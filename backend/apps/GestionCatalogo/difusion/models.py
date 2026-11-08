# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> difusion
# CASO DE USO: CU09 - Difusión de Novedades y Campañas Omnicanal
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.catalogo.models import *
except ImportError:
    pass
