# ==============================================================================
# SUBSISTEMA: GestionSaas -> empresas
# CASO DE USO: CU02 - Registrar Empresa Contratante (Tenant)
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.saas.schemas import *
except ImportError:
    pass
