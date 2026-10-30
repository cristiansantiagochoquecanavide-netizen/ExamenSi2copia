# Contratos de API, Lógica de Negocio y Reglas Backend (Presentación 2)

## 1. Módulo de Sincronización e Idempotencia

### 1.1. Endpoint: Sincronización de Lote Offline
- **Ruta**: `POST /api/v1/sincronizacion/offline`
- **Autenticación**: Requerida (Bearer Token con contexto `empresa_id` y `sucursal_id`).
- **Descripción**: Procesa transacciones generadas por terminales desconectadas (ventas, reservas). Aplica validación estricta de idempotencia por `uuid_operacion` para evitar duplicar transacciones ante reintentos de red.

#### Payload Request:
```json
{
  "lote": [
    {
      "uuid_operacion": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "tipo_operacion": "VENTA_LOCAL",
      "fecha_registro_local": "2026-10-31T15:20:00Z",
      "payload_json": {
        "sucursal_id": 1,
        "cliente_id": 3,
        "monto_total": 350.00,
        "metodo_pago": "EFECTIVO",
        "items": [
          {
            "producto_variante_id": 10,
            "cantidad": 2,
            "precio_unitario": 175.00
          }
        ]
      }
    }
  ]
}
```

#### Flujo de Ejecución en Servidor:
1. Para cada elemento en `lote`:
   - Consultar `SELECT id, estado FROM sincronizacion_offline WHERE uuid_operacion = :uuid`.
   - **Caso 1 (Idempotencia)**: Si el registro ya existe y su estado es `SINCRONIZADO`, se retorna inmediatamente el resultado previo sin alterar inventario.
   - **Caso 2 (Nueva Operación)**:
     - Insertar registro en `sincronizacion_offline` con `estado = 'PENDIENTE'`.
     - Abrir transacción de base de datos.
     - Para cada item en `items`:
       - Verificar `SELECT cantidad FROM inventario WHERE sucursal_id = :sucursal AND producto_variante_id = :variante FOR UPDATE`.
       - Si `cantidad >= item.cantidad`:
         - Decrementar `inventario.cantidad = inventario.cantidad - item.cantidad`.
         - Crear registro en `venta` y `detalle_venta`.
         - Actualizar `sincronizacion_offline.estado = 'SINCRONIZADO'`.
       - Si `cantidad < item.cantidad` (Conflicto por agotamiento de stock mientras la terminal estuvo offline):
         - Crear registro en `conflicto_inventario` con `cantidad_solicitada`, `stock_disponible_servidor` y `estado_resolucion = 'PENDIENTE'`.
         - Actualizar `sincronizacion_offline.estado = 'CONFLICTO_STOCK'`.
2. Retornar resumen del lote indicando procesados, cacheados y conflictos.

---

## 2. Módulo de Notas de Devolución por Cambio de Talla

### 2.1. Reglas del Negocio (RN):
- **RN06 (Plazo de Garantía)**: El cambio de prenda solo se admite si los días transcurridos entre la fecha de la venta original y la fecha actual son menores o iguales a `politica_garantia.plazo_dias_cambio` (ej. 7 días).
- **RN07 (Prohibición Estricta de Reembolso Monetario)**: En concordancia con los requisitos de la docente, el sistema **no realiza devolución de dinero en efectivo ni transferencia bancaria**. La operación es un canje físico por otra talla o variante de calce.
- **RN08 (Afectación Dual de Inventario)**:
  - La prenda devuelta (`variante_devuelta_id`) reingresa al inventario: `inventario.cantidad = inventario.cantidad + 1`.
  - La nueva prenda entregada (`variante_entregada_id`) sale del inventario: `inventario.cantidad = inventario.cantidad - 1`.

### 2.2. Endpoint: Emisión de Nota de Devolución
- **Ruta**: `POST /api/v1/devoluciones/notas`
- **Autenticación**: Requerida (Rol Cajero / Administrador).

#### Payload Request:
```json
{
  "venta_id": 45,
  "sucursal_id": 1,
  "cliente_id": 3,
  "motivo": "TALLA_CHICA",
  "observaciones": "El cliente solicita cambio por talla L debido a que la talla M le queda ajustada en el contorno de pecho.",
  "detalles": [
    {
      "variante_devuelta_id": 10,
      "cantidad_devuelta": 1,
      "variante_entregada_id": 11,
      "cantidad_entregada": 1,
      "diferencia_monetaria": 0.00
    }
  ]
}
```

#### Respuesta Response (`201 Created`):
```json
{
  "id": 12,
  "codigo_devolucion": "DEV-2026-0012",
  "empresa_id": 1,
  "venta_id": 45,
  "sucursal_id": 1,
  "motivo": "TALLA_CHICA",
  "estado": "COMPLETADA",
  "fecha_hora": "2026-10-31T16:45:00Z",
  "diferencia_monetaria_total": 0.00,
  "mensaje": "Nota de devolución emitida exitosamente. Inventario actualizado: prenda reingresada y nueva talla despachada."
}
```

---

## 3. Módulo de Traspasos Multi-sucursal en 2 Fases

### 3.1. Flujo Logístico en Dos Fases:
- **Fase 1 (Despacho en Origen)**: La sucursal emisora prepara el lote físico de prendas. Al despachar, el inventario disponible de origen se reduce y pasa al estado lógico `EN_TRANSITO`.
- **Fase 2 (Recepción en Destino)**: El transportista entrega el lote en la sucursal destino. El encargado de destino cuenta las prendas e ingresa la recepción conforme, sumando las unidades al inventario disponible de su sucursal y cerrando el ciclo con estado `RECEPCIONADO`.

### 3.2. Endpoint: Solicitar y Despachar Traspaso (Fase 1)
- **Ruta**: `POST /api/v1/inventario/traspasos`

#### Payload Request:
```json
{
  "sucursal_origen_id": 1,
  "sucursal_destino_id": 2,
  "motivo": "Reabastecimiento por alta demanda de vestidos de gala en Sucursal Norte",
  "items": [
    {
      "producto_variante_id": 15,
      "cantidad": 5
    }
  ]
}
```

### 3.3. Endpoint: Confirmar Recepción en Destino (Fase 2)
- **Ruta**: `POST /api/v1/inventario/traspasos/{traspaso_id}/recepcionar`

#### Payload Request:
```json
{
  "observaciones_recepcion": "Lote recibido conforme en perfectas condiciones",
  "items_confirmados": [
    {
      "producto_variante_id": 15,
      "cantidad_recibida": 5
    }
  ]
}
```
