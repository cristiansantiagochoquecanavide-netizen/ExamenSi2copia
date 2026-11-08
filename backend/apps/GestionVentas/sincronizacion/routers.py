# ==============================================================================
# SUBSISTEMA: GestionVentas -> sincronizacion
# CASO DE USO: CU16 - Sincronización de Operaciones Offline
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.sincronizacion.routers import *
except ImportError:
    pass
