# ==============================================================================
# SUBSISTEMA: GestionVentas -> pos
# CASO DE USO: CU15 - Venta Presencial POS / Contado Offline
# CAPA MVC: [SERVICIO / LÓGICA DE NEGOCIO]
# ==============================================================================
try:
    from apps.GestionVentas.services import *
except ImportError:
    pass
