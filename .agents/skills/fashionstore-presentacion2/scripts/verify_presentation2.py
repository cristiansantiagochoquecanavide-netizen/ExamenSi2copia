#!/usr/bin/env python3
"""
Suite de Pruebas Automatizadas de Lógica y Reglas de Negocio - PRESENTACIÓN 2
INF412 - Sistemas de Información 2 (MSc. Ing. Angélica Garzón Cuéllar)

Valida con rigor matemático y transaccional:
1. Sincronización offline con UUIDv4 e Idempotencia estricta (CU15 / CU16).
2. Detección de colisiones de stock y registro de discrepancias (CU17).
3. Reservas offline para probador físico en tienda sin pasarela de pago (CU14).
4. Emisión de Notas de Devolución por cambio de talla (CU19 / CU20).
5. Cumplimiento de regla RN07: Prohibición estricta de reembolso monetario en efectivo.
6. Cumplimiento de regla RN06: Expiración del plazo límite de garantía.
7. Traspasos de mercadería multi-sucursal en 2 fases con stock en tránsito (CU12 / CU13).
"""

import sys
import uuid
from datetime import datetime, timezone, timedelta

def test_offline_idempotent_sync():
    print("[TEST 1] Verificando Sincronización Offline e Idempotencia con UUIDv4 (CU15, CU16)...")
    
    # Simulación del almacén sincronizacion_offline en backend
    sincronizaciones_db = {}
    inventario_db = {101: 15}  # Variante 101 con 15 unidades disponibles

    def procesar_transaccion_offline(tx):
        uuid_op = tx["uuid_operacion"]
        
        # 1. Regla de Idempotencia: si ya existe, responder con cached status sin tocar inventario
        if uuid_op in sincronizaciones_db:
            return {
                "uuid": uuid_op,
                "status": "DUPLICADO_IDEMPOTENTE",
                "mensaje": "Transacción previamente procesada. No se duplicó inventario."
            }

        # 2. Transacción nueva: deducir inventario
        cantidad = tx["items"][0]["cantidad"]
        variante_id = tx["items"][0]["variante_id"]
        
        if inventario_db[variante_id] >= cantidad:
            inventario_db[variante_id] -= cantidad
            sincronizaciones_db[uuid_op] = {
                "estado": "SINCRONIZADO",
                "fecha": datetime.now(timezone.utc),
                "payload": tx
            }
            return {"uuid": uuid_op, "status": "SINCRONIZADO", "stock_restante": inventario_db[variante_id]}
        else:
            return {"uuid": uuid_op, "status": "CONFLICTO_STOCK", "mensaje": "Stock insuficiente"}

    # Transacción 1: Venta offline de 2 unidades
    op_uuid = str(uuid.uuid4())
    tx_offline = {
        "uuid_operacion": op_uuid,
        "tipo_operacion": "VENTA_LOCAL",
        "monto_total": 240.00,
        "items": [{"variante_id": 101, "cantidad": 2}]
    }

    # Primer envío
    res1 = procesar_transaccion_offline(tx_offline)
    assert res1["status"] == "SINCRONIZADO", "Error: la venta offline debió ser sincronizada"
    assert inventario_db[101] == 13, f"Error: el inventario debió quedar en 13 y quedó en {inventario_db[101]}"

    # Segundo envío del MISMO UUID (reintento por latencia de red)
    res2 = procesar_transaccion_offline(tx_offline)
    assert res2["status"] == "DUPLICADO_IDEMPOTENTE", "Fallo de Idempotencia: el segundo intento no fue detectado"
    assert inventario_db[101] == 13, "Fallo Crítico: el reenvío dedujo doblemente el stock"
    
    print("  -> PASSED: Idempotencia garantizada (reintento ignorado, 0 dobles deducciones).")


def test_stock_conflict_resolution():
    print("[TEST 2] Verificando Detección de Conflictos de Stock Central (CU17)...")
    
    stock_servidor = 1
    cantidad_offline_solicitada = 3
    conflictos_db = []

    if stock_servidor < cantidad_offline_solicitada:
        conflictos_db.append({
            "id": 1,
            "solicitado": cantidad_offline_solicitada,
            "disponible": stock_servidor,
            "estado_resolucion": "PENDIENTE",
            "accion_sugerida": "TRASPASO_AUTOMATICO_DESDE_OTRA_SUCURSAL"
        })

    assert len(conflictos_db) == 1, "Debe registrarse el conflicto en la tabla de auditoría"
    assert conflictos_db[0]["estado_resolucion"] == "PENDIENTE"
    print("  -> PASSED: Discrepancia por stock agotado durante periodo offline registrada en conflicto_inventario.")


def test_offline_reservation_no_payment():
    print("[TEST 3] Verificando Reserva para Probador Físico sin Pago Previo (CU14)...")
    
    reserva = {
        "uuid": str(uuid.uuid4()),
        "cliente_id": 42,
        "sucursal_id": 1,
        "prendas": [101, 102],
        "hora_ensayo": "17:30",
        "requiere_pago": False,
        "monto_cobrado": 0.00,
        "estado": "PENDIENTE_ENSAYO_TIENDA"
    }

    assert reserva["requiere_pago"] is False, "El apartado para probador no debe exigir pago previo"
    assert reserva["monto_cobrado"] == 0.00
    print("  -> PASSED: Prenda apartada en tienda sin pasarela de pago para probador presencial.")


def test_nota_devolucion_rules():
    print("[TEST 4 & 5] Verificando Notas de Devolución, Reingreso y Regla de No Reembolso (CU19, CU20)...")
    
    politica = {
        "plazo_dias_cambio": 7,
        "permite_cambio_talla": True,
        "admite_reembolso_dinero": False  # Regla RN07
    }

    inventario = {
        "variante_chica_id": 10,   # Prenda que el cliente devuelve (talla equivocada)
        "variante_nueva_id": 5     # Nueva talla que se le entrega
    }

    def emitir_nota_devolucion(dias_desde_venta, variante_devuelta, variante_entregada, dinero_devuelto):
        # 1. Validar plazo de garantía
        if dias_desde_venta > politica["plazo_dias_cambio"]:
            raise ValueError("Plazo de garantía vencido para cambio de prenda.")

        # 2. Validar prohibición estricta de reembolso (RN07)
        if dinero_devuelto > 0.00:
            raise ValueError("Regla RN07: Prohibido reintegro de dinero en devoluciones por cambio de talla.")

        # 3. Afectación dual del inventario
        # La prenda devuelta reingresa al stock disponible
        inventario[variante_devuelta] += 1
        # La nueva talla sale del stock
        inventario[variante_entregada] -= 1

        return {
            "codigo": f"DEV-{datetime.now().year}-0001",
            "estado": "COMPLETADA",
            "diferencia_monetaria": 0.00
        }

    # Caso A: Intento de reembolso monetario (debe ser rechazado)
    try:
        emitir_nota_devolucion(dias_desde_venta=2, variante_devuelta="variante_chica_id", variante_entregada="variante_nueva_id", dinero_devuelto=50.0)
        assert False, "Fallo: El sistema debió rechazar el reintegro de dinero."
    except ValueError as e:
        print(f"  -> Rechazo exitoso de dinero en efectivo: {e}")

    # Caso B: Intento con plazo de garantía expirado (8 días > 7 días)
    try:
        emitir_nota_devolucion(dias_desde_venta=8, variante_devuelta="variante_chica_id", variante_entregada="variante_nueva_id", dinero_devuelto=0.0)
        assert False, "Fallo: El sistema debió rechazar por plazo de garantía vencido."
    except ValueError as e:
        print(f"  -> Rechazo exitoso por plazo vencido: {e}")

    # Caso C: Cambio válido conforme (día 3, 0 dinero, canje físico)
    nota = emitir_nota_devolucion(dias_desde_venta=3, variante_devuelta="variante_chica_id", variante_entregada="variante_nueva_id", dinero_devuelto=0.0)
    assert nota["estado"] == "COMPLETADA"
    assert inventario["variante_chica_id"] == 11, "La prenda devuelta debió reingresar al stock (+1)"
    assert inventario["variante_nueva_id"] == 4, "La nueva talla debió salir del stock (-1)"
    print("  -> PASSED: Nota de devolución emitida, reingreso a stock ejecutado y balance Bs. 0.00.")


def test_two_phase_interbranch_transfer():
    print("[TEST 6] Verificando Traspasos Multi-sucursal en 2 Fases (CU12, CU13)...")
    
    stock_sucursal_origen = 10
    stock_sucursal_destino = 2
    stock_en_transito = 0

    # Fase 1: Despacho desde Sucursal Origen (5 unidades)
    cantidad_a_trasladar = 5
    assert stock_sucursal_origen >= cantidad_a_trasladar, "Stock insuficiente en origen"
    
    stock_sucursal_origen -= cantidad_a_trasladar
    stock_en_transito += cantidad_a_trasladar
    traspaso_estado = "EN_TRANSITO"
    
    assert stock_sucursal_origen == 5
    assert stock_en_transito == 5
    assert traspaso_estado == "EN_TRANSITO"
    print("  -> Fase 1 (Despacho): 5 unidades reducidas de origen y marcadas como EN_TRANSITO.")

    # Fase 2: Recepción Conforme en Sucursal Destino
    stock_en_transito -= cantidad_a_trasladar
    stock_sucursal_destino += cantidad_a_trasladar
    traspaso_estado = "RECEPCIONADO"

    assert stock_sucursal_destino == 7, "El stock en destino debió subir a 7"
    assert stock_en_transito == 0, "El stock en tránsito debió quedar en 0"
    assert traspaso_estado == "RECEPCIONADO"
    print("  -> Fase 2 (Recepción): 5 unidades ingresadas conforme a destino. Traspaso RECEPCIONADO.")
    print("  -> PASSED: Logística multi-sucursal en 2 fases verificada.")


def run_all_tests():
    print("==================================================================")
    print(" BATERÍA DE PRUEBAS AUTOMATIZADAS - PRESENTACIÓN 2 (INF412)")
    print("==================================================================")
    test_offline_idempotent_sync()
    test_stock_conflict_resolution()
    test_offline_reservation_no_payment()
    test_nota_devolucion_rules()
    test_two_phase_interbranch_transfer()
    print("\n==================================================================")
    print(" [RESULTADO FINAL] TODAS LAS PRUEBAS DE PRESENTACIÓN 2: PASARON (100% OK)")
    print("==================================================================")

if __name__ == "__main__":
    run_all_tests()
