# ==============================================================================
# SUBSISTEMA: GestionInventario -> conflictos
# CASO DE USO: CU17 - Arbitraje de Conflictos de Inventario
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from apps.GestionVentas.sincronizacion.models import *
except ImportError:
    pass
