# Compatibility shim for legacy imports
import sys

class _LazyLoader:
    def __init__(self, target_module_name):
        self._target = target_module_name

    def __getattr__(self, item):
        import importlib
        mod = importlib.import_module(self._target)
        return getattr(mod, item)

# Register virtual domain modules lazily
for legacy, modern in [
    ('app.core', 'apps.core'),
    ('app.core.config', 'apps.core.config'),
    ('app.core.database', 'apps.core.database'),
    ('app.core.security', 'apps.core.security'),
    ('app.core.tenant', 'apps.core.tenant'),
    ('app.domains.saas', 'apps.GestionSaas'),
    ('app.domains.inventario', 'apps.GestionInventario'),
    ('app.domains.catalogo', 'apps.GestionCatalogo'),
    ('app.domains.reservas', 'apps.GestionReservas'),
    ('app.domains.ventas', 'apps.GestionVentas'),
    ('app.domains.reportes', 'apps.ReportesIA'),
    ('app.domains.analitica_ia', 'apps.ReportesIA'),
    ('app.domains.usuarios', 'apps.UsuariosSeguridad'),
    ('app.domains.ia_asistente', 'apps.asistente'),
]:
    sys.modules[legacy] = _LazyLoader(modern)
