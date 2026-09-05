"""Capa de Servicio (Logica de Negocio) para el dominio de Reservas en Tienda Fisica."""
from sqlalchemy.ext.asyncio import AsyncSession

class ReservasService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_status(self) -> dict:
        """Retorna el estado operativo del servicio del dominio."""
        return {
            "domain": "reservas",
            "status": "ready",
            "description": "Agendamiento de prendas para prueba fisica en vestidores de sucursales"
        }
