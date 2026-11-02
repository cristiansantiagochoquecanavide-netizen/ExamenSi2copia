import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';

import 'package:fashionstore_mobile/core/constants/app_constants.dart';
import 'package:fashionstore_mobile/core/storage/local_storage_helper.dart';
import 'package:fashionstore_mobile/features/ventas/data/repositories/sincronizacion_repository.dart';
import 'package:fashionstore_mobile/features/ventas/data/repositories/ventas_repository.dart';
import 'package:fashionstore_mobile/features/ventas/domain/models/sincronizacion_models.dart';

void main() {
  String? authToken;

  setUpAll(() async {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;

    // Obtener token JWT al inicio de la suite
    final dio = Dio();
    final loginResp = await dio.post(
      'http://localhost:8000/api/v1/usuarios/auth/login',
      data: {
        'email': 'AdminFashion@gmail.com',
        'password': 'Admin123',
      },
    );
    authToken = loginResp.data['access_token'] as String;
  });

  setUp(() async {
    SharedPreferences.setMockInitialValues({
      if (authToken != null) AppConstants.tokenKey: authToken!,
    });
  });

  group('VERIFICACIÓN INTEGRAL CU16, CU17 & CU19 EN MÓVIL', () {
    test('0. Autenticación Móvil y obtención de JWT Bearer Token', () async {
      expect(authToken, isNotNull);
      expect(authToken!.isNotEmpty, isTrue);
    });

    test('1. CU16: Operaciones Offline en SQLite y Sincronización Batch con Idempotencia (RN04)', () async {
      final storage = LocalStorageHelper.instance;
      final syncRepo = SincronizacionRepository();

      // Limpiar SQLite previo
      await storage.clearAllOfflineOperations();
      expect(await storage.getPendingOperationsCount(), 0);

      // A) Registrar Venta de Contado Offline (CU15) con UUIDv4
      final saleUuid = await storage.recordOfflineCashSale(
        montoTotal: 250.0,
        items: [
          {
            'variante_id': 3,
            'cantidad': 1,
            'precio': 250.0,
          }
        ],
      );
      expect(saleUuid.isNotEmpty, isTrue);

      // B) Registrar Reserva para Probador Físico sin pago (CU14) con UUIDv4
      final resUuid = await storage.recordOfflineFittingReservation(
        prendaId: 2,
        horaEnsayo: '16:30',
      );
      expect(resUuid.isNotEmpty, isTrue);

      // C) Verificar conteo en cola local SQLite
      final pendingCount = await storage.getPendingOperationsCount();
      expect(pendingCount, 2);

      // D) Construir lote de transacciones estructurado
      final lote = await storage.buildBatchTransactions(sucursalId: 1);
      expect(lote.length, 2);
      expect(lote.any((t) => t['uuid_operacion'] == saleUuid), isTrue);
      expect(lote.any((t) => t['uuid_operacion'] == resUuid), isTrue);

      // E) Ejecutar Sincronización Batch (CU16) contra FastAPI
      final batchResult = await syncRepo.sincronizarLoteOffline(lote);
      expect(batchResult.totalRecibidos, 2);
      expect(batchResult.procesadosExitosamente + batchResult.duplicadosIdempotentes, 2);

      // F) COMPROBACIÓN DE IDEMPOTENCIA (RN04): Reenviar el mismo lote exactamente
      final idempotentResult = await syncRepo.sincronizarLoteOffline(lote);
      expect(idempotentResult.totalRecibidos, 2);
      expect(idempotentResult.duplicadosIdempotentes, 2);
      expect(idempotentResult.procesadosExitosamente, 0); // No duplica ventas ni stock

      // G) Purgar de SQLite las transacciones confirmadas
      await storage.deleteSyncedOperations([saleUuid, resUuid]);
      expect(await storage.getPendingOperationsCount(), 0);
    });

    test('2. CU17: Detección y Resolución Arbitral de Conflictos de Inventario', () async {
      final syncRepo = SincronizacionRepository();

      // A) Provocar colisión de inventario solicitando 99,999 unidades que el servidor no tiene
      final colisionLote = [
        {
          'uuid_operacion': 'conflict-uuid-${DateTime.now().millisecondsSinceEpoch}',
          'tipo_operacion': 'VENTA_LOCAL',
          'fecha_registro_local': DateTime.now().toUtc().toIso8601String(),
          'payload_json': {
            'sucursal_id': 1,
            'monto_total': 999999.0,
            'metodo_pago': 'EFECTIVO',
            'cliente_nombre': 'Cliente Conflicto Test',
            'cliente_nit': '0',
            'items': [
              {
                'variante_id': 1,
                'cantidad': 99999, // Stock insuficiente en servidor
                'precio': 100.0,
              }
            ],
          },
        }
      ];

      final syncColision = await syncRepo.sincronizarLoteOffline(colisionLote);
      expect(syncColision.conflictosStock, 1);
      expect(syncColision.resultados.first.estado, 'CONFLICTO_STOCK');

      // B) Listar conflictos pendientes en la app móvil
      final conflictos = await syncRepo.listarConflictos(
        sucursalId: 1,
        estadoResolucion: 'PENDIENTE_RESOLUCION',
      );
      expect(conflictos.isNotEmpty, isTrue);
      final ultimoConflicto = conflictos.first;
      expect(ultimoConflicto.estadoResolucion, 'PENDIENTE_RESOLUCION');

      // C) Arbitrar y Resolver Conflicto (CU17) mediante ADMITIR_SALDO_NEGATIVO
      final resArbitraje = await syncRepo.resolverConflicto(
        ultimoConflicto.id,
        const ResolverConflictoInput(
          accion: 'ADMITIR_SALDO_NEGATIVO',
          observaciones: 'Arbitraje móvil test: Permitir saldo negativo transitorio hasta reposición.',
        ),
      );
      expect(resArbitraje['estado'], 'RESUELTO');
      expect(resArbitraje['conflicto_id'], ultimoConflicto.id);
    });

    test('3. CU19: Registrar Solicitud de Cambio de Prenda por Medida (Exclusividad Web de CU20)', () async {
      final ventasRepo = VentasRepository();

      // A) CU19: Validar ticket previo y vigencia de garantía corporativa (RN06)
      const codigoVentaExistente = 'VTA-SEED-8-1-1793156586';
      final validacion = await ventasRepo.validarSolicitudCambio(codigoVentaExistente);

      expect(validacion.codigoVenta, codigoVentaExistente);
      expect(validacion.items.isNotEmpty, isTrue);
      expect(validacion.garantiaVigente, isTrue); // RN06: Plazo corporativo no excedido

      // B) RN07: Prohibición estricta de reembolso monetario en solicitudes de cambio
      expect(validacion.admiteReembolsoDinero, isFalse);
      expect(validacion.permiteCambioTalla, isTrue);

      // C) Registro de la prenda elegible para cambio por medida anatómica
      final prendaDevuelta = validacion.items.first;
      expect(prendaDevuelta.productoVarianteId, isNotNull);
      expect(prendaDevuelta.disponibleDevolver, greaterThanOrEqualTo(1));

      // D) Aseveración de alcance arquitectónico:
      // CU20 (Emisión formal de Nota de Devolución DEV-YYYY y Reingreso físico al Inventario)
      // corresponde EXCLUSIVAMENTE a la Plataforma Web en el módulo de caja.
    });
  });
}
