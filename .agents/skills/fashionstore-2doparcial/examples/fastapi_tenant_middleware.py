"""
Middleware y Dependencias de Inyección de Contexto Multitenant para FastAPI.
Extrae y valida el tenant_id a partir del token JWT o header HTTP, garantizando
aislamiento estricto de base de datos en SQLAlchemy (RNF01, RNF02).
"""

from fastapi import Request, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import jwt

SECRET_KEY = "FASHIONSTORE_SAAS_SUPER_SECRET_JWT_KEY_2026"
ALGORITHM = "HS256"

security = HTTPBearer()

class TenantContext(BaseModel):
    empresa_id: int
    user_id: int
    email: str
    rol: str
    subdominio: str
    plan_codigo: str
    permite_offline: bool = False
    permite_ia: bool = False

def get_current_tenant_context(credentials: HTTPAuthorizationCredentials = Security(security)) -> TenantContext:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        empresa_id: Optional[int] = payload.get("empresa_id")
        user_id: Optional[int] = payload.get("sub")
        email: Optional[str] = payload.get("email")
        rol: Optional[str] = payload.get("rol")
        subdominio: Optional[str] = payload.get("subdominio")
        plan_codigo: Optional[str] = payload.get("plan_codigo", "BASICO")
        permite_offline: bool = payload.get("permite_offline", False)
        permite_ia: bool = payload.get("permite_ia", False)

        if empresa_id is None or user_id is None:
            raise HTTPException(
                status_code=401, 
                detail="Token de autenticación inválido: falta información de empresa (tenant) o usuario."
            )

        return TenantContext(
            empresa_id=int(empresa_id),
            user_id=int(user_id),
            email=str(email),
            rol=str(rol),
            subdominio=str(subdominio),
            plan_codigo=str(plan_codigo),
            permite_offline=bool(permite_offline),
            permite_ia=bool(permite_ia)
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=401,
            detail="Credenciales no válidas o sesión expirada."
        )

# Función de ayuda para filtrar consultas de SQLAlchemy
def apply_tenant_filter(query, model, tenant: TenantContext):
    """
    Aplica forzosamente el filtro empresa_id al query de SQLAlchemy para prevenir Cross-Tenant Leakage.
    """
    if hasattr(model, 'empresa_id'):
        return query.filter(model.empresa_id == tenant.empresa_id)
    return query
