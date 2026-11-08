# ==============================================================================
# SUBSISTEMA: GestionVentas -> pagos
# CASO DE USO: CU20 - Pasarelas de Pago Digital y Monitoreo
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.ventas.models import *
except ImportError:
    pass
