# ==============================================================================
# SUBSISTEMA: GestionVentas -> pagos
# CASO DE USO: CU20 - Pasarelas de Pago Digital y Monitoreo
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from apps.GestionVentas.routers import *
except ImportError:
    pass
