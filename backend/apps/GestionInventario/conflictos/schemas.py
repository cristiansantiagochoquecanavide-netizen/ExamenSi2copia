# ==============================================================================
# SUBSISTEMA: GestionInventario -> conflictos
# CASO DE USO: CU17 - Arbitraje de Conflictos de Inventario
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.sincronizacion.schemas import *
except ImportError:
    pass
