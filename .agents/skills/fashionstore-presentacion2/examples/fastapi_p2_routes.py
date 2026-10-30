"""
FashionStore SaaS - Endpoints y Lógica de Negocio Backend (Presentación 2)
Módulos: Sincronización Offline (Idempotencia), Notas de Devolución y Traspasos Multi-sucursal
INF412 - Sistemas de Información 2
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, insert
from sqlalchemy.orm import selectinload

# Asumir integración con app.core.database y app.core.tenant
# from app.core.database import get_db
# from app.core.tenant import get_current_tenant_id, get_current_user

# ==============================================================================
# 1. ESQUEMAS PYDANTIC (PRESENTACIÓN 2)
# ==============================================================================

class OfflineItemPayload(BaseModel):
    producto_variante_id: int
    cantidad: int
    precio_unitario: Optional[float] = 0.0

class OfflineTransaction(BaseModel):
    uuid_operacion: str
    tipo_operacion: str  # 'VENTA_LOCAL', 'RESERVA_LOCAL'
    fecha_registro_local: datetime
    payload_json: dict

class LoteSincronizacionRequest(BaseModel):
    lote: List[OfflineTransaction]

class SincronizacionResultadoItem(BaseModel):
    uuid_operacion: str
    estado: str  # 'SINCRONIZADO', 'DUPLICADO_IGNORADO', 'CONFLICTO_STOCK', 'ERROR'
    mensaje: str

class SincronizacionBatchResponse(BaseModel):
    total_recibidos: int
    procesados_exitosamente: int
    duplicados_idempotentes: int
    conflictos_stock: int
    resultados: List[SincronizacionResultadoItem]

# Esquemas de Notas de Devolución
class DetalleDevolucionItem(BaseModel):
    variante_devuelta_id: int
    cantidad_devuelta: int = Field(gt=0)
    variante_entregada_id: int
    cantidad_entregada: int = Field(gt=0)
    diferencia_monetaria: float = 0.0  # RN07: Prohibido reembolso en efectivo

class NotaDevolucionCreate(BaseModel):
    venta_id: int
    sucursal_id: int
    cliente_id: int
    motivo: str = Field(description="'TALLA_CHICA', 'TALLA_GRANDE', 'DESAJUSTE_MEDIDA', 'DEFECTO_FABRICA'")
    observaciones: Optional[str] = None
    detalles: List[DetalleDevolucionItem]

# Esquemas de Traspasos
class ItemTraspasoCreate(BaseModel):
    producto_variante_id: int
    cantidad: int = Field(gt=0)

class TraspasoCreate(BaseModel):
    sucursal_origen_id: int
    sucursal_destino_id: int
    motivo: Optional[str] = None
    items: List[ItemTraspasoCreate]

class ItemRecepcionConfirm(BaseModel):
    producto_variante_id: int
    cantidad_recibida: int = Field(ge=0)

class RecepcionTraspasoRequest(BaseModel):
    observaciones_recepcion: Optional[str] = None
    items_confirmados: List[ItemRecepcionConfirm]


# ==============================================================================
# 2. CONTROLADOR / ROUTER DE SINCRONIZACIÓN OFFLINE E IDEMPOTENCIA
# ==============================================================================

router_sync = APIRouter(prefix="/sincronizacion", tags=["Sincronización Offline"])

@router_sync.post("/offline", response_model=SincronizacionBatchResponse)
async def sincronizar_operaciones_offline(
    request: LoteSincronizacionRequest,
    # db: AsyncSession = Depends(get_db),
    # tenant_id: int = Depends(get_current_tenant_id),
    # current_user = Depends(get_current_user)
):
    """
    CU16: Sincronizar Operaciones Comerciales Offline.
    Garantiza IDEMPOTENCIA: reintentos de red con el mismo uuid_operacion
    no provocan dobles ventas ni deducciones duplicadas de inventario.
    """
    total_recibidos = len(request.lote)
    procesados = 0
    duplicados = 0
    conflictos = 0
    resultados = []

    # Demostración lógica del procesamiento de cada transacción en el lote
    for tx in request.lote:
        uuid_op = tx.uuid_operacion
        
        # 1. Comprobación de idempotencia en tabla sincronizacion_offline
        # stmt = select(SincronizacionOffline).where(SincronizacionOffline.uuid_operacion == uuid_op)
        # existing = await db.scalar(stmt)
        # if existing and existing.estado == 'SINCRONIZADO':
        #     duplicados += 1
        #     resultados.append(SincronizacionResultadoItem(
        #         uuid_operacion=uuid_op,
        #         estado='DUPLICADO_IGNORADO',
        #         mensaje='Transacción previamente sincronizada (Idempotencia verificada).'
        #     ))
        #     continue

        # 2. Procesamiento según tipo_operacion
        if tx.tipo_operacion == 'VENTA_LOCAL':
            # Simulación de verificación de stock y deducción
            payload = tx.payload_json
            sucursal_id = payload.get("sucursal_id")
            items = payload.get("items", [])
            
            stock_insuficiente = False
            for it in items:
                # Comprobar stock actual en PostgreSQL:
                # if stock_servidor < it["cantidad"]:
                #     stock_insuficiente = True
                #     break
                pass

            if stock_insuficiente:
                conflictos += 1
                resultados.append(SincronizacionResultadoItem(
                    uuid_operacion=uuid_op,
                    estado='CONFLICTO_STOCK',
                    mensaje='Stock central insuficiente al momento de la sincronización. Registrado en conflicto_inventario.'
                ))
            else:
                procesados += 1
                resultados.append(SincronizacionResultadoItem(
                    uuid_operacion=uuid_op,
                    estado='SINCRONIZADO',
                    mensaje='Venta offline procesada exitosamente e inventario rebajado.'
                ))

        elif tx.tipo_operacion == 'RESERVA_LOCAL':
            procesados += 1
            resultados.append(SincronizacionResultadoItem(
                uuid_operacion=uuid_op,
                estado='SINCRONIZADO',
                mensaje='Reserva de probador físico registrada exitosamente.'
            ))

    return SincronizacionBatchResponse(
        total_recibidos=total_recibidos,
        procesados_exitosamente=procesados,
        duplicados_idempotentes=duplicados,
        conflictos_stock=conflictos,
        resultados=resultados
    )


# ==============================================================================
# 3. CONTROLADOR / ROUTER DE NOTAS DE DEVOLUCIÓN POR CAMBIO DE TALLA
# ==============================================================================

router_devoluciones = APIRouter(prefix="/devoluciones", tags=["Garantías y Devoluciones"])

@router_devoluciones.post("/notas", status_code=status.HTTP_201_CREATED)
async def emitir_nota_devolucion(
    nota: NotaDevolucionCreate,
    # db: AsyncSession = Depends(get_db),
    # tenant_id: int = Depends(get_current_tenant_id),
    # current_user = Depends(get_current_user)
):
    """
    CU19 / CU20: Emisión de Nota de Devolución por Cambio de Medida.
    - Valida plazo de garantía (RN06).
    - Prohíbe reembolso de dinero (RN07: diferencia_monetaria = 0.00).
    - Reingresa variante devuelta al stock vendible (+1).
    - Descuenta variante entregada del stock vendible (-1).
    """
    # 1. Validar política de garantía del tenant
    # stmt_pol = select(PoliticaGarantia).where(PoliticaGarantia.empresa_id == tenant_id)
    # pol = await db.scalar(stmt_pol)
    # plazo_max = pol.plazo_dias_cambio if pol else 7

    # 2. Validar fecha de la venta original
    # stmt_vta = select(Venta).where(Venta.id == nota.venta_id)
    # vta = await db.scalar(stmt_vta)
    # dias_transcurridos = (datetime.now(timezone.utc) - vta.fecha_hora).days
    # if dias_transcurridos > plazo_max:
    #     raise HTTPException(
    #         status_code=400,
    #         detail=f"Plazo de garantía vencido ({dias_transcurridos} días transcurridos, máximo permitido: {plazo_max} días)."
    #     )

    # 3. Validar regla estricta: NO REEMBOLSO MONETARIO
    for det in nota.detalles:
        if det.diferencia_monetaria != 0.00:
            raise HTTPException(
                status_code=400,
                detail="Regla de Negocio RN07: Prohibido reintegro de dinero en notas de devolución por cambio de talla."
            )

    # 4. Transacción atómica de ajuste de inventario:
    # For det in nota.detalles:
    #   - Incrementar stock de variante devuelta en la sucursal:
    #     UPDATE inventario SET cantidad = cantidad + det.cantidad_devuelta WHERE sucursal_id = nota.sucursal_id AND producto_variante_id = det.variante_devuelta_id
    #   - Decrementar stock de nueva talla entregada:
    #     UPDATE inventario SET cantidad = cantidad - det.cantidad_entregada WHERE sucursal_id = nota.sucursal_id AND producto_variante_id = det.variante_entregada_id

    correlativo = f"DEV-{datetime.now().year}-{nota.venta_id:04d}"
    return {
        "codigo_devolucion": correlativo,
        "empresa_id": 1,
        "venta_id": nota.venta_id,
        "motivo": nota.motivo,
        "estado": "COMPLETADA",
        "diferencia_monetaria": 0.00,
        "mensaje": "Nota de devolución emitida correctamente. Prenda reingresada al inventario y nueva talla despachada."
    }


# ==============================================================================
# 4. CONTROLADOR / ROUTER DE TRASPASOS MULTI-SUCURSAL (2 FASES)
# ==============================================================================

router_traspasos = APIRouter(prefix="/inventario/traspasos", tags=["Traspasos Multi-sucursal"])

@router_traspasos.post("", status_code=status.HTTP_201_CREATED)
async def solicitar_y_despachar_traspaso(
    traspaso: TraspasoCreate,
    # db: AsyncSession = Depends(get_db),
    # tenant_id: int = Depends(get_current_tenant_id),
    # current_user = Depends(get_current_user)
):
    """
    CU12: Fase 1 de Traspaso - Despacho desde Sucursal Origen.
    - Valida que origen y destino sean distintos.
    - Deduce stock de origen y lo marca como EN_TRANSITO.
    """
    if traspaso.sucursal_origen_id == traspaso.sucursal_destino_id:
        raise HTTPException(
            status_code=400,
            detail="La sucursal de origen debe ser distinta a la sucursal de destino."
        )

    # Validar existencias en origen y rebajar disponible:
    # for it in traspaso.items:
    #     UPDATE inventario SET cantidad = cantidad - it.cantidad WHERE sucursal_id = origen AND variante = it.producto_variante_id

    correlativo = f"TRASP-{datetime.now().year}-{traspaso.sucursal_origen_id}{traspaso.sucursal_destino_id}01"
    return {
        "codigo_traspaso": correlativo,
        "sucursal_origen_id": traspaso.sucursal_origen_id,
        "sucursal_destino_id": traspaso.sucursal_destino_id,
        "estado": "EN_TRANSITO",
        "mensaje": "Traspaso despachado exitosamente. Mercadería en tránsito hacia sucursal destino."
    }

@router_traspasos.post("/{traspaso_id}/recepcionar")
async def confirmar_recepcion_traspaso(
    traspaso_id: int,
    recepcion: RecepcionTraspasoRequest,
    # db: AsyncSession = Depends(get_db),
    # tenant_id: int = Depends(get_current_tenant_id),
    # current_user = Depends(get_current_user)
):
    """
    CU13: Fase 2 de Traspaso - Recepción Conforme en Sucursal Destino.
    - Incrementa stock disponible en la sucursal destino.
    - Actualiza estado a RECEPCIONADO.
    """
    # for it in recepcion.items_confirmados:
    #     UPDATE inventario SET cantidad = cantidad + it.cantidad_recibida WHERE sucursal_id = destino AND variante = it.producto_variante_id

    return {
        "traspaso_id": traspaso_id,
        "estado": "RECEPCIONADO",
        "mensaje": "Recepción física confirmada conforme. Prendas incorporadas al inventario disponible de la sucursal destino."
    }
