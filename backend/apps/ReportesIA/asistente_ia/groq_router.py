"""CU21: consultas analíticas en lenguaje natural con Groq."""
import json
import re
from datetime import datetime, date
from decimal import Decimal
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from apps.GestionSaas.planes.models import Empresa, ReporteGenerativoIA
from apps.core.config import settings
from apps.core.database import get_db
from apps.core.tenant import TenantContext, get_current_tenant_context

router = APIRouter(prefix="/ia", tags=["IA Generativa (Groq) - CU21"])

SAFE_TABLES = {"ventas", "detalles_venta", "prenda_variantes", "prendas", "sucursales", "inventario_stock"}
SAFE_FUNCTIONS = {"count", "sum", "avg", "min", "max", "round", "coalesce", "date_trunc", "extract"}
DEPRECATED_GROQ_MODELS = {"llama-3.3-70b-versatile": "openai/gpt-oss-120b"}
TABLE_REF = re.compile(r"\b(?:from|join)\s+([a-z_][a-z0-9_]*)\s+(?:as\s+)?([a-z_][a-z0-9_]*)", re.I)
TENANT_FILTER = re.compile(r"\b([a-z_][a-z0-9_]*)\s*\.\s*empresa_id\s*=\s*:tenant_id\b", re.I)


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
    if not candidate or not re.match(r"^select\b", candidate, re.I):
        raise HTTPException(status_code=400, detail="La consulta generada no es un SELECT válido.")
    # A statement separator anywhere inside the query, or SQL comments, remain
    # forbidden. A final semicolon was removed above as normal SQL punctuation.
    if ";" in candidate or "--" in candidate or "/*" in candidate or "*/" in candidate:
        raise HTTPException(status_code=400, detail="La consulta generada contiene sintaxis no permitida.")
    if re.search(r"\b(with|union|intersect|except|insert|update|delete|drop|alter|truncate|grant|revoke|copy|call|execute|or)\b", candidate, re.I):
        raise HTTPException(status_code=400, detail="La consulta generada contiene operaciones no permitidas.")
    refs = TABLE_REF.findall(candidate)
    if not refs or any(table.lower() not in SAFE_TABLES for table, _alias in refs):
        raise HTTPException(status_code=400, detail="La consulta intenta acceder a tablas no autorizadas.")
    tenant_aliases = {
        alias.lower() for table, alias in refs
        if table.lower() in {"ventas", "prendas"}
    }
    filtered_aliases = {alias.lower() for alias in TENANT_FILTER.findall(candidate)}
    if not re.search(r"\bwhere\b", candidate, re.I) or not tenant_aliases or not tenant_aliases.issubset(filtered_aliases):
        raise HTTPException(status_code=400, detail="La consulta no incluye el filtro obligatorio del tenant.")
    functions = re.findall(r"\b([a-z_][a-z0-9_]*)\s*\(", candidate, re.I)
    if any(function.lower() not in SAFE_FUNCTIONS for function in functions):
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

    generated = await _groq_chat([
        {"role": "system", "content": (
            "Eres un generador Text-to-SQL para FashionStore. Devuelve JSON con claves sql y resumen. "
            "Solo puedes producir una consulta PostgreSQL SELECT sobre estas tablas y columnas: "
            "ventas v (id, empresa_id, sucursal_id, cliente_id, total, estado, canal_venta, created_at), "
            "detalles_venta dv (venta_id, variante_id, cantidad, precio_unitario, subtotal), "
            "prenda_variantes pv (id, prenda_id, talla, color), prendas p (id, empresa_id, nombre, categoria_id, precio_base), "
            "sucursales s (id, nombre), inventario_stock i (variante_id, sucursal_id, cantidad_disponible). "
            "Debes filtrar por empresa en cada tabla que tenga ese campo: ventas y prendas, "
            "usando alias.empresa_id = :tenant_id. Puedes partir de cualquiera de ellas. "
            "Puedes agregar JOIN y un LIMIT de hasta 100. No escribas Markdown ni comentarios."
        )},
        {"role": "user", "content": payload.prompt.strip()},
    ], json_mode=True)
    try:
        generated_data = json.loads(generated)
        sql = _validate_sql(str(generated_data["sql"]))
        initial_summary = str(generated_data.get("resumen", ""))
    except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail="Groq no devolvió una consulta analítica válida.") from exc

    try:
        result = await db.execute(text(sql), {"tenant_id": tenant.empresa_id})
        columns = list(result.keys())
        rows = [{key: _json_value(value) for key, value in row._mapping.items()} for row in result.fetchall()]
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail="No fue posible ejecutar la consulta analítica generada.") from exc

    summary = await _groq_chat([
        {"role": "system", "content": "Resume en español los resultados analíticos con claridad. No inventes datos; si no hay filas, indícalo."},
        {"role": "user", "content": json.dumps({"pregunta": payload.prompt, "resultados": rows[:100]}, ensure_ascii=False)},
    ]) if rows else (initial_summary or "La consulta no encontró resultados para este período.")

    report = ReporteGenerativoIA(
        empresa_id=tenant.empresa_id,
        usuario_id=tenant.user_id,
        prompt_consulta=payload.prompt.strip(),
        tipo_entrada=payload.tipo_entrada.upper(),
        sql_generado=sql,
        respuesta_resumen=summary,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    company = await db.execute(select(Empresa.razon_social).where(Empresa.id == tenant.empresa_id))
    return {
        "reporte_id": report.id,
        "empresa_id": tenant.empresa_id,
        "empresa_nombre": company.scalar_one_or_none() or "Empresa",
        "prompt_consulta": report.prompt_consulta,
        "tipo_entrada": report.tipo_entrada,
        "sql_generado": sql,
        "respuesta_resumen": summary,
        "columnas": columns,
        "datos_tabulares": rows,
        "formato_exportacion": report.formato_exportacion,
        "motor_ia": f"Groq ({_active_groq_model()})",
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
    return {
        "reporte_id": report.id,
        "empresa_id": report.empresa_id,
        "empresa_nombre": "Empresa",
        "prompt_consulta": report.prompt_consulta,
        "tipo_entrada": report.tipo_entrada,
        "sql_generado": report.sql_generado,
        "respuesta_resumen": report.respuesta_resumen,
        "columnas": [],
        "datos_tabulares": [],
        "formato_exportacion": report.formato_exportacion,
        "motor_ia": f"Groq ({_active_groq_model()})",
        "fecha_consulta": report.fecha_consulta.isoformat(),
    }
