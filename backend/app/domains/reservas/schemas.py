"""Esquemas Pydantic para el dominio de Reservas en Tienda Fisica."""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class BaseReservasSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class ReservasStatusResponse(BaseModel):
    domain: str = "reservas"
    status: str = "active"
    message: str = "Dominio Reservas en Tienda Fisica operativo"
