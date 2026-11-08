# ==============================================================================
# SUBSISTEMA: UsuariosSeguridad -> roles
# CASO DE USO: RBAC - Roles y Permisos del Sistema
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.usuarios.routers import *
except ImportError:
    pass
