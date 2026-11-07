"""
Enrutadores FastAPI para Presentación 3:
- /api/v1/ia  -> CU21 (Consultas Lenguaje Natural Texto/Voz) & CU22 (Exportación PDF/Excel)
- /api/v1/ml  -> CU23 (Entrenamiento y Evaluación de Modelos de Machine Learning)
"""
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.tenant import TenantContext, get_current_tenant_context
from app.domains.analitica_ia.schemas import (
    ConsultaIARequest,
    ConsultaIAResponse,
    ReporteIAHistorialItem,
    MLDemandaTrainRequest,
    MLDemandaTrainResponse,
    MLRFMTrainRequest,
    MLRFMTrainResponse,
    MLEntrenarTodoResponse,
    ModeloMLPersistedItem,
)
from app.domains.analitica_ia.services import GeminiNLPService, TenantIASubscriptionGuard
from app.domains.analitica_ia.export_service import ReportExportService
from app.domains.analitica_ia.ml_service import MachineLearningService


ia_router = APIRouter(prefix="/ia", tags=["IA Generativa (P3)"])
ml_router = APIRouter(prefix="/ml", tags=["Machine Learning (P3)"])


# ==============================================================================
# ENDPOINTS CU21: CONSULTAR REPORTES POR LENGUAJE NATURAL (TEXTO / VOZ)
# ==============================================================================

@ia_router.post(
    "/consultar",
    response_model=ConsultaIAResponse,
    summary="Consultar Reportes por Lenguaje Natural Texto/Voz con Blindaje Multitenant (CU21)",
)
async def consultar_reporte_ia(
    req: ConsultaIARequest,
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    empresa_info = await TenantIASubscriptionGuard.obtener_empresa_y_validar_ia(
        db=db, empresa_id=tenant.empresa_id, require_ia_plan=True
    )
    nlp_service = GeminiNLPService(db=db)
    return await nlp_service.procesar_consulta(
        prompt=req.prompt,
        tipo_entrada=req.tipo_entrada,
        tenant_id=tenant.empresa_id,
        usuario_id=tenant.user_id,
        empresa_info=empresa_info,
    )


@ia_router.get(
    "/historial",
    response_model=List[ReporteIAHistorialItem],
    summary="Listar Historial de Reportes Generados por IA del Tenant Autenticado (CU21)",
)
async def listar_historial_ia(
    limit: int = Query(15, ge=1, le=50),
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    nlp_service = GeminiNLPService(db=db)
    registros = await nlp_service.listar_historial_tenant(tenant_id=tenant.empresa_id, limit=limit)
    return [
        ReporteIAHistorialItem(
            reporte_id=r.id,
            empresa_id=r.empresa_id,
            prompt_consulta=r.prompt_consulta,
            tipo_entrada=r.tipo_entrada,
            sql_generado=r.sql_generado,
            respuesta_resumen=r.respuesta_resumen,
            formato_exportacion=r.formato_exportacion,
            fecha_consulta=r.fecha_consulta,
        )
        for r in registros
    ]


@ia_router.get(
    "/reportes/{reporte_id}",
    response_model=ConsultaIAResponse,
    summary="Recuperar Detalle Tabular de un Reporte de IA Previo (CU21/CU22)",
)
async def obtener_detalle_reporte_ia(
    reporte_id: int,
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    empresa_info = await TenantIASubscriptionGuard.obtener_empresa_y_validar_ia(
        db=db, empresa_id=tenant.empresa_id, require_ia_plan=False
    )
    nlp_service = GeminiNLPService(db=db)
    rep = await nlp_service.obtener_reporte_hidratado(reporte_id=reporte_id, tenant_id=tenant.empresa_id)
    return {
        **{k: v for k, v in rep.items() if k != "_orm"},
        "empresa_nombre": empresa_info["razon_social"],
        "motor_ia": "Google Gemini 1.5 Flash (NLQ Engine)",
    }


# ==============================================================================
# ENDPOINTS CU22: EXPORTAR REPORTES DINÁMICOS DE IA (PDF / EXCEL)
# ==============================================================================

async def _ejecutar_exportacion_binaria(
    reporte_id: int,
    formato: str,
    tenant: TenantContext,
    db: AsyncSession,
) -> StreamingResponse:
    empresa_info = await TenantIASubscriptionGuard.obtener_empresa_y_validar_ia(
        db=db, empresa_id=tenant.empresa_id, require_ia_plan=False
    )
    nlp_service = GeminiNLPService(db=db)
    reporte = await nlp_service.obtener_reporte_hidratado(reporte_id=reporte_id, tenant_id=tenant.empresa_id)

    orm_obj = reporte["_orm"]
    fmt_upper = formato.upper()

    if fmt_upper == "PDF":
        orm_obj.formato_exportacion = "PDF"
        await db.commit()
        buffer_pdf = ReportExportService.generar_pdf(reporte, empresa_info)
        filename = f"Reporte_IA_{reporte_id}_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
        return StreamingResponse(
            buffer_pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    orm_obj.formato_exportacion = "EXCEL"
    await db.commit()
    buffer_xlsx = ReportExportService.generar_excel(reporte, empresa_info)
    filename = f"Reporte_IA_{reporte_id}_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return StreamingResponse(
        buffer_xlsx,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@ia_router.get(
    "/reportes/{reporte_id}/exportar/pdf",
    summary="Exportar Reporte Dinámico de IA a PDF con ReportLab Platypus (CU22)",
)
async def exportar_reporte_pdf(
    reporte_id: int,
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    return await _ejecutar_exportacion_binaria(reporte_id, "PDF", tenant, db)


@ia_router.get(
    "/reportes/{reporte_id}/exportar/excel",
    summary="Exportar Reporte Dinámico de IA a Excel con OpenPyXL (CU22)",
)
async def exportar_reporte_excel(
    reporte_id: int,
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    return await _ejecutar_exportacion_binaria(reporte_id, "EXCEL", tenant, db)


@ia_router.get(
    "/reportes/{reporte_id}/exportar",
    summary="Exportar Reporte Dinámico de IA por parámetro formato=PDF|EXCEL (CU22)",
)
async def exportar_reporte_por_parametro(
    reporte_id: int,
    formato: str = Query("PDF", pattern="^(PDF|EXCEL|pdf|excel)$"),
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    return await _ejecutar_exportacion_binaria(reporte_id, formato.upper(), tenant, db)


# ==============================================================================
# ENDPOINTS CU23: ENTRENAR Y EVALUAR MODELOS DE MACHINE LEARNING
# ==============================================================================

@ml_router.post(
    "/entrenar/demanda",
    response_model=MLDemandaTrainResponse,
    summary="Entrenar y Evaluar Modelo Supervisado de Predicción de Demanda de Stock (CU23)",
)
async def entrenar_demanda_stock(
    req: MLDemandaTrainRequest = MLDemandaTrainRequest(),
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    await TenantIASubscriptionGuard.obtener_empresa_y_validar_ia(
        db=db, empresa_id=tenant.empresa_id, require_ia_plan=True
    )
    ml_service = MachineLearningService(db=db)
    return await ml_service.entrenar_prediccion_demanda(
        tenant_id=tenant.empresa_id,
        algoritmo=req.algoritmo,
        dias_historico=req.dias_historico,
        test_size=req.test_size,
    )


@ml_router.post(
    "/entrenar/segmentacion-rfm",
    response_model=MLRFMTrainResponse,
    summary="Entrenar y Evaluar Modelo No Supervisado K-Means de Segmentación RFM (CU23)",
)
async def entrenar_segmentacion_rfm(
    req: MLRFMTrainRequest = MLRFMTrainRequest(),
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    await TenantIASubscriptionGuard.obtener_empresa_y_validar_ia(
        db=db, empresa_id=tenant.empresa_id, require_ia_plan=True
    )
    ml_service = MachineLearningService(db=db)
    return await ml_service.entrenar_segmentacion_rfm(
        tenant_id=tenant.empresa_id,
        num_clusters=req.num_clusters,
    )


@ml_router.post(
    "/entrenar-todo",
    response_model=MLEntrenarTodoResponse,
    summary="Ejecutar Pipeline Completo de Entrenamiento Supervisado + No Supervisado RFM (CU23)",
)
async def entrenar_todos_los_modelos(
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    await TenantIASubscriptionGuard.obtener_empresa_y_validar_ia(
        db=db, empresa_id=tenant.empresa_id, require_ia_plan=True
    )
    ml_service = MachineLearningService(db=db)
    demanda_res = await ml_service.entrenar_prediccion_demanda(tenant_id=tenant.empresa_id)
    rfm_res = await ml_service.entrenar_segmentacion_rfm(tenant_id=tenant.empresa_id, num_clusters=3)
    return {
        "empresa_id": tenant.empresa_id,
        "supervisado_demanda": demanda_res,
        "no_supervisado_rfm": rfm_res,
    }


@ml_router.get(
    "/modelos",
    response_model=List[ModeloMLPersistedItem],
    summary="Listar Modelos Analíticos ML Registrados en PostgreSQL para el Tenant (CU23)",
)
async def listar_modelos_ml(
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    ml_service = MachineLearningService(db=db)
    modelos = await ml_service.listar_modelos_tenant(tenant_id=tenant.empresa_id)
    return [
        ModeloMLPersistedItem(
            id=m.id,
            empresa_id=m.empresa_id,
            nombre_modelo=m.nombre_modelo,
            tipo_aprendizaje=m.tipo_aprendizaje,
            variable_objetivo=m.variable_objetivo,
            precision_metrica=float(m.precision_metrica) if m.precision_metrica is not None else None,
            parametros_json=m.parametros_json,
            fecha_entrenamiento=m.fecha_entrenamiento,
            activo=m.activo,
        )
        for m in modelos
    ]
