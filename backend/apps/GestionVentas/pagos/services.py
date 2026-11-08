# ==============================================================================
# SUBSISTEMA: GestionVentas -> pagos
# CASO DE USO: CU20 - Pasarelas de Pago Digital y Monitoreo
# CAPA MVC: [SERVICIO / LÓGICA DE NEGOCIO]
# ==============================================================================
try:
    from app.domains.ventas.services import *
except ImportError:
    pass
