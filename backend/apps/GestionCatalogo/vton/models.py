# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> vton
# CASO DE USO: CU07 - Catálogo Multidimensional y Probador Virtual AR
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.catalogo.models import *
except ImportError:
    pass
