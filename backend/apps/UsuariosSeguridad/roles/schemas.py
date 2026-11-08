# ==============================================================================
# SUBSISTEMA: UsuariosSeguridad -> roles
# CASO DE USO: RBAC - Roles y Permisos del Sistema
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.usuarios.schemas import *
except ImportError:
    pass
