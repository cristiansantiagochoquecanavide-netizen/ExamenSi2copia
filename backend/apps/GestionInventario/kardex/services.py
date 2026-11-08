# ==============================================================================
# SUBSISTEMA: GestionInventario -> kardex
# CASO DE USO: KARDEX - Movimientos y Kardex Físico-Valorado
# CAPA MVC: [SERVICIO / LÓGICA DE NEGOCIO]
# ==============================================================================
try:
    from app.domains.inventario.services import *
except ImportError:
    pass
