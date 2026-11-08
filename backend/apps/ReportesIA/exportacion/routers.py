# ==============================================================================
# SUBSISTEMA: ReportesIA -> exportacion
# CASO DE USO: CU22 - Exportación Dinámica a PDF y Excel
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from apps.ReportesIA.routers import *
except ImportError:
    pass
