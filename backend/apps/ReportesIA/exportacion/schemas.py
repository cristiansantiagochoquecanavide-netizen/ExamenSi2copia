# ==============================================================================
# SUBSISTEMA: ReportesIA -> exportacion
# CASO DE USO: CU22 - Exportación Dinámica a PDF y Excel
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.analitica_ia.schemas import *
except ImportError:
    pass
