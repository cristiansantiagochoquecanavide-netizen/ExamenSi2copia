# ==============================================================================
# SUBSISTEMA: GestionReservas -> trazabilidad
# CASO DE USO: CU25 - Trazabilidad y Ciclo de Vida de Reservas
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.reservas.models import *
except ImportError:
    pass
