# ==============================================================================
# SUBSISTEMA: UsuariosSeguridad -> bitacora
# CASO DE USO: AUDITORIA - Bitácora Inmutable de Auditoría
# CAPA MVC: [SERVICIO / LÓGICA DE NEGOCIO]
# ==============================================================================
try:
    from app.domains.usuarios.services import *
except ImportError:
    pass
