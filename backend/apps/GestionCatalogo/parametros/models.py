# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> parametros
# CASO DE USO: CU05 - Tallas, Colores, Categorías y Temporadas
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.catalogo.models import *
except ImportError:
    pass
