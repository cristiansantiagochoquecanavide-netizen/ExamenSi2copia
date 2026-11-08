# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> difusion
# CASO DE USO: CU09 - Difusión de Novedades y Campañas Omnicanal
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.catalogo.routers import *
except ImportError:
    pass
