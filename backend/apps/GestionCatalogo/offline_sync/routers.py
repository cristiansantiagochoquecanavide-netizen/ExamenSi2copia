# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> offline_sync
# CASO DE USO: CU08 - Sincronización de Catálogo Local
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.catalogo.routers import *
except ImportError:
    pass
