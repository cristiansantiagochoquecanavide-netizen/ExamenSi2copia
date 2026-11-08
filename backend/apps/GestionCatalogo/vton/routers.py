# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> vton
# CASO DE USO: CU07 - Catálogo Multidimensional y Probador Virtual AR
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.catalogo.routers import *
except ImportError:
    pass
