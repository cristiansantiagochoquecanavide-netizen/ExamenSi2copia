# ==============================================================================
# SUBSISTEMA: GestionInventario -> transferencias
# CASO DE USO: CU12_13 - Traspasos y Confirmación de Stock
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.inventario.schemas import *
except ImportError:
    pass
