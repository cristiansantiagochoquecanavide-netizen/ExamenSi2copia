# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> offline_sync
# CASO DE USO: CU08 - Sincronización de Catálogo Local
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.catalogo.models import *
except ImportError:
    pass
