# ==============================================================================
# SUBSISTEMA: GestionVentas -> checkout
# CASO DE USO: CU17 - Checkout E-Commerce y Despachos
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.ventas.schemas import *
except ImportError:
    pass
