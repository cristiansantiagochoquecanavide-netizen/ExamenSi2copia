# ==============================================================================
# SUBSISTEMA: GestionInventario -> stock
# CASO DE USO: CU10_11 - Existencias y Consulta Multi-sucursal
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.inventario.models import *
except ImportError:
    pass
