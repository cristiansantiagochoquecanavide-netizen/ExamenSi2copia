# ==============================================================================
# SUBSISTEMA: GestionSaas -> planes
# CASO DE USO: CU01 - Administrar Planes de Suscripción
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from apps.GestionSaas.routers import *
except ImportError:
    pass
