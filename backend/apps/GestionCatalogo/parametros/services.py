# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> parametros
# CASO DE USO: CU05 - Tallas, Colores, Categorías y Temporadas
# CAPA MVC: [SERVICIO / LÓGICA DE NEGOCIO]
# ==============================================================================
try:
    from app.domains.catalogo.services import *
except ImportError:
    pass
