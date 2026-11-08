# ==============================================================================
# SUBSISTEMA: GestionInventario -> stock
# CASO DE USO: CU10_11 - Existencias y Consulta Multi-sucursal
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.inventario.routers import *
except ImportError:
    pass
