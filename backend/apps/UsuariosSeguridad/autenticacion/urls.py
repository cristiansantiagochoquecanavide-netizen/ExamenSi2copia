# ==============================================================================
# ALIAS ESTILO DJANGO: urls.py -> routers.py
# SUBSISTEMA: UsuariosSeguridad -> autenticacion
# ==============================================================================
from .routers import router
urlpatterns = [router]
