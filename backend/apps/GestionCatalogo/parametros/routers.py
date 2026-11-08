# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> parametros
# CASO DE USO: CU05 - Tallas, Colores, Categorías y Temporadas
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from apps.GestionCatalogo.routers import *
except ImportError:
    pass
