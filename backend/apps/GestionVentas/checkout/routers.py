# ==============================================================================
# SUBSISTEMA: GestionVentas -> checkout
# CASO DE USO: CU17 - Checkout E-Commerce y Despachos
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.ventas.routers import *
except ImportError:
    pass
