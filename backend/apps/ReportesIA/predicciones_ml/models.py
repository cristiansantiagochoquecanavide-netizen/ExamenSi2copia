# ==============================================================================
# SUBSISTEMA: ReportesIA -> predicciones_ml
# CASO DE USO: CU23_24 - Machine Learning y Dashboard Predictivo
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.analitica_ia.models import *
except ImportError:
    pass
