# ==============================================================================
# SUBSISTEMA: ReportesIA -> exportacion
# CASO DE USO: CU22 - Exportación Dinámica a PDF y Excel
# CAPA MVC: [SERVICIO / LÓGICA DE NEGOCIO]
# ==============================================================================
try:
    from app.domains.analitica_ia.services import *
except ImportError:
    pass
