from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.tenant import TenantIsolationMiddleware
from app.domains.usuarios.routers import router as usuarios_router
from app.domains.catalogo.routers import router as catalogo_router
from app.domains.inventario.routers import router as inventario_router
from app.domains.reservas.routers import router as reservas_router
from app.domains.ventas.routers import router as ventas_router
from app.domains.ia_asistente.routers import router as ia_asistente_router
from app.domains.notificaciones.routers import router as notificaciones_router
from app.domains.reportes.routers import router as reportes_router
from app.domains.saas.routers import router as saas_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Asegurar que todas las tablas de todos los dominios existan al iniciar la aplicación
    from app.core.database import Base, engine
    import app.domains.usuarios.models
    import app.domains.inventario.models
    import app.domains.catalogo.models
    import app.domains.ventas.models
    import app.domains.reservas.models
    import app.domains.ia_asistente.models
    import app.domains.notificaciones.models
    import app.domains.saas.models
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e_init:
        print(f"Nota inicializando tablas en lifespan: {e_init}")
    yield
    # Eventos de cierre (shutdown): cerrar conexiones, liberar recursos.


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

# Configuracion CORS para aplicaciones Web (Angular) y Movil (Flutter)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir archivos estaticos (imagenes subidas del catalogo)
import os
import mimetypes
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("image/avif", ".avif")
mimetypes.add_type("image/jpeg", ".jpg")
mimetypes.add_type("image/jpeg", ".jpeg")
mimetypes.add_type("image/png", ".png")

from fastapi.staticfiles import StaticFiles
static_dir = os.path.join(os.path.dirname(__file__), "static")
uploads_prendas_dir = os.path.join(static_dir, "uploads", "prendas")
uploads_nobg_dir = os.path.join(uploads_prendas_dir, "nobg")
os.makedirs(uploads_prendas_dir, exist_ok=True)
os.makedirs(uploads_nobg_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Registro centralizado de enrutadores por dominio de negocio
app.include_router(saas_router, prefix=settings.API_V1_STR)
app.include_router(usuarios_router, prefix=settings.API_V1_STR)
app.include_router(catalogo_router, prefix=settings.API_V1_STR)
app.include_router(inventario_router, prefix=settings.API_V1_STR)
app.include_router(reservas_router, prefix=settings.API_V1_STR)
app.include_router(ventas_router, prefix=settings.API_V1_STR)
app.include_router(ia_asistente_router, prefix=settings.API_V1_STR)
app.include_router(notificaciones_router, prefix=settings.API_V1_STR)
app.include_router(reportes_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "api_v1": settings.API_V1_STR,
        "status": "online"
    }


@app.get("/health", tags=["Root"])
async def health_check():
    return {"status": "healthy"}
