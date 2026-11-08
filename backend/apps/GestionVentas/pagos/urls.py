# ==============================================================================
# ALIAS ESTILO DJANGO: urls.py -> routers.py
# SUBSISTEMA: GestionVentas -> pagos
# ==============================================================================
from .routers import router
urlpatterns = [router]
