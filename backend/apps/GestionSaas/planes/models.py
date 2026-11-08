# ==============================================================================
# SUBSISTEMA: GestionSaas -> planes
# CASO DE USO: CU01 - Administrar Planes de Suscripción
# CAPA MVC: [MODELO DE BASE DE DATOS / ORM]
# ==============================================================================
try:
    from app.domains.saas.models import *
except ImportError:
    pass
