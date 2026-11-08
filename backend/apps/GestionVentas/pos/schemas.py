# ==============================================================================
# SUBSISTEMA: GestionVentas -> pos
# CASO DE USO: CU15 - Venta Presencial POS / Contado Offline
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.ventas.schemas import *
except ImportError:
    pass
