"""
Servicio para Guía Anatómica de Medidas y Políticas de Garantía (CU06, CU18).
Permite registrar y consultar dimensiones corporales en centímetros por talla (pecho, cintura,
cadera, largo, manga) para mitigar discrepancias de talla, y gestionar políticas de devolución.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException

class GuiaMedidaCreate(BaseModel):
    talla_id: int
    pecho_cm: float = Field(..., gt=0, description="Contorno de pecho en centímetros")
    cintura_cm: float = Field(..., gt=0, description="Contorno de cintura en centímetros")
    cadera_cm: float = Field(..., gt=0, description="Contorno de cadera en centímetros")
    largo_cm: float = Field(..., gt=0, description="Largo total de la prenda en centímetros")
    manga_cm: Optional[float] = Field(None, gt=0, description="Largo de manga en centímetros")
    observacion_calce: Optional[str] = Field(None, max_length=150)

class PoliticaGarantiaUpdate(BaseModel):
    plazo_dias_cambio: int = Field(..., gt=0, le=90, description="Días de tolerancia para cambio de talla")
    requiere_etiqueta_original: bool = True

def get_guia_medidas_producto(db: Session, empresa_id: int, producto_id: int):
    """
    Recupera las medidas anatómicas por talla de un producto asegurando aislamiento de empresa.
    """
    sql = """
        SELECT g.id, t.nombre AS talla, g.pecho_cm, g.cintura_cm, g.cadera_cm, 
               g.largo_cm, g.manga_cm, g.observacion_calce
        FROM guia_medida g
        JOIN talla t ON g.talla_id = t.id
        JOIN producto p ON g.producto_id = p.id
        WHERE g.producto_id = :producto_id AND p.empresa_id = :empresa_id
        ORDER BY t.id ASC
    """
    rows = db.execute(sql, {"producto_id": producto_id, "empresa_id": empresa_id}).fetchall()
    return [dict(r) for r in rows]

def update_politica_garantia_tenant(db: Session, empresa_id: int, data: PoliticaGarantiaUpdate):
    """
    Actualiza la política de garantía respetando la regla RN07: Sin reembolso en efectivo.
    """
    sql = """
        UPDATE politica_garantia
        SET plazo_dias_cambio = :dias,
            requiere_etiqueta_original = :etiqueta,
            admite_reembolso_dinero = FALSE
        WHERE empresa_id = :empresa_id
        RETURNING *;
    """
    row = db.execute(sql, {
        "dias": data.plazo_dias_cambio,
        "etiqueta": data.requiere_etiqueta_original,
        "empresa_id": empresa_id
    }).fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Política de garantía no encontrada para la empresa.")
    db.commit()
    return dict(row)
