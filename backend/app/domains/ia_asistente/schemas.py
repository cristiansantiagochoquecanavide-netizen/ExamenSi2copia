"""Esquemas Pydantic para el dominio de Inteligencia Artificial y Recomendaciones."""
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class BaseIaasistenteSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

class IaasistenteStatusResponse(BaseModel):
    domain: str = "ia_asistente"
    status: str = "active"
    message: str = "Dominio Inteligencia Artificial y Recomendaciones operativo"
