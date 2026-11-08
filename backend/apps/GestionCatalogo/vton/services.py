# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> vton
# CASO DE USO: CU07 - Catálogo Multidimensional y Probador Virtual AR
# CAPA MVC: [SERVICIO / LÓGICA DE NEGOCIO]
# ==============================================================================
try:
    from apps.GestionCatalogo.services import *
except ImportError:
    pass
