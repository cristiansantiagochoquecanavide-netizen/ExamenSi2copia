from typing import List, Optional
from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.tenant import (
    TenantContext, get_current_tenant_context, get_optional_tenant_context
)
from app.domains.saas.schemas import (
    PlanCreate, PlanUpdate, PlanResponse, EmpresaCreate, EmpresaResponse,
    CambiarPlanRequest, SuscripcionDetalleResponse,
    SucursalTenantCreate, SucursalTenantResponse,
    GuiaMedidasProductoResponse, GuiaMedidaCreate, GuiaMedidaItem,
    PoliticaGarantiaResponse, PoliticaGarantiaUpdate
)
from app.domains.saas.services import (
    PlanService, EmpresaService, SuscripcionService, SucursalTenantService,
    GuiaMedidasService, PoliticaGarantiaService
)

router = APIRouter(tags=["SaaS Multitenant, Sucursales, Guía de Medidas y Garantías"])


# ------------------------------------------------------------------------------
# 1. MÓDULO SAAS Y PLANES DE SUSCRIPCIÓN
# ------------------------------------------------------------------------------

@router.get("/planes", response_model=List[PlanResponse], summary="Listar Planes de Suscripción (CU01)")
async def listar_planes(db: AsyncSession = Depends(get_db)):
    """
    Retorna la lista de planes de suscripción disponibles en la plataforma SaaS:
    - BÁSICO (máx 2 sucursales)
    - INTERMEDIO / PROFESIONAL (máx 10 sucursales, offline)
    - VIP / CORPORATIVO (sucursales ilimitadas, IA generativa, analítica ML)
    """
    return await PlanService.listar_planes(db)


@router.post("/planes", response_model=PlanResponse, status_code=status.HTTP_201_CREATED, summary="Crear Plan de Suscripción (CU01)")
async def crear_plan(data: PlanCreate, db: AsyncSession = Depends(get_db)):
    """
    Permite al Superadministrador crear nuevos planes SaaS definiendo precios, límites de sucursales y accesos.
    Valida duplicados de código de plan y límites inválidos.
    """
    return await PlanService.crear_plan(db, data)


@router.put("/planes/{plan_id}", response_model=PlanResponse, summary="Actualizar Plan de Suscripción (CU01)")
async def actualizar_plan(plan_id: int, data: PlanUpdate, db: AsyncSession = Depends(get_db)):
    """
    Permite modificar las condiciones de un plan existente (precios, límites de sucursales, flags de IA u offline).
    """
    return await PlanService.actualizar_plan(db, plan_id, data)


@router.post("/empresas", response_model=EmpresaResponse, status_code=status.HTTP_201_CREATED, summary="Registrar Empresa / Tenant (CU02)")
async def crear_empresa(data: EmpresaCreate, db: AsyncSession = Depends(get_db)):
    """
    Registra una nueva empresa contratante (Tenant) asignándole su suscripción inicial,
    política de garantía por defecto y usuario administrador inicial.
    """
    return await EmpresaService.crear_empresa(db, data)


# ------------------------------------------------------------------------------
# 1.1 GESTIÓN DE SUSCRIPCIÓN Y ESTADO DE CUENTA (CU03)
# ------------------------------------------------------------------------------

@router.get("/suscripciones/mi-suscripcion", response_model=SuscripcionDetalleResponse, summary="Consultar Estado de Cuenta y Suscripción (CU03)")
async def consultar_mi_suscripcion(
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Permite al Administrador del Tenant consultar su plan activo, vigencia,
    días restantes, sucursales usadas y límite máximo.
    """
    return await SuscripcionService.consultar_estado_cuenta(db, tenant.empresa_id)


@router.post("/suscripciones/renovar", response_model=SuscripcionDetalleResponse, summary="Renovación de Suscripción (CU03)")
async def renovar_suscripcion(
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Ejecuta la renovación de suscripción anual extendiendo la vigencia por 365 días adicionales.
    """
    return await SuscripcionService.renovar(db, tenant.empresa_id)


@router.put("/suscripciones/cambiar-plan", response_model=SuscripcionDetalleResponse, summary="Cambiar o Migrar Plan de Suscripción (CU03)")
async def cambiar_plan_suscripcion(
    data: CambiarPlanRequest,
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Permite al tenant migrar a otro plan.
    Si el tenant intenta hacer downgrade a un plan cuyo límite es inferior a sus sucursales activas actuales,
    el backend bloquea la operación con HTTP 400.
    """
    return await SuscripcionService.cambiar_plan(db, tenant.empresa_id, data.nuevo_plan_id)


# ------------------------------------------------------------------------------
# 2. MÓDULO DE SUCURSALES CON CONTROL DE LÍMITES POR PLAN
# ------------------------------------------------------------------------------

@router.get("/sucursales", response_model=List[SucursalTenantResponse], summary="Listar Sucursales del Tenant (CU04)")
async def listar_sucursales_tenant(
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista las sucursales pertenecientes exclusivamente a la empresa del tenant autenticado.
    Garantiza aislamiento estricto previniendo Cross-Tenant Data Leakage.
    """
    return await SucursalTenantService.listar(db, tenant)


@router.post("/sucursales", response_model=SucursalTenantResponse, status_code=status.HTTP_201_CREATED, summary="Crear Sucursal con Validación de Cuota (CU04 / RN08)")
async def crear_sucursal_tenant(
    data: SucursalTenantCreate,
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea una nueva sucursal verificando previamente la cuota máxima permitida por el plan de suscripción.
    Si el tenant en Plan Básico intenta registrar una 3ra sucursal, bloquea la acción con HTTP 400 Bad Request.
    """
    return await SucursalTenantService.crear(db, data, tenant)


# ------------------------------------------------------------------------------
# 3. MÓDULO DE GUÍA ANATÓMICA DE MEDIDAS EN CENTÍMETROS
# ------------------------------------------------------------------------------

@router.get("/productos/{producto_id}/guia-medidas", response_model=GuiaMedidasProductoResponse, summary="Consultar Guía de Medidas en cm (CU06)")
@router.get("/prendas/{producto_id}/guia-medidas", response_model=GuiaMedidasProductoResponse, include_in_schema=False)
async def obtener_guia_medidas(
    producto_id: int,
    tenant: Optional[TenantContext] = Depends(get_optional_tenant_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Recupera las medidas anatómicas corporales en centímetros (pecho, cintura, cadera, largo, manga)
    por cada talla para una prenda de vestir, permitiendo al cliente verificar su calce exacto.
    """
    return await GuiaMedidasService.get_guia_medidas(db, producto_id, tenant)


@router.post("/productos/{producto_id}/guia-medidas", response_model=GuiaMedidaItem, status_code=status.HTTP_201_CREATED, summary="Registrar Medida Anatómica en cm (CU06)")
@router.post("/prendas/{producto_id}/guia-medidas", response_model=GuiaMedidaItem, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def registrar_guia_medida(
    producto_id: int,
    data: GuiaMedidaCreate,
    tenant: Optional[TenantContext] = Depends(get_optional_tenant_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Registra o actualiza las dimensiones anatómicas en centímetros para una talla específica de una prenda.
    """
    return await GuiaMedidasService.create_or_update_guia(db, producto_id, data, tenant)


# ------------------------------------------------------------------------------
# 4. MÓDULO DE POLÍTICAS DE GARANTÍA Y DEVOLUCIÓN (REGLA RN07: SIN REEMBOLSO)
# ------------------------------------------------------------------------------

@router.get("/politica-garantia", response_model=PoliticaGarantiaResponse, summary="Consultar Política de Garantía (CU18 / RN07)")
async def consultar_politica_garantia(
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene la política de garantía de cambio de talla vigente para la empresa autenticada.
    El campo `admite_reembolso_dinero` se mantiene estrictamente en FALSE (Regla RN07).
    """
    return await PoliticaGarantiaService.obtener_politica(db, tenant.empresa_id)


@router.put("/politica-garantia", response_model=PoliticaGarantiaResponse, summary="Actualizar Política de Garantía (CU18 / RN07)")
async def actualizar_politica_garantia(
    data: PoliticaGarantiaUpdate,
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualiza los días de tolerancia para cambio de talla (ej. 7 días, 15 días).
    La regla RN07 de prohibición de reembolso monetario se preserva de forma inmutable.
    """
    return await PoliticaGarantiaService.actualizar_politica(db, tenant.empresa_id, data)
