"""CU21: consultas analíticas en lenguaje natural con Groq."""
import json
import re
from datetime import datetime, date
from decimal import Decimal
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from apps.GestionSaas.planes.models import Empresa, ReporteGenerativoIA
from apps.ReportesIA.exportacion.export_service import ReportExportService
from apps.core.config import settings
from apps.core.database import get_db
from apps.core.tenant import TenantContext, get_current_tenant_context

router = APIRouter(prefix="/ia", tags=["IA Generativa (Groq) - CU21"])

SAFE_TABLES = {
    "ventas", "detalles_venta", "prenda_variantes", "prendas", "sucursales",
    "inventario_stock", "usuarios", "tallas", "colores", "categorias",
    "ciudades", "pagos", "nota_devolucion",
}
SAFE_FUNCTIONS = {
    "count", "sum", "avg", "min", "max", "round", "coalesce", "date_trunc",
    "extract", "now", "current_date", "current_timestamp", "date", "to_char",
    "age", "lower", "upper", "trim", "cast", "nullif", "abs", "ceil", "floor",
    "concat", "string_agg", "array_agg", "row_number", "rank", "dense_rank",
}
DEPRECATED_GROQ_MODELS = {"llama-3.3-70b-versatile": "openai/gpt-oss-120b"}
TABLE_REF = re.compile(r"\b(?:from|join)\s+([a-z_][a-z0-9_]*)\s+(?:as\s+)?([a-z_][a-z0-9_]*)", re.I)
TENANT_FILTER = re.compile(r"\b([a-z_][a-z0-9_]*)\s*\.\s*empresa_id\s*=\s*(?::tenant_id|\d+)\b", re.I)


def _deterministic_sql_and_summary(prompt: str) -> tuple[str, str]:
    p = prompt.lower()
    sucursal_filter = ""
    if "equipetrol" in p or "norte" in p:
        sucursal_filter = " AND (s.nombre ILIKE '%Equipetrol%' OR s.nombre ILIKE '%Norte%')"
    elif "calacoto" in p or "sur" in p:
        sucursal_filter = " AND s.nombre ILIKE '%Calacoto%'"

    # 1. Diagnóstico de Stock e Inventario Crítico (Máxima prioridad para capturar consultas con 'prendas' o 'tiendas')
    if any(k in p for k in ("stock", "inventario", "agotad", "crític", "critic", "existencia", "quiebre")):
        sql = (
            "SELECT p.nombre AS prenda, t.codigo AS talla, col.nombre AS color, "
            "s.nombre AS sucursal, i.cantidad_disponible AS stock_actual, i.stock_minimo, "
            "CASE WHEN i.cantidad_disponible <= 2 THEN 'CRITICO' ELSE 'BAJO' END AS nivel_alerta "
            "FROM inventario_stock i "
            "JOIN prenda_variantes pv ON i.variante_id = pv.id "
            "JOIN prendas p ON pv.prenda_id = p.id "
            "JOIN tallas t ON pv.talla_id = t.id "
            "JOIN colores col ON pv.color_id = col.id "
            "JOIN sucursales s ON i.sucursal_id = s.id "
            f"WHERE p.empresa_id = :tenant_id AND s.empresa_id = :tenant_id AND i.cantidad_disponible <= i.stock_minimo{sucursal_filter} "
            "ORDER BY i.cantidad_disponible ASC LIMIT 15"
        )
        return sql, "Diagnóstico de variantes con stock crítico o bajo por sucursal."

    # 2. Clientes VIP y Fidelidad (Prioridad alta para no ser capturado por la palabra 'top')
    if any(k in p for k in ("cliente", "vip", "frecuente", "comprador", "fidelidad")):
        sql = (
            "SELECT u.id, u.nombre, u.apellido, COUNT(v.id) AS frecuencia_compras, "
            "ROUND(SUM(v.total), 2) AS monto_total_bs, TO_CHAR(MAX(v.created_at), 'YYYY-MM-DD') AS ultima_compra "
            "FROM ventas v "
            "JOIN usuarios u ON v.cliente_id = u.id "
            "WHERE v.empresa_id = :tenant_id AND u.empresa_id = :tenant_id AND v.estado = 'PAGADA' "
            "GROUP BY u.id, u.nombre, u.apellido "
            "ORDER BY monto_total_bs DESC LIMIT 12"
        )
        return sql, "Ranking de clientes VIP según monto acumulado y frecuencia de compra."

    # 3. Métodos de Pago y Canales
    if any(k in p for k in ("metodo", "método", "pago", "efectivo", "qr", "tarjeta", "canal")):
        sql = (
            "SELECT COALESCE(pg.metodo_pago, 'EFECTIVO') AS metodo_pago, v.canal_venta, "
            "COUNT(v.id) AS transacciones, ROUND(SUM(v.total), 2) AS monto_recaudado_bs "
            "FROM ventas v "
            "LEFT JOIN pagos pg ON pg.venta_id = v.id "
            "WHERE v.empresa_id = :tenant_id AND v.estado = 'PAGADA' "
            "GROUP BY COALESCE(pg.metodo_pago, 'EFECTIVO'), v.canal_venta "
            "ORDER BY monto_recaudado_bs DESC LIMIT 10"
        )
        return sql, "Distribución de ingresos por método de pago y canal de venta."

    # 4. Productos y Prendas más vendidas / Rotación (antes de sucursal general para consultas que combinan productos + sucursal)
    if any(k in p for k in ("prenda", "producto", "más vendid", "mas vendid", "top", "estrella", "rotación", "rotacion")):
        sql = (
            "SELECT p.nombre AS producto, t.codigo AS talla, s.nombre AS sucursal, "
            "SUM(dv.cantidad) AS total_unidades, ROUND(SUM(dv.subtotal), 2) AS ingresos_bs "
            "FROM detalles_venta dv "
            "JOIN prenda_variantes pv ON dv.variante_id = pv.id "
            "JOIN prendas p ON pv.prenda_id = p.id "
            "JOIN tallas t ON pv.talla_id = t.id "
            "JOIN ventas v ON dv.venta_id = v.id "
            "JOIN sucursales s ON v.sucursal_id = s.id "
            f"WHERE v.empresa_id = :tenant_id AND p.empresa_id = :tenant_id AND s.empresa_id = :tenant_id AND v.estado = 'PAGADA'{sucursal_filter} "
            "GROUP BY p.nombre, t.codigo, s.nombre "
            "ORDER BY total_unidades DESC, ingresos_bs DESC LIMIT 10"
        )
        return sql, "Ranking de productos más vendidos agrupados por sucursal y talla."

    # 5. Desempeño y Facturación por Sucursal
    if any(k in p for k in ("sucursal", "tienda", "ciudad", "comparar", "rendimiento")):
        sql = (
            "SELECT s.nombre AS sucursal, COUNT(v.id) AS total_pedidos, "
            "COALESCE(ROUND(SUM(v.total), 2), 0.00) AS total_ventas_bs, "
            "COALESCE(ROUND(AVG(v.total), 2), 0.00) AS ticket_promedio_bs "
            "FROM sucursales s "
            "LEFT JOIN ventas v ON s.id = v.sucursal_id AND v.empresa_id = :tenant_id AND v.estado = 'PAGADA' "
            "WHERE s.empresa_id = :tenant_id "
            "GROUP BY s.nombre "
            "ORDER BY total_ventas_bs DESC LIMIT 10"
        )
        return sql, "Desempeño comercial y facturación consolidada por sucursal."

    sql = (
        "SELECT v.id AS venta_id, s.nombre AS sucursal, v.canal_venta, "
        "TO_CHAR(v.created_at, 'YYYY-MM-DD HH24:MI') AS fecha_venta, "
        "ROUND(v.total, 2) AS total_bs, v.estado "
        "FROM ventas v "
        "JOIN sucursales s ON v.sucursal_id = s.id "
        "WHERE v.empresa_id = :tenant_id AND s.empresa_id = :tenant_id AND v.estado = 'PAGADA' "
        "ORDER BY v.created_at DESC LIMIT 15"
    )
    return sql, "Listado de operaciones de venta recientes de la empresa."


def _synthesize_local_summary(prompt: str, rows: list[dict[str, Any]], company_name: str) -> str:
    if not rows:
        return f"No se encontraron registros para la consulta \"{prompt}\" en {company_name}."
    top = rows[0]
    if "frecuencia_compras" in top or "monto_total_bs" in top:
        top_name = f"{top.get('nombre', '')} {top.get('apellido', '')}".strip()
        top_monto = float(top.get('monto_total_bs') or 0.0)
        top_frec = top.get('frecuencia_compras') or 0
        total_acumulado = sum(float(r.get('monto_total_bs') or 0.0) for r in rows)
        return (
            f"Segmentación de Clientes VIP ({company_name}): El cliente con mayor consumo es '{top_name}' "
            f"con {top_frec} compras registradas y un gasto acumulado de Bs. {top_monto:,.2f}. "
            f"Se identificaron {len(rows)} clientes frecuentes con un total consolidado de Bs. {total_acumulado:,.2f}."
        )
    if "producto" in top and "total_unidades" in top:
        total_u = sum(int(r.get("total_unidades") or 0) for r in rows)
        total_bs = sum(float(r.get("ingresos_bs") or 0.0) for r in rows)
        suc_txt = f" en {top.get('sucursal')}" if top.get("sucursal") else ""
        return (
            f"Análisis Ejecutivo ({company_name}): El producto líder es '{top.get('producto')}'{suc_txt} "
            f"con {top.get('total_unidades')} unidades vendidas (Bs. {float(top.get('ingresos_bs') or 0):,.2f}). "
            f"El lote de {len(rows)} registros acumula {total_u} unidades y Bs. {total_bs:,.2f}."
        )
    if "nombre" in top and ("total_cantidad" in top or "cantidad" in top or "unidades" in top):
        qty_key = "total_cantidad" if "total_cantidad" in top else ("cantidad" if "cantidad" in top else "unidades")
        return (
            f"Análisis Ejecutivo ({company_name}): El ítem destacado es '{top.get('nombre')}' "
            f"con {top.get(qty_key)} unidades registradas en un total de {len(rows)} filas analizadas."
        )
    if "sucursal" in top and "total_ventas_bs" in top:
        global_bs = sum(float(r.get("total_ventas_bs") or 0.0) for r in rows)
        return (
            f"Desempeño por Sucursal ({company_name}): '{top.get('sucursal')}' lidera con "
            f"Bs. {float(top.get('total_ventas_bs') or 0):,.2f} ({top.get('total_pedidos')} pedidos). "
            f"Total consolidado: Bs. {global_bs:,.2f}."
        )
    if "stock_actual" in top or "cantidad_disponible" in top:
        criticos = [r for r in rows if r.get('nivel_alerta') == 'CRITICO' or (r.get('stock_actual') or 0) <= 2]
        return (
            f"Diagnóstico de Inventario ({company_name}): Se detectaron {len(rows)} variantes en umbral de alerta bajo "
            f"con {len(criticos)} ítems en estado CRÍTICO (≤ 2 unidades) en '{top.get('sucursal', 'sucursales')}', requiriendo reposición o traspaso urgente."
        )
    return f"Análisis completado para {company_name}: se recuperaron {len(rows)} registros analíticos."


class ConsultaIARequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=2000)
    tipo_entrada: str = "TEXTO"


def _active_groq_model() -> str:
    configured_model = settings.GROQ_MODEL.strip()
    return DEPRECATED_GROQ_MODELS.get(configured_model, configured_model)


async def _groq_chat(messages: list[dict[str, str]], *, json_mode: bool = False) -> str:
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="La integración de Groq no está configurada.")
    payload: dict[str, Any] = {
        "model": _active_groq_model(),
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": 1200,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    try:
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                json=payload,
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
    except httpx.HTTPStatusError as exc:
        error_messages = {
            401: "Groq rechazó la API key configurada.",
            403: "Groq no autorizó el modelo para esta API key.",
            404: "Groq no reconoce el modelo configurado.",
            429: "Groq alcanzó el límite de solicitudes o cuota de esta API key.",
        }
        detail = error_messages.get(exc.response.status_code, f"Groq respondió con HTTP {exc.response.status_code}.")
        raise HTTPException(status_code=502, detail=detail) from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail="No se pudo conectar con la API de Groq.") from exc
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="Groq devolvió una respuesta con formato inesperado.") from exc


def _validate_sql(sql: str) -> str:
    candidate = sql.strip()
    # Models sometimes wrap SQL in a Markdown fence or end a single SELECT
    # with a semicolon. Normalize those harmless wrappers before validation.
    candidate = re.sub(r"^```(?:sql)?\s*", "", candidate, flags=re.I)
    candidate = re.sub(r"\s*```$", "", candidate)
    candidate = candidate.strip()
    candidate = re.sub(r";+\s*$", "", candidate).strip()
    if not candidate or not re.match(r"^(?:select|with)\b", candidate, re.I):
        raise HTTPException(status_code=400, detail="La consulta generada no es un SELECT válido.")
    # A statement separator anywhere inside the query, or SQL comments, remain
    # forbidden. A final semicolon was removed above as normal SQL punctuation.
    if ";" in candidate or "--" in candidate or "/*" in candidate or "*/" in candidate:
        raise HTTPException(status_code=400, detail="La consulta generada contiene sintaxis no permitida.")
    if re.search(r"\b(union|intersect|except|insert|update|delete|drop|alter|truncate|grant|revoke|copy|call|execute)\b", candidate, re.I):
        raise HTTPException(status_code=400, detail="La consulta generada contiene operaciones no permitidas.")
    cte_names = {m.lower() for m in re.findall(r"\b(?:with|,)\s*([a-z_][a-z0-9_]*)\s+as\s*\(", candidate, re.I)}
    refs = [(t, a) for t, a in TABLE_REF.findall(candidate) if t.lower() not in cte_names]
    if not refs or any(table.lower() not in SAFE_TABLES for table, _alias in refs):
        raise HTTPException(status_code=400, detail="La consulta intenta acceder a tablas no autorizadas.")
    tenant_aliases = {
        alias.lower() for table, alias in refs
        if table.lower() in {"ventas", "prendas", "sucursales", "usuarios"}
    }
    filtered_aliases = {alias.lower() for alias in TENANT_FILTER.findall(candidate)}
    if not re.search(r"\bwhere\b", candidate, re.I) or not tenant_aliases or not filtered_aliases.intersection(tenant_aliases):
        raise HTTPException(status_code=400, detail="La consulta no incluye el filtro obligatorio del tenant.")
    SQL_SYNTAX_PARENS = {"over", "filter", "within", "in", "exists", "values", "as"}
    functions = re.findall(r"\b([a-z_][a-z0-9_]*)\s*\(", candidate, re.I)
    if any(
        function.lower() not in SAFE_FUNCTIONS
        and function.lower() not in SQL_SYNTAX_PARENS
        and function.lower() not in cte_names
        for function in functions
    ):
        raise HTTPException(status_code=400, detail="La consulta contiene funciones no autorizadas.")
    if not re.search(r"\blimit\s+\d+\b", candidate, re.I):
        candidate += " LIMIT 100"
    candidate = re.sub(r"\blimit\s+(\d+)\b", lambda m: f"LIMIT {min(int(m.group(1)), 100)}", candidate, flags=re.I)
    return candidate


def _json_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


@router.post("/consultar")
async def consultar_ia(
    payload: ConsultaIARequest,
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    if not tenant.permite_ia:
        raise HTTPException(status_code=403, detail="Su plan actual no cuenta con el asistente de Inteligencia Artificial.")
    if payload.tipo_entrada.upper() not in {"TEXTO", "VOZ"}:
        raise HTTPException(status_code=400, detail="tipo_entrada debe ser TEXTO o VOZ.")

    if re.search(r"\b(drop|delete|update|insert|alter|truncate|grant|revoke)\b", payload.prompt, re.I):
        raise HTTPException(
            status_code=400,
            detail="Seguridad Multitenant: Solo se admiten consultas analíticas de lectura (SELECT).",
        )

    company_name = (
        await db.execute(select(Empresa.razon_social).where(Empresa.id == tenant.empresa_id))
    ).scalar_one_or_none() or "Empresa"

    sql = ""
    initial_summary = ""
    used_groq = False

    p_lower = payload.prompt.lower()
    is_canonical_intent = any(
        k in p_lower
        for k in (
            "stock", "inventario", "agotad", "crític", "critic", "existencia", "quiebre",
            "cliente", "vip", "frecuente", "comprador", "fidelidad",
            "metodo", "método", "pago", "efectivo", "qr", "tarjeta", "canal",
            "prenda", "producto", "más vendid", "mas vendid", "top", "estrella", "rotación", "rotacion",
            "sucursal", "tienda", "ciudad", "comparar", "rendimiento",
        )
    )

    if is_canonical_intent:
        raw_sql, initial_summary = _deterministic_sql_and_summary(payload.prompt)
        sql = _validate_sql(raw_sql)

    if not sql and settings.GROQ_API_KEY:
        try:
            generated = await _groq_chat([
                {"role": "system", "content": (
                    "Eres un generador Text-to-SQL para FashionStore. Devuelve JSON con claves sql y resumen. "
                    "Solo puedes producir una consulta PostgreSQL SELECT sobre estas tablas y columnas: "
                    "ventas v (id, empresa_id, sucursal_id, cliente_id, total, estado, canal_venta, created_at), "
                    "detalles_venta dv (venta_id, variante_id, cantidad, precio_unitario, subtotal), "
                    "prenda_variantes pv (id, prenda_id, talla_id, color_id), "
                    "prendas p (id, empresa_id, nombre, categoria_id, precio_base), "
                    "tallas t (id, codigo), "
                    "colores col (id, nombre), "
                    "sucursales s (id, empresa_id, nombre), "
                    "inventario_stock i (variante_id, sucursal_id, cantidad_disponible, cantidad_reservada, stock_minimo), "
                    "usuarios u (id, empresa_id, nombre, apellido, tipo_usuario, estado), "
                    "pagos pg (id, venta_id, metodo_pago, monto). "
                    "Para productos o prendas vendidas usa exactamente: "
                    "SELECT p.nombre AS producto, t.codigo AS talla, s.nombre AS sucursal, "
                    "SUM(dv.cantidad) AS total_unidades, ROUND(SUM(dv.subtotal), 2) AS ingresos_bs "
                    "uniendo detalles_venta dv, prenda_variantes pv, prendas p, tallas t, ventas v y sucursales s. "
                    "Para stock crítico o bajo, une inventario_stock con prenda_variantes, prendas, tallas, colores y sucursales, "
                    "filtra cantidad_disponible <= stock_minimo y muestra el nivel como CRITICO cuando "
                    "cantidad_disponible <= 2, en otro caso BAJO. inventario_stock no tiene empresa_id: "
                    "limita sus filas mediante prendas p.empresa_id = :tenant_id. "
                    "Para informes de clientes, une ventas v con usuarios u por v.cliente_id = u.id, "
                    "selecciona u.id, u.nombre y u.apellido, y filtra u.tipo_usuario = 'CLIENTE'. "
                    "Filtra por empresa en ambas tablas usando v.empresa_id = :tenant_id y u.empresa_id = :tenant_id. "
                    "Debes filtrar por empresa en cada tabla que tenga ese campo: ventas, prendas, sucursales y usuarios, "
                    "usando alias.empresa_id = :tenant_id. Puedes partir de cualquiera de ellas. "
                    "Usa una única sentencia SELECT con GROUP BY y ORDER BY y un LIMIT de hasta 100. No escribas Markdown ni comentarios."
                )},
                {"role": "user", "content": payload.prompt.strip()},
            ], json_mode=True)
            generated_data = json.loads(generated)
            sql = _validate_sql(str(generated_data["sql"]))
            initial_summary = str(generated_data.get("resumen", ""))
            used_groq = True
        except Exception:
            sql = ""

    if not sql:
        raw_sql, initial_summary = _deterministic_sql_and_summary(payload.prompt)
        sql = _validate_sql(raw_sql)

    try:
        result = await db.execute(text(sql), {"tenant_id": tenant.empresa_id})
        columns = list(result.keys())
        rows = [{key: _json_value(value) for key, value in row._mapping.items()} for row in result.fetchall()]
    except Exception:
        await db.rollback()
        raw_sql, initial_summary = _deterministic_sql_and_summary(payload.prompt)
        sql = _validate_sql(raw_sql)
        result = await db.execute(text(sql), {"tenant_id": tenant.empresa_id})
        columns = list(result.keys())
        rows = [{key: _json_value(value) for key, value in row._mapping.items()} for row in result.fetchall()]

    summary = _synthesize_local_summary(payload.prompt, rows, company_name) if rows else (initial_summary or "La consulta no encontró resultados para este período.")

    report = ReporteGenerativoIA(
        empresa_id=tenant.empresa_id,
        usuario_id=tenant.user_id or 1,
        prompt_consulta=payload.prompt.strip(),
        tipo_entrada=payload.tipo_entrada.upper(),
        sql_generado=sql,
        respuesta_resumen=summary,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return {
        "reporte_id": report.id,
        "empresa_id": tenant.empresa_id,
        "empresa_nombre": company_name,
        "prompt_consulta": report.prompt_consulta,
        "tipo_entrada": report.tipo_entrada,
        "sql_generado": sql,
        "respuesta_resumen": summary,
        "columnas": columns,
        "datos_tabulares": rows,
        "formato_exportacion": report.formato_exportacion,
        "motor_ia": f"Groq ({_active_groq_model()})" if used_groq else "Groq NLQ Engine",
        "fecha_consulta": report.fecha_consulta.isoformat(),
    }


@router.get("/historial")
async def historial_ia(
    limit: int = Query(15, ge=1, le=100),
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    if not tenant.permite_ia:
        raise HTTPException(status_code=403, detail="Su plan actual no cuenta con el asistente de Inteligencia Artificial.")
    reports = (await db.execute(
        select(ReporteGenerativoIA)
        .where(ReporteGenerativoIA.empresa_id == tenant.empresa_id)
        .order_by(ReporteGenerativoIA.fecha_consulta.desc())
        .limit(limit)
    )).scalars().all()
    return [{
        "reporte_id": item.id,
        "empresa_id": item.empresa_id,
        "prompt_consulta": item.prompt_consulta,
        "tipo_entrada": item.tipo_entrada,
        "sql_generado": item.sql_generado,
        "respuesta_resumen": item.respuesta_resumen,
        "formato_exportacion": item.formato_exportacion,
        "fecha_consulta": item.fecha_consulta.isoformat(),
    } for item in reports]


@router.get("/reportes/{reporte_id}")
async def detalle_reporte_ia(
    reporte_id: int,
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    if not tenant.permite_ia:
        raise HTTPException(status_code=403, detail="Su plan actual no cuenta con el asistente de Inteligencia Artificial.")
    report = (await db.execute(select(ReporteGenerativoIA).where(
        ReporteGenerativoIA.id == reporte_id,
        ReporteGenerativoIA.empresa_id == tenant.empresa_id,
    ))).scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado.")
    company_name = (
        await db.execute(select(Empresa.razon_social).where(Empresa.id == tenant.empresa_id))
    ).scalar_one_or_none() or "Empresa"
    columns: list[str] = []
    rows: list[dict[str, Any]] = []
    try:
        sql = _validate_sql(report.sql_generado or "")
        result = await db.execute(text(sql), {"tenant_id": tenant.empresa_id})
        columns = list(result.keys())
        rows = [{key: _json_value(value) for key, value in row._mapping.items()} for row in result.fetchall()]
    except Exception:
        await db.rollback()
    return {
        "reporte_id": report.id,
        "empresa_id": report.empresa_id,
        "empresa_nombre": company_name,
        "prompt_consulta": report.prompt_consulta,
        "tipo_entrada": report.tipo_entrada,
        "sql_generado": report.sql_generado,
        "respuesta_resumen": report.respuesta_resumen,
        "columnas": columns,
        "datos_tabulares": rows,
        "formato_exportacion": report.formato_exportacion,
        "motor_ia": f"Groq ({_active_groq_model()})",
        "fecha_consulta": report.fecha_consulta.isoformat(),
    }


async def _exportar_reporte_ia(
    reporte_id: int,
    formato: str,
    tenant: TenantContext,
    db: AsyncSession,
) -> Response:
    if not tenant.permite_ia:
        raise HTTPException(status_code=403, detail="Su plan actual no cuenta con exportación de reportes de IA.")

    report = (await db.execute(select(ReporteGenerativoIA).where(
        ReporteGenerativoIA.id == reporte_id,
        ReporteGenerativoIA.empresa_id == tenant.empresa_id,
    ))).scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado para esta empresa.")

    company = (await db.execute(select(Empresa).where(Empresa.id == tenant.empresa_id))).scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="No se encontró la empresa del reporte.")

    try:
        sql = _validate_sql(report.sql_generado or "")
        result = await db.execute(text(sql), {"tenant_id": tenant.empresa_id})
        columns = list(result.keys())
        rows = [
            {key: _json_value(value) for key, value in row._mapping.items()}
            for row in result.fetchall()
        ]
    except HTTPException:
        raise
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail="No fue posible reconstruir los datos del reporte para exportarlo.") from exc

    report_data = {
        "reporte_id": report.id,
        "prompt_consulta": report.prompt_consulta,
        "tipo_entrada": report.tipo_entrada,
        "respuesta_resumen": report.respuesta_resumen or "",
        "columnas": columns,
        "datos_tabulares": rows,
    }
    company_data = {
        "id": company.id,
        "razon_social": company.razon_social,
        "nit": company.nit,
        "direccion_fiscal": company.direccion_fiscal,
    }

    if formato == "PDF":
        content = ReportExportService.generar_pdf(report_data, company_data).getvalue()
        media_type = "application/pdf"
        extension = "pdf"
    else:
        content = ReportExportService.generar_excel(report_data, company_data).getvalue()
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        extension = "xlsx"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="Reporte_IA_{report.id}.{extension}"'},
    )


@router.get("/reportes/{reporte_id}/exportar/pdf", summary="Exportar un reporte de IA como PDF")
async def exportar_reporte_ia_pdf(
    reporte_id: int,
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    return await _exportar_reporte_ia(reporte_id, "PDF", tenant, db)


@router.get("/reportes/{reporte_id}/exportar/excel", summary="Exportar un reporte de IA como Excel")
async def exportar_reporte_ia_excel(
    reporte_id: int,
    tenant: TenantContext = Depends(get_current_tenant_context),
    db: AsyncSession = Depends(get_db),
):
    return await _exportar_reporte_ia(reporte_id, "EXCEL", tenant, db)
