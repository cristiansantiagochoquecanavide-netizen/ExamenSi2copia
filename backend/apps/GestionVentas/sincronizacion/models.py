# ==============================================================================
# SUBSISTEMA: GestionVentas -> sincronizacion
# CASO DE USO: CU16 - Sincronización de Operaciones Offline
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.sincronizacion.models import *
except ImportError:
    pass
