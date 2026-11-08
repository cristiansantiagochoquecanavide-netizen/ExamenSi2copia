# ==============================================================================
# SUBSISTEMA: ReportesIA -> predicciones_ml
# CASO DE USO: CU23_24 - Machine Learning y Dashboard Predictivo
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from apps.ReportesIA.routers import *
except ImportError:
    pass
