# ==============================================================================
# SUBSISTEMA: GestionReservas -> probadores
# CASO DE USO: CU14 - Reservas de Prendas para Probador en Boutique
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.reservas.routers import *
except ImportError:
    pass
