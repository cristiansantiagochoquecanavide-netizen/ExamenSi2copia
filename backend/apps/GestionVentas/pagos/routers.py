# ==============================================================================
# SUBSISTEMA: GestionVentas -> pagos
# CASO DE USO: CU20 - Pasarelas de Pago Digital y Monitoreo
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.ventas.routers import *
except ImportError:
    pass
