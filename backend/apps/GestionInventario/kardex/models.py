# ==============================================================================
# SUBSISTEMA: GestionInventario -> kardex
# CASO DE USO: KARDEX - Movimientos y Kardex Físico-Valorado
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.inventario.models import *
except ImportError:
    pass
