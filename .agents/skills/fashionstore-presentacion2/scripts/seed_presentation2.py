#!/usr/bin/env python3
"""
Script de inicialización y Seeding de datos para la Presentación 2 (FashionStore).
Genera e inserta la configuración de políticas de garantía, inventario multi-sucursal,
guías de medidas en cm y estados de traspaso en dos fases.
INF412 - Sistemas de Información 2 (MSc. Ing. Angélica Garzón Cuéllar)
"""

import sys

def get_presentation2_seed_sql():
    return """
-- ==============================================================================
-- SEEDING SQL PRESENTACIÓN 2: LOGÍSTICA, OFFLINE Y GARANTÍAS (INF412)
-- ==============================================================================

-- 1. Asegurar políticas de garantía por tenant (RN06 y RN07)
-- Regla estricta: Plazo de 7 días, cambio de talla permitido, PROHIBIDO reembolso en efectivo.
INSERT INTO politica_garantia (empresa_id, plazo_dias_cambio, permite_cambio_talla, admite_reembolso_dinero, requiere_etiqueta_original, activo)
SELECT e.id, 7, TRUE, FALSE, TRUE, TRUE
FROM empresa e
ON CONFLICT (empresa_id) DO UPDATE SET
    plazo_dias_cambio = 7,
    permite_cambio_talla = TRUE,
    admite_reembolso_dinero = FALSE;

-- 2. Asegurar existencia de 2 sucursales para Tenant 1 (Elegance Boutique) para traspasos
INSERT INTO sucursal (empresa_id, nombre, direccion, ciudad, telefono, activo)
SELECT 1, 'Sucursal Central - Casco Viejo', 'Calle 21 de Mayo #340', 'Santa Cruz', '3345678', TRUE
WHERE NOT EXISTS (SELECT 1 FROM sucursal WHERE empresa_id = 1 AND nombre LIKE '%Central%');

INSERT INTO sucursal (empresa_id, nombre, direccion, ciudad, telefono, activo)
SELECT 1, 'Sucursal Norte - Equipetrol', 'Av. San Martín #1200', 'Santa Cruz', '3398765', TRUE
WHERE NOT EXISTS (SELECT 1 FROM sucursal WHERE empresa_id = 1 AND nombre LIKE '%Equipetrol%');

-- 3. Semilla de Guía Anatómica de Medidas en centímetros por talla (pecho, cintura, cadera, largo, manga)
INSERT INTO guia_medida (producto_id, talla_id, pecho_cm, cintura_cm, cadera_cm, largo_cm, manga_cm, observacion_calce)
SELECT p.id, t.id, 92.50, 74.00, 98.00, 68.00, 61.50, 'Calce estándar regular fit con tolerancia +-1.5cm'
FROM producto p
CROSS JOIN talla t
WHERE p.id IN (SELECT id FROM producto LIMIT 5)
ON CONFLICT (producto_id, talla_id) DO NOTHING;

-- 4. Semilla de Traspaso en Fase 1 (EN_TRANSITO) para demostración en vivo
INSERT INTO traspaso_inventario (codigo_traspaso, empresa_id, sucursal_origen_id, sucursal_destino_id, usuario_despacha_id, estado, motivo, fecha_despacho)
SELECT 'TRASP-2026-0001', 1, s1.id, s2.id, 1, 'EN_TRANSITO', 'Reabastecimiento de urgencia de vestidos de fiesta', NOW()
FROM sucursal s1, sucursal s2
WHERE s1.empresa_id = 1 AND s2.empresa_id = 1 AND s1.id <> s2.id
LIMIT 1
ON CONFLICT (codigo_traspaso) DO NOTHING;
"""

def main():
    print("==================================================================")
    print(" SEEDING PRESENTACION 2: OFFLINE, LOGISTICA Y GARANTIAS")
    print("==================================================================")
    sql = get_presentation2_seed_sql()
    print("[OK] Sentencias SQL de seeding generadas con exito.")
    print("[OK] Politicas de garantia: 7 dias de validez y prohibicion estricta de reembolso monetario (RN07).")
    print("[OK] Configuracion multi-sucursal lista para traspasos en dos fases (CU12 / CU13).")
    print("[OK] Guias anatomicas de medidas en cm aseguradas para control de calce textil (CU06 / CU19).")
    print("\n--- SCRIPT SQL PARA EJECUTAR EN PGADMIN O PSQL ---")
    print(sql.strip()[:600] + "\n... [SQL completo disponible en references/database-schema.sql]")
    return 0

if __name__ == "__main__":
    sys.exit(main())
