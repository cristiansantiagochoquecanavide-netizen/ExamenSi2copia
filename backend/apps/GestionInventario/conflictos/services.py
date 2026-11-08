# ==============================================================================
# SUBSISTEMA: GestionInventario -> conflictos
# CASO DE USO: CU17 - Arbitraje de Conflictos de Inventario
# CAPA MVC: [SERVICIO / LÓGICA DE NEGOCIO]
# ==============================================================================
try:
    from app.domains.sincronizacion.services import *
except ImportError:
    pass
