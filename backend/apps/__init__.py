"""Paquete maestro de aplicaciones por subsistemas del sistema FashionStore."""
import sys
import importlib
import importlib.abc
import importlib.util

ALIASES = {
    'apps.GestionInventario.models': 'apps.GestionInventario.stock.models',
    'apps.GestionInventario.schemas': 'apps.GestionInventario.stock.schemas',
    'apps.GestionInventario.services': 'apps.GestionInventario.stock.services',
    'apps.GestionInventario.routers': 'apps.GestionInventario.stock.routers',

    'apps.GestionCatalogo.models': 'apps.GestionCatalogo.prendas.models',
    'apps.GestionCatalogo.schemas': 'apps.GestionCatalogo.prendas.schemas',
    'apps.GestionCatalogo.services': 'apps.GestionCatalogo.prendas.services',
    'apps.GestionCatalogo.routers': 'apps.GestionCatalogo.prendas.routers',
    'apps.GestionCatalogo.bg_removal': 'apps.GestionCatalogo.vton.bg_removal',
    'apps.GestionCatalogo.vton_service': 'apps.GestionCatalogo.vton.vton_service',

    'apps.UsuariosSeguridad.models': 'apps.UsuariosSeguridad.autenticacion.models',
    'apps.UsuariosSeguridad.schemas': 'apps.UsuariosSeguridad.autenticacion.schemas',
    'apps.UsuariosSeguridad.services': 'apps.UsuariosSeguridad.autenticacion.services',
    'apps.UsuariosSeguridad.routers': 'apps.UsuariosSeguridad.autenticacion.routers',

    'apps.GestionVentas.models': 'apps.GestionVentas.pos.models',
    'apps.GestionVentas.schemas': 'apps.GestionVentas.pos.schemas',
    'apps.GestionVentas.services': 'apps.GestionVentas.pos.services',
    'apps.GestionVentas.routers': 'apps.GestionVentas.pos.routers',

    'apps.GestionReservas.models': 'apps.GestionReservas.probadores.models',
    'apps.GestionReservas.schemas': 'apps.GestionReservas.probadores.schemas',
    'apps.GestionReservas.services': 'apps.GestionReservas.probadores.services',
    'apps.GestionReservas.routers': 'apps.GestionReservas.probadores.routers',

    'apps.GestionSaas.models': 'apps.GestionSaas.planes.models',
    'apps.GestionSaas.schemas': 'apps.GestionSaas.planes.schemas',
    'apps.GestionSaas.services': 'apps.GestionSaas.planes.services',
    'apps.GestionSaas.routers': 'apps.GestionSaas.planes.routers',

    'apps.ReportesIA.models': 'apps.ReportesIA.asistente_ia.models',
    'apps.ReportesIA.schemas': 'apps.ReportesIA.asistente_ia.schemas',
    'apps.ReportesIA.services': 'apps.ReportesIA.asistente_ia.services',
    'apps.ReportesIA.routers': 'apps.ReportesIA.asistente_ia.routers',
    'apps.ReportesIA.export_service': 'apps.ReportesIA.exportacion.export_service',
    'apps.ReportesIA.ml_service': 'apps.ReportesIA.predicciones_ml.ml_service',
}

class AliasLoader(importlib.abc.Loader):
    def __init__(self, target):
        self.target = target
    def create_module(self, spec):
        mod = importlib.import_module(self.target)
        sys.modules[spec.name] = mod
        return mod
    def exec_module(self, module):
        pass

class AliasFinder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path, target=None):
        if fullname in ALIASES:
            loader = AliasLoader(ALIASES[fullname])
            return importlib.util.spec_from_loader(fullname, loader)
        return None

if not any(isinstance(f, AliasFinder) for f in sys.meta_path):
    sys.meta_path.insert(0, AliasFinder())
