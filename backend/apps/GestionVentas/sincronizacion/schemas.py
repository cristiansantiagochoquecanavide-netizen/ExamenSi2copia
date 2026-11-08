# ==============================================================================
# SUBSISTEMA: GestionVentas -> sincronizacion
# CASO DE USO: CU16 - Sincronización de Operaciones Offline
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.sincronizacion.schemas import *
except ImportError:
    pass
