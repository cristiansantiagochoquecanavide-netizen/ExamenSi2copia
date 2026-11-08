# ==============================================================================
# SUBSISTEMA: GestionSaas -> empresas
# CASO DE USO: CU02 - Registrar Empresa Contratante (Tenant)
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from apps.GestionSaas.routers import *
except ImportError:
    pass
