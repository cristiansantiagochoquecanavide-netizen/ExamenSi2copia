/// FashionStore Mobile - Local SQLite Helper para Presentación 2 (CU08, CU14, CU15)
/// Persistencia en sqflite: Catálogo Local, Reservas de Probador y Ventas Contado Offline
/// INF412 - Sistemas de Información 2 (Atelier Noir)
library local_storage_helper;

import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:uuid/uuid.dart';

class LocalStorageHelper {
  static final LocalStorageHelper instance = LocalStorageHelper._init();
  static Database? _database;
  final _uuid = const Uuid();

  LocalStorageHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('fashionstore_local.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        // CU08: Catálogo local en memoria con medidas anatómicas en centímetros
        await db.execute('''
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
          )
        ''');

        // CU14: Reservas para probador físico sin pago (0 dinero)
        await db.execute('''
          CREATE TABLE offline_reservations (
            uuid TEXT PRIMARY KEY,
            prenda_id INTEGER NOT NULL,
            hora_ensayo TEXT NOT NULL,
            requiere_pago INTEGER DEFAULT 0,
            fecha_registro TEXT NOT NULL,
            estado TEXT DEFAULT 'PENDIENTE_ENSAYO'
          )
        ''');

        // CU15: Ventas de contado offline en efectivo con UUIDv4
        await db.execute('''
          CREATE TABLE offline_sales (
            uuid TEXT PRIMARY KEY,
            monto_total REAL NOT NULL,
            metodo_pago TEXT DEFAULT 'EFECTIVO',
            items_json TEXT NOT NULL,
            fecha_registro TEXT NOT NULL,
            estado TEXT DEFAULT 'REGISTRADO_LOCAL'
          )
        ''');
      },
    );
  }

  // ==========================================
  // CU08: Poblar y Consultar Catálogo Local
  // ==========================================
  Future<void> cacheCatalog(List<Map<String, dynamic>> items) async {
    final db = await instance.database;
    final batch = db.batch();
    batch.delete('local_catalog');
    for (var item in items) {
      batch.insert('local_catalog', item);
    }
    await batch.commit(noResult: true);
  }

  Future<List<Map<String, dynamic>>> getLocalCatalog() async {
    final db = await instance.database;
    return await db.query('local_catalog');
  }

  // ====================================================
  // CU14: Registrar Reserva para Probador Físico Sin Pago
  // ====================================================
  Future<String> recordOfflineFittingReservation({
    required int prendaId,
    required String horaEnsayo,
  }) async {
    final db = await instance.database;
    final uuid = _uuid.v4();

    await db.insert('offline_reservations', {
      'uuid': uuid,
      'prenda_id': prendaId,
      'hora_ensayo': horaEnsayo,
      'requiere_pago': 0, // 0 = false (Sin cobro monetario previo)
      'fecha_registro': DateTime.now().toUtc().toIso8601String(),
      'estado': 'PENDIENTE_ENSAYO_TIENDA',
    });

    return uuid;
  }

  Future<List<Map<String, dynamic>>> getOfflineFittingReservations() async {
    final db = await instance.database;
    return await db.query('offline_reservations');
  }

  // ====================================================
  // CU15: Registrar Venta de Contado Offline con UUIDv4
  // ====================================================
  Future<String> recordOfflineCashSale({
    required double montoTotal,
    required List<Map<String, dynamic>> items,
  }) async {
    final db = await instance.database;
    final uuid = _uuid.v4();
    final fecha = DateTime.now().toUtc().toIso8601String();

    await db.transaction((txn) async {
      // 1. Insertar venta en contingencia offline
      await txn.insert('offline_sales', {
        'uuid': uuid,
        'monto_total': montoTotal,
        'metodo_pago': 'EFECTIVO',
        'items_json': jsonEncode(items),
        'fecha_registro': fecha,
        'estado': 'REGISTRADO_LOCAL',
      });

      // 2. Rebajar inmediatamente existencias en catálogo local SQLite
      for (var item in items) {
        final varianteId = item['variante_id'] as int;
        final cant = item['cantidad'] as int;
        await txn.rawUpdate('''
          UPDATE local_catalog 
          SET stock_disponible = MAX(0, stock_disponible - ?) 
          WHERE id = ?
        ''', [cant, varianteId]);
      }
    });

    return uuid;
  }

  Future<List<Map<String, dynamic>>> getOfflineSales() async {
    final db = await instance.database;
    return await db.query('offline_sales');
  }

  // ====================================================
  // CU16: Métodos para Sincronización Batch Offline
  // ====================================================

  /// Retorna el conteo total de transacciones offline pendientes
  Future<int> getPendingOperationsCount() async {
    final db = await instance.database;
    final sales = await db.query('offline_sales', where: "estado != 'SINCRONIZADO'");
    final reservations = await db.query('offline_reservations', where: "estado != 'SINCRONIZADO'");
    return sales.length + reservations.length;
  }

  /// Construye el lote de transacciones estructuradas para el endpoint POST /sincronizacion/offline
  Future<List<Map<String, dynamic>>> buildBatchTransactions({int sucursalId = 1}) async {
    final db = await instance.database;
    final List<Map<String, dynamic>> lote = [];

    // 1. Ventas offline
    final sales = await db.query('offline_sales', where: "estado != 'SINCRONIZADO'");
    for (var s in sales) {
      List<dynamic> items = [];
      try {
        final rawJson = s['items_json'] as String?;
        if (rawJson != null && rawJson.isNotEmpty) {
          items = jsonDecode(rawJson) as List<dynamic>;
        }
      } catch (_) {}

      lote.add({
        'uuid_operacion': s['uuid'] as String,
        'tipo_operacion': 'VENTA_LOCAL',
        'fecha_registro_local': s['fecha_registro'] as String,
        'payload_json': {
          'sucursal_id': sucursalId,
          'monto_total': s['monto_total'],
          'metodo_pago': s['metodo_pago'] ?? 'EFECTIVO',
          'cliente_nombre': 'Cliente Móvil Presencial (Offline)',
          'cliente_nit': '0',
          'items': items,
        },
      });
    }

    // 2. Reservas offline
    final reservations = await db.query('offline_reservations', where: "estado != 'SINCRONIZADO'");
    for (var r in reservations) {
      lote.add({
        'uuid_operacion': r['uuid'] as String,
        'tipo_operacion': 'RESERVA_LOCAL',
        'fecha_registro_local': r['fecha_registro'] as String,
        'payload_json': {
          'sucursal_id': sucursalId,
          'prenda_id': r['prenda_id'],
          'hora_ensayo': r['hora_ensayo'],
          'requiere_pago': (r['requiere_pago'] as int? ?? 0) == 1,
        },
      });
    }

    return lote;
  }

  /// Elimina de SQLite las operaciones que ya fueron sincronizadas o confirmadas
  Future<void> deleteSyncedOperations(List<String> uuids) async {
    if (uuids.isEmpty) return;
    final db = await instance.database;
    final placeholders = List.filled(uuids.length, '?').join(',');

    await db.transaction((txn) async {
      await txn.delete('offline_sales', where: 'uuid IN ($placeholders)', whereArgs: uuids);
      await txn.delete('offline_reservations', where: 'uuid IN ($placeholders)', whereArgs: uuids);
    });
  }

  /// Limpia todas las operaciones offline locales (para reinicio de pruebas)
  Future<void> clearAllOfflineOperations() async {
    final db = await instance.database;
    await db.delete('offline_sales');
    await db.delete('offline_reservations');
  }
}
