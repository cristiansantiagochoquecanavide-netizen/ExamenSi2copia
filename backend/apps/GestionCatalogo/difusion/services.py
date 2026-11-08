# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> difusion
# CASO DE USO: CU09 - Difusión de Novedades y Campañas Omnicanal
# CAPA MVC: [SERVICIO / LÓGICA DE NEGOCIO]
# ==============================================================================
try:
    from app.domains.catalogo.services import *
except ImportError:
    pass
