# ==============================================================================
# SUBSISTEMA: GestionVentas -> pagos
# CASO DE USO: CU20 - Pasarelas de Pago Digital y Monitoreo
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.ventas.schemas import *
except ImportError:
    pass
