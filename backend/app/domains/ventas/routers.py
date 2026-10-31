"""APIRouter para el dominio de Ventas y Pagos."""
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.usuarios.models import Usuario
from app.domains.usuarios.routers import get_current_user, get_optional_current_user, require_permissions
from app.domains.ventas.services import VentasService
from app.domains.ventas.schemas import (
    VentasStatusResponse, VentaPOSCreate, VentaResponse,
    DevolucionCreate, DevolucionResponse, VentaParaDevolucionResponse,
    PagoResponse, PagoElectronicoCreate, ConfirmarPagoRequest,
    QRGenerarResponse, WebhookPagoPayload, PagoIniciarResponse,
    VentaOnlineCheckoutRequest, ActualizarEstadoEnvioRequest, EnvioPedidoResponse,
    PromocionCreate, PromocionUpdate, PromocionResponse,
    ValidarCuponRequest, ValidarCuponResponse,
    ValidarCambioGarantiaResponse, NotaDevolucionFormalCreate, NotaDevolucionFormalResponse
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


# ----------------- CU15: CARRITO & CHECKOUT E-COMMERCE -----------------
@router.post(
    "/checkout-online",
    response_model=VentaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Procesar Venta Digital / Carrito de Compras (CU15)"
)
async def procesar_checkout_online(
    data: VentaOnlineCheckoutRequest,
    request: Request,
    current_user: Optional[Usuario] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await VentasService.procesar_checkout_online(db, data, current_user, ip)


@router.get(
    "/pedidos-online",
    response_model=List[VentaResponse],
    summary="Listar Pedidos de Venta Digital E-Commerce (CU15)"
)
async def listar_pedidos_online(
    sucursal_id: Optional[int] = None,
    estado_envio: Optional[str] = None,
    cliente_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: Optional[Usuario] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user:
        if current_user.rol and current_user.rol.nombre == "CLIENTE":
            cliente_id = current_user.id
    else:
        # Fallback a cliente activo si viene de app móvil sin sesión o con token expirado
        if not cliente_id:
            res_cli = await db.execute(
                select(Usuario).where(Usuario.tipo_usuario == "CLIENTE").limit(1)
            )
            cli = res_cli.scalar_one_or_none()
            if cli:
                cliente_id = cli.id

    return await VentasService.listar_pedidos_online(
        db=db,
        sucursal_id=sucursal_id,
        estado_envio=estado_envio,
        cliente_id=cliente_id,
        limit=limit,
        offset=offset
    )


@router.put(
    "/pedidos-online/{envio_id}/estado",
    response_model=EnvioPedidoResponse,
    summary="Actualizar Estado de Envío de Pedido E-Commerce (CU15)"
)
async def actualizar_estado_envio(
    envio_id: int,
    data: ActualizarEstadoEnvioRequest,
    request: Request,
    current_user: Usuario = Depends(require_permissions("ventas:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await VentasService.actualizar_estado_envio(db, envio_id, data, current_user, ip)


# ----------------- CU16: PROMOCIONES Y DESCUENTOS -----------------
@router.post(
    "/promociones/validar",
    response_model=ValidarCuponResponse,
    summary="Validar Cupón de Descuento (CU16)"
)
async def validar_cupon(
    data: ValidarCuponRequest,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not data.cliente_id and current_user:
        data.cliente_id = current_user.id
    return await VentasService.validar_cupon(db, data)


@router.post(
    "/promociones",
    response_model=PromocionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear Promoción / Cupón de Descuento (CU16)"
)
async def crear_promocion(
    data: PromocionCreate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("ventas:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await VentasService.crear_promocion(db, data, current_user, ip)


@router.get(
    "/promociones",
    response_model=List[PromocionResponse],
    summary="Listar Promociones y Campañas (CU16)"
)
async def listar_promociones(
    activo: Optional[bool] = None,
    tipo_descuento: Optional[str] = None,
    solo_vigentes: bool = False,
    limit: int = 50,
    offset: int = 0,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await VentasService.listar_promociones(
        db, activo=activo, tipo_descuento=tipo_descuento,
        solo_vigentes=solo_vigentes, limit=limit, offset=offset
    )


@router.get(
    "/promociones/{promocion_id}",
    response_model=PromocionResponse,
    summary="Obtener Promoción por ID (CU16)"
)
async def obtener_promocion(
    promocion_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await VentasService.obtener_promocion_por_id(db, promocion_id)


@router.put(
    "/promociones/{promocion_id}",
    response_model=PromocionResponse,
    summary="Actualizar Promoción (CU16)"
)
async def actualizar_promocion(
    promocion_id: int,
    data: PromocionUpdate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("ventas:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await VentasService.actualizar_promocion(db, promocion_id, data, current_user, ip)


@router.patch(
    "/promociones/{promocion_id}/estado",
    response_model=PromocionResponse,
    summary="Activar o Desactivar Promoción (CU16)"
)
async def cambiar_estado_promocion(
    promocion_id: int,
    activo: bool,
    request: Request,
    current_user: Usuario = Depends(require_permissions("ventas:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await VentasService.cambiar_estado_promocion(db, promocion_id, activo, current_user, ip)


@router.delete(
    "/promociones/{promocion_id}",
    summary="Eliminar o Desactivar Promoción (CU16)"
)
async def eliminar_promocion(
    promocion_id: int,
    request: Request,
    current_user: Usuario = Depends(require_permissions("ventas:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await VentasService.eliminar_promocion(db, promocion_id, current_user, ip)


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





# ----------------- CU19 & CU20: NOTAS DE DEVOLUCIÓN POR CAMBIO DE TALLA (RN06, RN07, RN08) -----------------
@router.get(
    "/devoluciones/validar-cambio/{codigo_venta}",
    response_model=ValidarCambioGarantiaResponse,
    summary="Validar Solicitud de Cambio de Prenda por Medida (CU19 / RN06)"
)
async def validar_solicitud_cambio(
    codigo_venta: str,
    current_user: Usuario = Depends(require_permissions("ventas:read")),
    db: AsyncSession = Depends(get_db)
):
    """
    CU19: Validar ticket previo, cálculo de días transcurridos y vigencia de garantía (RN06).
    """
    emp_id = getattr(current_user, 'empresa_id', 1) or 1
    return await VentasService.validar_solicitud_cambio(db, codigo_venta, emp_id)


@router.post(
    "/devoluciones/nota-cambio-talla",
    response_model=NotaDevolucionFormalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Emitir Nota de Devolución Oficial con Balance Atómico (CU20 / RN07 / RN08)"
)
async def emitir_nota_devolucion_formal(
    data: NotaDevolucionFormalCreate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("ventas:write")),
    db: AsyncSession = Depends(get_db)
):
    """
    CU20: Emisión formal de Nota de Devolución DEV-YYYY-NNNN.
    - Prohibición estricta de reembolso monetario (RN07: saldo Bs. 0.00).
    - Doble balance atómico de stock (RN08: +1 devuelto a stock, -1 nueva talla entregada).
    """
    ip = request.client.host if request.client else None
    return await VentasService.emitir_nota_devolucion_formal(db, data, current_user, ip)


@router.get(
    "/devoluciones/notas-lista",
    response_model=List[NotaDevolucionFormalResponse],
    summary="Listar Notas de Devolución Emitidas (CU20)"
)
async def listar_notas_devolucion_formales(
    sucursal_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: Usuario = Depends(require_permissions("ventas:read")),
    db: AsyncSession = Depends(get_db)
):
    emp_id = getattr(current_user, 'empresa_id', 1) or 1
    return await VentasService.listar_notas_devolucion_formales(db, sucursal_id, emp_id, limit, offset)
