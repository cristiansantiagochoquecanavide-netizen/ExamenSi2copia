# ==============================================================================
# SUBSISTEMA: GestionInventario -> sucursales
# CASO DE USO: CU04 - Administrar Sucursales con Control de Límites
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from apps.GestionInventario.routers import *
except ImportError:
    pass
