# ==============================================================================
# SUBSISTEMA: GestionInventario -> transferencias
# CASO DE USO: CU12_13 - Traspasos y Confirmación de Stock
# CAPA MVC: [SERVICIO / LÓGICA DE NEGOCIO]
# ==============================================================================
try:
    from app.domains.inventario.services import *
except ImportError:
    pass
