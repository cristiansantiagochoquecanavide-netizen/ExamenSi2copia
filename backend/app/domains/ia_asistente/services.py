"""Capa de Servicio (Logica de Negocio) para el dominio de Inteligencia Artificial y Recomendaciones (CU19)."""
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy import select, and_, or_, desc, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.domains.ia_asistente.models import PreferenciaEstiloUsuario, InteraccionRecomendacion
from app.domains.ia_asistente.schemas import (
    PreferenciaEstiloCreate, PreferenciaEstiloResponse,
    RecomendacionPrendaItem, OutfitSugeridoResponse, DashboardRecomendacionesResponse
)
from app.domains.catalogo.models import Prenda, Categoria, Temporada, PrendaMultimedia, PrendaVariante, CalificacionPrenda
from app.domains.ventas.models import Venta, DetalleVenta
from app.domains.reservas.models import Reserva, DetalleReserva
from app.domains.usuarios.models import Usuario


class IaasistenteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_status(self) -> dict:
        """Retorna el estado operativo del servicio del dominio."""
        return {
            "domain": "ia_asistente",
            "status": "ready",
            "description": "Recomendador inteligente de prendas, personal styling studio, outfits y telemetria"
        }

    # =========================================================================
    # 1. PERFIL DE ESTILO DEL CLIENTE (QUIZ DE ESTILO)
    # =========================================================================
    async def obtener_preferencias(self, usuario_id: int) -> Optional[PreferenciaEstiloResponse]:
        result = await self.db.execute(
            select(PreferenciaEstiloUsuario).where(PreferenciaEstiloUsuario.usuario_id == usuario_id)
        )
        pref = result.scalar_one_or_none()
        if not pref:
            return None
        return PreferenciaEstiloResponse.model_validate(pref)

    async def guardar_o_actualizar_preferencias(
        self, usuario_id: int, data: PreferenciaEstiloCreate
    ) -> PreferenciaEstiloResponse:
        result = await self.db.execute(
            select(PreferenciaEstiloUsuario).where(PreferenciaEstiloUsuario.usuario_id == usuario_id)
        )
        pref = result.scalar_one_or_none()

        if pref:
            pref.sector_preferido = data.sector_preferido.upper()
            pref.ocasion_frecuente = data.ocasion_frecuente.upper()
            pref.estilos_preferidos = data.estilos_preferidos
            pref.colores_favoritos = data.colores_favoritos
            pref.presupuesto_max = Decimal(str(data.presupuesto_max)) if data.presupuesto_max is not None else None
            pref.completado = True
            pref.updated_at = datetime.now(timezone.utc)
        else:
            pref = PreferenciaEstiloUsuario(
                usuario_id=usuario_id,
                sector_preferido=data.sector_preferido.upper(),
                ocasion_frecuente=data.ocasion_frecuente.upper(),
                estilos_preferidos=data.estilos_preferidos,
                colores_favoritos=data.colores_favoritos,
                presupuesto_max=Decimal(str(data.presupuesto_max)) if data.presupuesto_max is not None else None,
                completado=True
            )
            self.db.add(pref)

        await self.db.commit()
        await self.db.refresh(pref)
        return PreferenciaEstiloResponse.model_validate(pref)

    # =========================================================================
    # 2. MOTOR HÍBRIDO DE RECOMENDACIONES IA
    # =========================================================================
    def _extraer_imagen(self, prenda: Prenda) -> Optional[str]:
        if not prenda.multimedia:
            return None
        for m in prenda.multimedia:
            if m.tipo == "IMAGEN" and m.es_portada:
                return m.url
        for m in prenda.multimedia:
            if m.tipo == "IMAGEN":
                return m.url
        return None

    def _construir_item(self, prenda: Prenda, match_score: int, motivo: str, etiqueta: str) -> RecomendacionPrendaItem:
        return RecomendacionPrendaItem(
            id=prenda.id,
            sku=prenda.sku,
            nombre=prenda.nombre,
            descripcion=prenda.descripcion,
            precio_base=float(prenda.precio_base),
            categoria_id=prenda.categoria_id,
            categoria_nombre=prenda.categoria.nombre if prenda.categoria else "General",
            sector=prenda.categoria.sector if prenda.categoria else "UNISEX",
            temporada_nombre=prenda.temporada.nombre if prenda.temporada else None,
            imagen_url=self._extraer_imagen(prenda),
            rating_promedio=prenda.rating_promedio or 5.0,
            total_resenas=prenda.total_resenas or 0,
            match_score=match_score,
            motivo_recomendacion=motivo,
            etiqueta_ia=etiqueta
        )

    async def obtener_historial_compras_y_reservas(self, usuario_id: int) -> Tuple[set, set]:
        """Obtiene categorías y prendas compradas o reservadas por el cliente."""
        categorias_afines = set()
        prendas_vistas = set()

        # Compras pagadas
        v_res = await self.db.execute(
            select(DetalleVenta)
            .join(Venta)
            .join(PrendaVariante, DetalleVenta.variante_id == PrendaVariante.id)
            .join(Prenda, PrendaVariante.prenda_id == Prenda.id)
            .where(Venta.cliente_id == usuario_id, Venta.estado == "PAGADA")
            .options(selectinload(DetalleVenta.variante).selectinload(PrendaVariante.prenda))
        )
        for det in v_res.scalars().all():
            if det.variante and det.variante.prenda:
                prendas_vistas.add(det.variante.prenda.id)
                categorias_afines.add(det.variante.prenda.categoria_id)

        # Reservas confirmadas / probadas
        r_res = await self.db.execute(
            select(DetalleReserva)
            .join(Reserva)
            .join(PrendaVariante, DetalleReserva.variante_id == PrendaVariante.id)
            .join(Prenda, PrendaVariante.prenda_id == Prenda.id)
            .where(Reserva.cliente_id == usuario_id)
            .options(selectinload(DetalleReserva.variante).selectinload(PrendaVariante.prenda))
        )
        for det in r_res.scalars().all():
            if det.variante and det.variante.prenda:
                prendas_vistas.add(det.variante.prenda.id)
                categorias_afines.add(det.variante.prenda.categoria_id)

        # Reseñas positivas (>= 4 estrellas)
        calif_res = await self.db.execute(
            select(CalificacionPrenda)
            .where(CalificacionPrenda.usuario_id == usuario_id, CalificacionPrenda.puntuacion >= 4)
            .options(selectinload(CalificacionPrenda.prenda))
        )
        for cal in calif_res.scalars().all():
            if cal.prenda:
                prendas_vistas.add(cal.prenda.id)
                categorias_afines.add(cal.prenda.categoria_id)

        return categorias_afines, prendas_vistas

    async def calcular_recomendaciones(
        self,
        usuario_id: Optional[int] = None,
        limit: int = 12,
        ocasion: Optional[str] = None,
        sector: Optional[str] = None
    ) -> List[RecomendacionPrendaItem]:
        """Algoritmo de recomendación híbrido multi-criterio."""
        # 1. Cargar todas las prendas activas con sus relaciones
        query = select(Prenda).options(
            selectinload(Prenda.categoria),
            selectinload(Prenda.temporada),
            selectinload(Prenda.multimedia),
            selectinload(Prenda.calificaciones)
        ).where(Prenda.activo == True)

        result = await self.db.execute(query)
        prendas = list(result.scalars().all())

        if not prendas:
            return []

        # 2. Cargar perfil de usuario si está logueado
        pref: Optional[PreferenciaEstiloUsuario] = None
        categorias_compradas = set()
        prendas_interactuadas = set()

        if usuario_id:
            p_res = await self.db.execute(
                select(PreferenciaEstiloUsuario).where(PreferenciaEstiloUsuario.usuario_id == usuario_id)
            )
            pref = p_res.scalar_one_or_none()
            categorias_compradas, prendas_interactuadas = await self.obtener_historial_compras_y_reservas(usuario_id)

        # 3. Determinar parámetros efectivos
        filtro_sector = (sector or (pref.sector_preferido if pref else None) or "UNISEX").upper()
        filtro_ocasion = (ocasion or (pref.ocasion_frecuente if pref else None) or "CASUAL").upper()

        scored_items: List[Tuple[int, RecomendacionPrendaItem]] = []

        for p in prendas:
            score = 65  # Base score
            motivos = []
            p_sector = p.categoria.sector.upper() if p.categoria else "UNISEX"
            cat_nombre = p.categoria.nombre if p.categoria else "Indumentaria"
            temp_nombre = p.temporada.nombre if p.temporada else "Colección Actual"

            # A. Afinidad de Sector (+15 pts)
            if filtro_sector in ("UNISEX", "TODOS") or p_sector == "UNISEX" or p_sector == filtro_sector:
                score += 15
            else:
                score -= 10

            # B. Presupuesto (+10 pts)
            if pref and pref.presupuesto_max:
                if p.precio_base <= pref.presupuesto_max:
                    score += 10
                    motivos.append("Se ajusta perfectamente a tu rango de presupuesto")
                else:
                    score -= 5

            # C. Afinidad con Historial de Compras y Reservas (+15 pts)
            if p.categoria_id in categorias_compradas:
                score += 15
                motivos.append(f"Afinidad alta con tus compras y elecciones previas en {cat_nombre}")
            elif p.id in prendas_interactuadas:
                score += 10
                motivos.append("Seleccionado por tu interés en prendas de esta silueta")

            # D. Ocasión de Uso (+15 pts)
            desc_lower = (p.descripcion + " " + p.nombre).lower()
            if filtro_ocasion == "GALA" and ("gala" in desc_lower or "noche" in desc_lower or "seda" in desc_lower):
                score += 15
                motivos.append("Ideal para tus eventos nocturnos y galas de alta costura")
            elif filtro_ocasion in ("FORMAL_OFICINA", "FORMAL") and ("sartorial" in desc_lower or "blazer" in desc_lower or "oficina" in desc_lower):
                score += 15
                motivos.append("Alineado a tu estilo ejecutivo formal y cortes sartoriales")
            elif filtro_ocasion == "COCTEL" and ("coctel" in desc_lower or "vestido" in desc_lower):
                score += 15
                motivos.append("Corte sofisticado óptimo para ocasiones de cóctel")
            elif filtro_ocasion == "URBANO" and ("algodón" in desc_lower or "casual" in desc_lower):
                score += 12
                motivos.append("Confort premium y versatilidad para estilo urbano")

            # E. Temporada Activa (+10 pts)
            if p.temporada and p.temporada.activo:
                score += 10
                if not motivos:
                    motivos.append(f"Pieza protagónica de la colección {temp_nombre}")

            # F. Calificaciones Altas del CU18 (+10 pts)
            rating = p.rating_promedio
            if rating >= 4.5:
                score += 10
                motivos.append(f"Excelencia ratificada con {rating}★ por compradoras verificadas")

            # Normalizar score a 70..99
            final_score = min(99, max(72, score))

            # Definir Etiqueta
            if final_score >= 96:
                etiqueta = "MATCH PERFECTO (98%)"
            elif p.categoria_id in categorias_compradas:
                etiqueta = "BASADO EN TUS COMPRAS"
            elif rating >= 4.8:
                etiqueta = f"TOP RATED {rating}★"
            elif p.temporada and p.temporada.activo:
                etiqueta = "TENDENCIA DE TEMPORADA"
            else:
                etiqueta = "SELECCIÓN ATELIER IA"

            motivo_final = motivos[0] if motivos else f"Recomendación estilística personalizada para la ocasión {filtro_ocasion.lower()}"
            item = self._construir_item(p, final_score, motivo_final, etiqueta)
            scored_items.append((final_score, item))

        # Ordenar por score descendente
        scored_items.sort(key=lambda x: x[0], reverse=True)
        return [item for _, item in scored_items[:limit]]

    # =========================================================================
    # 3. OUTFITS COMPLETOS ("COMPLETA TU LOOK")
    # =========================================================================
    async def generar_outfits_destacados(self, prendas_catalogo: List[Prenda]) -> List[OutfitSugeridoResponse]:
        """Crea 2-3 combinaciones estilísticas elegantes y coherentes."""
        outfits: List[OutfitSugeridoResponse] = []
        if len(prendas_catalogo) < 2:
            return outfits

        # Buscar prendas icónicas para armar conjuntos
        vestido_noir = next((p for p in prendas_catalogo if "seda noir" in p.nombre.lower()), None)
        blazer_milano = next((p for p in prendas_catalogo if "sartorial milano" in p.nombre.lower()), None)
        blusa_seda = next((p for p in prendas_catalogo if "camisa" in p.nombre.lower() or "blusa" in p.nombre.lower() or "seda" in p.nombre.lower()), None)

        # Look 1: Gala Nocturna & Sartorial
        if vestido_noir and blazer_milano:
            p1 = self._construir_item(vestido_noir, 98, "Pieza central del conjunto", "PRENDA BASE")
            p2 = self._construir_item(blazer_milano, 96, "Contraste estructurado de sastrería italiana", "COMPLEMENTO")
            total = float(vestido_noir.precio_base + blazer_milano.precio_base)
            outfits.append(OutfitSugeridoResponse(
                id="look-gala-noir",
                nombre_look="Ensemble Gala Noir & Milano",
                descripcion_estilo="Fusión de la fluidez etérea de la seda Noir con la precisión geométrica de la sastrería italiana Milano.",
                ocasion="Gala y Noches de Gala",
                prendas=[p1, p2],
                precio_total=total,
                ahorro_estimado=round(total * 0.10, 2),
                match_score=98
            ))

        # Look 2: Ejecutivo de Alta Costura
        prendas_restantes = [p for p in prendas_catalogo if p.id not in (vestido_noir.id if vestido_noir else 0, blazer_milano.id if blazer_milano else 0)]
        if blazer_milano and prendas_restantes:
            comp = prendas_restantes[0]
            p1 = self._construir_item(blazer_milano, 95, "Pieza de autoridad sartorial", "PRENDA BASE")
            p2 = self._construir_item(comp, 93, "Acompañamiento armónico y sofisticado", "COMPLEMENTO")
            total = float(blazer_milano.precio_base + comp.precio_base)
            outfits.append(OutfitSugeridoResponse(
                id="look-executive-chic",
                nombre_look="Sartorial Executive Chic",
                descripcion_estilo="Silueta contemporánea pensada para presentaciones de alto impacto o cenas formales.",
                ocasion="Formal & Negocios",
                prendas=[p1, p2],
                precio_total=total,
                ahorro_estimado=round(total * 0.08, 2),
                match_score=95
            ))

        return outfits

    async def generar_outfit_para_prenda(self, prenda_id: int) -> OutfitSugeridoResponse:
        """Dado un ID de prenda, busca 1 o 2 complementos armónicos para completar el look."""
        query = select(Prenda).options(
            selectinload(Prenda.categoria),
            selectinload(Prenda.temporada),
            selectinload(Prenda.multimedia),
            selectinload(Prenda.calificaciones)
        ).where(Prenda.activo == True)
        result = await self.db.execute(query)
        todas = list(result.scalars().all())

        prenda_base = next((p for p in todas if p.id == prenda_id), None)
        if not prenda_base:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prenda no encontrada")

        # Seleccionar complementos de distinta categoría y mismo sector o UNISEX
        base_sector = prenda_base.categoria.sector.upper() if prenda_base.categoria else "UNISEX"
        complementos = [
            p for p in todas
            if p.id != prenda_base.id
            and p.categoria_id != prenda_base.categoria_id
            and (p.categoria.sector.upper() in (base_sector, "UNISEX") if p.categoria else True)
        ]

        if not complementos:
            complementos = [p for p in todas if p.id != prenda_base.id]

        seleccionadas = complementos[:2]
        prendas_outfit = [
            self._construir_item(prenda_base, 99, "Prenda seleccionada", "PIEZA CLAVE")
        ]
        total = float(prenda_base.precio_base)

        for comp in seleccionadas:
            item = self._construir_item(comp, 94, "Complemento coordinado por temporada y armonía tonal", "COMPLEMENTO")
            prendas_outfit.append(item)
            total += float(comp.precio_base)

        return OutfitSugeridoResponse(
            id=f"look-custom-{prenda_base.id}",
            nombre_look=f"Look Coordinado: {prenda_base.nombre}",
            descripcion_estilo=f"Conjunto curado por Atelier IA para realzar las líneas de {prenda_base.nombre} con prendas armoniosas.",
            ocasion="Combinación Personalizada",
            prendas=prendas_outfit,
            precio_total=round(total, 2),
            ahorro_estimado=round(total * 0.05, 2),
            match_score=96
        )

    # =========================================================================
    # 4. DASHBOARD GENERAL DE RECOMENDACIONES IA
    # =========================================================================
    async def obtener_dashboard_recomendaciones(
        self, usuario_id: Optional[int] = None, usuario_nombre: Optional[str] = None
    ) -> DashboardRecomendacionesResponse:
        pref = None
        if usuario_id:
            pref = await self.obtener_preferencias(usuario_id)

        # Cargar prendas recomendadas "Para Ti"
        para_ti = await self.calcular_recomendaciones(usuario_id=usuario_id, limit=8)

        # Novedades de la temporada activa
        novedades = [p for p in para_ti if "TENDENCIA" in p.etiqueta_ia or p.match_score >= 90][:4]
        if not novedades:
            novedades = para_ti[:4]

        # Outfits destacados
        query = select(Prenda).options(
            selectinload(Prenda.categoria),
            selectinload(Prenda.temporada),
            selectinload(Prenda.multimedia),
            selectinload(Prenda.calificaciones)
        ).where(Prenda.activo == True)
        res = await self.db.execute(query)
        todas = list(res.scalars().all())
        outfits = await self.generar_outfits_destacados(todas)

        return DashboardRecomendacionesResponse(
            usuario_id=usuario_id,
            usuario_nombre=usuario_nombre,
            perfil_completado=pref.completado if pref else False,
            preferencias=pref,
            para_ti=para_ti,
            novedades_temporada=novedades,
            outfits_destacados=outfits
        )

    # =========================================================================
    # 5. TELEMETRÍA DE INTERACCIÓN
    # =========================================================================
    async def registrar_interaccion(
        self,
        prenda_id: int,
        tipo_evento: str,
        score_aplicado: float = 0.0,
        motivo: str = "EXPLORACION",
        usuario_id: Optional[int] = None
    ) -> bool:
        inter = InteraccionRecomendacion(
            usuario_id=usuario_id,
            prenda_id=prenda_id,
            tipo_evento=tipo_evento.upper(),
            score_aplicado=Decimal(str(score_aplicado)),
            motivo=motivo
        )
        self.db.add(inter)
        await self.db.commit()
        return True

