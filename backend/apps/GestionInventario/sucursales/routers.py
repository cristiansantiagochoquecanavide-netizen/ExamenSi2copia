# ==============================================================================
# SUBSISTEMA: GestionInventario -> sucursales
# CASO DE USO: CU04 - Administrar Sucursales con Control de Límites
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.inventario.routers import *
except ImportError:
    pass
