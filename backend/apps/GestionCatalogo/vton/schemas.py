# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> vton
# CASO DE USO: CU07 - Catálogo Multidimensional y Probador Virtual AR
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.catalogo.schemas import *
except ImportError:
    pass
