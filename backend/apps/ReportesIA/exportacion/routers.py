# ==============================================================================
# SUBSISTEMA: ReportesIA -> exportacion
# CASO DE USO: CU22 - Exportación Dinámica a PDF y Excel
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.analitica_ia.routers import *
except ImportError:
    pass
