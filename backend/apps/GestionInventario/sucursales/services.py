# ==============================================================================
# SUBSISTEMA: GestionInventario -> sucursales
# CASO DE USO: CU04 - Administrar Sucursales con Control de Límites
# CAPA MVC: [SERVICIO / LÓGICA DE NEGOCIO]
# ==============================================================================
try:
    from app.domains.inventario.services import *
except ImportError:
    pass
