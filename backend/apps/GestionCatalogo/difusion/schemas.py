from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field


class NotificacionBase(BaseModel):
    titulo: str = Field(..., max_length=200, description="Título visible de la notificación o alerta")
    mensaje: str = Field(..., description="Cuerpo del mensaje o detalle de la alerta")
    tipo: str = Field(
        ...,
        description="Tipo de alerta: RESERVA_PROBADOR, ESTADO_PEDIDO, PROMOCION, RECOMENDACION_IA, ALERTA_STOCK, SISTEMA"
    )
    canal: str = Field(default="TODOS", description="Canal de entrega: PUSH, IN_APP, TODOS")
    prioridad: str = Field(default="NORMAL", description="Prioridad: BAJA, NORMAL, ALTA, URGENTE")
    data_extra: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Metadata auxiliar (IDs, deep links, etc.)")


class NotificacionCreate(NotificacionBase):
    usuario_id: Optional[int] = Field(default=None, description="ID del usuario destino (None = emisión global / broadcast)")


class NotificacionResponse(NotificacionBase):
    id: int
    usuario_id: Optional[int] = None
    leida: bool = False
    fecha_leida: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificacionResumenResponse(BaseModel):
    total_no_leidas: int
    ultimas: List[NotificacionResponse]


class DispositivoSuscripcionCreate(BaseModel):
    token_dispositivo: str = Field(..., max_length=500, description="FCM device token o Web Push Subscription identifier")
    plataforma: str = Field(default="WEB", description="Plataforma de origen: WEB, ANDROID, IOS")


class DispositivoSuscripcionResponse(BaseModel):
    id: int
    usuario_id: Optional[int] = None
    token_dispositivo: str
    plataforma: str
    activo: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmitirAlertaTestRequest(BaseModel):
    tipo: str = Field(
        default="RECOMENDACION_IA",
        description="Tipo: RECOMENDACION_IA, RESERVA_PROBADOR, ESTADO_PEDIDO, PROMOCION, ALERTA_STOCK"
    )
    usuario_id: Optional[int] = None
    custom_title: Optional[str] = None
    custom_message: Optional[str] = None
    data_extra: Optional[Dict[str, Any]] = None
