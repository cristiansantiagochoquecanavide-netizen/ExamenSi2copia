# ==============================================================================
# SUBSISTEMA: UsuariosSeguridad -> bitacora
# CASO DE USO: AUDITORIA - Bitácora Inmutable de Auditoría
# CAPA MVC: [CONTROLADOR / ROUTER FASTAPI]
# ==============================================================================
try:
    from apps.UsuariosSeguridad.routers import *
except ImportError:
    pass
