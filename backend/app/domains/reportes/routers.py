"""Endpoints de FastAPI para el dominio de Reportes, Dashboards y Análisis por Voz (CU22)."""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.reportes.schemas import (
    DashboardReporteResponse, ConsultaVozRequest, AnalisisVozResponse
)
from app.domains.reportes.services import ReportesService

router = APIRouter(prefix="/reportes", tags=["Reportes & Dashboard (IA) - CU22"])


@router.get(
    "/dashboard",
    response_model=DashboardReporteResponse,
    summary="Obtener métricas, KPIs y gráficos consolidados para el Dashboard"
)
async def obtener_dashboard(
    rango: str = Query("30D", description="Rango temporal: 24H, 7D, 30D, MES_ACTUAL"),
    granularidad: str = Query("MES", description="Granularidad de línea temporal: DIA, SEMANA, MES"),
    sucursal_id: Optional[int] = Query(None, description="Filtrar por sucursal"),
    db: AsyncSession = Depends(get_db)
):
    """Retorna los KPIs ejecutivos, gráficos de tendencia, alertas y órdenes recientes."""
    service = ReportesService(db)
    return await service.obtener_dashboard_kpis(rango=rango, granularidad=granularidad, sucursal_id=sucursal_id)


@router.post(
    "/analisis-voz",
    response_model=AnalisisVozResponse,
    summary="Procesar consulta de voz con IA y generar informe estratégico con speech"
)
async def procesar_consulta_voz(
    payload: ConsultaVozRequest,
    db: AsyncSession = Depends(get_db)
):
    """Interpreta la pregunta gerencial por voz, extrae métricas reales de la BD y redacta diagnósticos."""
    service = ReportesService(db)
    return await service.analizar_consulta_voz(query=payload.query, sucursal_id=payload.sucursal_id)


@router.get(
    "/exportar",
    summary="Exportar reporte ejecutivo en formato CSV para descarga"
)
async def exportar_reporte(
    db: AsyncSession = Depends(get_db)
):
    """Genera y descarga un archivo CSV con el reporte consolidado de operaciones y ventas."""
    service = ReportesService(db)
    contenido_csv = await service.exportar_reporte_csv()

    return Response(
        content=contenido_csv,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=informe_ejecutivo_fashionstore.csv"
        }
    )
