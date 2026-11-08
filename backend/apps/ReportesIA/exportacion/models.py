# ==============================================================================
# SUBSISTEMA: ReportesIA -> exportacion
# CASO DE USO: CU22 - Exportación Dinámica a PDF y Excel
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.analitica_ia.models import *
except ImportError:
    pass
