# ==============================================================================
# SUBSISTEMA: ReportesIA -> predicciones_ml
# CASO DE USO: CU23_24 - Machine Learning y Dashboard Predictivo
# CAPA MVC: [SERVICIO / LÓGICA DE NEGOCIO]
# ==============================================================================
try:
    from apps.ReportesIA.services import *
except ImportError:
    pass
