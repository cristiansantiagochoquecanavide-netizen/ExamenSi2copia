# ==============================================================================
# SUBSISTEMA: GestionInventario -> sucursales
# CASO DE USO: CU04 - Administrar Sucursales con Control de Límites
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.inventario.models import *
except ImportError:
    pass
