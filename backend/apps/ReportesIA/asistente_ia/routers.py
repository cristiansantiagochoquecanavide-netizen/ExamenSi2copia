# ==============================================================================
# SUBSISTEMA: ReportesIA -> asistente_ia
# CASO DE USO: CU21 - Consultas por Lenguaje Natural con Gemini
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.analitica_ia.routers import *
except ImportError:
    pass
