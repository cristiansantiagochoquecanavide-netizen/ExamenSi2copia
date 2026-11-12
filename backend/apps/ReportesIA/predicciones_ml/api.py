"""Rutas HTTP para el laboratorio ML y el dashboard de predicciones."""
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from apps.core.database import get_db
from apps.core.tenant import TenantContext, get_current_tenant_context
from .ml_service import MachineLearningService

router = APIRouter(prefix="/ml", tags=["Machine Learning (CU23-CU24)"])


class TrainDemandRequest(BaseModel):
    algoritmo: str = "RandomForestRegressor"
    dias_historico: int = Field(default=90, ge=30, le=365)
    test_size: float = Field(default=0.2, gt=0, lt=0.5)


class TrainRFMRequest(BaseModel):
    num_clusters: int = Field(default=3, ge=2, le=6)


class TrainAllRequest(TrainDemandRequest):
    num_clusters: int = Field(default=3, ge=2, le=6)


def _require_ml_access(tenant: TenantContext) -> None:
    if not tenant.permite_ia:
        raise HTTPException(status_code=403, detail="El plan actual no habilita el laboratorio de Machine Learning.")


def _serialize_model(model: Any) -> dict[str, Any]:
    return {
        "id": model.id,
        "empresa_id": model.empresa_id,
        "nombre_modelo": model.nombre_modelo,
        "tipo_aprendizaje": model.tipo_aprendizaje,
        "variable_objetivo": model.variable_objetivo,
        "precision_metrica": float(model.precision_metrica) if model.precision_metrica is not None else None,
        "parametros_json": model.parametros_json or {},
        "fecha_entrenamiento": model.fecha_entrenamiento,
        "activo": model.activo,
    }


def _serialize_projection(item: dict[str, Any]) -> dict[str, Any]:
    state = item.get("estado_stock")
    risk = {
        "QUIEBRE_INMINENTE": "QUIEBRE_INMINENTE",
        "STOCK_MINIMO": "STOCK_MINIMO",
        "STOCK_OPTIMO": "STOCK_SUFICIENTE",
    }.get(state, "STOCK_SUFICIENTE")
    return {
        "variante_id": item["variante_id"],
        "sku": item["sku"],
        "prenda_nombre": item["prenda_nombre"],
        "talla": item["talla"],
        "color": item["color"],
        "sucursal_id": item["sucursal_id"],
        "sucursal_nombre": item["sucursal_nombre"],
        "stock_disponible": item["stock_disponible"],
        "demanda_proyectada_7d": item["demanda_estimada_7d"],
        "dias_de_cobertura": item["dias_cobertura"],
        "estado_riesgo": risk,
        "accion_sugerida": item["sugerencia_accion"],
        "rotacion_semanal_estimada": item["demanda_estimada_7d"],
    }


@router.post("/entrenar/demanda")
async def entrenar_demanda(
    payload: TrainDemandRequest,
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    _require_ml_access(tenant)
    return await MachineLearningService(db).entrenar_prediccion_demanda(
        tenant.empresa_id,
        algoritmo=payload.algoritmo,
        dias_historico=payload.dias_historico,
        test_size=payload.test_size,
    )


@router.post("/entrenar/segmentacion-rfm")
async def entrenar_segmentacion_rfm(
    payload: TrainRFMRequest,
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    _require_ml_access(tenant)
    return await MachineLearningService(db).entrenar_segmentacion_rfm(
        tenant.empresa_id, num_clusters=payload.num_clusters
    )


@router.post("/entrenar-todo")
async def entrenar_todo(
    payload: TrainAllRequest,
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    _require_ml_access(tenant)
    service = MachineLearningService(db)
    demand = await service.entrenar_prediccion_demanda(
        tenant.empresa_id,
        algoritmo=payload.algoritmo,
        dias_historico=payload.dias_historico,
        test_size=payload.test_size,
    )
    rfm = await service.entrenar_segmentacion_rfm(
        tenant.empresa_id, num_clusters=payload.num_clusters
    )
    return {"empresa_id": tenant.empresa_id, "supervisado_demanda": demand, "no_supervisado_rfm": rfm}


@router.get("/modelos")
async def listar_modelos(
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    _require_ml_access(tenant)
    models = await MachineLearningService(db).listar_modelos_tenant(tenant.empresa_id)
    return [_serialize_model(model) for model in models]


@router.get("/proyecciones-stock")
async def obtener_proyecciones_stock(
    sucursal_id: int | None = Query(default=None, ge=1),
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    _require_ml_access(tenant)
    data = await MachineLearningService(db).obtener_proyecciones_stock(tenant.empresa_id, sucursal_id)
    items = [_serialize_projection(item) for item in data["items"]]
    return {
        "empresa_id": tenant.empresa_id,
        "total_analizadas": len(items),
        "quiebres_inminentes": sum(item["estado_riesgo"] == "QUIEBRE_INMINENTE" for item in items),
        "en_alerta_minimo": sum(item["estado_riesgo"] == "STOCK_MINIMO" for item in items),
        "items": items,
    }


@router.get("/dashboard")
async def obtener_dashboard(
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    _require_ml_access(tenant)
    service = MachineLearningService(db)
    models = await service.listar_modelos_tenant(tenant.empresa_id)
    demand = next((m for m in models if m.tipo_aprendizaje == "SUPERVISADO_REGRESION" and m.activo), None)
    rfm = next((m for m in models if m.tipo_aprendizaje == "NO_SUPERVISADO_CLUSTERING" and m.activo), None)
    projections = await service.obtener_proyecciones_stock(tenant.empresa_id)
    items = [_serialize_projection(item) for item in projections["items"]]
    return {
        "empresa_id": tenant.empresa_id,
        "precision_r2_demanda": float(demand.precision_metrica or 0) if demand else 0,
        "silhouette_score_rfm": float(rfm.precision_metrica or 0) if rfm else 0,
        "quiebres_inminentes_count": sum(item["estado_riesgo"] == "QUIEBRE_INMINENTE" for item in items),
        "alertas_stock_minimo_count": sum(item["estado_riesgo"] == "STOCK_MINIMO" for item in items),
        "total_variantes_evaluadas": len(items),
        "distribucion_rfm": [],
        "curva_tendencia_7d": [],
        "recomendaciones_ia": [],
    }
