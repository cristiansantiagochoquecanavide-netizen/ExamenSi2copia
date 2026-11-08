# ==============================================================================
# SUBSISTEMA: GestionVentas -> pos
# CASO DE USO: CU15 - Venta Presencial POS / Contado Offline
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from apps.GestionVentas.routers import *
except ImportError:
    pass
