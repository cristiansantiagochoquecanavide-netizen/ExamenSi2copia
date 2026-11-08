# ==============================================================================
# SUBSISTEMA: GestionVentas -> checkout
# CASO DE USO: CU17 - Checkout E-Commerce y Despachos
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.ventas.models import *
except ImportError:
    pass
