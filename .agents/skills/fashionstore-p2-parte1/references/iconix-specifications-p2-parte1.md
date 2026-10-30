# Especificaciones ICONIX: Parte 1 de la Presentación 2 (CU08 al CU15)

## 1. Alcance de Casos de Uso (Parte 1)

Este documento detalla el análisis de requisitos, diagramas de robustez (BCE) y flujo de secuencia para los 6 casos de uso asignados:

---

### CU08: Descargar y Almacenar Catálogo en Memoria Local
- **Actores**: Vendedor, Cajero, Sistema Cliente.
- **Canal**: Web PWA (IndexedDB) / Móvil Flutter (SQLite).
- **Precondiciones**: Dispositivo con conexión a internet al momento de la sincronización inicial.
- **Flujo Principal**:
  1. El sistema cliente realiza una petición `GET /api/v1/catalogo/sincronizar-local` enviando el token con contexto de tenant y sucursal.
  2. El servidor retorna la lista de prendas activas con sus atributos: nombre, categoría, precio, tallas disponibles, stock local y tabla de medidas en centímetros (`pecho_cm`, `cintura_cm`, etc.).
  3. El cliente abre el almacén local (`catalogo` en IndexedDB o tabla `local_catalog` en SQLite).
  4. Se reemplazan los registros locales en una sola transacción atómica.
  5. Se almacena la marca temporal de la última actualización en `localStorage` o `SharedPreferences`.
  6. El sistema notifica al usuario: "Catálogo local sincronizado correctamente".
- **Objetos de Robustez (BCE)**:
  - **Boundary**: `IU_SincronizacionCatalogo`, `BotonDescargaLocal`.
  - **Control**: `CatalogoLocalController`, `StorageSyncService`.
  - **Entity**: `CatalogoLocalStore` (IndexedDB / SQLite), `ProductoVariante`.

---

### CU11: Consultar Disponibilidad de Inventario Multi-sucursal
- **Actores**: Vendedor, Cliente.
- **Canal**: Web / Móvil.
- **Precondiciones**: Empresa con al menos 2 sucursales registradas; usuario autenticado.
- **Flujo Principal**:
  1. El usuario visualiza una prenda y selecciona una talla específica en el catálogo.
  2. Si la tienda actual no tiene stock suficiente, el actor presiona "Consultar stock en otras sucursales".
  3. El cliente invoca `GET /api/v1/inventario/sucursales-stock?variante_id={id}`.
  4. El servidor consulta en PostgreSQL las existencias de dicha variante en todas las sucursales pertenecientes al mismo `empresa_id`.
  5. El sistema presenta una grilla detallada con:
     - Nombre de la sucursal (ej. "Sucursal Central", "Sucursal Equipetrol").
     - Dirección física y teléfono de contacto.
     - Cantidad de unidades disponibles para venta inmediata.
  6. Si otra sucursal dispone de existencias, el vendedor puede iniciar el flujo de solicitud de traspaso (CU12).
- **Objetos de Robustez (BCE)**:
  - **Boundary**: `IU_ConsultaStockMultisucursal`, `ModalDisponibilidadTiendas`.
  - **Control**: `StockMultisucursalController`.
  - **Entity**: `Sucursal`, `InventarioSucursal`.

---

### CU12: Solicitar y Despachar Traspaso de Inventario (Fase 1: Origen)
- **Actores**: Encargado de Sucursal Origen / Jefe de Bodega.
- **Canal**: Web.
- **Precondiciones**: Existencias físicas disponibles en la sucursal emisora.
- **Flujo Principal**:
  1. El encargado de la sucursal de origen abre el formulario de despacho de traspaso.
  2. Selecciona la sucursal de destino, la prenda/variante y la cantidad a transferir.
  3. El sistema valida que `sucursal_origen_id <> sucursal_destino_id`.
  4. El sistema valida que `inventario.cantidad >= cantidad_solicitada`.
  5. En una sola transacción:
     a. Se descuenta el stock de la sucursal origen: `inventario.cantidad = inventario.cantidad - cantidad_solicitada`.
     b. Se genera el código correlativo de traspaso `TRASP-YYYY-NNNN`.
     c. Se crea el registro maestro en `traspaso_inventario` con `estado = 'EN_TRANSITO'`, registrando fecha y usuario que despacha.
     d. Se crean los registros de detalle en `detalle_traspaso`.
  6. El sistema genera el remito o comprobante de despacho físico para el transporte.
- **Objetos de Robustez (BCE)**:
  - **Boundary**: `IU_FormularioTraspaso`, `BotonDespacharTraspaso`.
  - **Control**: `TraspasoDespachoController`, `InventarioOrigenService`.
  - **Entity**: `TraspasoInventario`, `DetalleTraspaso`, `InventarioOrigen`.

---

### CU13: Confirmar Recepción de Traspaso en Destino (Fase 2: Destino)
- **Actores**: Encargado de Sucursal Destino / Receptor.
- **Canal**: Web.
- **Precondiciones**: Existencia de un traspaso en estado `EN_TRANSITO` dirigido a la sucursal del actor.
- **Flujo Principal**:
  1. El encargado de la sucursal destino consulta la bandeja de traspasos entrantes en tránsito.
  2. Al llegar el transporte físico, el encargado abre la orden y verifica el conteo físico de prendas recibidas.
  3. El usuario confirma las cantidades conformes y registra observaciones si las hubiera.
  4. En una transacción atómica:
     a. Se incrementa el inventario de la sucursal receptora: `inventario.cantidad = inventario.cantidad + cantidad_recibida`.
     b. Se actualiza el registro en `detalle_traspaso` con la cantidad recibida.
     c. Se actualiza `traspaso_inventario.estado = 'RECEPCIONADO'`, registrando fecha, hora y usuario que recepciona.
  5. Las prendas quedan automáticamente disponibles para venta presencial o virtual en la nueva sucursal.
- **Objetos de Robustez (BCE)**:
  - **Boundary**: `IU_BandejaRecepcionTraspasos`, `BotonConfirmarRecepcion`.
  - **Control**: `TraspasoRecepcionController`, `InventarioDestinoService`.
  - **Entity**: `TraspasoInventario`, `DetalleTraspaso`, `InventarioDestino`.

---

### CU14: Registrar Reserva Offline para Ensayo en Tienda
- **Actores**: Cliente, Vendedor.
- **Canal**: Web PWA / Móvil Flutter (Modo Offline).
- **Precondiciones**: Catálogo descargado previamente en memoria local.
- **Flujo Principal**:
  1. El cliente o vendedor selecciona una o más prendas de interés en el catálogo local.
  2. Selecciona la opción *"Apartar para Probador Físico (Sin Pago)"*.
  3. El sistema solicita seleccionar la fecha y hora estimada de la visita a la tienda.
  4. La aplicación genera un `uuid_reserva` (UUIDv4) y persiste la reserva en el almacenamiento local (`reservas_offline` en IndexedDB o SQLite).
  5. **Regla de Negocio**: No se exige pasarela de pago ni cobro de seña monetaria (compromiso de ensayo presencial).
  6. La pantalla presenta un ticket digital con el código local de apartado para mostrar en el probador de la tienda.
- **Objetos de Robustez (BCE)**:
  - **Boundary**: `IU_FichaProductoApartado`, `DialogoTicketProbador`.
  - **Control**: `ReservaProbadorOfflineController`.
  - **Entity**: `ReservaLocalStore` (IndexedDB / SQLite).

---

### CU15: Registrar Venta de Contado Offline
- **Actores**: Cajero, Vendedor.
- **Canal**: Web PWA / Móvil Flutter (Modo Offline).
- **Precondiciones**: Terminal de cobro sin conexión a internet (modo contingencia); existencias en memoria local.
- **Flujo Principal**:
  1. El cajero agrega las prendas solicitadas al carrito de cobro de contingencia.
  2. El sistema valida precio y existencia en el catálogo local.
  3. El cajero selecciona como medio de pago: **EFECTIVO / CONTADO**.
  4. El sistema genera un identificador local único criptográfico: `uuid_operacion = crypto.randomUUID()`.
  5. El sistema rebaja temporalmente la cantidad del inventario local de la terminal.
  6. Se guarda el registro en el almacenamiento local (`ventas_offline` en IndexedDB o SQLite) con estado `PENDIENTE_SINCRONIZACION`.
  7. El sistema emite e imprime el comprobante de contingencia con la leyenda *"Venta local fuera de línea - UUID: {uuid_operacion}"*.
- **Objetos de Robustez (BCE)**:
  - **Boundary**: `IU_POSCajaContingencia`, `DialogoCobroEfectivo`.
  - **Control**: `VentaContadoOfflineController`, `LocalStockDeductor`.
  - **Entity**: `VentaLocalStore` (IndexedDB / SQLite).
