# ==============================================================================
# SUBSISTEMA: GestionReservas -> trazabilidad
# CASO DE USO: CU25 - Trazabilidad y Ciclo de Vida de Reservas
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.reservas.routers import *
except ImportError:
    pass
