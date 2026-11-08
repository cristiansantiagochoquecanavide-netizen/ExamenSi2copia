# ==============================================================================
# ALIAS ESTILO DJANGO: urls.py -> routers.py
# SUBSISTEMA: GestionCatalogo -> offline_sync
# ==============================================================================
from .routers import router
urlpatterns = [router]
