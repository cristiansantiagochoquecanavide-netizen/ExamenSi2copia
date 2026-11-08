# ==============================================================================
# SUBSISTEMA: GestionInventario -> conflictos
# CASO DE USO: CU17 - Arbitraje de Conflictos de Inventario
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.sincronizacion.routers import *
except ImportError:
    pass
