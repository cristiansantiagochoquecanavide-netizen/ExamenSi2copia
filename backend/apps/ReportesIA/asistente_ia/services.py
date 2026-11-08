# ==============================================================================
# SUBSISTEMA: ReportesIA -> asistente_ia
# CASO DE USO: CU21 - Consultas por Lenguaje Natural con Gemini
# CAPA MVC: [SERVICIO / LÓGICA DE NEGOCIO]
# ==============================================================================
try:
    from app.domains.analitica_ia.services import *
except ImportError:
    pass
