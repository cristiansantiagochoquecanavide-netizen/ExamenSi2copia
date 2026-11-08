"""Enrutador FastAPI para Sincronización Offline e Idempotencia (CU16 y CU17)."""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from apps.core.database import get_db
from apps.core.tenant import get_optional_tenant_context, TenantContext
from apps.UsuariosSeguridad.routers import get_optional_current_user, require_permissions
from apps.UsuariosSeguridad.models import Usuario
from apps.GestionVentas.sincronizacion.schemas import (
    LoteSincronizacionRequest, SincronizacionBatchResponse,
    ConflictoInventarioResponse, ResolverConflictoRequest
)
from apps.GestionVentas.sincronizacion.services import SincronizacionService

router = APIRouter(prefix="/sincronizacion", tags=["Sincronización Offline & Idempotencia (CU16 - CU17)"])


# ==============================================================================
# CASO DE USO: CU16 - SINCRONIZAR OPERACIONES COMERCIALES OFFLINE
# ROL: Sistema / Cajero
# CAPA MVC: [CONTROLADOR / ENDPOINT DE SINCRONIZACIÓN POR LOTES]
# ==============================================================================
@router.post(
    "/offline",
    response_model=SincronizacionBatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Sincronizar Operaciones Comerciales Offline por Lotes (CU16)"
)
async def sincronizar_lote_offline(
    request: LoteSincronizacionRequest,
    current_user: Optional[Usuario] = Depends(get_optional_current_user),
    tenant_ctx: Optional[TenantContext] = Depends(get_optional_tenant_context),
    db: AsyncSession = Depends(get_db)
):
    """
    CU16: Sincronizar Operaciones Comerciales Offline.
    - Procesa en lote transacciones emitidas fuera de línea (ventas contado o reservas probador).
    - Aplica estricta IDEMPOTENCIA con UUIDv4 (RN04): si un UUID ya fue procesado, no duplica ventas ni inventario.
    - Si el stock central es insuficiente, genera automáticamente un registro en `conflicto_inventario` (CU17).
    """
    empresa_id = tenant_ctx.empresa_id if tenant_ctx else (current_user.empresa_id if current_user and hasattr(current_user, 'empresa_id') else 1)
    return await SincronizacionService.procesar_lote_offline(
        db=db,
        request=request,
        current_user=current_user,
        empresa_id=empresa_id
    )


# ==============================================================================
# CASO DE USO: CU17 - RESOLVER CONFLICTOS DE CONSISTENCIA DE INVENTARIO
# ROL: Administrador del Tenant / Encargado de Sucursal
# CAPA MVC: [CONTROLADOR / ENDPOINTS ARBITRAJE Y RESOLUCIÓN DE CONFLICTOS]
# ==============================================================================
@router.get(
    "/conflictos",
    response_model=List[ConflictoInventarioResponse],
    summary="Listar Conflictos de Consistencia de Inventario (CU17)"
)
async def listar_conflictos_inventario(
    sucursal_id: Optional[int] = Query(None, description="Filtrar por sucursal"),
    estado_resolucion: Optional[str] = Query(None, description="Filtrar por estado: PENDIENTE_RESOLUCION o RESUELTO"),
    db: AsyncSession = Depends(get_db)
):
    """
    CU17: Listar colisiones de inventario producidas por ventas fuera de línea con stock agotado en el servidor central.
    """
    return await SincronizacionService.listar_conflictos(
        db=db,
        sucursal_id=sucursal_id,
        estado_resolucion=estado_resolucion
    )


@router.put(
    "/conflictos/{conflicto_id}/resolver",
    summary="Resolver Conflicto de Inventario mediante Arbitraje (CU17)"
)
async def resolver_conflicto_inventario(
    conflicto_id: int,
    data: ResolverConflictoRequest,
    current_user: Optional[Usuario] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    CU17: Resolver discrepancia de inventario aplicando una de las 3 alternativas ICONIX:
    - TRASPASO_INMEDIATO (CU12)
    - ADMITIR_SALDO_NEGATIVO
    - ANULAR_VENTA
    """
    user_id = current_user.id if current_user else 1
    return await SincronizacionService.resolver_conflicto(
        db=db,
        conflicto_id=conflicto_id,
        data=data,
        usuario_id=user_id
    )
