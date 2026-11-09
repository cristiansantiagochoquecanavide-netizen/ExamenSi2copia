# ==============================================================================
# MAIN BACKEND FASTAPI - ARQUITECTURA MODULAR POR SUBSISTEMAS (apps/)
# FashionStore SaaS Multitenant
# ==============================================================================
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import mimetypes

from apps.core.config import settings
from apps.core.tenant import TenantIsolationMiddleware

# Routers de Subsistemas (apps/)
from apps.UsuariosSeguridad import router as usuarios_router
from apps.GestionCatalogo import router as catalogo_router
from apps.GestionInventario import router as inventario_router
from apps.GestionReservas import router as reservas_router
from apps.GestionVentas import router as ventas_router
from apps.asistente.routers import router as ia_asistente_router
from apps.GestionSaas import router as saas_router
from apps.ReportesIA import ia_router, ml_router

try:
    from apps.GestionCatalogo.difusion.routers import router as notificaciones_router
except ImportError:
    notificaciones_router = None

try:
    from apps.GestionVentas.sincronizacion.routers import router as sincronizacion_router
except ImportError:
    sincronizacion_router = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    from apps.core.database import Base, engine
    import apps.UsuariosSeguridad.models
    import apps.GestionInventario.models
    import apps.GestionCatalogo.models
    import apps.GestionVentas.models
    import apps.GestionReservas.models
    import apps.GestionSaas.models
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e_init:
        print(f"Nota inicializando tablas en lifespan: {e_init}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Middleware de aislamiento Multitenant (SaaS)
app.add_middleware(TenantIsolationMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("image/avif", ".avif")
mimetypes.add_type("image/jpeg", ".jpg")
mimetypes.add_type("image/jpeg", ".jpeg")
mimetypes.add_type("image/png", ".png")

from fastapi.staticfiles import StaticFiles
static_dir = os.path.join(os.path.dirname(__file__), "app", "static")
if not os.path.exists(static_dir):
    static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Registro centralizado de enrutadores por subsistema
app.include_router(saas_router, prefix=settings.API_V1_STR)
app.include_router(usuarios_router, prefix=settings.API_V1_STR)
app.include_router(catalogo_router, prefix=settings.API_V1_STR)
app.include_router(inventario_router, prefix=settings.API_V1_STR)
app.include_router(reservas_router, prefix=settings.API_V1_STR)
app.include_router(ventas_router, prefix=settings.API_V1_STR)
app.include_router(ia_asistente_router, prefix=settings.API_V1_STR)
if notificaciones_router:
    app.include_router(notificaciones_router, prefix=settings.API_V1_STR)
if sincronizacion_router:
    app.include_router(sincronizacion_router, prefix=settings.API_V1_STR)
app.include_router(ia_router, prefix=settings.API_V1_STR)
if ml_router:
    app.include_router(ml_router, prefix=settings.API_V1_STR)


@app.api_route("/", methods=["GET", "HEAD"], tags=["Root"])
async def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "status": "online",
        "architecture": "MVC Modular Subsystems (backend/apps/)"
    }


@app.api_route("/health", methods=["GET", "HEAD"], tags=["Health"])
@app.api_route(f"{settings.API_V1_STR}/health", methods=["GET", "HEAD"], tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "health": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }
