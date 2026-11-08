# ==============================================================================
# SUBSISTEMA: UsuariosSeguridad -> bitacora
# CASO DE USO: AUDITORIA - Bitácora Inmutable de Auditoría
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from app.domains.usuarios.routers import *
except ImportError:
    pass
