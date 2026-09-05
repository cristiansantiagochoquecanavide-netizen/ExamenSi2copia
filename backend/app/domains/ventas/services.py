"""Capa de Servicio (Logica de Negocio) para el dominio de Ventas y Pagos."""
from sqlalchemy.ext.asyncio import AsyncSession

class VentasService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_status(self) -> dict:
        """Retorna el estado operativo del servicio del dominio."""
        return {
            "domain": "ventas",
            "status": "ready",
            "description": "Ventas presenciales POS, compras digitales web/movil, pasarelas de pago y comprobantes"
        }
