# ==============================================================================
# SUBSISTEMA: GestionInventario -> kardex
# CASO DE USO: KARDEX - Movimientos y Kardex Físico-Valorado
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.inventario.routers import *
except ImportError:
    pass
