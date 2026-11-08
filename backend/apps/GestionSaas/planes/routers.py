# ==============================================================================
# SUBSISTEMA: GestionSaas -> planes
# CASO DE USO: CU01 - Administrar Planes de Suscripción
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.saas.routers import *
except ImportError:
    pass
