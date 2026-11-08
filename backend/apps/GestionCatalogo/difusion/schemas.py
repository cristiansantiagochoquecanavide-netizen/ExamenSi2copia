# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> difusion
# CASO DE USO: CU09 - Difusión de Novedades y Campañas Omnicanal
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.catalogo.schemas import *
except ImportError:
    pass
