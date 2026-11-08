"""Endpoints de FastAPI para el dominio de Reportes, Dashboards y Análisis por Voz (CU22)."""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status, Response
from sqlalchemy.ext.asyncio import AsyncSession

from apps.core.database import get_db
from apps.ReportesIA.schemas import (
    DashboardReporteResponse, ConsultaVozRequest, AnalisisVozResponse
)
from apps.ReportesIA.services import ReportesService

router = APIRouter(prefix="/reportes", tags=["Reportes & Dashboard (IA) - CU22"])


@router.get(
    "/dashboard",
    response_model=DashboardReporteResponse,
    summary="Obtener métricas, KPIs y gráficos consolidados para el Dashboard"
)
async def obtener_dashboard(
    rango: str = Query("30D", description="Rango temporal: 24H, 7D, 30D, MES_ACTUAL, MES_ANTERIOR, MES_ESPECIFICO"),
    granularidad: str = Query("MES", description="Granularidad de línea temporal: DIA, SEMANA, MES"),
    mes: Optional[int] = Query(None, ge=1, le=12, description="Mes específico (1 a 12)"),
    anio: Optional[int] = Query(None, ge=2020, le=2030, description="Año específico"),
    sucursal_id: Optional[int] = Query(None, description="Filtrar por sucursal"),
    db: AsyncSession = Depends(get_db)
):
    """Retorna los KPIs ejecutivos, gráficos de tendencia, alertas y órdenes recientes."""
    service = ReportesService(db)
    return await service.obtener_dashboard_kpis(
        rango=rango, granularidad=granularidad, sucursal_id=sucursal_id, mes=mes, anio=anio
    )


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
    summary="Exportar reporte ejecutivo en formato Excel (.xlsx), PDF (.pdf) o CSV"
)
async def exportar_reporte(
    formato: str = Query("excel", pattern="^(excel|pdf|csv)$", description="Formato de exportación: excel, pdf o csv"),
    rango: str = Query("30D", description="Rango de fechas: 24H, 7D, 30D, MES_ESPECIFICO"),
    mes: Optional[int] = Query(None, ge=1, le=12, description="Mes a auditar"),
    anio: Optional[int] = Query(None, ge=2020, le=2030, description="Año a auditar"),
    sucursal_id: Optional[int] = Query(None, description="Filtrar por ID de sucursal"),
    db: AsyncSession = Depends(get_db)
):
    """Genera y descarga un informe ejecutivo consolidado en formato Excel, PDF o CSV."""
    service = ReportesService(db)
    mes_str = f"_{anio}_{mes:02d}" if mes and anio else f"_{rango}"

    if formato == "excel":
        content = await service.exportar_reporte_excel(rango=rango, mes=mes, anio=anio, sucursal_id=sucursal_id)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"Informe_Ejecutivo_FashionStore{mes_str}.xlsx"
    elif formato == "pdf":
        content = await service.exportar_reporte_pdf(rango=rango, mes=mes, anio=anio, sucursal_id=sucursal_id)
        media_type = "application/pdf"
        filename = f"Informe_Ejecutivo_FashionStore{mes_str}.pdf"
    else:
        content = await service.exportar_reporte_csv(rango=rango, mes=mes, anio=anio, sucursal_id=sucursal_id)
        media_type = "text/csv; charset=utf-8"
        filename = f"Informe_Ejecutivo_FashionStore{mes_str}.csv"

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

