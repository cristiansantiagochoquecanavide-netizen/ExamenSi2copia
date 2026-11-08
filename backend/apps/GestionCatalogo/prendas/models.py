# ==============================================================================
# SUBSISTEMA: GestionCatalogo -> prendas
# CASO DE USO: CU06 - Catálogo de Prendas y Guía de Medidas
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.catalogo.models import *
except ImportError:
    pass
