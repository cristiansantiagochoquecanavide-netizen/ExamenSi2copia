# ==============================================================================
# SUBSISTEMA: GestionReservas -> trazabilidad
# CASO DE USO: CU25 - Trazabilidad y Ciclo de Vida de Reservas
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from apps.GestionReservas.routers import *
except ImportError:
    pass
