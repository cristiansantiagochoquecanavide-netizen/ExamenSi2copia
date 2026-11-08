# ==============================================================================
# ALIAS ESTILO DJANGO: urls.py -> routers.py
# SUBSISTEMA: GestionInventario -> stock
# ==============================================================================
from .routers import router
urlpatterns = [router]
