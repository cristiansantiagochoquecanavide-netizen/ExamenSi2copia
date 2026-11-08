from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.tenant import TenantContext, verify_tenant_access
from app.domains.saas.models import (
    PlanSuscripcion, Empresa, Suscripcion, GuiaMedida, PoliticaGarantia
)
from app.domains.saas.schemas import (
    PlanCreate, PlanUpdate, CambiarPlanRequest,
    EmpresaCreate, SucursalTenantCreate, GuiaMedidaCreate, PoliticaGarantiaUpdate
)
from app.domains.inventario.models import Sucursal, Ciudad
from app.domains.catalogo.models import Prenda, Talla
from app.domains.usuarios.models import Usuario, Rol
from app.core.security import hash_password


class SubscriptionQuotaError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


async def validate_branch_creation_limit(db: AsyncSession, empresa_id: int) -> bool:
    """
    Verifica si la empresa puede crear una nueva sucursal según el plan contratado (CU01, CU04).
    Límites fijados por la cátedra:
      - BASICO: Máximo 2 sucursales.
      - INTERMEDIO: Máximo 10 sucursales.
      - VIP: Ilimitadas (hasta 999).
    """
    # 1. Obtener la suscripción activa y su plan
    query_sub = (
        select(PlanSuscripcion.codigo, PlanSuscripcion.limite_sucursales, Suscripcion.estado)
        .join(PlanSuscripcion, Suscripcion.plan_id == PlanSuscripcion.id)
        .where(
            and_(
                Suscripcion.empresa_id == empresa_id,
                Suscripcion.estado == "ACTIVA"
            )
        )
        .order_by(Suscripcion.id.desc())
    )
    result_sub = await db.execute(query_sub)
    sub_row = result_sub.first()

    if not sub_row:
        # Si no hay suscripcion activa explícita pero existe empresa, buscar su plan por omisión
        emp_res = await db.execute(select(Empresa).where(Empresa.id == empresa_id))
        emp = emp_res.scalar_one_or_none()
        if not emp:
            raise SubscriptionQuotaError("La empresa especificada no existe en la plataforma SaaS.")
        
        # Asignar plan por omision BASICO si es tenant nuevo
        plan_codigo = "BASICO"
        limite_sucursales = 2
    else:
        plan_codigo = sub_row[0]
        limite_sucursales = sub_row[1]

    # 2. Contar sucursales activas actuales de la empresa
    query_count = (
        select(func.count(Sucursal.id))
        .where(
            and_(
                Sucursal.empresa_id == empresa_id,
                Sucursal.activo == True
            )
        )
    )
    actuales = (await db.execute(query_count)).scalar() or 0

    if actuales >= limite_sucursales:
        raise SubscriptionQuotaError(
            f"Límite de sucursales alcanzado. Su plan '{plan_codigo}' permite un máximo de "
            f"{limite_sucursales} sucursales. Actualice a un plan superior para continuar creciendo."
        )

    return True


class PlanService:
    @staticmethod
    async def listar_planes(db: AsyncSession) -> List[PlanSuscripcion]:
        result = await db.execute(
            select(PlanSuscripcion).where(PlanSuscripcion.activo == True).order_by(PlanSuscripcion.precio_mensual)
        )
        return list(result.scalars().all())

    @staticmethod
    async def obtener_por_codigo(db: AsyncSession, codigo: str) -> Optional[PlanSuscripcion]:
        result = await db.execute(select(PlanSuscripcion).where(PlanSuscripcion.codigo == codigo))
        return result.scalar_one_or_none()

    @staticmethod
    async def crear_plan(db: AsyncSession, data: PlanCreate) -> PlanSuscripcion:
        # Validar duplicados de codigo
        existente = await db.execute(select(PlanSuscripcion).where(func.upper(PlanSuscripcion.codigo) == data.codigo.strip().upper()))
        if existente.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Ya existe un plan con el código '{data.codigo.strip().upper()}'.")
        
        nuevo_plan = PlanSuscripcion(
            codigo=data.codigo.strip().upper(),
            nombre=data.nombre.strip(),
            descripcion=data.descripcion,
            precio_mensual=data.precio_mensual,
            limite_sucursales=data.limite_sucursales,
            permite_ia=data.permite_ia,
            permite_offline=data.permite_offline,
            activo=data.activo
        )
        db.add(nuevo_plan)
        await db.commit()
        await db.refresh(nuevo_plan)
        return nuevo_plan

    @staticmethod
    async def actualizar_plan(db: AsyncSession, plan_id: int, data: PlanUpdate) -> PlanSuscripcion:
        plan = await db.get(PlanSuscripcion, plan_id)
        if not plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan de suscripción no encontrado.")
        
        if data.nombre is not None:
            plan.nombre = data.nombre.strip()
        if data.descripcion is not None:
            plan.descripcion = data.descripcion
        if data.precio_mensual is not None:
            plan.precio_mensual = data.precio_mensual
        if data.limite_sucursales is not None:
            plan.limite_sucursales = data.limite_sucursales
        if data.permite_ia is not None:
            plan.permite_ia = data.permite_ia
        if data.permite_offline is not None:
            plan.permite_offline = data.permite_offline
        if data.activo is not None:
            plan.activo = data.activo
            
        await db.commit()
        await db.refresh(plan)
        return plan


class EmpresaService:
    @staticmethod
    async def crear_empresa(db: AsyncSession, data: EmpresaCreate) -> Dict[str, Any]:
        # Validar duplicados de nit o subdominio
        dupl = await db.execute(
            select(Empresa).where(
                or_(Empresa.nit == data.nit, Empresa.subdominio == data.subdominio)
            )
        )
        if dupl.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una empresa registrada con ese NIT o Subdominio."
            )

        # Validar plan
        plan = await db.get(PlanSuscripcion, data.plan_id)
        if not plan or not plan.activo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El plan de suscripción seleccionado no existe o no está activo."
            )

        # 1. Crear Empresa
        empresa = Empresa(
            razon_social=data.razon_social,
            nit=data.nit,
            subdominio=data.subdominio.lower().strip(),
            email_corporativo=data.email_corporativo,
            telefono=data.telefono,
            direccion_fiscal=data.direccion_fiscal,
            activo=True
        )
        db.add(empresa)
        await db.flush()

        # 2. Crear Suscripción Inicial
        hoy = date.today()
        suscripcion = Suscripcion(
            empresa_id=empresa.id,
            plan_id=plan.id,
            fecha_inicio=hoy,
            fecha_fin=hoy + timedelta(days=365),
            estado="ACTIVA",
            monto_pago=plan.precio_mensual * 12,
            renovacion_automatica=True
        )
        db.add(suscripcion)

        # 3. Crear Política de Garantía por omisión (Regla RN07: Sin reembolso de dinero)
        politica = PoliticaGarantia(
            empresa_id=empresa.id,
            plazo_dias_cambio=7,
            permite_cambio_talla=True,
            admite_reembolso_dinero=False,
            requiere_etiqueta_original=True,
            activo=True
        )
        db.add(politica)

        # 4. Crear usuario administrador para el tenant
        rol_admin_res = await db.execute(select(Rol).where(Rol.nombre == "ADMINISTRADOR"))
        rol_admin = rol_admin_res.scalar_one_or_none()
        rol_id = rol_admin.id if rol_admin else 1

        usuario_admin = Usuario(
            email=data.email_corporativo,
            password_hash=hash_password(data.admin_password or "Password123!"),
            nombre="Admin",
            apellido=data.razon_social[:30],
            ci_nit=data.nit,
            telefono=data.telefono,
            direccion=data.direccion_fiscal,
            tipo_usuario="PERSONAL",
            estado="ACTIVO",
            rol_id=rol_id,
            empresa_id=empresa.id
        )
        db.add(usuario_admin)

        await db.commit()
        await db.refresh(empresa)
        await db.refresh(suscripcion)

        return {
            "id": empresa.id,
            "razon_social": empresa.razon_social,
            "nit": empresa.nit,
            "subdominio": empresa.subdominio,
            "email_corporativo": empresa.email_corporativo,
            "telefono": empresa.telefono,
            "direccion_fiscal": empresa.direccion_fiscal,
            "activo": empresa.activo,
            "suscripcion": {
                "plan": plan.codigo,
                "estado": suscripcion.estado,
                "fecha_inicio": suscripcion.fecha_inicio,
                "fecha_fin": suscripcion.fecha_fin
            }
        }


class SucursalTenantService:
    @staticmethod
    async def listar(db: AsyncSession, tenant: TenantContext) -> List[Dict[str, Any]]:
        query = (
            select(Sucursal, Ciudad.nombre.label("ciudad_nombre"))
            .outerjoin(Ciudad, Sucursal.ciudad_id == Ciudad.id)
            .where(
                or_(
                    Sucursal.empresa_id == tenant.empresa_id,
                    Sucursal.empresa_id == None
                )
            )
            .order_by(Sucursal.id)
        )
        result = await db.execute(query)
        rows = result.all()
        return [
            {
                "id": r[0].id,
                "empresa_id": r[0].empresa_id,
                "nombre": r[0].nombre,
                "ciudad": r[1] or "Santa Cruz",
                "direccion": r[0].direccion,
                "telefono": r[0].telefono,
                "activo": r[0].activo
            }
            for r in rows
        ]

    @staticmethod
    async def crear(db: AsyncSession, data: SucursalTenantCreate, tenant: TenantContext) -> Dict[str, Any]:
        # Validar control de límites por plan de suscripción (CU04 / RN08)
        await validate_branch_creation_limit(db, tenant.empresa_id)

        # Resolver ciudad
        ciudad_id = data.ciudad_id
        ciudad_nombre = data.ciudad or "Santa Cruz"
        if not ciudad_id:
            c_res = await db.execute(select(Ciudad).where(func.lower(Ciudad.nombre) == ciudad_nombre.lower()))
            c_obj = c_res.scalar_one_or_none()
            if c_obj:
                ciudad_id = c_obj.id
            else:
                # Crear ciudad si no existe
                nueva_ciudad = Ciudad(nombre=ciudad_nombre, codigo=ciudad_nombre[:3].upper())
                db.add(nueva_ciudad)
                await db.flush()
                ciudad_id = nueva_ciudad.id

        sucursal = Sucursal(
            nombre=data.nombre,
            empresa_id=tenant.empresa_id,
            ciudad_id=ciudad_id,
            direccion=data.direccion,
            telefono=data.telefono,
            horario_atencion=data.horario_atencion or "09:00 - 20:00",
            capacidad_probadores=data.capacidad_probadores or 3,
            activo=data.activo if data.activo is not None else True
        )
        db.add(sucursal)
        await db.commit()
        await db.refresh(sucursal)

        return {
            "id": sucursal.id,
            "empresa_id": sucursal.empresa_id,
            "nombre": sucursal.nombre,
            "ciudad": ciudad_nombre,
            "direccion": sucursal.direccion,
            "telefono": sucursal.telefono,
            "activo": sucursal.activo
        }


class GuiaMedidasService:
    @staticmethod
    async def get_guia_medidas(db: AsyncSession, producto_id: int, tenant: Optional[TenantContext] = None) -> Dict[str, Any]:
        # Verificar prenda
        prenda_res = await db.execute(select(Prenda).where(Prenda.id == producto_id))
        prenda = prenda_res.scalar_one_or_none()
        if not prenda:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prenda no encontrada.")

        if tenant and prenda.empresa_id:
            verify_tenant_access(prenda.empresa_id, tenant)

        # Consultar guias por producto
        guias_res = await db.execute(
            select(GuiaMedida, Talla.codigo.label("talla_codigo"))
            .join(Talla, GuiaMedida.talla_id == Talla.id)
            .where(GuiaMedida.producto_id == producto_id)
            .order_by(Talla.orden.asc(), Talla.id.asc())
        )
        rows = guias_res.all()

        tallas_list = []
        for g, talla_cod in rows:
            tallas_list.append({
                "id": g.id,
                "talla_id": g.talla_id,
                "talla": talla_cod,
                "pecho_cm": float(g.pecho_cm),
                "cintura_cm": float(g.cintura_cm),
                "cadera_cm": float(g.cadera_cm),
                "largo_cm": float(g.largo_cm),
                "manga_cm": float(g.manga_cm) if g.manga_cm is not None else None,
                "observacion_calce": g.observacion_calce
            })

        # Si no tiene medidas personalizadas, retornar guía estándar proporcional para que nunca falle la vista del cliente
        if not tallas_list:
            tallas_db = (await db.execute(select(Talla).where(Talla.activo == True).order_by(Talla.orden))).scalars().all()
            for idx, t in enumerate(tallas_db):
                delta = idx * 4.0
                tallas_list.append({
                    "id": None,
                    "talla_id": t.id,
                    "talla": t.codigo,
                    "pecho_cm": round(86.0 + delta, 1),
                    "cintura_cm": round(66.0 + delta, 1),
                    "cadera_cm": round(92.0 + delta, 1),
                    "largo_cm": round(138.0 + (idx * 2.0), 1),
                    "manga_cm": round(58.0 + (idx * 0.5), 1),
                    "observacion_calce": "Corte regular anatómico en centímetros"
                })

        return {
            "producto_id": prenda.id,
            "nombre": prenda.nombre,
            "tallas": tallas_list
        }

    @staticmethod
    async def create_or_update_guia(
        db: AsyncSession,
        producto_id: int,
        data: GuiaMedidaCreate,
        tenant: Optional[TenantContext] = None
    ) -> Dict[str, Any]:
        prenda_res = await db.execute(select(Prenda).where(Prenda.id == producto_id))
        prenda = prenda_res.scalar_one_or_none()
        if not prenda:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prenda no encontrada.")

        if tenant and prenda.empresa_id:
            verify_tenant_access(prenda.empresa_id, tenant)

        # Validar talla
        talla_res = await db.execute(select(Talla).where(Talla.id == data.talla_id))
        talla = talla_res.scalar_one_or_none()
        if not talla:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Talla no encontrada.")

        # Buscar si ya existe la guía para esta prenda y talla
        guia_res = await db.execute(
            select(GuiaMedida).where(
                and_(
                    GuiaMedida.producto_id == producto_id,
                    GuiaMedida.talla_id == data.talla_id
                )
            )
        )
        guia = guia_res.scalar_one_or_none()

        if guia:
            guia.pecho_cm = Decimal(str(data.pecho_cm))
            guia.cintura_cm = Decimal(str(data.cintura_cm))
            guia.cadera_cm = Decimal(str(data.cadera_cm))
            guia.largo_cm = Decimal(str(data.largo_cm))
            guia.manga_cm = Decimal(str(data.manga_cm)) if data.manga_cm is not None else None
            guia.observacion_calce = data.observacion_calce
        else:
            guia = GuiaMedida(
                producto_id=producto_id,
                talla_id=data.talla_id,
                pecho_cm=Decimal(str(data.pecho_cm)),
                cintura_cm=Decimal(str(data.cintura_cm)),
                cadera_cm=Decimal(str(data.cadera_cm)),
                largo_cm=Decimal(str(data.largo_cm)),
                manga_cm=Decimal(str(data.manga_cm)) if data.manga_cm is not None else None,
                observacion_calce=data.observacion_calce
            )
            db.add(guia)

        await db.commit()
        await db.refresh(guia)

        return {
            "id": guia.id,
            "producto_id": guia.producto_id,
            "talla_id": guia.talla_id,
            "talla": talla.codigo,
            "pecho_cm": float(guia.pecho_cm),
            "cintura_cm": float(guia.cintura_cm),
            "cadera_cm": float(guia.cadera_cm),
            "largo_cm": float(guia.largo_cm),
            "manga_cm": float(guia.manga_cm) if guia.manga_cm is not None else None,
            "observacion_calce": guia.observacion_calce
        }


class PoliticaGarantiaService:
    @staticmethod
    async def obtener_politica(db: AsyncSession, empresa_id: int) -> Dict[str, Any]:
        result = await db.execute(
            select(PoliticaGarantia).where(PoliticaGarantia.empresa_id == empresa_id)
        )
        pol = result.scalar_one_or_none()
        if not pol:
            # Crear política por omisión de 7 días, sin devolución de dinero
            pol = PoliticaGarantia(
                empresa_id=empresa_id,
                plazo_dias_cambio=7,
                permite_cambio_talla=True,
                admite_reembolso_dinero=False,
                requiere_etiqueta_original=True,
                activo=True
            )
            db.add(pol)
            await db.commit()
            await db.refresh(pol)

        return {
            "id": pol.id,
            "empresa_id": pol.empresa_id,
            "plazo_dias_cambio": pol.plazo_dias_cambio,
            "permite_cambio_talla": pol.permite_cambio_talla,
            "admite_reembolso_dinero": False,  # Regla RN07 Inmutable
            "requiere_etiqueta_original": pol.requiere_etiqueta_original
        }

    @staticmethod
    async def actualizar_politica(
        db: AsyncSession,
        empresa_id: int,
        data: PoliticaGarantiaUpdate
    ) -> Dict[str, Any]:
        result = await db.execute(
            select(PoliticaGarantia).where(PoliticaGarantia.empresa_id == empresa_id)
        )
        pol = result.scalar_one_or_none()
        if not pol:
            pol = PoliticaGarantia(
                empresa_id=empresa_id,
                plazo_dias_cambio=data.plazo_dias_cambio,
                permite_cambio_talla=True,
                admite_reembolso_dinero=False,
                requiere_etiqueta_original=data.requiere_etiqueta_original,
                activo=True
            )
            db.add(pol)
        else:
            pol.plazo_dias_cambio = data.plazo_dias_cambio
            pol.requiere_etiqueta_original = data.requiere_etiqueta_original
            # Regla RN07: inmutable en False (prohibido reintegro monetario)
            pol.admite_reembolso_dinero = False

        await db.commit()
        await db.refresh(pol)

        return {
            "id": pol.id,
            "empresa_id": pol.empresa_id,
            "plazo_dias_cambio": pol.plazo_dias_cambio,
            "permite_cambio_talla": pol.permite_cambio_talla,
            "admite_reembolso_dinero": False,
            "requiere_etiqueta_original": pol.requiere_etiqueta_original
        }


class SuscripcionService:
    @staticmethod
    async def consultar_estado_cuenta(db: AsyncSession, empresa_id: int) -> Dict[str, Any]:
        # 1. Obtener la suscripcion del tenant
        sub_res = await db.execute(
            select(Suscripcion, PlanSuscripcion)
            .join(PlanSuscripcion, Suscripcion.plan_id == PlanSuscripcion.id)
            .where(Suscripcion.empresa_id == empresa_id)
            .order_by(Suscripcion.id.desc())
        )
        sub_row = sub_res.first()
        if not sub_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No se encontró suscripción para esta empresa.")
        
        suscripcion, plan = sub_row

        # 2. Contar sucursales activas
        cnt_res = await db.execute(
            select(func.count(Sucursal.id)).where(Sucursal.empresa_id == empresa_id, Sucursal.activo == True)
        )
        sucursales_actuales = cnt_res.scalar() or 0

        hoy = date.today()
        dias_restantes = (suscripcion.fecha_fin - hoy).days if suscripcion.fecha_fin else 0

        return {
            "id": suscripcion.id,
            "empresa_id": suscripcion.empresa_id,
            "plan_id": plan.id,
            "plan_codigo": plan.codigo,
            "plan_nombre": plan.nombre,
            "estado": suscripcion.estado,
            "fecha_inicio": suscripcion.fecha_inicio,
            "fecha_fin": suscripcion.fecha_fin,
            "limite_sucursales": plan.limite_sucursales,
            "sucursales_actuales": sucursales_actuales,
            "permite_ia": plan.permite_ia,
            "permite_offline": plan.permite_offline,
            "dias_restantes": dias_restantes
        }

    @staticmethod
    async def renovar(db: AsyncSession, empresa_id: int) -> Dict[str, Any]:
        sub_res = await db.execute(
            select(Suscripcion).where(Suscripcion.empresa_id == empresa_id).order_by(Suscripcion.id.desc())
        )
        suscripcion = sub_res.scalars().first()
        if not suscripcion:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No se encontró suscripción activa.")

        # Extender 365 días a partir de hoy o fecha fin previa
        base_date = max(date.today(), suscripcion.fecha_fin or date.today())
        suscripcion.fecha_fin = base_date + timedelta(days=365)
        suscripcion.estado = "ACTIVA"
        await db.commit()
        await db.refresh(suscripcion)

        return await SuscripcionService.consultar_estado_cuenta(db, empresa_id)

    @staticmethod
    async def cambiar_plan(db: AsyncSession, empresa_id: int, nuevo_plan_id: int, user_id: Optional[int] = None) -> Dict[str, Any]:
        # Validar nuevo plan
        nuevo_plan = await db.get(PlanSuscripcion, nuevo_plan_id)
        if not nuevo_plan or not nuevo_plan.activo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El plan de suscripción solicitado no existe o está inactivo.")

        # Validar que las sucursales actuales no superen el nuevo límite (CU03 / RN08)
        cnt_res = await db.execute(
            select(func.count(Sucursal.id)).where(Sucursal.empresa_id == empresa_id, Sucursal.activo == True)
        )
        actuales = cnt_res.scalar() or 0

        if actuales > nuevo_plan.limite_sucursales:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Incompatibilidad de plan: Su empresa tiene {actuales} sucursales activas, pero el plan '{nuevo_plan.nombre}' sólo admite hasta {nuevo_plan.limite_sucursales}. Desactive sucursales antes de migrar a un plan inferior."
            )

        # Actualizar suscripción
        sub_res = await db.execute(
            select(Suscripcion).where(Suscripcion.empresa_id == empresa_id).order_by(Suscripcion.id.desc())
        )
        suscripcion = sub_res.scalars().first()
        if not suscripcion:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No se encontró suscripción para actualizar.")

        suscripcion.plan_id = nuevo_plan.id
        suscripcion.estado = "ACTIVA"
        await db.commit()
        await db.refresh(suscripcion)

        res = await SuscripcionService.consultar_estado_cuenta(db, empresa_id)

        if user_id:
            try:
                from app.core.security import create_access_token
                from app.domains.usuarios.models import Usuario, Rol
                from app.domains.saas.models import Empresa
                from sqlalchemy.orm import selectinload

                u_res = await db.execute(
                    select(Usuario).options(selectinload(Usuario.rol).selectinload(Rol.permisos)).where(Usuario.id == user_id)
                )
                usuario = u_res.scalar_one_or_none()
                if usuario:
                    emp = await db.get(Empresa, empresa_id)
                    token_payload = {
                        "sub": str(usuario.id),
                        "email": usuario.email,
                        "rol": usuario.rol.nombre if usuario.rol else "CLIENTE",
                        "sucursal_id": usuario.sucursal_id,
                        "empresa_id": empresa_id,
                        "nombre_empresa": emp.razon_social if emp else "FashionStore",
                        "subdominio": emp.subdominio if emp else "elegance",
                        "plan_codigo": nuevo_plan.codigo,
                        "permite_offline": bool(nuevo_plan.permite_offline),
                        "permite_ia": bool(nuevo_plan.permite_ia),
                        "permisos": [p.codigo for p in usuario.rol.permisos] if usuario.rol else []
                    }
                    res["access_token"] = create_access_token(token_payload)
            except Exception as e:
                import traceback
                traceback.print_exc()

        return res
