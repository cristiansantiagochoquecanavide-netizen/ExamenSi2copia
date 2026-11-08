# ==============================================================================
# SUBSISTEMA: ReportesIA -> asistente_ia
# CASO DE USO: CU21 - Consultas por Lenguaje Natural con Gemini
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.analitica_ia.schemas import *
except ImportError:
    pass
