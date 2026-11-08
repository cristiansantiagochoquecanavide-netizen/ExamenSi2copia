# ==============================================================================
# SUBSISTEMA: GestionReservas -> trazabilidad
# CASO DE USO: CU25 - Trazabilidad y Ciclo de Vida de Reservas
# CAPA MVC: [SERVICIO / LÓGICA DE NEGOCIO]
# ==============================================================================
try:
    from app.domains.reservas.services import *
except ImportError:
    pass
