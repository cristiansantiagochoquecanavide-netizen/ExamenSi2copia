# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> parametros
# CASO DE USO: CU05 - Tallas, Colores, Categorías y Temporadas
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.catalogo.schemas import *
except ImportError:
    pass
