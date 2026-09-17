from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.catalogo.models import (
    Categoria, Talla, Color, Temporada, Prenda, PrendaMultimedia, PrendaVariante,
    InventarioStock, MovimientoInventario, CalificacionPrenda
)
from app.domains.catalogo.schemas import (
    CategoriaCreate, CategoriaUpdate, TallaCreate, TallaUpdate,
    ColorCreate, ColorUpdate, TemporadaCreate, TemporadaUpdate,
    PrendaCreate, PrendaUpdate, PrendaMultimediaCreate, AjusteInventarioRequest,
    CalificacionCreate, CalificacionUpdate, CalificacionResponse,
    EstadisticasCalificacionesResponse, ListadoCalificacionesResponse,
    DesgloseEstrellas, DesgloseAjuste, CalificacionUsuarioInfo
)
from app.domains.inventario.models import Sucursal
from app.domains.ventas.models import Venta, DetalleVenta
from app.domains.usuarios.models import Usuario
from app.domains.usuarios.services import AuditoriaService



# =========================================================================
# CU5: PARAMETRIZACION DE MODA (CATEGORIAS, TALLAS, COLORES, TEMPORADAS)
# =========================================================================
class ParametrosModaService:
    # --- Categorias ---
    @staticmethod
    async def listar_categorias(db: AsyncSession, activo_solo: bool = False) -> List[Categoria]:
        query = select(Categoria)
        if activo_solo:
            query = query.where(Categoria.activo == True)
        result = await db.execute(query.order_by(Categoria.nombre))
        return list(result.scalars().all())

    @staticmethod
    async def crear_categoria(db: AsyncSession, data: CategoriaCreate, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> Categoria:
        dupl = await db.execute(select(Categoria).where(Categoria.nombre == data.nombre))
        if dupl.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"La categoria '{data.nombre}' ya existe (E1)")

        cat = Categoria(nombre=data.nombre, descripcion=data.descripcion, sector=data.sector, activo=data.activo)
        db.add(cat)
        await db.commit()
        await db.refresh(cat)
        await AuditoriaService.registrar_evento(
            db, accion="CREAR_CATEGORIA", modulo="catalogo",
            detalle=f"Creacion de categoria {cat.nombre} ({cat.sector})",
            usuario_id=admin.id if admin else None, ip_address=ip
        )
        return cat

    @staticmethod
    async def actualizar_categoria(db: AsyncSession, id: int, data: CategoriaUpdate, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> Categoria:
        res = await db.execute(select(Categoria).where(Categoria.id == id))
        cat = res.scalar_one_or_none()
        if not cat:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria no encontrada")
        if data.nombre and data.nombre != cat.nombre:
            dupl = await db.execute(select(Categoria).where(Categoria.nombre == data.nombre))
            if dupl.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El nombre de categoria ya existe (E1)")
            cat.nombre = data.nombre
        if data.descripcion is not None: cat.descripcion = data.descripcion
        if data.sector is not None: cat.sector = data.sector
        if data.activo is not None: cat.activo = data.activo
        await db.commit()
        await db.refresh(cat)
        return cat

    @staticmethod
    async def eliminar_categoria(db: AsyncSession, id: int, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> bool:
        res = await db.execute(select(Categoria).where(Categoria.id == id))
        cat = res.scalar_one_or_none()
        if not cat:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria no encontrada")
        prendas = await db.execute(select(Prenda).where(Prenda.categoria_id == id))
        if prendas.scalars().first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Intento de eliminar atributo en uso: existen productos asociados (E2)")
        await db.delete(cat)
        await db.commit()
        return True

    # --- Tallas ---
    @staticmethod
    async def listar_tallas(db: AsyncSession, activo_solo: bool = False) -> List[Talla]:
        query = select(Talla)
        if activo_solo:
            query = query.where(Talla.activo == True)
        result = await db.execute(query.order_by(Talla.orden, Talla.codigo))
        return list(result.scalars().all())

    @staticmethod
    async def crear_talla(db: AsyncSession, data: TallaCreate, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> Talla:
        dupl = await db.execute(select(Talla).where(Talla.codigo == data.codigo.upper()))
        if dupl.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"La talla '{data.codigo}' ya existe (E1)")
        talla = Talla(codigo=data.codigo.upper(), descripcion=data.descripcion, orden=data.orden, activo=data.activo)
        db.add(talla)
        await db.commit()
        await db.refresh(talla)
        return talla

    @staticmethod
    async def actualizar_talla(db: AsyncSession, id: int, data: TallaUpdate, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> Talla:
        res = await db.execute(select(Talla).where(Talla.id == id))
        talla = res.scalar_one_or_none()
        if not talla:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Talla no encontrada")
        if data.codigo and data.codigo.upper() != talla.codigo:
            dupl = await db.execute(select(Talla).where(Talla.codigo == data.codigo.upper()))
            if dupl.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El codigo de talla ya existe (E1)")
            talla.codigo = data.codigo.upper()
        if data.descripcion is not None: talla.descripcion = data.descripcion
        if data.orden is not None: talla.orden = data.orden
        if data.activo is not None: talla.activo = data.activo
        await db.commit()
        await db.refresh(talla)
        return talla

    @staticmethod
    async def eliminar_talla(db: AsyncSession, id: int, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> bool:
        res = await db.execute(select(Talla).where(Talla.id == id))
        talla = res.scalar_one_or_none()
        if not talla:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Talla no encontrada")
        variantes = await db.execute(select(PrendaVariante).where(PrendaVariante.talla_id == id))
        if variantes.scalars().first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Intento de eliminar talla en uso por prendas (E2)")
        await db.delete(talla)
        await db.commit()
        return True

    # --- Colores ---
    @staticmethod
    async def listar_colores(db: AsyncSession, activo_solo: bool = False) -> List[Color]:
        query = select(Color)
        if activo_solo:
            query = query.where(Color.activo == True)
        result = await db.execute(query.order_by(Color.nombre))
        return list(result.scalars().all())

    @staticmethod
    async def crear_color(db: AsyncSession, data: ColorCreate, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> Color:
        dupl = await db.execute(select(Color).where(Color.nombre == data.nombre))
        if dupl.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"El color '{data.nombre}' ya existe (E1)")
        color = Color(nombre=data.nombre, codigo_hex=data.codigo_hex, codigo_rgb=data.codigo_rgb, activo=data.activo)
        db.add(color)
        await db.commit()
        await db.refresh(color)
        return color

    @staticmethod
    async def actualizar_color(db: AsyncSession, id: int, data: ColorUpdate, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> Color:
        res = await db.execute(select(Color).where(Color.id == id))
        color = res.scalar_one_or_none()
        if not color:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Color no encontrado")
        if data.nombre and data.nombre != color.nombre:
            dupl = await db.execute(select(Color).where(Color.nombre == data.nombre))
            if dupl.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El nombre de color ya existe (E1)")
            color.nombre = data.nombre
        if data.codigo_hex is not None: color.codigo_hex = data.codigo_hex
        if data.codigo_rgb is not None: color.codigo_rgb = data.codigo_rgb
        if data.activo is not None: color.activo = data.activo
        await db.commit()
        await db.refresh(color)
        return color

    @staticmethod
    async def eliminar_color(db: AsyncSession, id: int, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> bool:
        res = await db.execute(select(Color).where(Color.id == id))
        color = res.scalar_one_or_none()
        if not color:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Color no encontrado")
        variantes = await db.execute(select(PrendaVariante).where(PrendaVariante.color_id == id))
        if variantes.scalars().first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Intento de eliminar color en uso por prendas (E2)")
        await db.delete(color)
        await db.commit()
        return True

    # --- Temporadas ---
    @staticmethod
    async def listar_temporadas(db: AsyncSession, activo_solo: bool = False) -> List[Temporada]:
        query = select(Temporada)
        if activo_solo:
            query = query.where(Temporada.activo == True)
        result = await db.execute(query.order_by(desc(Temporada.created_at)))
        return list(result.scalars().all())

    @staticmethod
    async def crear_temporada(db: AsyncSession, data: TemporadaCreate, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> Temporada:
        dupl = await db.execute(
            select(Temporada).where(or_(Temporada.nombre == data.nombre, Temporada.codigo == data.codigo.upper()))
        )
        if dupl.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La temporada o codigo ya existe (E1)")
        temp = Temporada(
            nombre=data.nombre,
            codigo=data.codigo.upper(),
            fecha_inicio=data.fecha_inicio,
            fecha_fin=data.fecha_fin,
            activo=data.activo
        )
        db.add(temp)
        await db.commit()
        await db.refresh(temp)
        return temp

    @staticmethod
    async def actualizar_temporada(db: AsyncSession, id: int, data: TemporadaUpdate, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> Temporada:
        res = await db.execute(select(Temporada).where(Temporada.id == id))
        temp = res.scalar_one_or_none()
        if not temp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Temporada no encontrada")
        if data.nombre: temp.nombre = data.nombre
        if data.codigo: temp.codigo = data.codigo.upper()
        if data.fecha_inicio is not None: temp.fecha_inicio = data.fecha_inicio
        if data.fecha_fin is not None: temp.fecha_fin = data.fecha_fin
        if data.activo is not None: temp.activo = data.activo
        await db.commit()
        await db.refresh(temp)
        return temp

    @staticmethod
    async def eliminar_temporada(db: AsyncSession, id: int, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> bool:
        res = await db.execute(select(Temporada).where(Temporada.id == id))
        temp = res.scalar_one_or_none()
        if not temp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Temporada no encontrada")
        prendas = await db.execute(select(Prenda).where(Prenda.temporada_id == id))
        if prendas.scalars().first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Intento de eliminar temporada asociada a productos (E2)")
        await db.delete(temp)
        await db.commit()
        return True


# =========================================================================
# CU6: GESTION DE CATALOGO E INVENTARIO DE PRENDAS (MULTIMEDIA AR / STOCK)
# =========================================================================
class PrendaService:
    @staticmethod
    async def listar(
        db: AsyncSession,
        categoria_id: Optional[int] = None,
        temporada_id: Optional[int] = None,
        sector: Optional[str] = None,
        sucursal_id: Optional[int] = None,
        activo_solo: bool = True,
        limit: int = 50,
        offset: int = 0
    ) -> List[Prenda]:
        query = select(Prenda).options(
            selectinload(Prenda.categoria),
            selectinload(Prenda.temporada),
            selectinload(Prenda.multimedia),
            selectinload(Prenda.variantes).selectinload(PrendaVariante.talla),
            selectinload(Prenda.variantes).selectinload(PrendaVariante.color),
            selectinload(Prenda.calificaciones)
        )
        filters = []
        if activo_solo:
            filters.append(Prenda.activo == True)
        if categoria_id:
            filters.append(Prenda.categoria_id == categoria_id)
        if temporada_id:
            filters.append(Prenda.temporada_id == temporada_id)
        if sector:
            filters.append(Prenda.categoria.has(Categoria.sector == sector))
        
        # Filtro de disponibilidad por sucursal (RF08)
        if sucursal_id:
            filters.append(
                Prenda.variantes.any(
                    PrendaVariante.stock_items.any(
                        and_(InventarioStock.sucursal_id == sucursal_id, InventarioStock.cantidad_disponible > 0)
                    )
                )
            )

        if filters:
            query = query.where(and_(*filters))

        query = query.order_by(desc(Prenda.created_at)).limit(limit).offset(offset)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def obtener_por_id(db: AsyncSession, prenda_id: int) -> Prenda:
        query = select(Prenda).options(
            selectinload(Prenda.categoria),
            selectinload(Prenda.temporada),
            selectinload(Prenda.multimedia),
            selectinload(Prenda.variantes).selectinload(PrendaVariante.talla),
            selectinload(Prenda.variantes).selectinload(PrendaVariante.color),
            selectinload(Prenda.variantes).selectinload(PrendaVariante.stock_items),
            selectinload(Prenda.calificaciones)
        ).where(Prenda.id == prenda_id)
        result = await db.execute(query)
        prenda = result.scalar_one_or_none()
        if not prenda:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prenda no encontrada en catalogo")
        return prenda

    @staticmethod
    async def crear(db: AsyncSession, data: PrendaCreate, admin: Optional[Usuario] = None, ip: Optional[str] = None) -> Prenda:
        # Validar SKU unico (E1)
        dupl = await db.execute(select(Prenda).where(Prenda.sku == data.sku.upper()))
        if dupl.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Codigo SKU duplicado '{data.sku}': Conflicto de identificador (E1)")

        # Validar categoria y temporada
        cat = await db.get(Categoria, data.categoria_id)
        if not cat: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Categoria no existe")
        temp = await db.get(Temporada, data.temporada_id)
        if not temp: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Temporada no existe")

        prenda = Prenda(
            sku=data.sku.upper(),
            nombre=data.nombre,
            descripcion=data.descripcion,
            precio_base=float(data.precio_base),
            categoria_id=data.categoria_id,
            temporada_id=data.temporada_id
        )
        db.add(prenda)
        await db.flush()

        # Crear variantes (talla + color)
        for var_in in data.variantes:
            talla = await db.get(Talla, var_in.talla_id)
            color = await db.get(Color, var_in.color_id)
            sku_var = var_in.sku_variante or f"{prenda.sku}-{talla.codigo if talla else 'T'}-{color.nombre[:3].upper() if color else 'C'}"
            variante = PrendaVariante(
                prenda_id=prenda.id,
                talla_id=var_in.talla_id,
                color_id=var_in.color_id,
                sku_variante=sku_var,
                codigo_barras=var_in.codigo_barras
            )
            db.add(variante)

        await db.commit()
        await db.refresh(prenda)

        await AuditoriaService.registrar_evento(
            db, accion="REGISTRAR_PRENDA", modulo="catalogo",
            detalle=f"Registro de nueva prenda {prenda.nombre} (SKU: {prenda.sku})",
            usuario_id=admin.id if admin else None, ip_address=ip,
            valores_nuevos={"sku": prenda.sku, "precio": float(prenda.precio_base)}
        )
        return await PrendaService.obtener_por_id(db, prenda.id)

    @staticmethod
    async def vincular_multimedia(
        db: AsyncSession,
        prenda_id: int,
        data: PrendaMultimediaCreate,
        admin: Optional[Usuario] = None,
        ip: Optional[str] = None
    ) -> PrendaMultimedia:
        prenda = await PrendaService.obtener_por_id(db, prenda_id)

        # Validacion E2: Formato de archivo 3D incompatible
        extension = data.formato.lower()
        if data.tipo in ["MODELO_3D_GLB", "MODELO_3D_USDZ"]:
            if extension not in [".glb", ".usdz"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Formato de archivo 3D incompatible: El sistema solo admite .glb o .usdz para Realidad Aumentada (E2)"
                )
        else:
            if extension not in [".jpg", ".jpeg", ".png", ".webp"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Formato de imagen incompatible: Se admite solo .jpg, .jpeg, .png, .webp (E2)"
                )

        media = PrendaMultimedia(
            prenda_id=prenda.id,
            tipo=data.tipo,
            url=data.url,
            formato=extension,
            es_portada=data.es_portada
        )
        db.add(media)
        await db.commit()
        await db.refresh(media)

        await AuditoriaService.registrar_evento(
            db, accion="VINCULAR_MULTIMEDIA_AR", modulo="catalogo",
            detalle=f"Vinculacion de multimedia {data.tipo} ({data.formato}) a la prenda {prenda.sku}",
            usuario_id=admin.id if admin else None, ip_address=ip
        )
        return media


class StockService:
    @staticmethod
    async def ajustar_inventario(
        db: AsyncSession,
        data: AjusteInventarioRequest,
        admin: Optional[Usuario] = None,
        ip: Optional[str] = None
    ) -> InventarioStock:
        # Validar variante
        var_res = await db.execute(select(PrendaVariante).where(PrendaVariante.id == data.variante_id))
        variante = var_res.scalar_one_or_none()
        if not variante:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variante de prenda no encontrada")

        # Validar sucursal
        suc_res = await db.execute(select(Sucursal).where(Sucursal.id == data.sucursal_id))
        sucursal = suc_res.scalar_one_or_none()
        if not sucursal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sucursal no encontrada")

        # Obtener o inicializar stock
        stk_res = await db.execute(
            select(InventarioStock).where(
                and_(InventarioStock.variante_id == data.variante_id, InventarioStock.sucursal_id == data.sucursal_id)
            )
        )
        stock = stk_res.scalar_one_or_none()
        if not stock:
            stock = InventarioStock(
                variante_id=data.variante_id,
                sucursal_id=data.sucursal_id,
                cantidad_disponible=0,
                cantidad_reservada=0
            )
            db.add(stock)
            await db.flush()

        cantidad_anterior = stock.cantidad_disponible

        # Calcular nueva cantidad
        if data.tipo_movimiento in ["INGRESO_INICIAL", "AJUSTE_POSITIVO", "DEVOLUCION"]:
            cantidad_nueva = cantidad_anterior + data.cantidad
        else:
            cantidad_nueva = cantidad_anterior - data.cantidad

        # Validacion E3: Ajuste con stock resultante negativo
        if cantidad_nueva < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ajuste con stock resultante negativo ({cantidad_nueva}): El sistema restringe la operacion (E3)"
            )

        stock.cantidad_disponible = cantidad_nueva

        # Registrar movimiento de inventario
        movimiento = MovimientoInventario(
            stock_id=stock.id,
            tipo_movimiento=data.tipo_movimiento,
            cantidad=data.cantidad,
            cantidad_anterior=cantidad_anterior,
            cantidad_nueva=cantidad_nueva,
            motivo=data.motivo,
            usuario_id=admin.id if admin else None
        )
        db.add(movimiento)
        await db.commit()
        await db.refresh(stock)

        await AuditoriaService.registrar_evento(
            db, accion="AJUSTE_INVENTARIO", modulo="inventario",
            detalle=f"Ajuste de inventario en {sucursal.nombre} para variante SKU {variante.sku_variante}: {cantidad_anterior} -> {cantidad_nueva} ({data.motivo})",
            usuario_id=admin.id if admin else None, ip_address=ip,
            valores_anteriores={"stock_anterior": cantidad_anterior},
            valores_nuevos={"stock_nuevo": cantidad_nueva, "tipo": data.tipo_movimiento}
        )
        return stock

    @staticmethod
    async def consultar_stock_sucursal(db: AsyncSession, sucursal_id: int) -> List[InventarioStock]:
        query = select(InventarioStock).options(
            selectinload(InventarioStock.variante).selectinload(PrendaVariante.talla),
            selectinload(InventarioStock.variante).selectinload(PrendaVariante.color),
            selectinload(InventarioStock.variante).selectinload(PrendaVariante.prenda)
        ).where(InventarioStock.sucursal_id == sucursal_id)
        result = await db.execute(query)
        return list(result.scalars().all())


# =========================================================================
# CU18: CALIFICACIONES Y RESEÑAS DE PRENDAS (VERIFIED BUYER / METRICAS)
# =========================================================================
class CalificacionService:
    @staticmethod
    async def verificar_compra(db: AsyncSession, usuario_id: int, prenda_id: int) -> bool:
        """Verifica si el usuario tiene una compra PAGADA que incluya alguna variante de la prenda."""
        query = (
            select(DetalleVenta.id)
            .join(Venta, DetalleVenta.venta_id == Venta.id)
            .join(PrendaVariante, DetalleVenta.variante_id == PrendaVariante.id)
            .where(
                Venta.cliente_id == usuario_id,
                Venta.estado == "PAGADA",
                PrendaVariante.prenda_id == prenda_id
            )
            .limit(1)
        )
        res = await db.execute(query)
        return res.scalar() is not None

    @staticmethod
    async def listar_calificaciones(
        db: AsyncSession, prenda_id: int, usuario_actual_id: Optional[int] = None
    ) -> ListadoCalificacionesResponse:
        """Obtiene las métricas estadísticas y la lista de opiniones para la prenda."""
        prenda = await db.get(Prenda, prenda_id)
        if not prenda:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prenda no encontrada")

        query = (
            select(CalificacionPrenda)
            .options(selectinload(CalificacionPrenda.usuario))
            .where(CalificacionPrenda.prenda_id == prenda_id, CalificacionPrenda.activo == True)
            .order_by(desc(CalificacionPrenda.created_at))
        )
        result = await db.execute(query)
        calificaciones = list(result.scalars().all())

        total = len(calificaciones)
        if total > 0:
            promedio = round(sum(c.puntuacion for c in calificaciones) / total, 1)
            promedio_calidad = round(sum(c.calidad for c in calificaciones) / total, 1)
            estrellas = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            ajustes = {"PEQUENO": 0, "FIEL": 0, "GRANDE": 0}
            for c in calificaciones:
                estrellas[c.puntuacion] = estrellas.get(c.puntuacion, 0) + 1
                ajuste_key = c.ajuste_talla.upper() if c.ajuste_talla else "FIEL"
                ajustes[ajuste_key] = ajustes.get(ajuste_key, 0) + 1

            desglose_est = DesgloseEstrellas(
                estrellas_5=estrellas[5],
                estrellas_4=estrellas[4],
                estrellas_3=estrellas[3],
                estrellas_2=estrellas[2],
                estrellas_1=estrellas[1],
            )
            desglose_aj = DesgloseAjuste(
                pequeno=ajustes.get("PEQUENO", 0),
                fiel=ajustes.get("FIEL", 0),
                grande=ajustes.get("GRANDE", 0),
            )
            porcentaje_fiel = round((ajustes.get("FIEL", 0) / total) * 100)
        else:
            promedio = 0.0
            promedio_calidad = 0.0
            desglose_est = DesgloseEstrellas()
            desglose_aj = DesgloseAjuste()
            porcentaje_fiel = 100

        estadisticas = EstadisticasCalificacionesResponse(
            promedio=promedio,
            total_resenas=total,
            promedio_calidad=promedio_calidad,
            desglose_estrellas=desglose_est,
            desglose_ajuste=desglose_aj,
            porcentaje_fiel_talla=porcentaje_fiel
        )

        calificaciones_dto = []
        mi_calif_dto = None
        for c in calificaciones:
            user_info = None
            if c.usuario:
                user_info = CalificacionUsuarioInfo(
                    id=c.usuario.id,
                    nombre=c.usuario.nombre,
                    apellido=c.usuario.apellido,
                    email=c.usuario.email
                )
            dto = CalificacionResponse(
                id=c.id,
                prenda_id=c.prenda_id,
                usuario_id=c.usuario_id,
                puntuacion=c.puntuacion,
                ajuste_talla=c.ajuste_talla,
                calidad=c.calidad,
                titulo=c.titulo,
                comentario=c.comentario,
                compra_verificada=c.compra_verificada,
                activo=c.activo,
                created_at=c.created_at,
                updated_at=c.updated_at,
                usuario=user_info
            )
            calificaciones_dto.append(dto)
            if usuario_actual_id and c.usuario_id == usuario_actual_id:
                mi_calif_dto = dto

        es_verificado = False
        if usuario_actual_id:
            es_verificado = await CalificacionService.verificar_compra(db, usuario_actual_id, prenda_id)

        return ListadoCalificacionesResponse(
            estadisticas=estadisticas,
            calificaciones=calificaciones_dto,
            mi_calificacion=mi_calif_dto,
            es_comprador_verificado=es_verificado
        )

    @staticmethod
    async def crear_o_actualizar(
        db: AsyncSession, prenda_id: int, data: CalificacionCreate, usuario: Usuario, ip: Optional[str] = None
    ) -> CalificacionPrenda:
        """Crea o actualiza la calificación de un usuario para una prenda con verificación de compra."""
        prenda = await db.get(Prenda, prenda_id)
        if not prenda or not prenda.activo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prenda no encontrada o inactiva")

        compra_verificada = await CalificacionService.verificar_compra(db, usuario.id, prenda_id)

        query = select(CalificacionPrenda).where(
            CalificacionPrenda.prenda_id == prenda_id,
            CalificacionPrenda.usuario_id == usuario.id
        )
        res = await db.execute(query)
        calif = res.scalar_one_or_none()

        if calif:
            calif.puntuacion = data.puntuacion
            calif.ajuste_talla = data.ajuste_talla
            calif.calidad = data.calidad
            calif.titulo = data.titulo
            calif.comentario = data.comentario
            calif.compra_verificada = compra_verificada
            calif.activo = True
            calif.updated_at = datetime.now(timezone.utc)
            accion = "ACTUALIZAR_CALIFICACION"
        else:
            calif = CalificacionPrenda(
                prenda_id=prenda_id,
                usuario_id=usuario.id,
                puntuacion=data.puntuacion,
                ajuste_talla=data.ajuste_talla,
                calidad=data.calidad,
                titulo=data.titulo,
                comentario=data.comentario,
                compra_verificada=compra_verificada,
                activo=True
            )
            db.add(calif)
            accion = "CREAR_CALIFICACION"

        await db.commit()
        await db.refresh(calif)

        await AuditoriaService.registrar_evento(
            db,
            accion=accion,
            modulo="catalogo",
            detalle=f"{accion} de prenda '{prenda.nombre}' (ID {prenda_id}): {data.puntuacion} estrellas - '{data.titulo}' (Verificada: {compra_verificada})",
            usuario_id=usuario.id,
            ip_address=ip
        )
        return calif

    @staticmethod
    async def eliminar(
        db: AsyncSession, calificacion_id: int, usuario: Usuario, ip: Optional[str] = None
    ) -> bool:
        """Elimina la calificación si pertenece al usuario o si tiene rol de administración."""
        res = await db.execute(
            select(CalificacionPrenda).options(selectinload(CalificacionPrenda.prenda)).where(CalificacionPrenda.id == calificacion_id)
        )
        calif = res.scalar_one_or_none()
        if not calif:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calificación no encontrada")

        es_autor = (calif.usuario_id == usuario.id)
        es_admin = False
        if usuario.rol and usuario.rol.nombre in ["ADMINISTRADOR", "GERENTE", "ADMIN"]:
            es_admin = True

        if not es_autor and not es_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para eliminar esta reseña")

        prenda_nombre = calif.prenda.nombre if calif.prenda else f"ID {calif.prenda_id}"
        await db.delete(calif)
        await db.commit()

        await AuditoriaService.registrar_evento(
            db,
            accion="ELIMINAR_CALIFICACION",
            modulo="catalogo",
            detalle=f"Eliminacion de calificacion ID {calificacion_id} para prenda '{prenda_nombre}'",
            usuario_id=usuario.id,
            ip_address=ip
        )
        return True

