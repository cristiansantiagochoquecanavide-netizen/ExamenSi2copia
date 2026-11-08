# ==============================================================================
# SUBSISTEMA: UsuariosSeguridad -> bitacora
# CASO DE USO: AUDITORIA - Bitácora Inmutable de Auditoría
# CAPA MVC: [DTO / SCHEMAS PYDANTIC]
# ==============================================================================
try:
    from app.domains.usuarios.schemas import *
except ImportError:
    pass
