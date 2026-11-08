# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> offline_sync
# CASO DE USO: CU08 - Sincronización de Catálogo Local
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.catalogo.schemas import *
except ImportError:
    pass
