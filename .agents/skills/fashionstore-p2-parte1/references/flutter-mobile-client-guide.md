# Guía Técnica: Cliente Móvil Flutter con SQLite (CU08, CU14, CU15)

## 1. Persistencia Local en Flutter con `sqflite`

La aplicación móvil debe operar de forma autónoma cuando el usuario o vendedor pierde cobertura de red móvil o WiFi. Para ello, utiliza la base de datos SQLite empotrada `fashionstore_local.db`.

### Dependencias Requeridas en `pubspec.yaml`:
```yaml
dependencies:
  sqflite: ^2.3.3+1
  path_provider: ^2.1.3
  path: ^1.9.0
  uuid: ^4.4.0
```

---

## 2. Esquema de Tablas Locales para la Parte 1

```sql
-- 1. Catálogo local (CU08)
CREATE TABLE local_catalog (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    categoria TEXT,
    precio REAL NOT NULL,
    talla TEXT NOT NULL,
    color TEXT,
    stock_disponible INTEGER NOT NULL,
    pecho_cm REAL,
    cintura_cm REAL
);

-- 2. Apartados para probador físico sin pago (CU14)
CREATE TABLE offline_reservations (
    uuid TEXT PRIMARY KEY,
    prenda_id INTEGER NOT NULL,
    hora_ensayo TEXT NOT NULL,
    requiere_pago INTEGER DEFAULT 0, -- 0 = Sin pago monetario
    fecha_registro TEXT NOT NULL,
    estado TEXT DEFAULT 'PENDIENTE_ENSAYO'
);

-- 3. Ventas de contingencia en efectivo (CU15)
CREATE TABLE offline_sales (
    uuid TEXT PRIMARY KEY,
    total REAL NOT NULL,
    metodo_pago TEXT DEFAULT 'EFECTIVO',
    items_json TEXT NOT NULL,
    fecha_registro TEXT NOT NULL,
    estado TEXT DEFAULT 'REGISTRADO_LOCAL'
);
```

---

## 3. Implementación de Métodos Clave

### Descargar y poblar catálogo (CU08):
```dart
Future<void> cacheCatalog(List<Map<String, dynamic>> items) async {
  final db = await LocalStorageHelper.instance.database;
  final batch = db.batch();
  batch.delete('local_catalog');
  for (var item in items) {
    batch.insert('local_catalog', item);
  }
  await batch.commit(noResult: true);
}
```

### Registrar Reserva de Probador (CU14):
```dart
Future<String> saveOfflineFittingReservation({required int prendaId, required String hora}) async {
  final db = await LocalStorageHelper.instance.database;
  final uuid = const Uuid().v4();
  await db.insert('offline_reservations', {
    'uuid': uuid,
    'prenda_id': prendaId,
    'hora_ensayo': hora,
    'requiere_pago': 0, // Sin dinero
    'fecha_registro': DateTime.now().toIso8601String(),
    'estado': 'PENDIENTE_ENSAYO',
  });
  return uuid;
}
```

### Registrar Venta de Contado Offline (CU15):
```dart
Future<String> saveOfflineCashSale({required double total, required List<Map<String, dynamic>> items}) async {
  final db = await LocalStorageHelper.instance.database;
  final uuid = const Uuid().v4();
  await db.transaction((txn) async {
    await txn.insert('offline_sales', {
      'uuid': uuid,
      'total': total,
      'metodo_pago': 'EFECTIVO',
      'items_json': jsonEncode(items),
      'fecha_registro': DateTime.now().toIso8601String(),
      'estado': 'REGISTRADO_LOCAL',
    });
    // Rebajar stock en el catálogo local
    for (var item in items) {
      await txn.rawUpdate(
        'UPDATE local_catalog SET stock_disponible = stock_disponible - ? WHERE id = ?',
        [item['cantidad'], item['variante_id']]
      );
    }
  });
  return uuid;
}
```
