"""Esquemas Pydantic para el dominio de Ventas y Pagos."""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class BaseVentasSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class VentasStatusResponse(BaseModel):
    domain: str = "ventas"
    status: str = "active"
    message: str = "Dominio Ventas y Pagos operativo"
