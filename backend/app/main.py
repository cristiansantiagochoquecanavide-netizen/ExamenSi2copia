from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.domains.usuarios.routers import router as usuarios_router
from app.domains.catalogo.routers import router as catalogo_router
from app.domains.inventario.routers import router as inventario_router
from app.domains.reservas.routers import router as reservas_router
from app.domains.ventas.routers import router as ventas_router
from app.domains.ia_asistente.routers import router as ia_asistente_router
from app.domains.notificaciones.routers import router as notificaciones_router
from app.domains.reportes.routers import router as reportes_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Eventos de inicio (startup): conexiones a base de datos, pool, etc.
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
from fastapi.staticfiles import StaticFiles
static_dir = os.path.join(os.path.dirname(__file__), "static")
uploads_prendas_dir = os.path.join(static_dir, "uploads", "prendas")
os.makedirs(uploads_prendas_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Registro centralizado de enrutadores por dominio de negocio
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
