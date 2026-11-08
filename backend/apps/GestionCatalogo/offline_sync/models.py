# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> offline_sync
# CASO DE USO: CU08 - Sincronización de Catálogo Local
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from apps.GestionCatalogo.models import *
except ImportError:
    pass
