# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> prendas
# CASO DE USO: CU06 - Catálogo de Prendas y Guía de Medidas
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.catalogo.routers import *
except ImportError:
    pass
