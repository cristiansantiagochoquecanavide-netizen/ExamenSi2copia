# ==============================================================================
# SUBSISTEMA: UsuariosSeguridad -> roles
# CASO DE USO: RBAC - Roles y Permisos del Sistema
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from apps.UsuariosSeguridad.models import *
except ImportError:
    pass
