# ==============================================================================
# SUBSISTEMA: GestionInventario -> transferencias
# CASO DE USO: CU12_13 - Traspasos y Confirmación de Stock
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.inventario.routers import *
except ImportError:
    pass
