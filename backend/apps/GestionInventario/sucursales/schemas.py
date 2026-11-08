# ==============================================================================
# SUBSISTEMA: GestionInventario -> sucursales
# CASO DE USO: CU04 - Administrar Sucursales con Control de Límites
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.inventario.schemas import *
except ImportError:
    pass
