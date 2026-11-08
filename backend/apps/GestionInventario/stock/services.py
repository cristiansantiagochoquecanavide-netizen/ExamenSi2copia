# ==============================================================================
# SUBSISTEMA: GestionInventario -> stock
# CASO DE USO: CU10_11 - Existencias y Consulta Multi-sucursal
# CAPA MVC: [SERVICIO / LÓGICA DE NEGOCIO]
# ==============================================================================
try:
    from apps.GestionInventario.services import *
except ImportError:
    pass
