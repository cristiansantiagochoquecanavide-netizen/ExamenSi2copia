# ==============================================================================
# SUBSISTEMA: UsuariosSeguridad -> usuarios
# CASO DE USO: USUARIOS - Administración de Usuarios y Personal
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.usuarios.models import *
except ImportError:
    pass
