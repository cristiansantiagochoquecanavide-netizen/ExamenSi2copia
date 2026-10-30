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
}
