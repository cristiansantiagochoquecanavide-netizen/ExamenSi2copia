"""Capa de Servicio (Logica de Negocio) para el dominio de Inteligencia Artificial y Recomendaciones (CU19)."""
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional, Dict, Any, Tuple
from uuid import uuid4
import re
from sqlalchemy import select, and_, or_, desc, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.domains.ia_asistente.models import (
    PreferenciaEstiloUsuario, InteraccionRecomendacion, SesionChatIA, MensajeChatIA
)
from app.domains.ia_asistente.schemas import (
    PreferenciaEstiloCreate, PreferenciaEstiloResponse,
    RecomendacionPrendaItem, OutfitSugeridoResponse, DashboardRecomendacionesResponse,
    PrendaChatCardResponse, MensajeChatResponse, SesionChatResponse, SesionChatResumen
)
from app.domains.catalogo.models import (
    Prenda, Categoria, Temporada, PrendaMultimedia, PrendaVariante, CalificacionPrenda, InventarioStock
)
from app.domains.inventario.models import Sucursal
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


# =============================================================================
# 6. ASISTENTE VIRTUAL & CHATBOT DE MODA (CU20) - ATELIER CONCIERGE IA
# =============================================================================
class ChatbotConciergeService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def obtener_o_crear_sesion(
        self, session_uuid: Optional[str] = None, usuario_id: Optional[int] = None
    ) -> SesionChatIA:
        if session_uuid:
            res = await self.db.execute(
                select(SesionChatIA)
                .options(selectinload(SesionChatIA.mensajes))
                .where(SesionChatIA.session_uuid == session_uuid)
            )
            sesion = res.scalar_one_or_none()
            if sesion:
                if usuario_id and not sesion.usuario_id:
                    sesion.usuario_id = usuario_id
                    await self.db.commit()
                return sesion

        # Crear nueva sesión
        nuevo_uuid = str(uuid4())
        nueva_sesion = SesionChatIA(
            session_uuid=nuevo_uuid,
            usuario_id=usuario_id,
            titulo="Consulta con Atelier Concierge",
            activa=True
        )
        self.db.add(nueva_sesion)
        await self.db.commit()
        await self.db.refresh(nueva_sesion)
        return nueva_sesion

    def clasificar_intencion_y_entidades(self, texto: str) -> Tuple[str, Dict[str, Any]]:
        t = texto.lower().strip()
        entidades: Dict[str, Any] = {
            "ocasion": None,
            "sector": None,
            "prenda_tipo": None,
            "color": None,
            "presupuesto_max": None,
            "sucursal": None
        }

        # Extracción de presupuesto
        match_precio = re.search(r'(?:menos de|hasta|maximo|máximo|presupuesto de|\$)\s*(\d{2,5})', t)
        if match_precio:
            try:
                entidades["presupuesto_max"] = float(match_precio.group(1))
            except ValueError:
                pass

        # Detección de sectores
        if any(w in t for w in ["mujer", "femenin", "dama", "chica"]):
            entidades["sector"] = "MUJER"
        elif any(w in t for w in ["hombre", "masculin", "caballero", "chico"]):
            entidades["sector"] = "HOMBRE"
        elif any(w in t for w in ["niño", "niña", "infantil", "nene"]):
            entidades["sector"] = "NINOS"
        elif any(w in t for w in ["unisex"]):
            entidades["sector"] = "UNISEX"

        # Detección de ocasiones
        if any(w in t for w in ["gala", "boda", "matrimonio", "fiesta de gala", "alfombra", "noche"]):
            entidades["ocasion"] = "GALA"
        elif any(w in t for w in ["oficina", "trabajo", "formal", "reunion", "reunión", "ejecutiv", "sartorial"]):
            entidades["ocasion"] = "FORMAL_OFICINA"
        elif any(w in t for w in ["coctel", "cóctel", "cocktail", "evento social"]):
            entidades["ocasion"] = "COCTEL"
        elif any(w in t for w in ["casual", "diario", "urbano", "salida", "descontracturado"]):
            entidades["ocasion"] = "CASUAL"

        # Detección de tipos de prendas
        for p_tipo in ["vestido", "blazer", "traje", "pantalon", "pantalón", "camisa", "falda", "abrigo", "saco", "smoking"]:
            if p_tipo in t:
                entidades["prenda_tipo"] = p_tipo.replace("pantalón", "pantalon")
                break

        # Detección de colores
        for c in ["negro", "dorado", "azul", "blanco", "rojo", "esmeralda", "bordeaux", "verde"]:
            if c in t:
                entidades["color"] = c
                break

        # Detección de sucursales
        for suc in ["centro", "palermo", "norte", "sur", "recoleta"]:
            if suc in t:
                entidades["sucursal"] = suc
                break

        # Clasificación de intención prioritaria
        if any(w in t for w in ["stock", "disponibilidad", "quedan", "hay en tienda", "tienen en"]):
            return "CONSULTAR_STOCK", entidades

        if any(w in t for w in ["combinar", "como combino", "con que me pongo", "completa el look", "outfit para"]):
            return "COMPLETAR_LOOK", entidades

        if any(w in t for w in ["probador", "probarme", "reservar probador", "agendar", "vestidor", "cita", "turno", "realidad aumentada"]) or re.search(r'\b(probador|probar|3d|ar)\b', t):
            return "AGENDAR_PROBADOR", entidades

        if any(w in t for w in ["devolucion", "devolver", "cambio", "cambiar", "politica", "política", "envio", "envío", "cupon", "cupón", "descuento", "pago"]):
            return "POLITICAS_TIENDA", entidades

        if any(w in t for w in ["hola", "buen dia", "buenos dias", "buenas tardes", "buenas noches", "quien sos", "que haces", "ayuda"]):
            if not entidades["prenda_tipo"] and not entidades["ocasion"]:
                return "SALUDO_GENERAL", entidades

        return "BUSCAR_PRENDA", entidades

    async def buscar_prendas_rag(self, entidades: Dict[str, Any], limit: int = 3) -> List[Prenda]:
        query = (
            select(Prenda)
            .join(Prenda.categoria)
            .options(
                selectinload(Prenda.categoria),
                selectinload(Prenda.multimedia),
                selectinload(Prenda.temporada),
                selectinload(Prenda.calificaciones)
            )
            .where(Prenda.activo == True)
        )

        conds = []
        if entidades.get("sector"):
            s_val = entidades["sector"]
            if s_val == "MUJER":
                conds.append(Categoria.sector.in_(["MUJERES", "UNISEX"]))
            elif s_val == "HOMBRE":
                conds.append(Categoria.sector.in_(["HOMBRES", "UNISEX"]))
            elif s_val == "NINOS":
                conds.append(Categoria.sector == "NINOS")
            else:
                conds.append(Categoria.sector == "UNISEX")

        if entidades.get("prenda_tipo"):
            p_kw = entidades["prenda_tipo"]
            conds.append(
                or_(
                    Prenda.nombre.ilike(f"%{p_kw}%"),
                    Prenda.descripcion.ilike(f"%{p_kw}%")
                )
            )

        if entidades.get("ocasion"):
            oc_kw = entidades["ocasion"]
            if oc_kw == "GALA":
                conds.append(or_(Prenda.descripcion.ilike("%gala%"), Prenda.descripcion.ilike("%noche%"), Prenda.descripcion.ilike("%seda%")))
            elif oc_kw == "FORMAL_OFICINA":
                conds.append(or_(Prenda.descripcion.ilike("%formal%"), Prenda.descripcion.ilike("%oficina%"), Prenda.descripcion.ilike("%sartorial%")))
            elif oc_kw == "COCTEL":
                conds.append(or_(Prenda.descripcion.ilike("%coctel%"), Prenda.descripcion.ilike("%cóctel%"), Prenda.descripcion.ilike("%fiesta%")))
            elif oc_kw == "CASUAL":
                conds.append(or_(Prenda.descripcion.ilike("%casual%"), Prenda.descripcion.ilike("%urbano%"), Prenda.descripcion.ilike("%lino%")))

        if entidades.get("color"):
            c_kw = entidades["color"]
            conds.append(or_(Prenda.nombre.ilike(f"%{c_kw}%"), Prenda.descripcion.ilike(f"%{c_kw}%")))

        if entidades.get("presupuesto_max"):
            conds.append(Prenda.precio_base <= Decimal(str(entidades["presupuesto_max"])))

        if conds:
            query = query.where(and_(*conds))

        query = query.order_by(Prenda.precio_base.desc(), Prenda.id.desc()).limit(limit * 2)
        res = await self.db.execute(query)
        prendas = list(res.scalars().all())

        # Fallback suave si no hubo coincidencias exactas
        if not prendas:
            fallback_query = (
                select(Prenda)
                .options(
                    selectinload(Prenda.categoria),
                    selectinload(Prenda.multimedia),
                    selectinload(Prenda.temporada),
                    selectinload(Prenda.calificaciones)
                )
                .where(Prenda.activo == True)
                .order_by(Prenda.precio_base.desc(), Prenda.id.desc())
                .limit(limit)
            )
            res_fb = await self.db.execute(fallback_query)
            prendas = list(res_fb.scalars().all())

        # Ordenar por rating_promedio en memoria y tomar 'limit'
        prendas.sort(key=lambda p: (p.rating_promedio or 0.0, float(p.precio_base)), reverse=True)
        return prendas[:limit]

    async def consultar_stock_sucursal_rag(self, sucursal_nombre: Optional[str] = None) -> str:
        query = (
            select(Sucursal.nombre, func.sum(InventarioStock.cantidad_disponible).label("total_stock"))
            .join(InventarioStock, InventarioStock.sucursal_id == Sucursal.id)
            .where(Sucursal.activo == True)
            .group_by(Sucursal.id, Sucursal.nombre)
        )
        if sucursal_nombre:
            query = query.where(Sucursal.nombre.ilike(f"%{sucursal_nombre}%"))

        res = await self.db.execute(query)
        filas = res.all()
        if not filas:
            return "Actualmente disponemos de stock centralizado con envíos prioritarios a todo el país."

        detalles = [f"• **{nombre}**: {stock or 0} unidades disponibles" for nombre, stock in filas]
        return "Disponibilidad de stock verificada en tiempo real en nuestras boutiques:\n" + "\n".join(detalles)

    def to_chat_card(self, prenda: Prenda) -> PrendaChatCardResponse:
        img_url = None
        if prenda.multimedia:
            for m in prenda.multimedia:
                if m.es_portada:
                    img_url = m.url
                    break
            if not img_url and len(prenda.multimedia) > 0:
                img_url = prenda.multimedia[0].url

        if not img_url:
            img_url = "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=400&q=80"

        return PrendaChatCardResponse(
            id=prenda.id,
            nombre=prenda.nombre,
            sku=prenda.sku,
            precio_base=float(prenda.precio_base),
            categoria_nombre=prenda.categoria.nombre if prenda.categoria else "Colección",
            sector=prenda.categoria.sector if prenda.categoria else "UNISEX",
            imagen_url=img_url,
            rating_promedio=float(prenda.rating_promedio or 5.0),
            total_resenas=prenda.total_resenas or 0
        )

    async def procesar_mensaje(
        self, texto: str, session_uuid: Optional[str] = None, usuario_id: Optional[int] = None
    ) -> MensajeChatResponse:
        # 1. Obtener o inicializar sesión
        sesion = await self.obtener_o_crear_sesion(session_uuid=session_uuid, usuario_id=usuario_id)

        # 2. Registrar mensaje del usuario
        msg_usuario = MensajeChatIA(
            sesion_id=sesion.id,
            remitente="USUARIO",
            texto=texto,
            prendas_adjuntas_ids=[],
            sugerencias_rapidas=[]
        )
        self.db.add(msg_usuario)
        await self.db.flush()

        # 3. Clasificar intención y extraer entidades
        intencion, entidades = self.clasificar_intencion_y_entidades(texto)

        nombre_usuario = "estimado/a cliente"
        if usuario_id:
            res_u = await self.db.execute(select(Usuario).where(Usuario.id == usuario_id))
            u = res_u.scalar_one_or_none()
            if u:
                nombre_usuario = u.nombre

        prendas_adjuntas: List[Prenda] = []
        texto_respuesta = ""
        sugerencias: List[str] = []

        # 4. Resolver según intención de negocio
        if intencion == "SALUDO_GENERAL":
            texto_respuesta = (
                f"¡Hola, {nombre_usuario}! Soy **Atelier Concierge**, tu estilista virtual y asesor personal en FashionStore. "
                "Puedo recomendarte siluetas exclusivas, coordinar looks para cualquier ocasión, verificar stock en nuestras sucursales o ayudarte a agendar un probador físico con Realidad Aumentada.\n\n"
                "¿En qué ocasión o prenda estás pensando hoy?"
            )
            sugerencias = [
                "Vestidos para fiesta de gala",
                "Blazers y sastrería para oficina",
                "¿Cómo reservo un probador?",
                "Consultar stock en tiendas"
            ]

        elif intencion == "BUSCAR_PRENDA":
            prendas_adjuntas = await self.buscar_prendas_rag(entidades, limit=3)
            filtro_desc = []
            if entidades.get("ocasion"):
                filtro_desc.append(f"ocasión {entidades['ocasion'].lower()}")
            if entidades.get("prenda_tipo"):
                filtro_desc.append(entidades['prenda_tipo'])
            if entidades.get("sector"):
                filtro_desc.append(f"colección {entidades['sector'].lower()}")
            if entidades.get("presupuesto_max"):
                filtro_desc.append(f"hasta ${entidades['presupuesto_max']:.0f} USD")

            detalle_filtro = f" para {', '.join(filtro_desc)}" if filtro_desc else ""
            texto_respuesta = (
                f"He curado una selección exclusiva de nuestra colección{detalle_filtro}. "
                "Estas piezas destacan por la pureza de sus cortes, alta calidad de confección y excelente valoración por nuestros clientes:"
            )
            sugerencias = [
                "Ver opciones en otro color",
                "Completar look con accesorios",
                "¿Tienen stock en sucursal Centro?",
                "Agendar probador para probármelas"
            ]

        elif intencion == "CONSULTAR_STOCK":
            reporte_stock = await self.consultar_stock_sucursal_rag(entidades.get("sucursal"))
            texto_respuesta = (
                f"He consultado el inventario en tiempo real de FashionStore.\n\n{reporte_stock}\n\n"
                "Recordá que podés reservar las prendas online y probártelas en la sucursal que elijas."
            )
            sugerencias = [
                "Agendar probador físico",
                "Ver vestidos disponibles",
                "¿Hacen envíos a domicilio?"
            ]

        elif intencion == "COMPLETAR_LOOK":
            prendas_adjuntas = await self.buscar_prendas_rag(entidades, limit=2)
            texto_respuesta = (
                "Para lograr una silueta equilibrada y de alto impacto estético, nuestra curaduría sugiere la regla del contraste sartorial: "
                "combinar prendas estructuradas con caídas fluidas y mantener una paleta tonal neutra (negro noir, dorado o marfil). "
                "Aquí tenés combinaciones destacadas que elevan tu presencia:"
            )
            sugerencias = [
                "Ver en el Catálogo",
                "Hacer Test de Estilo Personal",
                "¿Cómo agendo un probador?"
            ]

        elif intencion == "AGENDAR_PROBADOR":
            texto_respuesta = (
                "¡Agendar un probador físico en FashionStore es sumamente sencillo!\n\n"
                "1. Accedé al menú **Reservas & Probador** en la barra superior.\n"
                "2. Seleccioná tu sucursal más cercana (ej. Centro, Palermo) y el horario que prefieras.\n"
                "3. Elegí las prendas que querés probarte; nuestro personal las tendrá listas y desinfectadas en tu vestidor.\n"
                "4. En el catálogo podés escanear el código **3D AR** con tu celular para visualizarlas en Realidad Aumentada antes de asistir."
            )
            sugerencias = [
                "Ir a Agendar Probador",
                "Ver prendas con Realidad Aumentada",
                "Consultar horarios de atención"
            ]

        elif intencion == "POLITICAS_TIENDA":
            texto_respuesta = (
                "En FashionStore garantizamos una experiencia de alta costura sin fricciones:\n\n"
                "• **Cambios y Devoluciones (CU17)**: Tenés hasta 30 días continuos desde tu compra para solicitar cambios o devoluciones con reembolso total en prendas sin uso.\n"
                "• **Envíos**: Entregas express seguras a todo el país con empaque premium de protección.\n"
                "• **Promociones (CU16)**: Podés ingresar cupones de descuento vigentes al momento del checkout e-commerce o en nuestro Punto de Venta POS."
            )
            sugerencias = [
                "Ver prendas en promoción",
                "Ir al Checkout",
                "Hablar con un estilista"
            ]

        else:
            prendas_adjuntas = await self.buscar_prendas_rag({}, limit=3)
            texto_respuesta = (
                "Comprendo tu consulta. En FashionStore nos especializamos en sastrería moderna, alta costura y asesoramiento inteligente. "
                "Te comparto algunas de las piezas más solicitadas de esta temporada:"
            )
            sugerencias = [
                "Vestidos de gala",
                "Sastrería ejecutiva",
                "Consultar stock en tiendas"
            ]

        # Actualizar título si es el inicio
        if len(sesion.mensajes) <= 1:
            if entidades.get("ocasion"):
                sesion.titulo = f"Búsqueda: {entidades['ocasion'].capitalize()}"
            elif entidades.get("prenda_tipo"):
                sesion.titulo = f"Consulta: {entidades['prenda_tipo'].capitalize()}"
            else:
                sesion.titulo = texto[:40] + ("..." if len(texto) > 40 else "")

        sesion.updated_at = datetime.now(timezone.utc)

        # 5. Registrar respuesta del concierge
        prendas_ids = [p.id for p in prendas_adjuntas]
        msg_bot = MensajeChatIA(
            sesion_id=sesion.id,
            remitente="ASISTENTE",
            texto=texto_respuesta,
            intencion_detectada=intencion,
            prendas_adjuntas_ids=prendas_ids,
            sugerencias_rapidas=sugerencias
        )
        self.db.add(msg_bot)
        await self.db.commit()
        await self.db.refresh(msg_bot)

        # 6. Mapear a respuesta DTO
        cards = [self.to_chat_card(p) for p in prendas_adjuntas]
        return MensajeChatResponse(
            id=msg_bot.id,
            remitente=msg_bot.remitente,
            texto=msg_bot.texto,
            intencion_detectada=msg_bot.intencion_detectada,
            prendas_recomendadas=cards,
            sugerencias_rapidas=msg_bot.sugerencias_rapidas,
            created_at=msg_bot.created_at
        )

    async def obtener_historial_sesion(self, session_uuid: str) -> Optional[SesionChatResponse]:
        res = await self.db.execute(
            select(SesionChatIA)
            .options(selectinload(SesionChatIA.mensajes))
            .where(SesionChatIA.session_uuid == session_uuid)
        )
        sesion = res.scalar_one_or_none()
        if not sesion:
            return None

        mensajes_dto: List[MensajeChatResponse] = []
        for m in sesion.mensajes:
            cards: List[PrendaChatCardResponse] = []
            if m.prendas_adjuntas_ids:
                res_p = await self.db.execute(
                    select(Prenda)
                    .options(selectinload(Prenda.categoria), selectinload(Prenda.multimedia))
                    .where(Prenda.id.in_(m.prendas_adjuntas_ids))
                )
                prendas_map = {p.id: p for p in res_p.scalars().all()}
                for pid in m.prendas_adjuntas_ids:
                    if pid in prendas_map:
                        cards.append(self.to_chat_card(prendas_map[pid]))

            mensajes_dto.append(
                MensajeChatResponse(
                    id=m.id,
                    remitente=m.remitente,
                    texto=m.texto,
                    intencion_detectada=m.intencion_detectada,
                    prendas_recomendadas=cards,
                    sugerencias_rapidas=m.sugerencias_rapidas,
                    created_at=m.created_at
                )
            )

        return SesionChatResponse(
            session_uuid=sesion.session_uuid,
            titulo=sesion.titulo,
            mensajes=mensajes_dto,
            created_at=sesion.created_at
        )

    async def listar_sesiones_usuario(self, usuario_id: int) -> List[SesionChatResumen]:
        res = await self.db.execute(
            select(SesionChatIA)
            .options(selectinload(SesionChatIA.mensajes))
            .where(SesionChatIA.usuario_id == usuario_id)
            .order_by(desc(SesionChatIA.updated_at))
            .limit(15)
        )
        sesiones = res.scalars().all()
        return [
            SesionChatResumen(
                session_uuid=s.session_uuid,
                titulo=s.titulo,
                total_mensajes=len(s.mensajes),
                updated_at=s.updated_at
            )
            for s in sesiones
        ]

    async def eliminar_sesion(self, session_uuid: str) -> bool:
        res = await self.db.execute(
            select(SesionChatIA).where(SesionChatIA.session_uuid == session_uuid)
        )
        sesion = res.scalar_one_or_none()
        if not sesion:
            return False
        await self.db.delete(sesion)
        await self.db.commit()
        return True


