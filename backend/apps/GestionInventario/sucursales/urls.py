# ==============================================================================
# ALIAS ESTILO DJANGO: urls.py -> routers.py
# SUBSISTEMA: GestionInventario -> sucursales
# ==============================================================================
from .routers import router
urlpatterns = [router]
