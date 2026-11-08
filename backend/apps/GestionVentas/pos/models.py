# ==============================================================================
# SUBSISTEMA: GestionVentas -> pos
# CASO DE USO: CU15 - Venta Presencial POS / Contado Offline
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.ventas.models import *
except ImportError:
    pass
