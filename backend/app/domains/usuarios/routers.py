from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.domains.usuarios.models import Usuario
from app.domains.usuarios.schemas import (
    LoginRequest, TokenResponse, SolicitarRecuperacionRequest, RestablecerPasswordRequest,
    MensajeResponse, RolCreate, RolUpdate, RolResponse, PermisoResponse,
    ClienteRegistroRequest, PersonalRegistroRequest, UsuarioUpdate,
    CambiarEstadoRequest, UsuarioResponse, BitacoraAuditoriaResponse
)
from app.domains.usuarios.services import AuthService, RolService, UsuarioService, AuditoriaService

router = APIRouter(prefix="/usuarios", tags=["Usuarios & Autenticaci?n"])

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/usuarios/auth/login",
    auto_error=False
)

# ----------------- DEPENDENCIAS DE AUTENTICACION Y RBAC -----------------
async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Usuario:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticacion requerido",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Validar lista negra (CU1)
    if await AuthService.is_token_revoked(db, token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token ha sido revocado. Inicie sesion nuevamente",
            headers={"WWW-Authenticate": "Bearer"}
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido o expirado",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user_id = int(payload.get("sub", 0))
    usuario = await UsuarioService.obtener_por_id(db, user_id)
    if usuario.estado != "ACTIVO":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cuenta de usuario {usuario.estado.lower()} (E2)"
        )
    return usuario


async def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[Usuario]:
    if not token:
        return None
    if await AuthService.is_token_revoked(db, token):
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    try:
        user_id = int(payload.get("sub", 0))
        usuario = await UsuarioService.obtener_por_id(db, user_id)
        if usuario.estado != "ACTIVO":
            return None
        return usuario
    except Exception:
        return None


def require_permissions(*required_permissions: str):
    async def permission_checker(current_user: Usuario = Depends(get_current_user)):
        if current_user.rol and current_user.rol.nombre == "ADMINISTRADOR":
            return current_user

        user_perms = [p.codigo for p in current_user.rol.permisos] if current_user.rol else []
        for req in required_permissions:
            if req in user_perms:
                return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permisos insuficientes para realizar esta operacion"
        )
    return permission_checker


# ----------------- CU1: AUTENTICACION, LOGIN Y SESION -----------------
@router.post("/auth/login", response_model=TokenResponse, summary="Iniciar Sesion (CU1)")
async def login(data: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else None
    return await AuthService.login(db, data, ip)


@router.post("/auth/logout", response_model=MensajeResponse, summary="Cerrar Sesion e Invalidar Token (CU1)")
async def logout(
    request: Request,
    token: str = Depends(oauth2_scheme),
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    await AuthService.logout(db, token, current_user.id, current_user.email, ip)
    return MensajeResponse(mensaje="Sesion cerrada e invalidada correctamente")


@router.post("/auth/recuperar-password", response_model=MensajeResponse, summary="Solicitar Recuperacion de Password (CU1)")
async def solicitar_recuperacion(data: SolicitarRecuperacionRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else None
    token = await AuthService.solicitar_recuperacion(db, data, ip)
    # En entorno academico se notifica o se devuelve confirmacion
    return MensajeResponse(mensaje=f"Instrucciones de recuperacion generadas con exito para {data.email}")


@router.post("/auth/restablecer-password", response_model=MensajeResponse, summary="Restablecer Password con Token (CU1)")
async def restablecer_password(data: RestablecerPasswordRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else None
    await AuthService.restablecer_password(db, data, ip)
    return MensajeResponse(mensaje="Contrasena restablecida exitosamente")


@router.get("/auth/me", response_model=UsuarioResponse, summary="Perfil del Usuario Autenticado")
async def get_me(current_user: Usuario = Depends(get_current_user)):
    return current_user


# ----------------- CU2: GESTION DE ROLES Y PERMISOS (RBAC) -----------------
@router.get("/roles", response_model=List[RolResponse], summary="Listar Roles (CU2)")
async def listar_roles(
    current_user: Usuario = Depends(require_permissions("usuarios:read", "roles:read")),
    db: AsyncSession = Depends(get_db)
):
    return await RolService.listar_roles(db)


@router.post("/roles", response_model=RolResponse, status_code=status.HTTP_201_CREATED, summary="Crear Rol (CU2)")
async def crear_rol(
    data: RolCreate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("roles:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await RolService.crear_rol(db, data, current_user, ip)


@router.get("/roles/{rol_id}", response_model=RolResponse, summary="Obtener Detalle de Rol (CU2)")
async def obtener_rol(
    rol_id: int,
    current_user: Usuario = Depends(require_permissions("roles:read")),
    db: AsyncSession = Depends(get_db)
):
    return await RolService.obtener_rol(db, rol_id)


@router.put("/roles/{rol_id}", response_model=RolResponse, summary="Modificar Rol y Permisos (CU2)")
async def actualizar_rol(
    rol_id: int,
    data: RolUpdate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("roles:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await RolService.actualizar_rol(db, rol_id, data, current_user, ip)


@router.delete("/roles/{rol_id}", response_model=MensajeResponse, summary="Eliminar Rol (CU2)")
async def eliminar_rol(
    rol_id: int,
    request: Request,
    current_user: Usuario = Depends(require_permissions("roles:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    await RolService.eliminar_rol(db, rol_id, current_user, ip)
    return MensajeResponse(mensaje="Rol eliminado exitosamente")


@router.get("/permisos", response_model=List[PermisoResponse], summary="Catalogo de Permisos por Modulo (CU2)")
async def listar_permisos(
    current_user: Usuario = Depends(require_permissions("roles:read")),
    db: AsyncSession = Depends(get_db)
):
    return await RolService.listar_permisos(db)


# ----------------- CU3: GESTION DE USUARIOS Y CLIENTES -----------------
@router.post("/clientes/registro", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED, summary="Registro Publico de Clientes (CU3)")
async def registrar_cliente(data: ClienteRegistroRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else None
    return await UsuarioService.registrar_cliente(db, data, ip)


@router.post("/personal", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED, summary="Registro de Personal Interno con Sucursal (CU3)")
async def registrar_personal(
    data: PersonalRegistroRequest,
    request: Request,
    current_user: Usuario = Depends(require_permissions("usuarios:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await UsuarioService.registrar_personal(db, data, current_user, ip)


@router.get("/", response_model=List[UsuarioResponse], summary="Listar Usuarios con Filtros (CU3)")
async def listar_usuarios(
    tipo_usuario: Optional[str] = None,
    rol_id: Optional[int] = None,
    sucursal_id: Optional[int] = None,
    estado: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: Usuario = Depends(require_permissions("usuarios:read")),
    db: AsyncSession = Depends(get_db)
):
    return await UsuarioService.listar(db, tipo_usuario, rol_id, sucursal_id, estado, limit, offset)


@router.get("/{user_id}", response_model=UsuarioResponse, summary="Obtener Detalle de Usuario (CU3)")
async def obtener_usuario(
    user_id: int,
    current_user: Usuario = Depends(require_permissions("usuarios:read")),
    db: AsyncSession = Depends(get_db)
):
    return await UsuarioService.obtener_por_id(db, user_id)


@router.put("/{user_id}", response_model=UsuarioResponse, summary="Actualizar Usuario (CU3)")
async def actualizar_usuario(
    user_id: int,
    data: UsuarioUpdate,
    request: Request,
    current_user: Usuario = Depends(require_permissions("usuarios:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await UsuarioService.actualizar(db, user_id, data, current_user, ip)


@router.patch("/{user_id}/estado", response_model=UsuarioResponse, summary="Cambiar Estado de Cuenta (CU3)")
async def cambiar_estado_usuario(
    user_id: int,
    data: CambiarEstadoRequest,
    request: Request,
    current_user: Usuario = Depends(require_permissions("usuarios:write")),
    db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return await UsuarioService.cambiar_estado(db, user_id, data, current_user, ip)


# ----------------- CU7: CONSULTAR BITACORA DE AUDITORIA -----------------
@router.get("/auditoria/logs", response_model=List[BitacoraAuditoriaResponse], summary="Consultar Bitacora de Auditoria (CU7)")
async def consultar_bitacora(
    fecha_inicio: Optional[datetime] = None,
    fecha_fin: Optional[datetime] = None,
    usuario_id: Optional[int] = None,
    modulo: Optional[str] = None,
    accion: Optional[str] = None,
    ip_address: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: Usuario = Depends(require_permissions("auditoria:read")),
    db: AsyncSession = Depends(get_db)
):
    return await AuditoriaService.consultar(db, fecha_inicio, fecha_fin, usuario_id, modulo, accion, ip_address, limit, offset)


@router.get("/auditoria/logs/{evento_id}", response_model=BitacoraAuditoriaResponse, summary="Detalle de Evento de Auditoria (CU7)")
async def obtener_evento_auditoria(
    evento_id: int,
    current_user: Usuario = Depends(require_permissions("auditoria:read")),
    db: AsyncSession = Depends(get_db)
):
    return await AuditoriaService.obtener_por_id(db, evento_id)
