# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> prendas
# CASO DE USO: CU06 - Catálogo de Prendas y Guía de Medidas
# CAPA MVC: [SERVICIO / LÓGICA DE NEGOCIO]
# ==============================================================================
try:
    from app.domains.catalogo.services import *
except ImportError:
    pass
