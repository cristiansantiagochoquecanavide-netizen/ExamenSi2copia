# ==============================================================================
# SUBSISTEMA: UsuariosSeguridad -> bitacora
# CASO DE USO: AUDITORIA - Bitácora Inmutable de Auditoría
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.usuarios.models import *
except ImportError:
    pass
