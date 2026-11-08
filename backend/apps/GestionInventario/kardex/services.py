# ==============================================================================
# SUBSISTEMA: GestionInventario -> kardex
# CASO DE USO: KARDEX - Movimientos y Kardex Físico-Valorado
# CAPA MVC: [SERVICIO / LÓGICA DE NEGOCIO]
# ==============================================================================
try:
    from apps.GestionInventario.services import *
except ImportError:
    pass
