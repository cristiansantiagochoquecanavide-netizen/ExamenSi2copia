# ==============================================================================
# SUBSISTEMA: GestionSaas -> empresas
# CASO DE USO: CU02 - Registrar Empresa Contratante (Tenant)
# CAPA MVC: [SERVICIO / LÓGICA DE NEGOCIO]
# ==============================================================================
try:
    from app.domains.saas.services import *
except ImportError:
    pass
