"""
Servicio y decorador para control de cuotas y límites por Plan de Suscripción (CU01, CU04).
Previene que un tenant en Plan Básico registre más de 2 sucursales o acceda a IA / Offline
si su plan no lo contempla.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

class SubscriptionQuotaError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=400, detail=detail)

def validate_branch_creation_limit(db: Session, empresa_id: int):
    """
    Verifica si la empresa puede crear una nueva sucursal según el plan contratado.
    Límites:
      - BASICO: Máximo 2 sucursales.
      - INTERMEDIO: Máximo 10 sucursales.
      - VIP: Ilimitadas (hasta 999).
    """
    # 1. Obtener la suscripción activa y su plan
    query_sub = """
        SELECT p.codigo, p.limite_sucursales, s.estado
        FROM suscripcion s
        JOIN plan_suscripcion p ON s.plan_id = p.id
        WHERE s.empresa_id = :empresa_id AND s.estado = 'ACTIVA'
        ORDER BY s.id DESC LIMIT 1
    """
    result = db.execute(query_sub, {"empresa_id": empresa_id}).fetchone()
    
    if not result:
        raise SubscriptionQuotaError("La empresa no cuenta con una suscripción activa.")
    
    plan_codigo = result[0]
    limite_sucursales = result[1]
    
    # 2. Contar sucursales activas actuales de la empresa
    query_count = """
        SELECT COUNT(*) 
        FROM sucursal 
        WHERE empresa_id = :empresa_id AND activo = TRUE
    """
    actuales = db.execute(query_count, {"empresa_id": empresa_id}).scalar()
    
    if actuales >= limite_sucursales:
        raise SubscriptionQuotaError(
            f"Límite de sucursales alcanzado ({actuales}/{limite_sucursales}). "
            f"Su plan actual '{plan_codigo}' no permite registrar más sucursales. "
            f"Actualice a un plan superior para continuar expandiendo su negocio."
        )
    
    return True
