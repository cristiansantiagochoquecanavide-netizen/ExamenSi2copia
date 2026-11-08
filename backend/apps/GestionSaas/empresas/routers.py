# ==============================================================================
# SUBSISTEMA: GestionSaas -> empresas
# CASO DE USO: CU02 - Registrar Empresa Contratante (Tenant)
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.saas.routers import *
except ImportError:
    pass
