# ==============================================================================
# SUBSISTEMA: GestionReservas -> probadores
# CASO DE USO: CU14 - Reservas de Prendas para Probador en Boutique
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from apps.GestionReservas.routers import *
except ImportError:
    pass
