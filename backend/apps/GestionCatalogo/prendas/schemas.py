# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> prendas
# CASO DE USO: CU06 - Catálogo de Prendas y Guía de Medidas
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.catalogo.schemas import *
except ImportError:
    pass
