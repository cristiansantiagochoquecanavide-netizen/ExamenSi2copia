# ==============================================================================
# SUBSISTEMA: GestionSaas -> empresas
# CASO DE USO: CU02 - Registrar Empresa Contratante (Tenant)
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.saas.models import *
except ImportError:
    pass
