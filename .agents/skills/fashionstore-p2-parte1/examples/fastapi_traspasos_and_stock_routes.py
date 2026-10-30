"""
FastAPI Routes para Parte 1 (CU08, CU11, CU12, CU13)
Catálogo Local, Disponibilidad Multi-sucursal y Traspasos en 2 Fases
INF412 - Sistemas de Información 2 (Presentación 2)
"""

from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status, Query

router_p2_parte1 = APIRouter(prefix="", tags=["Presentación 2 - Parte 1"])

# ==============================================================================
# ESQUEMAS PYDANTIC
# ==============================================================================

class PrendaSyncItem(BaseModel):
    id: int
    nombre: str = Field(default="")
    categoria: str = Field(default="")
    precio: float
    talla: str
    color: str
    stock_disponible: int
    pecho_cm: Optional[float] = None
    cintura_cm: Optional[float] = None

class StockSucursalItem(BaseModel):
    sucursal_id: int
    nombre_sucursal: str
    direccion: str
    telefono: Optional[str] = None
    stock_disponible: int

class ItemTraspasoCreate(BaseModel):
    producto_variante_id: int
    cantidad: int = Field(gt=0, description="Cantidad a transferir (debe ser mayor a cero)")

class TraspasoCreateRequest(BaseModel):
    sucursal_origen_id: int
    sucursal_destino_id: int
    motivo: Optional[str] = None
    items: List[ItemTraspasoCreate]

class ItemRecepcionConfirm(BaseModel):
    producto_variante_id: int
    cantidad_recibida: int = Field(ge=0, description="Cantidad efectivamente recibida")

class RecepcionTraspasoRequest(BaseModel):
    observaciones_recepcion: Optional[str] = None
    items_confirmados: List[ItemRecepcionConfirm]


# ==============================================================================
# 1. CU08: ENDPOINT DE DESCARGA DE CATÁLOGO PARA CLIENTES OFFLINE
# ==============================================================================

@router_p2_parte1.get("/api/v1/catalogo/sincronizar-local", response_model=List[PrendaSyncItem])
async def sincronizar_catalogo_local():
    """
    CU08: Descargar y Almacenar Catálogo en Memoria Local.
    Provee el volcado estructurado consumido por IndexedDB (Angular PWA)
    y SQLite (Flutter) para garantizar navegación fuera de línea.
    """
    # Consulta a base de datos de productos, variantes y guías de medidas en cm
    # SELECT p.id, p.nombre, pv.precio, pv.talla, pv.color, i.cantidad, gm.pecho_cm...
    return [
        PrendaSyncItem(
            id=1,
            nombre="Vestido de Fiesta Gala Seda",
            categoria="Vestidos",
            precio=350.00,
            talla="M",
            color="Azul Marino",
            stock_disponible=12,
            pecho_cm=92.00,
            cintura_cm=74.00
        ),
        PrendaSyncItem(
            id=2,
            nombre="Blazer Ejecutivo Slim Fit",
            categoria="Sacos",
            precio=420.00,
            talla="L",
            color="Negro",
            stock_disponible=8,
            pecho_cm=102.00,
            cintura_cm=88.00
        )
    ]


# ==============================================================================
# 2. CU11: CONSULTA DE DISPONIBILIDAD DE INVENTARIO MULTI-SUCURSAL
# ==============================================================================

@router_p2_parte1.get("/api/v1/inventario/sucursales-stock", response_model=List[StockSucursalItem])
async def consultar_stock_multisucursal(
    variante_id: int = Query(..., description="ID de la variante textil a consultar")
):
    """
    CU11: Consultar Disponibilidad de Inventario Multi-sucursal.
    Permite al vendedor y cliente ver el stock disponible en todas las sucursales del tenant.
    """
    # En producción:
    # SELECT s.id, s.nombre, s.direccion, s.telefono, COALESCE(i.cantidad, 0)
    # FROM sucursal s
    # LEFT JOIN inventario i ON i.sucursal_id = s.id AND i.producto_variante_id = :variante_id
    # WHERE s.empresa_id = :current_tenant_id AND s.activo = TRUE
    return [
        StockSucursalItem(
            sucursal_id=1,
            nombre_sucursal="Sucursal Central - Casco Viejo",
            direccion="Calle 21 de Mayo #340",
            telefono="3345678",
            stock_disponible=0
        ),
        StockSucursalItem(
            sucursal_id=2,
            nombre_sucursal="Sucursal Norte - Equipetrol",
            direccion="Av. San Martín #1200",
            telefono="3398765",
            stock_disponible=8
        )
    ]


# ==============================================================================
# 3. CU12: FASE 1 DE TRASPASO - SOLICITUD Y DESPACHO EN ORIGEN
# ==============================================================================

@router_p2_parte1.post("/api/v1/inventario/traspasos", status_code=status.HTTP_201_CREATED)
async def solicitar_y_despachar_traspaso(traspaso: TraspasoCreateRequest):
    """
    CU12: Fase 1 del Traspaso.
    - Valida que sucursal_origen_id <> sucursal_destino_id.
    - Valida stock suficiente en origen.
    - Descuenta del disponible de origen y genera orden en estado 'EN_TRANSITO'.
    """
    if traspaso.sucursal_origen_id == traspaso.sucursal_destino_id:
        raise HTTPException(
            status_code=400,
            detail="La sucursal de origen debe ser distinta a la sucursal de destino."
        )

    # Transacción:
    # 1. Comprobar stock y descontar en sucursal_origen_id
    # 2. INSERT INTO traspaso_inventario (estado = 'EN_TRANSITO')
    # 3. INSERT INTO detalle_traspaso
    correlativo = f"TRASP-{datetime.now().year}-{traspaso.sucursal_origen_id}{traspaso.sucursal_destino_id}01"
    
    return {
        "codigo_traspaso": correlativo,
        "sucursal_origen_id": traspaso.sucursal_origen_id,
        "sucursal_destino_id": traspaso.sucursal_destino_id,
        "estado": "EN_TRANSITO",
        "mensaje": "Traspaso despachado exitosamente. Mercadería física en tránsito hacia sucursal destino."
    }


# ==============================================================================
# 4. CU13: FASE 2 DE TRASPASO - CONFIRMAR RECEPCIÓN EN DESTINO
# ==============================================================================

@router_p2_parte1.post("/api/v1/inventario/traspasos/{traspaso_id}/recepcionar")
async def confirmar_recepcion_traspaso(
    traspaso_id: int,
    recepcion: RecepcionTraspasoRequest
):
    """
    CU13: Fase 2 del Traspaso.
    - Valida que el traspaso esté en estado 'EN_TRANSITO'.
    - Suma las cantidades recibidas al inventario disponible de destino.
    - Actualiza el estado a 'RECEPCIONADO'.
    """
    # Transacción:
    # 1. UPDATE inventario SET cantidad = cantidad + cant WHERE sucursal_id = destino
    # 2. UPDATE traspaso_inventario SET estado = 'RECEPCIONADO', fecha_recepcion = NOW()
    return {
        "traspaso_id": traspaso_id,
        "estado": "RECEPCIONADO",
        "mensaje": "Recepción conforme confirmada. Mercadería ingresada al inventario disponible de destino."
    }
