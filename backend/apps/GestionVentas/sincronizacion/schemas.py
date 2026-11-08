"""Esquemas Pydantic para el Dominio de Sincronización Offline e Idempotencia (CU16 y CU17)."""
from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class OfflineTransaction(BaseModel):
    uuid_operacion: str = Field(..., description="UUIDv4 generado por la terminal offline")
    tipo_operacion: str = Field(..., description="Tipo de operación: VENTA_LOCAL o RESERVA_LOCAL")
    fecha_registro_local: datetime = Field(..., description="Timestamp UTC del registro en el cliente")
    payload_json: Dict[str, Any] = Field(..., description="Cuerpo JSON de la transacción")


class LoteSincronizacionRequest(BaseModel):
    lote: List[OfflineTransaction] = Field(..., description="Lote de transacciones offline acumuladas")


class SincronizacionResultadoItem(BaseModel):
    uuid_operacion: str
    tipo_operacion: str
    estado: str  # SINCRONIZADO, DUPLICADO_IDEMPOTENTE, CONFLICTO_STOCK, ERROR
    mensaje: str
    codigo_referencia: Optional[str] = None


class SincronizacionBatchResponse(BaseModel):
    total_recibidos: int
    procesados_exitosamente: int
    duplicados_idempotentes: int
    conflictos_stock: int
    errores: int
    resultados: List[SincronizacionResultadoItem]


# Esquemas para CU17: Arbitraje y Resolución de Conflictos de Inventario
class ConflictoInventarioResponse(BaseModel):
    id: int
    sincronizacion_id: int
    uuid_operacion: Optional[str] = None
    sucursal_id: int
    sucursal_nombre: Optional[str] = None
    producto_variante_id: int
    prenda_nombre: Optional[str] = None
    talla: Optional[str] = None
    color: Optional[str] = None
    cantidad_solicitada: int
    stock_disponible_servidor: int
    estado_resolucion: str
    fecha_deteccion: datetime
    fecha_resolucion: Optional[datetime] = None
    resuelto_por_usuario_id: Optional[int] = None

    class Config:
        from_attributes = True


class ResolverConflictoRequest(BaseModel):
    accion: str = Field(
        ...,
        description="Estrategia: TRASPASO_INMEDIATO, ADMITIR_SALDO_NEGATIVO, ANULAR_VENTA"
    )
    observaciones: str = Field(..., min_length=5, description="Justificación técnica de la conciliación")
    sucursal_proveedora_id: Optional[int] = Field(None, description="Sucursal de origen para TRASPASO_INMEDIATO")
