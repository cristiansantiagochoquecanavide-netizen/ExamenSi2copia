# ==============================================================================
# SUBSISTEMA: UsuariosSeguridad -> roles
# CASO DE USO: RBAC - Roles y Permisos del Sistema
# CAPA MVC: [SERVICIO / LÓGICA DE NEGOCIO]
# ==============================================================================
try:
    from apps.UsuariosSeguridad.services import *
except ImportError:
    pass
