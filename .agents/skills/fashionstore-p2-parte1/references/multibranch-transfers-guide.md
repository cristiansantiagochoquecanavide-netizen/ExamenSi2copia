# Guía Técnica: Inventario Multi-sucursal y Traspasos en Dos Fases (CU11, CU12, CU13)

## 1. Visión General de la Logística Multi-sucursal

En FashionStore SaaS, cada tenant cuenta con múltiples sucursales activas (según su plan de suscripción). La gestión de stock debe ser transparente entre tiendas y permitir el traslado formal de mercadería en dos fases auditadas.

```mermaid
sequenceDiagram
    autonumber
    actor Vendedor as Vendedor (Sucursal 1)
    actor EncargadoOrigen as Encargado Origen (Bodega)
    actor EncargadoDestino as Encargado Destino (Tienda 2)
    participant API as FastAPI Backend
    participant BD as PostgreSQL Central

    Note over Vendedor, API: CU11: Consulta de Stock Multi-sucursal
    Vendedor->>API: GET /inventario/sucursales-stock?variante_id=45
    API->>BD: SELECT s.nombre, i.cantidad FROM inventario i JOIN sucursal s...
    BD-->>API: Existencias: Sucursal Central (0), Sucursal Norte (8)
    API-->>Vendedor: Retorna stock distribuido

    Note over EncargadoOrigen, API: CU12: Fase 1 Despacho de Traspaso
    EncargadoOrigen->>API: POST /inventario/traspasos (origen=1, destino=2, cant=5)
    API->>BD: UPDATE inventario SET cantidad = cantidad - 5 WHERE sucursal_id = 1
    API->>BD: INSERT INTO traspaso_inventario (estado='EN_TRANSITO')
    API-->>EncargadoOrigen: Código TRASP-2026-0001 emitido (En Tránsito)

    Note over EncargadoDestino, API: CU13: Fase 2 Recepción Conforme en Destino
    EncargadoDestino->>API: POST /inventario/traspasos/1/recepcionar (recibido=5)
    API->>BD: UPDATE inventario SET cantidad = cantidad + 5 WHERE sucursal_id = 2
    API->>BD: UPDATE traspaso_inventario SET estado='RECEPCIONADO'
    API-->>EncargadoDestino: Traspaso cerrado exitosamente
```

---

## 2. Especificación de Endpoints

### 2.1. CU11: Consultar Disponibilidad de Inventario Multi-sucursal
- **Método**: `GET`
- **Ruta**: `/api/v1/inventario/sucursales-stock`
- **Query Params**: `variante_id` (int)
- **Seguridad**: Autenticado (filtra estrictamente por `empresa_id` del usuario).
- **Respuesta JSON**:
```json
[
  {
    "sucursal_id": 1,
    "nombre_sucursal": "Sucursal Central - Casco Viejo",
    "direccion": "Calle 21 de Mayo #340",
    "telefono": "3345678",
    "stock_disponible": 0
  },
  {
    "sucursal_id": 2,
    "nombre_sucursal": "Sucursal Norte - Equipetrol",
    "direccion": "Av. San Martín #1200",
    "telefono": "3398765",
    "stock_disponible": 8
  }
]
```

---

### 2.2. CU12: Solicitar y Despachar Traspaso (Fase 1: Origen)
- **Método**: `POST`
- **Ruta**: `/api/v1/inventario/traspasos`
- **Validaciones**:
  1. `sucursal_origen_id <> sucursal_destino_id`.
  2. `inventario.cantidad >= cantidad_a_enviar`.
- **Acción Transaccional**:
  - Resta las unidades del stock disponible de la sucursal de origen.
  - Inserta el registro en `traspaso_inventario` con `estado = 'EN_TRANSITO'`.
  - Inserta en `detalle_traspaso`.
- **Payload Request**:
```json
{
  "sucursal_origen_id": 1,
  "sucursal_destino_id": 2,
  "motivo": "Reabastecimiento de urgencia",
  "items": [
    {
      "producto_variante_id": 45,
      "cantidad": 5
    }
  ]
}
```

---

### 2.3. CU13: Confirmar Recepción de Traspaso en Destino (Fase 2: Destino)
- **Método**: `POST`
- **Ruta**: `/api/v1/inventario/traspasos/{traspaso_id}/recepcionar`
- **Validaciones**:
  1. El traspaso debe encontrarse en estado `EN_TRANSITO`.
  2. El usuario debe pertenecer a la sucursal de destino o ser Administrador de Tenant.
- **Acción Transaccional**:
  - Suma las unidades recibidas al stock disponible de la sucursal de destino.
  - Actualiza `traspaso_inventario.estado = 'RECEPCIONADO'`.
  - Registra fecha y usuario receptor.
- **Payload Request**:
```json
{
  "observaciones_recepcion": "Mercadería recibida en perfectas condiciones",
  "items_confirmados": [
    {
      "producto_variante_id": 45,
      "cantidad_recibida": 5
    }
  ]
}
```
