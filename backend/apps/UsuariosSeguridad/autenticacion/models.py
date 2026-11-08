# ==============================================================================
# SUBSISTEMA: UsuariosSeguridad -> autenticacion
# CASO DE USO: CU05 - Autenticación y Contexto Multitenant
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from apps.UsuariosSeguridad.models import *
except ImportError:
    pass
