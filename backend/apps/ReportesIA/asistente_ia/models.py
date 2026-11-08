# ==============================================================================
# SUBSISTEMA: ReportesIA -> asistente_ia
# CASO DE USO: CU21 - Consultas por Lenguaje Natural con Gemini
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.analitica_ia.models import *
except ImportError:
    pass
