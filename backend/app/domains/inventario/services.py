from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.inventario.models import Ciudad, Sucursal
from app.domains.inventario.schemas import CiudadCreate, CiudadUpdate, SucursalCreate, SucursalUpdate
from app.domains.usuarios.models import Usuario
from app.domains.usuarios.services import AuditoriaService

class CiudadService:
    @staticmethod
    async def listar(db: AsyncSession, activo_solo: bool = False) -> List[Ciudad]:
        query = select(Ciudad)
        if activo_solo:
            query = query.where(Ciudad.activo == True)
        result = await db.execute(query.order_by(Ciudad.nombre))
        return list(result.scalars().all())

    @staticmethod
    async def obtener_por_id(db: AsyncSession, ciudad_id: int) -> Ciudad:
        result = await db.execute(select(Ciudad).where(Ciudad.id == ciudad_id))
        ciudad = result.scalar_one_or_none()
        if not ciudad:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ciudad no encontrada")
        return ciudad

    @staticmethod
    async def crear(db: AsyncSession, data: CiudadCreate, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> Ciudad:
        duplicado = await db.execute(
            select(Ciudad).where(or_(Ciudad.nombre == data.nombre, Ciudad.codigo == data.codigo.upper()))
        )
        if duplicado.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La ciudad o codigo ya existe (E1)")

        ciudad = Ciudad(nombre=data.nombre, codigo=data.codigo.upper(), activo=data.activo)
        db.add(ciudad)
        await db.commit()
        await db.refresh(ciudad)

        await AuditoriaService.registrar_evento(
            db, accion="CREAR_CIUDAD", modulo="inventario",
            detalle=f"Creacion de ciudad {ciudad.nombre} ({ciudad.codigo})",
            usuario_id=admin.id if admin else None, usuario_email=admin.email if admin else None,
            ip_address=ip, valores_nuevos={"nombre": ciudad.nombre, "codigo": ciudad.codigo}
        )
        return ciudad

    @staticmethod
    async def actualizar(db: AsyncSession, ciudad_id: int, data: CiudadUpdate, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> Ciudad:
        ciudad = await CiudadService.obtener_por_id(db, ciudad_id)
        if data.nombre and data.nombre != ciudad.nombre:
            dupl = await db.execute(select(Ciudad).where(Ciudad.nombre == data.nombre))
            if dupl.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El nombre de ciudad ya existe (E1)")
            ciudad.nombre = data.nombre
        if data.codigo and data.codigo.upper() != ciudad.codigo:
            dupl = await db.execute(select(Ciudad).where(Ciudad.codigo == data.codigo.upper()))
            if dupl.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El codigo de ciudad ya existe (E1)")
            ciudad.codigo = data.codigo.upper()
        if data.activo is not None:
            ciudad.activo = data.activo

        await db.commit()
        await db.refresh(ciudad)
        return ciudad

    @staticmethod
    async def eliminar(db: AsyncSession, ciudad_id: int, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> bool:
        ciudad = await CiudadService.obtener_por_id(db, ciudad_id)
        sucursales = await db.execute(select(Sucursal).where(Sucursal.ciudad_id == ciudad_id))
        if sucursales.scalars().first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede eliminar la ciudad porque tiene sucursales asignadas (E2)")
        await db.delete(ciudad)
        await db.commit()
        return True


class SucursalService:
    @staticmethod
    async def listar(
        db: AsyncSession,
        ciudad_id: Optional[int] = None,
        encargado_id: Optional[int] = None,
        activo_solo: bool = False
    ) -> List[Sucursal]:
        query = select(Sucursal).options(selectinload(Sucursal.ciudad))
        filters = []
        if ciudad_id:
            filters.append(Sucursal.ciudad_id == ciudad_id)
        if encargado_id:
            filters.append(Sucursal.encargado_id == encargado_id)
        if activo_solo:
            filters.append(Sucursal.activo == True)
        if filters:
            query = query.where(and_(*filters))
        result = await db.execute(query.order_by(Sucursal.nombre))
        return list(result.scalars().all())

    @staticmethod
    async def obtener_por_id(db: AsyncSession, sucursal_id: int) -> Sucursal:
        result = await db.execute(
            select(Sucursal).options(selectinload(Sucursal.ciudad)).where(Sucursal.id == sucursal_id)
        )
        sucursal = result.scalar_one_or_none()
        if not sucursal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sucursal no encontrada")
        return sucursal

    @staticmethod
    async def crear(db: AsyncSession, data: SucursalCreate, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> Sucursal:
        # Validar ciudad
        await CiudadService.obtener_por_id(db, data.ciudad_id)

        # Validar duplicidad de nombre en misma ciudad (E1)
        dupl = await db.execute(
            select(Sucursal).where(and_(Sucursal.nombre == data.nombre, Sucursal.ciudad_id == data.ciudad_id))
        )
        if dupl.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe una sucursal con ese nombre en la ciudad (E1)")

        # Validar encargado si fue proporcionado
        if data.encargado_id:
            enc = await db.get(Usuario, data.encargado_id)
            if not enc or enc.estado != "ACTIVO":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El usuario encargado no existe o no esta activo")

        sucursal = Sucursal(
            nombre=data.nombre,
            direccion=data.direccion,
            telefono=data.telefono,
            horario_atencion=data.horario_atencion,
            capacidad_probadores=data.capacidad_probadores,
            ciudad_id=data.ciudad_id,
            encargado_id=data.encargado_id,
            activo=data.activo
        )
        db.add(sucursal)
        await db.commit()
        await db.refresh(sucursal)

        await AuditoriaService.registrar_evento(
            db, accion="CREAR_SUCURSAL", modulo="inventario",
            detalle=f"Creacion de sucursal {sucursal.nombre} en ciudad ID {sucursal.ciudad_id}",
            usuario_id=admin.id if admin else None, usuario_email=admin.email if admin else None,
            ip_address=ip, valores_nuevos={"nombre": sucursal.nombre, "ciudad_id": sucursal.ciudad_id}
        )
        return sucursal

    @staticmethod
    async def actualizar(db: AsyncSession, sucursal_id: int, data: SucursalUpdate, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> Sucursal:
        sucursal = await SucursalService.obtener_por_id(db, sucursal_id)
        if data.ciudad_id and data.ciudad_id != sucursal.ciudad_id:
            await CiudadService.obtener_por_id(db, data.ciudad_id)
            sucursal.ciudad_id = data.ciudad_id

        if data.nombre and data.nombre != sucursal.nombre:
            dupl = await db.execute(
                select(Sucursal).where(and_(Sucursal.nombre == data.nombre, Sucursal.ciudad_id == sucursal.ciudad_id))
            )
            if dupl.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe una sucursal con ese nombre en la ciudad (E1)")
            sucursal.nombre = data.nombre

        if data.direccion: sucursal.direccion = data.direccion
        if data.telefono is not None: sucursal.telefono = data.telefono
        if data.horario_atencion is not None: sucursal.horario_atencion = data.horario_atencion
        if data.capacidad_probadores is not None: sucursal.capacidad_probadores = data.capacidad_probadores
        if data.encargado_id is not None:
            if data.encargado_id > 0:
                enc = await db.get(Usuario, data.encargado_id)
                if not enc or enc.estado != "ACTIVO":
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El usuario encargado no existe o no esta activo")
                sucursal.encargado_id = data.encargado_id
            else:
                sucursal.encargado_id = None
        if data.activo is not None: sucursal.activo = data.activo

        await db.commit()
        await db.refresh(sucursal)
        return sucursal

    @staticmethod
    async def asignar_encargado(db: AsyncSession, sucursal_id: int, encargado_id: int, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> Sucursal:
        sucursal = await SucursalService.obtener_por_id(db, sucursal_id)
        enc = await db.get(Usuario, encargado_id)
        if not enc or enc.estado != "ACTIVO":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El usuario asignado no existe o no esta activo")

        encargado_anterior = sucursal.encargado_id
        sucursal.encargado_id = encargado_id
        # Tambien sincronizamos la sucursal asignada en el usuario (CU3 / CU4)
        enc.sucursal_id = sucursal_id

        await db.commit()
        await db.refresh(sucursal)

        await AuditoriaService.registrar_evento(
            db, accion="ASIGNAR_ENCARGADO_SUCURSAL", modulo="inventario",
            detalle=f"Asignacion de encargado {enc.email} a la sucursal {sucursal.nombre}",
            usuario_id=admin.id if admin else None, usuario_email=admin.email if admin else None,
            ip_address=ip, valores_anteriores={"encargado_id": encargado_anterior},
            valores_nuevos={"encargado_id": encargado_id}
        )
        return sucursal

    @staticmethod
    async def eliminar(db: AsyncSession, sucursal_id: int, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> bool:
        sucursal = await SucursalService.obtener_por_id(db, sucursal_id)
        # Validacion E2: Comprobar inventario asignado
        # Consultamos si existen registros de stock para esta sucursal
        from app.domains.catalogo.models import InventarioStock
        stock_activo = await db.execute(
            select(InventarioStock).where(and_(InventarioStock.sucursal_id == sucursal_id, InventarioStock.cantidad_disponible > 0))
        )
        if stock_activo.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Intento de eliminar sucursal activa: La sucursal tiene inventario asignado o existencias disponibles (E2)"
            )

        # En lugar de hard delete destructivo, si tiene historial se puede desactivar o borrar
        await db.delete(sucursal)
        await db.commit()

        await AuditoriaService.registrar_evento(
            db, accion="ELIMINAR_SUCURSAL", modulo="inventario",
            detalle=f"Eliminacion de sucursal {sucursal.nombre}",
            usuario_id=admin.id if admin else None, usuario_email=admin.email if admin else None,
            ip_address=ip, valores_anteriores={"id": sucursal_id, "nombre": sucursal.nombre}
        )
        return True
