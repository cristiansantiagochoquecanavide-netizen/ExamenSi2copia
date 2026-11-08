# ==============================================================================
# SUBSISTEMA: GestionVentas -> devoluciones
# CASO DE USO: CU18_19_20 - Políticas, Solicitud y Nota de Devolución
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.ventas.routers import *
except ImportError:
    pass
