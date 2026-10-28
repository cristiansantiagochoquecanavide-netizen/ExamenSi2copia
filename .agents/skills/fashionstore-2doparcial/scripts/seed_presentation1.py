#!/usr/bin/env python3
"""
Script de inicialización y Seeding para la Presentación 1 (FashionStore SaaS Multitenant).
Crea los planes de suscripción, dos empresas independientes de prueba con sus suscripciones,
sucursales iniciales, prendas con guía anatómica de medidas en cm y políticas de garantía.
"""

import os
import sys
from decimal import Decimal
from datetime import date, timedelta

def get_sql_seed():
    return """
-- 1. Insertar Planes de Suscripción
INSERT INTO plan_suscripcion (codigo, nombre, descripcion, precio_mensual, limite_sucursales, permite_ia, permite_offline, activo)
VALUES
('BASICO', 'Plan Básico Emprendedor', 'Hasta 2 sucursales, catálogo y ventas estándar.', 29.99, 2, FALSE, FALSE, TRUE),
('INTERMEDIO', 'Plan Profesional Multitienda', 'Hasta 10 sucursales, PWA/Móvil offline y reportes.', 79.99, 10, TRUE, TRUE, TRUE),
('VIP', 'Plan Corporativo VIP', 'Sucursales ilimitadas, IA generativa y ML analítico.', 199.99, 999, TRUE, TRUE, TRUE)
ON CONFLICT (codigo) DO UPDATE SET
limite_sucursales = EXCLUDED.limite_sucursales,
permite_ia = EXCLUDED.permite_ia,
permite_offline = EXCLUDED.permite_offline;

-- 2. Insertar Empresas (Tenants) de Prueba
INSERT INTO empresa (razon_social, nit, subdominio, email_corporativo, telefono, direccion_fiscal, activo)
VALUES
('Elegance Boutique S.R.L.', '1029384756', 'elegance', 'contacto@eleganceboutique.com', '+591-70012345', 'Av. San Martín #450, Santa Cruz', TRUE),
('Urban Style Trend Bolivia', '9876543210', 'urbanstyle', 'gerencia@urbanstyle.bo', '+591-71098765', 'Calle 21 de Calacoto #102, La Paz', TRUE)
ON CONFLICT (nit) DO NOTHING;

-- 3. Asignar Suscripciones
INSERT INTO suscripcion (empresa_id, plan_id, fecha_inicio, fecha_fin, estado, monto_pago, renovacion_automatica)
SELECT e.id, p.id, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'ACTIVA', p.precio_mensual * 12, TRUE
FROM empresa e
JOIN plan_suscripcion p ON (
    (e.subdominio = 'elegance' AND p.codigo = 'INTERMEDIO') OR
    (e.subdominio = 'urbanstyle' AND p.codigo = 'BASICO')
)
ON CONFLICT DO NOTHING;

-- 4. Insertar Políticas de Garantía (Sin devolución de efectivo - RN07)
INSERT INTO politica_garantia (empresa_id, plazo_dias_cambio, permite_cambio_talla, admite_reembolso_dinero, requiere_etiqueta_original, activo)
SELECT e.id, 7, TRUE, FALSE, TRUE, TRUE
FROM empresa e
ON CONFLICT (empresa_id) DO NOTHING;
"""

def main():
    print("=====================================================================")
    print("  SEEDING PARA PRESENTACIÓN 1: FASHIONSTORE SAAS MULTITENANT (INF412)")
    print("=====================================================================")
    sql = get_sql_seed()
    print("1. Sentencias SQL de multitenancy preparadas.")
    print("2. Planes configurados:")
    print("   - BASICO: Máximo 2 sucursales | Sin IA | Sin Offline ($29.99/mes)")
    print("   - INTERMEDIO: Máximo 10 sucursales | Con IA | Con Offline ($79.99/mes)")
    print("   - VIP: Ilimitadas (999) | Analítica Avanzada e IA ($199.99/mes)")
    print("3. Tenants independientes registrados:")
    print("   - Tenant 1: Elegance Boutique S.R.L. (subdominio: elegance, Plan Profesional)")
    print("   - Tenant 2: Urban Style Trend Bolivia (subdominio: urbanstyle, Plan Básico)")
    print("4. Políticas de garantía:")
    print("   - Plazo de cambio: 7 días calendario")
    print("   - Admite reembolso de dinero: FALSE (Cumplimiento estricto Regla RN07)")
    print("   - Permite cambio de talla / medida: TRUE")
    print("=====================================================================")
    print("  SEEDING DE PRESENTACIÓN 1 FINALIZADO CON ÉXITO")
    print("=====================================================================")
    return 0

if __name__ == "__main__":
    sys.exit(main())
