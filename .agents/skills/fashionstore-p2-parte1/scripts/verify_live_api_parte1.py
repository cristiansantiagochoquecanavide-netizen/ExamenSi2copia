#!/usr/bin/env python3
"""
Prueba E2E de Endpoints en Vivo: PRESENTACIÓN 2 - PARTE 1
Verifica contra la API FastAPI activa (http://localhost:8000) los endpoints:
- GET  /api/v1/catalogo/sincronizar-local (CU08)
- GET  /api/v1/inventario/sucursales-stock (CU11)
- POST /api/v1/inventario/traspasos (CU12)
- POST /api/v1/inventario/traspasos/{id}/recepcionar (CU13)
"""

import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:8000/api/v1"

def test_live_cu08():
    print("[E2E TEST 1 - CU08] Invocando GET /api/v1/catalogo/sincronizar-local...")
    req = urllib.request.Request(f"{BASE_URL}/catalogo/sincronizar-local")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200, f"Status esperado 200, obtenido {resp.status}"
        data = json.loads(resp.read().decode("utf-8"))
        assert len(data) > 0, "Debe retornar al menos una prenda para el volcado offline"
        item = data[0]
        assert "pecho_cm" in item and item["pecho_cm"] is not None, "Debe incluir pecho_cm"
        assert "cintura_cm" in item and item["cintura_cm"] is not None, "Debe incluir cintura_cm"
        print(f"  -> PASSED: {len(data)} prendas sincronizables. Ejemplo: {item['nombre']} ({item['talla']}) - Pecho: {item['pecho_cm']}cm, Cintura: {item['cintura_cm']}cm")

def test_live_cu11():
    print("[E2E TEST 2 - CU11] Invocando GET /api/v1/inventario/sucursales-stock?variante_id=1...")
    req = urllib.request.Request(f"{BASE_URL}/inventario/sucursales-stock?variante_id=1")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200, f"Status esperado 200, obtenido {resp.status}"
        data = json.loads(resp.read().decode("utf-8"))
        assert len(data) >= 2, "Debe retornar al menos 2 sucursales del tenant"
        print(f"  -> PASSED: Disponibilidad multi-sucursal consultada ({len(data)} tiendas).")
        for s in data:
            print(f"     * {s['nombre_sucursal']}: {s['stock_disponible']} unidades disponibles.")

def test_live_cu12_and_cu13():
    print("[E2E TEST 3 & 4 - CU12/CU13] Ciclo Completo de Traspaso en Dos Fases...")
    
    # Fase 1: Despacho
    payload_despacho = {
        "sucursal_origen_id": 1,
        "sucursal_destino_id": 2,
        "motivo": "Reabastecimiento de prueba automatizada",
        "items": [{"producto_variante_id": 1, "cantidad": 2}]
    }
    req1 = urllib.request.Request(
        f"{BASE_URL}/inventario/traspasos",
        data=json.dumps(payload_despacho).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req1) as resp1:
        assert resp1.status == 201, f"Status esperado 201, obtenido {resp1.status}"
        data1 = json.loads(resp1.read().decode("utf-8"))
        traspaso_id = data1.get("traspaso_id")
        codigo = data1.get("codigo_traspaso")
        assert data1["estado"] == "EN_TRANSITO", "El estado tras el despacho debe ser EN_TRANSITO"
        print(f"  -> PASSED (CU12): Traspaso {codigo} (ID: {traspaso_id}) emitido en estado {data1['estado']}.")

    # Fase 2: Recepción
    payload_recepcion = {
        "observaciones_recepcion": "Mercadería verificada físicamente conforme",
        "items_confirmados": [{"producto_variante_id": 1, "cantidad_recibida": 2}]
    }
    req2 = urllib.request.Request(
        f"{BASE_URL}/inventario/traspasos/{traspaso_id}/recepcionar",
        data=json.dumps(payload_recepcion).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req2) as resp2:
        assert resp2.status == 200, f"Status esperado 200, obtenido {resp2.status}"
        data2 = json.loads(resp2.read().decode("utf-8"))
        assert data2["estado"] == "RECEPCIONADO", "El estado tras la recepción debe ser RECEPCIONADO"
        print(f"  -> PASSED (CU13): Traspaso ID {traspaso_id} recepcionado conforme (Estado: {data2['estado']}).")

def main():
    print("==================================================================")
    print(" PRUEBAS E2E DE ENDPOINTS EN VIVO: PRESENTACION 2 - PARTE 1")
    print("==================================================================")
    test_live_cu08()
    test_live_cu11()
    test_live_cu12_and_cu13()
    print("\n==================================================================")
    print(" [CONFIRMADO] TODOS LOS ENDPOINTS EN VIVO OPERAN AL 100% OK")
    print("==================================================================")

if __name__ == "__main__":
    main()
