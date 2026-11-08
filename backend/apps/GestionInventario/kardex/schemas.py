# ==============================================================================
# SUBSISTEMA: GestionInventario -> kardex
# CASO DE USO: KARDEX - Movimientos y Kardex Físico-Valorado
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.inventario.schemas import *
except ImportError:
    pass
