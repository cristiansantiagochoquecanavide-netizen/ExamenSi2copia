# ==============================================================================
# SUBSISTEMA: UsuariosSeguridad -> roles
# CASO DE USO: RBAC - Roles y Permisos del Sistema
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.usuarios.models import *
except ImportError:
    pass
