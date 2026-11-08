# ==============================================================================
# ALIAS ESTILO DJANGO: urls.py -> routers.py
# SUBSISTEMA: GestionVentas -> pos
# ==============================================================================
from .routers import router
urlpatterns = [router]
