# ==============================================================================
# SUBSISTEMA: UsuariosSeguridad -> autenticacion
# CASO DE USO: CU05 - Autenticación y Contexto Multitenant
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from apps.UsuariosSeguridad.routers import *
except ImportError:
    pass
