# ==============================================================================
# SUBSISTEMA: GestionInventario -> stock
# CASO DE USO: CU10_11 - Existencias y Consulta Multi-sucursal
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.inventario.schemas import *
except ImportError:
    pass
