/**
 * FashionStore Mobile - SQLite Local Database Helper & Sync Manager
 * Presentación 2: Móvil Offline-First para INF412
 */

import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:uuid/uuid.dart';
import 'package:dio/dio.dart';

class LocalProduct {
  final int id;
  final String nombre;
  final String categoria;
  final double precio;
  final String talla;
  final String color;
  final int stockDisponible;
  final double? pechoCm;
  final double? cinturaCm;

  LocalProduct({
    required this.id,
    required this.nombre,
    required this.categoria,
    required this.precio,
    required this.talla,
    required this.color,
    required this.stockDisponible,
    this.pechoCm,
    this.cinturaCm,
  });

  factory LocalProduct.fromMap(Map<String, dynamic> map) {
    return LocalProduct(
      id: map['id'],
      nombre: map['nombre'],
      categoria: map['categoria'] ?? '',
      precio: (map['precio'] as num).toDouble(),
      talla: map['talla'] ?? '',
      color: map['color'] ?? '',
      stockDisponible: map['stock_disponible'] ?? 0,
      pechoCm: map['pecho_cm'] != null ? (map['pecho_cm'] as num).toDouble() : null,
      cinturaCm: map['cintura_cm'] != null ? (map['cintura_cm'] as num).toDouble() : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'nombre': nombre,
      'categoria': categoria,
      'precio': precio,
      'talla': talla,
      'color': color,
      'stock_disponible': stockDisponible,
      'pecho_cm': pechoCm,
      'cintura_cm': cinturaCm,
    };
  }
}

class OfflineDatabaseHelper {
  static final OfflineDatabaseHelper instance = OfflineDatabaseHelper._init();
  static Database? _database;
  final _uuidGen = const Uuid();

  OfflineDatabaseHelper._init();

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
      onCreate: _createDB,
    );
  }

  Future _createDB(Database db, int version) async {
    // 1. Catálogo local
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

    // 2. Ventas offline
    await db.execute('''
      CREATE TABLE offline_sales (
        uuid TEXT PRIMARY KEY,
        sucursal_id INTEGER NOT NULL,
        cliente_id INTEGER NOT NULL,
        monto_total REAL NOT NULL,
        metodo_pago TEXT NOT NULL,
        fecha_registro TEXT NOT NULL,
        items_json TEXT NOT NULL,
        estado_sync TEXT NOT NULL
      )
    ''');

    // 3. Reservas offline para probador
    await db.execute('''
      CREATE TABLE offline_reservations (
        uuid TEXT PRIMARY KEY,
        sucursal_id INTEGER NOT NULL,
        cliente_id INTEGER NOT NULL,
        hora_ensayo TEXT NOT NULL,
        items_json TEXT NOT NULL,
        fecha_registro TEXT NOT NULL,
        estado_sync TEXT NOT NULL
      )
    ''');

    // 4. Cola de sincronización
    await db.execute('''
      CREATE TABLE sync_queue (
        uuid TEXT PRIMARY KEY,
        tipo_operacion TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        fecha_creacion TEXT NOT NULL
      )
    ''');
  }

  // --- Operaciones de Catálogo ---
  Future<void> syncCatalogFromServer(List<LocalProduct> products) async {
    final db = await instance.database;
    final batch = db.batch();
    batch.delete('local_catalog');
    for (var prod in products) {
      batch.insert('local_catalog', prod.toMap());
    }
    await batch.commit(noResult: true);
  }

  Future<List<LocalProduct>> getLocalCatalog({String? query}) async {
    final db = await instance.database;
    List<Map<String, dynamic>> maps;
    if (query != null && query.isNotEmpty) {
      maps = await db.query(
        'local_catalog',
        where: 'nombre LIKE ? OR categoria LIKE ?',
        whereArgs: ['%$query%', '%$query%'],
      );
    } else {
      maps = await db.query('local_catalog');
    }
    return maps.map((e) => LocalProduct.fromMap(e)).toList();
  }

  // --- Registrar Venta Offline (Contado / Efectivo) ---
  Future<String> recordOfflineSale({
    required int sucursalId,
    required int clienteId,
    required double montoTotal,
    required List<Map<String, dynamic>> items,
  }) async {
    final db = await instance.database;
    final uuid = _uuidGen.v4();
    final fecha = DateTime.now().toUtc().toIso8601String();
    final itemsStr = jsonEncode(items);

    final payload = {
      'sucursal_id': sucursalId,
      'cliente_id': clienteId,
      'monto_total': montoTotal,
      'metodo_pago': 'EFECTIVO',
      'items': items,
    };

    await db.transaction((txn) async {
      // 1. Guardar en offline_sales
      await txn.insert('offline_sales', {
        'uuid': uuid,
        'sucursal_id': sucursalId,
        'cliente_id': clienteId,
        'monto_total': montoTotal,
        'metodo_pago': 'EFECTIVO',
        'fecha_registro': fecha,
        'items_json': itemsStr,
        'estado_sync': 'PENDIENTE',
      });

      // 2. Encolar en sync_queue
      await txn.insert('sync_queue', {
        'uuid': uuid,
        'tipo_operacion': 'VENTA_LOCAL',
        'payload_json': jsonEncode(payload),
        'fecha_creacion': fecha,
      });

      // 3. Rebajar temporalmente stock local
      for (var item in items) {
        final varianteId = item['producto_variante_id'] as int;
        final cant = item['cantidad'] as int;
        await txn.rawUpdate('''
          UPDATE local_catalog 
          SET stock_disponible = stock_disponible - ? 
          WHERE id = ?
        ''', [cant, varianteId]);
      }
    });

    return uuid;
  }

  // --- Registrar Reserva Offline para Probador Físico (Sin Pago) ---
  Future<String> recordOfflineReservation({
    required int sucursalId,
    required int clienteId,
    required String horaEnsayo,
    required List<int> varianteIds,
  }) async {
    final db = await instance.database;
    final uuid = _uuidGen.v4();
    final fecha = DateTime.now().toUtc().toIso8601String();
    final itemsPayload = varianteIds.map((id) => {'producto_variante_id': id}).toList();

    final payload = {
      'sucursal_id': sucursalId,
      'cliente_id': clienteId,
      'hora_ensayo': horaEnsayo,
      'items': itemsPayload,
    };

    await db.transaction((txn) async {
      await txn.insert('offline_reservations', {
        'uuid': uuid,
        'sucursal_id': sucursalId,
        'cliente_id': clienteId,
        'hora_ensayo': horaEnsayo,
        'items_json': jsonEncode(itemsPayload),
        'fecha_registro': fecha,
        'estado_sync': 'PENDIENTE',
      });

      await txn.insert('sync_queue', {
        'uuid': uuid,
        'tipo_operacion': 'RESERVA_LOCAL',
        'payload_json': jsonEncode(payload),
        'fecha_creacion': fecha,
      });
    });

    return uuid;
  }

  // --- Sincronizar cola pendiente hacia FastAPI ---
  Future<int> syncQueueWithBackend(String backendBaseUrl, String authToken) async {
    final db = await instance.database;
    final pendingOps = await db.query('sync_queue', orderBy: 'fecha_creacion ASC');
    if (pendingOps.isEmpty) return 0;

    final batchList = pendingOps.map((op) {
      return {
        'uuid_operacion': op['uuid'],
        'tipo_operacion': op['tipo_operacion'],
        'fecha_registro_local': op['fecha_creacion'],
        'payload_json': jsonDecode(op['payload_json'] as String),
      };
    }).toList();

    final dio = Dio(BaseOptions(
      baseUrl: backendBaseUrl,
      headers: {
        'Authorization': 'Bearer $authToken',
        'Content-Type': 'application/json',
      },
    ));

    try {
      final response = await dio.post('/api/v1/sincronizacion/offline', data: {
        'lote': batchList,
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Eliminar confirmados de la cola local
        final batchTxn = db.batch();
        for (var op in pendingOps) {
          final uuid = op['uuid'] as String;
          batchTxn.delete('sync_queue', where: 'uuid = ?', whereArgs: [uuid]);
          batchTxn.update(
            'offline_sales',
            {'estado_sync': 'SINCRONIZADO'},
            where: 'uuid = ?',
            whereArgs: [uuid],
          );
        }
        await batchTxn.commit(noResult: true);
        return pendingOps.length;
      }
    } catch (e) {
      // Error de red, se mantiene en cola para próximo intento
      print('Fallo al sincronizar: $e');
    }
    return 0;
  }
}
