"""APIRouter para el dominio de Ventas y Pagos."""
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.usuarios.models import Usuario
from app.domains.usuarios.routers import require_permissions
from app.domains.ventas.services import VentasService
from app.domains.ventas.schemas import (
    VentasStatusResponse, VentaPOSCreate, VentaResponse,
    DevolucionCreate, DevolucionResponse, VentaParaDevolucionResponse,
    PagoResponse, PagoElectronicoCreate, ConfirmarPagoRequest,
    QRGenerarResponse, WebhookPagoPayload, PagoIniciarResponse
)

router = APIRouter(
    prefix="/ventas",
    tags=["Ventas & POS"]
)

@router.get(
    "/status",
    response_model=VentasStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Estado del dominio Ventas y Pagos"
)
async def get_domain_status(db: AsyncSession = Depends(get_db)):
    service = VentasService(db)
    result = await service.get_status()
    return VentasStatusResponse(
        domain=result["domain"],
        status=result["status"],
        message=result["description"]
    )


# ----------------- CU10: PUNTO DE VENTA (POS) -----------------
@router.post(
    "/pos",
    response_model=VentaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar Venta Presencial POS (CU10)"
)
async def registrar_venta_pos(
    data: VentaPOSCreate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("ventas:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await VentasService.registrar_venta_pos(db, data, current_user, ip)


@router.get(
    "",
    response_model=List[VentaResponse],
    summary="Listar Ventas Registradas (CU10)"
)
async def listar_ventas(
    sucursal_id: Optional[int] = None,
    fecha: Optional[date] = None,
    canal_venta: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: Usuario = Depends(require_permissions("ventas:read")),
    db: AsyncSession = Depends(get_db)
):
    return await VentasService.listar_ventas(db, sucursal_id, fecha, canal_venta, limit, offset)


# ----------------- CU11: DEVOLUCIONES Y CAMBIOS -----------------
@router.get(
    "/buscar-codigo/{codigo_venta}",
    response_model=VentaParaDevolucionResponse,
    summary="Buscar Ticket/Venta para Devolución o Cambio (CU11)"
)
async def buscar_venta_codigo(
    codigo_venta: str,
    current_user: Usuario = Depends(require_permissions("ventas:read")),
    db: AsyncSession = Depends(get_db)
):
    return await VentasService.buscar_venta_para_devolucion(db, codigo_venta)


@router.post(
    "/devoluciones",
    response_model=DevolucionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar Devolución o Cambio de Prendas (CU11)"
)
async def registrar_devolucion(
    data: DevolucionCreate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("ventas:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await VentasService.registrar_devolucion_cambio(db, data, current_user, ip)


@router.get(
    "/devoluciones/lista",
    response_model=List[DevolucionResponse],
    summary="Listar Devoluciones y Cambios (CU11)"
)
async def listar_devoluciones(
    sucursal_id: Optional[int] = None,
    tipo: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: Usuario = Depends(require_permissions("ventas:read")),
    db: AsyncSession = Depends(get_db)
):
    return await VentasService.listar_devoluciones(db, sucursal_id, tipo, limit, offset)


@router.get(
    "/devoluciones/{devolucion_id}",
    response_model=DevolucionResponse,
    summary="Obtener Detalle / Comprobante de Devolución o Cambio (CU11)"
)
async def obtener_devolucion(
    devolucion_id: int,
    current_user: Usuario = Depends(require_permissions("ventas:read")),
    db: AsyncSession = Depends(get_db)
):
    return await VentasService.obtener_devolucion_por_id(db, devolucion_id)


# ----------------- CU12: PAGOS ELECTRÓNICOS Y PASARELAS -----------------
@router.post(
    "/pagos/iniciar",
    response_model=PagoIniciarResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Iniciar Cobro Electrónico (QR Simple / Tarjeta / PayPal) (CU12)"
)
async def iniciar_pago(
    data: PagoElectronicoCreate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("ventas:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await VentasService.iniciar_pago_electronico(db, data, current_user, ip)


@router.post(
    "/pagos/{pago_id}/confirmar",
    response_model=PagoResponse,
    summary="Confirmar Acreditación de Pago QR / Externo (CU12)"
)
async def confirmar_pago(
    pago_id: int,
    data: ConfirmarPagoRequest,
    request: Request,
    current_user: Usuario = Depends(require_permissions("ventas:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await VentasService.confirmar_pago_electronico(db, pago_id, data, current_user, ip)


@router.post(
    "/pagos/webhook",
    summary="Endpoint Receptor de Webhooks de Pasarelas (Libélula / Stripe / PayPal) (CU12)"
)
async def webhook_pasarela(
    payload: WebhookPagoPayload,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await VentasService.procesar_webhook_pasarela(db, payload, ip)


@router.get(
    "/pagos",
    response_model=List[PagoResponse],
    summary="Listar Historial de Pagos Electrónicos (CU12)"
)
async def listar_pagos(
    pasarela: Optional[str] = None,
    estado: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: Usuario = Depends(require_permissions("ventas:read")),
    db: AsyncSession = Depends(get_db)
):
    return await VentasService.listar_pagos_electronicos(db, pasarela, estado, limit, offset)


@router.get(
    "/pagos/{pago_id}",
    response_model=PagoResponse,
    summary="Obtener Voucher Digital de Pago (CU12)"
)
async def obtener_pago(
    pago_id: int,
    current_user: Usuario = Depends(require_permissions("ventas:read")),
    db: AsyncSession = Depends(get_db)
):
    return await VentasService.obtener_pago_por_id(db, pago_id)


# ----------------- VENTA POR ID (CU10) -----------------
@router.get(
    "/{venta_id}",
    response_model=VentaResponse,
    summary="Obtener Detalle / Comprobante de Venta (CU10)"
)
async def obtener_venta(
    venta_id: int,
    current_user: Usuario = Depends(require_permissions("ventas:read")),
    db: AsyncSession = Depends(get_db)
):
    return await VentasService.obtener_venta_por_id(db, venta_id)

