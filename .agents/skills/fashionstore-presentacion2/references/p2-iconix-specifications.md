# Especificaciones de Modelado ICONIX y UML 2.5+ (Presentación 2)

## 1. Enfoque Metodológico ICONIX en Presentación 2

En la **Presentación 2**, la metodología ICONIX se concentra en las Fases 2 y 3:
- **Análisis de Robustez (Patrón BCE)**: Cierra la brecha entre el "QUÉ" (Casos de Uso) y el "CÓMO" (Diseño de Clases). Conecta:
  - **Boundary Objects (Vista/UI)**: Formularios web PWA, pantallas Flutter, ventanas de cobro y diálogos de sincronización.
  - **Control Objects (Lógica/Servicios)**: Controladores de sincronización, procesadores de notas de devolución, gestores de traspaso y despachadores de cola.
  - **Entity Objects (Persistencia/BD)**: Modelos de datos locales (IndexedDB / SQLite) y entidades centrales PostgreSQL (`sincronizacion_offline`, `conflicto_inventario`, `nota_devolucion`, `traspaso_inventario`).
- **Diseño Crítico (Diagramas de Secuencia)**: Asigna formalmente los métodos, mensajes síncronos/asíncronos y respuestas entre los objetos identificados.

---

## 2. Especificación Detallada de los 10 Casos de Uso Críticos (P2)

### CU08: Descargar y Almacenar Catálogo en Memoria Local
- **Actores**: Vendedor, Cajero, Sistema Cliente.
- **Canal**: Web PWA (IndexedDB) / Móvil Flutter (SQLite).
- **Precondiciones**: Usuario autenticado con token válido; conexión activa al momento de la descarga.
- **Flujo Principal**:
  1. El sistema cliente consulta el endpoint `GET /api/v1/catalogo/sincronizar-local`.
  2. El servidor responde con la lista consolidada de productos, variantes (tallas, colores), precios, stock de la sucursal asignada y guías de medidas en centímetros.
  3. El cliente abre la base local (IndexedDB `catalogo_store` en PWA o tabla `local_catalog` en Flutter SQLite).
  4. El cliente ejecuta una transacción de reemplazo (`clear()` y escritura en lote de los registros).
  5. Se registra la marca temporal `ultimo_sync_catalogo` en almacenamiento local.
  6. El sistema notifica al usuario: "Catálogo actualizado para operación fuera de línea".
- **Robustez (BCE)**:
  - *Boundary*: `IU_DescargaCatalogo`, `BotonSyncCatalogo`.
  - *Control*: `CatalogoLocalManager`, `CacheService`.
  - *Entity*: `CatalogoLocalStore` (IndexedDB/SQLite), `ProductoVariante`.

---

### CU11: Consultar Disponibilidad de Inventario Multi-sucursal
- **Actores**: Vendedor, Cliente.
- **Canal**: Web / Móvil.
- **Precondiciones**: Tenant autenticado con al menos 2 sucursales registradas.
- **Flujo Principal**:
  1. El vendedor o cliente visualiza una prenda y selecciona una talla específica.
  2. Si la talla no tiene stock en la sucursal actual, el actor presiona "Ver stock en otras sucursales".
  3. El sistema invoca `GET /api/v1/inventario/sucursales-stock?variante_id={id}`.
  4. El backend consulta las existencias en todas las sucursales pertenecientes al mismo `empresa_id`.
  5. El sistema presenta una grilla con: Nombre de sucursal, Dirección, Teléfono y Unidades disponibles.
  6. El vendedor puede sugerir al cliente solicitar un traspaso físico entre sucursales (CU12) o redirigir al cliente a la sucursal más cercana.
- **Robustez (BCE)**:
  - *Boundary*: `IU_ConsultaStockMultisucursal`, `ModalSucursales`.
  - *Control*: `InventarioMultisucursalService`.
  - *Entity*: `Sucursal`, `Inventario`.

---

### CU12: Solicitar y Despachar Traspaso de Inventario (Fase 1: Origen)
- **Actores**: Encargado de Almacén / Sucursal Origen.
- **Canal**: Web.
- **Precondiciones**: Existencia de stock suficiente en la sucursal origen.
- **Flujo Principal**:
  1. El usuario de sucursal origen crea una solicitud de traspaso indicando la sucursal destino, la variante y la cantidad a transferir.
  2. El sistema valida que `sucursal_origen_id <> sucursal_destino_id`.
  3. El sistema valida que `inventario.cantidad >= cantidad_enviada`.
  4. El sistema descuenta las unidades del inventario disponible de origen: `inventario.cantidad = inventario.cantidad - cantidad_enviada`.
  5. Se crea el registro maestro en `traspaso_inventario` con `estado = 'EN_TRANSITO'`, generando el código correlativo `TRASP-YYYY-NNNN`.
  6. Se crea el registro detalle en `detalle_traspaso`.
  7. El sistema emite la Guía de Remisión física / digital para el transporte de la mercadería.
- **Robustez (BCE)**:
  - *Boundary*: `IU_FormularioTraspaso`, `BtnDespacharTraspaso`.
  - *Control*: `TraspasoWorkflowController`, `StockReservationService`.
  - *Entity*: `TraspasoInventario`, `DetalleTraspaso`, `InventarioSucursal`.

---

### CU13: Confirmar Recepción de Traspaso en Destino (Fase 2: Destino)
- **Actores**: Encargado de Almacén / Sucursal Destino.
- **Canal**: Web.
- **Precondiciones**: Traspaso existente en estado `EN_TRANSITO` dirigido a la sucursal del actor.
- **Flujo Principal**:
  1. El usuario de la sucursal receptora consulta la lista de traspasos en tránsito dirigidos a su tienda.
  2. El lote físico de prendas llega a la tienda y el usuario inspecciona las cantidades y estado de las prendas.
  3. El usuario registra la cantidad efectivamente recibida conforme.
  4. El sistema actualiza el registro en `detalle_traspaso` con `cantidad_recibida`.
  5. El sistema suma las prendas al inventario disponible de la sucursal destino: `inventario.cantidad = inventario.cantidad + cantidad_recibida`.
  6. Se actualiza `traspaso_inventario.estado = 'RECEPCIONADO'`, registrando fecha y usuario que recepciona.
  7. El lote de prendas queda habilitado inmediatamente para venta presencial o virtual en la nueva sucursal.
- **Flujo Alternativo**:
  - 3a. Discrepancia física o daño: El usuario marca `estado = 'OBSERVADO'` registrando la diferencia en las observaciones para conciliación de pérdidas.
- **Robustez (BCE)**:
  - *Boundary*: `IU_RecepcionTraspaso`, `BtnConfirmarRecepcion`.
  - *Control*: `RecepcionTraspasoController`, `InventarioUpdateService`.
  - *Entity*: `TraspasoInventario`, `DetalleTraspaso`, `InventarioDestino`.

---

### CU14: Registrar Reserva Offline para Ensayo en Tienda
- **Actores**: Cliente, Vendedor.
- **Canal**: Web PWA / Móvil Flutter (Modo Offline).
- **Precondiciones**: Catálogo descargado previamente en memoria local.
- **Flujo Principal**:
  1. El cliente o vendedor selecciona una o más prendas de interés para probarse en tienda física.
  2. El usuario elige la opción "Apartar para Probador Físico (Sin Pago)".
  3. El sistema cliente genera un identificador local único (UUIDv4) y registra la reserva en la base local (IndexedDB `reservas_offline` o SQLite `offline_reservations`) con estado `PENDIENTE_CONFIRMACION`.
  4. La aplicación no exige pasarela de pago ni cobro de seña monetaria (compromiso de prueba presencial).
  5. La reserva se añade a la cola local de sincronización `sync_queue`.
  6. La pantalla presenta un ticket digital con código QR / numérico para que el cliente lo muestre al ingresar al vestidor físico.
- **Robustez (BCE)**:
  - *Boundary*: `IU_ApartadoProbador`, `DialogoTicketReserva`.
  - *Control*: `ReservaOfflineManager`, `LocalPersistenceController`.
  - *Entity*: `ReservaLocalStore`, `ColaSincronizacionLocal`.

---

### CU15: Registrar Venta de Contado Offline
- **Actores**: Cajero, Vendedor.
- **Canal**: Web PWA / Móvil Flutter (Modo Offline).
- **Precondiciones**: Terminal desconectada de Internet; catálogo con existencias en memoria local.
- **Flujo Principal**:
  1. El cajero escanea o busca las prendas solicitadas por el cliente.
  2. El sistema recupera precio unitario y valida stock disponible en la memoria local (IndexedDB / SQLite).
  3. El cajero selecciona forma de pago: **EFECTIVO / CONTADO**.
  4. El sistema descuenta temporalmente la cantidad del stock local de la terminal.
  5. El cliente genera un `uuid_operacion` criptográfico (UUIDv4).
  6. El sistema almacena la venta en la base de datos local y genera un recibo de contingencia imprimible con la leyenda: "Comprobante emitido en modo contingencia fuera de línea".
  7. La transacción se encola en `sync_queue` con estado `PENDIENTE`.
- **Robustez (BCE)**:
  - *Boundary*: `IU_TerminalVentaOffline`, `DialogoCobroEfectivo`.
  - *Control*: `VentaContingenciaController`, `LocalStockManager`.
  - *Entity*: `VentaLocalStore`, `ColaSincronizacionLocal`.

---

### CU16: Sincronizar Operaciones Comerciales Offline (Idempotencia)
- **Actores**: Sistema Cliente (Background), Cajero.
- **Canal**: Web PWA / Móvil Flutter.
- **Precondiciones**: Restablecimiento de conectividad a Internet; operaciones pendientes en cola local.
- **Flujo Principal**:
  1. El listener de red detecta el evento `online` o el usuario presiona "Sincronizar ahora".
  2. El cliente extrae las transacciones de `sync_queue`.
  3. El cliente realiza una petición HTTP `POST /api/v1/sincronizacion/offline` enviando el paquete con `uuid_operacion`, `tipo_operacion`, `fecha_registro_local` y `payload_json`.
  4. El backend valida si `uuid_operacion` ya existe en la tabla `sincronizacion_offline`:
     - **Si ya existe**: Se confirma como procesada previamente (`idempotencia`), evitando duplicar ventas o rebajas de inventario.
     - **Si es nueva**: Se procesa atómicamente la venta en las tablas `venta` y `detalle_venta`, rebajando el stock real en PostgreSQL.
  5. Si el stock central es suficiente, la transacción se marca como `SINCRONIZADO`.
  6. El backend retorna el estado de cada UUID enviado.
  7. El cliente actualiza su cola local, eliminando las operaciones exitosas y actualizando los comprobantes locales con el correlativo fiscal asignado.
- **Robustez (BCE)**:
  - *Boundary*: `IU_MonitorSincronizacion`, `BadgeEstadoConexion`.
  - *Control*: `SyncManagerClient`, `FastAPISyncDispatcher`, `IdempotencyValidator`.
  - *Entity*: `SincronizacionOffline`, `Venta`, `DetalleVenta`, `InventarioCentral`.

---

### CU17: Resolver Conflictos de Consistencia de Inventario
- **Actores**: Administrador de Sucursal, Jefe de Almacén.
- **Canal**: Web / Móvil.
- **Precondiciones**: Una transacción offline fue sincronizada, pero el stock central en PostgreSQL era menor al vendido localmente.
- **Flujo Principal**:
  1. Durante la ejecución de CU16, el backend detecta que `inventario.cantidad < cantidad_vendida_offline`.
  2. El backend registra la anomalía en `conflicto_inventario` asociándola al `sincronizacion_id`.
  3. El sistema notifica al Administrador de Sucursal con una alerta de "Conflicto de Inventario Detectado".
  4. El administrador accede al panel de resolución y evalúa las opciones de conciliación:
     - **Opción A (Traspaso Automático)**: Solicitar de urgencia las unidades faltantes desde otra sucursal que cuente con stock.
     - **Opción B (Stock Negativo Temporal)**: Permitir que el inventario quede en negativo a la espera de un reabastecimiento programado de almacén central.
     - **Opción C (Anulación y Contacto con Cliente)**: Si el cliente aún no retiró la prenda física.
  5. El administrador confirma la decisión, actualizando el estado de resolución en la tabla `conflicto_inventario`.
- **Robustez (BCE)**:
  - *Boundary*: `IU_ResolucionConflictos`, `ModalConciliacionStock`.
  - *Control*: `ConflictoStockResolverService`.
  - *Entity*: `ConflictoInventario`, `SincronizacionOffline`, `Inventario`.

---

### CU18: Configurar Políticas y Plazos de Cambio de Prenda
- **Actores**: Administrador del Tenant.
- **Canal**: Web.
- **Precondiciones**: Sesión activa con rol de Administrador de Tenant y suscripción vigente.
- **Flujo Principal**:
  1. El administrador accede al módulo de "Políticas de Postventa y Garantía".
  2. El sistema recupera la configuración actual en la tabla `politica_garantia` filtrada por `empresa_id`.
  3. El actor parametriza:
     a. Plazo máximo de cambio en días (`plazo_dias_cambio`: ej. 7 días, 48 hrs o 24 hrs según la regla de negocio de la tienda).
     b. Bandera `permite_cambio_talla = TRUE`.
     c. Bandera `admite_reembolso_dinero = FALSE` (Regla inmutable RN07: prohibición estricta de reintegro de dinero).
     d. Exigencia de etiquetas originales intactas.
  4. El sistema valida que el plazo sea un entero positivo y persiste los cambios.
  5. El sistema confirma la actualización: "Políticas de garantía de la empresa actualizadas".
- **Robustez (BCE)**:
  - *Boundary*: `IU_ConfiguracionPoliticaGarantia`, `FormPoliticasGarantia`.
  - *Control*: `PoliticaGarantiaController`, `TenantPolicyValidator`.
  - *Entity*: `PoliticaGarantia`, `Empresa`.

---

### CU19: Registrar Solicitud de Cambio de Prenda por Medida
- **Actores**: Cliente, Cajero.
- **Canal**: Web / Móvil.
- **Precondiciones**: Venta previa existente y registrada en el sistema.
- **Flujo Principal**:
  1. El cliente presenta la prenda a cambiar y el ticket de compra original.
  2. El cajero ingresa el número de venta o código correlativo de factura.
  3. El sistema consulta la fecha de emisión de la venta y obtiene `politica_garantia.plazo_dias_cambio` del tenant.
  4. El sistema calcula la diferencia en días:
     `dias_transcurridos = (fecha_actual - fecha_venta).dias`
  5. Si `dias_transcurridos <= plazo_dias_cambio`:
     a. El sistema habilita la solicitud de cambio de prenda.
     b. El cajero selecciona la prenda que el cliente desea entregar y captura el motivo (`TALLA_CHICA`, `TALLA_GRANDE`, `DESAJUSTE_MEDIDA`).
     c. El cliente selecciona la nueva prenda/talla deseada.
  6. Si `dias_transcurridos > plazo_dias_cambio`:
     a. El sistema rechaza la solicitud indicando: "Plazo de garantía para cambio de prenda expirado según políticas de la empresa".
- **Robustez (BCE)**:
  - *Boundary*: `IU_SolicitudCambioPrenda`, `ValidadorPlazoGarantia`.
  - *Control*: `PoliticaGarantiaService`, `GarantiaValidator`.
  - *Entity*: `PoliticaGarantia`, `VentaOriginal`.

---

### CU20: Emitir Nota de Devolución y Reingreso a Inventario
- **Actores**: Cajero, Encargado de Tienda.
- **Canal**: Web.
- **Precondiciones**: Solicitud de cambio validada conforme (CU19).
- **Flujo Principal**:
  1. El cajero confirma la prenda recibida (`variante_devuelta_id`) y la prenda que se entrega (`variante_entregada_id`).
  2. El sistema valida que el precio de la nueva prenda sea equivalente o se ajuste a la política (prohibición estricta de reembolso de dinero en efectivo: `diferencia_monetaria = 0.00`).
  3. En una sola transacción de base de datos:
     a. Se incrementa el inventario de la variante devuelta: `inventario.cantidad = inventario.cantidad + 1` (reingresa como disponible).
     b. Se decrementa el inventario de la nueva variante: `inventario.cantidad = inventario.cantidad - 1`.
     c. Se crea el registro maestro en `nota_devolucion` con código único `DEV-YYYY-NNNN`.
     d. Se crea el registro en `detalle_nota_devolucion`.
  4. El sistema imprime la **Nota de Devolución Oficial**, detallando el reingreso, el egreso de la nueva talla y el saldo a pagar en Bs. 0.00.
  5. La prenda devuelta queda inmediatamente disponible para ser vendida a otro cliente.
- **Robustez (BCE)**:
  - *Boundary*: `IU_EmisionNotaDevolucion`, `ReciboNotaDevolucion`.
  - *Control*: `NotaDevolucionController`, `AjusteInventarioService`.
  - *Entity*: `NotaDevolucion`, `DetalleNotaDevolucion`, `InventarioVariante`.

---

### CU25: Consultar Trazabilidad y Estado de Reservas
- **Actores**: Cliente, Vendedor.
- **Canal**: Web / Móvil.
- **Precondiciones**: Reserva creada previamente.
- **Flujo Principal**:
  1. El cliente o vendedor consulta el historial de reservas ingresando el código del cliente o código de reserva.
  2. El sistema recupera las prendas apartadas, fecha y hora de la cita para probador y estado actual (`PENDIENTE`, `EN_PROBADOR`, `COMPLETADA_EN_VENTA`, `EXPIRADA`).
  3. Si la reserva expiró sin que el cliente se presentara, las prendas reservadas se liberan automáticamente en el inventario disponible.
- **Robustez (BCE)**:
  - *Boundary*: `IU_HistorialReservas`, `TimelineReserva`.
  - *Control*: `ReservaTrazabilidadService`.
  - *Entity*: `Reserva`, `DetalleReserva`.
