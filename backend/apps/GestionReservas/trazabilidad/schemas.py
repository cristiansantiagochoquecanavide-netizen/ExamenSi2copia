# ==============================================================================
# SUBSISTEMA: GestionReservas -> trazabilidad
# CASO DE USO: CU25 - Trazabilidad y Ciclo de Vida de Reservas
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.reservas.schemas import *
except ImportError:
    pass
