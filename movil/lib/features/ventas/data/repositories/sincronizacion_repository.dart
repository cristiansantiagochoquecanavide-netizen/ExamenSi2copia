import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/storage/local_storage_helper.dart';
import '../../domain/models/sincronizacion_models.dart';

class SincronizacionRepository {
  final ApiClient _apiClient;

  SincronizacionRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<Options> _getAuthOptions() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(AppConstants.tokenKey);
    if (token != null && token.isNotEmpty) {
      return Options(headers: {'Authorization': 'Bearer $token'});
    }
    return Options();
  }

  // ====================================================
  // CU16: Sincronizar Operaciones Comerciales Offline (Batch)
  // ====================================================
  Future<SincronizacionBatchResponseModel> sincronizarLoteOffline(List<Map<String, dynamic>> lote) async {
    try {
      final options = await _getAuthOptions();
      final response = await _apiClient.dio.post(
        '/sincronizacion/offline',
        data: {'lote': lote},
        options: options,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return SincronizacionBatchResponseModel.fromJson(response.data as Map<String, dynamic>);
      }
      throw Exception('Error al sincronizar lote offline (${response.statusCode})');
    } on DioException catch (e) {
      if (e.response?.data != null && e.response!.data is Map) {
        final d = e.response!.data as Map;
        if (d.containsKey('detail')) throw Exception(d['detail']);
      }
      throw Exception('Error de conexión al sincronizar lote: ${e.message}');
    }
  }

  /// Orquestador completo para CU16: Extrae de SQLite, envía en lote y purga confirmados
  Future<SincronizacionBatchResponseModel> sincronizarTodoDesdeSQLite({int sucursalId = 1}) async {
    final lote = await LocalStorageHelper.instance.buildBatchTransactions(sucursalId: sucursalId);
    if (lote.isEmpty) {
      return const SincronizacionBatchResponseModel(
        totalRecibidos: 0,
        procesadosExitosamente: 0,
        duplicadosIdempotentes: 0,
        conflictosStock: 0,
        errores: 0,
        resultados: [],
      );
    }

    final batchResponse = await sincronizarLoteOffline(lote);

    // Identificar UUIDs exitosos o duplicados idempotentes para purgarlos de SQLite
    final confirmedUuids = batchResponse.resultados
        .where((r) => r.estado == 'SINCRONIZADO' || r.estado == 'DUPLICADO_IDEMPOTENTE')
        .map((r) => r.uuidOperacion)
        .toList();

    if (confirmedUuids.isNotEmpty) {
      await LocalStorageHelper.instance.deleteSyncedOperations(confirmedUuids);
    }

    return batchResponse;
  }

  // ====================================================
  // CU17: Listar y Resolver Conflictos de Consistencia de Inventario
  // ====================================================
  Future<List<ConflictoInventarioModel>> listarConflictos({
    int? sucursalId,
    String? estadoResolucion,
  }) async {
    try {
      final options = await _getAuthOptions();
      final queryParams = <String, dynamic>{};
      if (sucursalId != null) queryParams['sucursal_id'] = sucursalId;
      if (estadoResolucion != null && estadoResolucion.isNotEmpty) {
        queryParams['estado_resolucion'] = estadoResolucion;
      }

      final response = await _apiClient.dio.get(
        '/sincronizacion/conflictos',
        queryParameters: queryParams,
        options: options,
      );

      if (response.data is List) {
        final list = response.data as List<dynamic>;
        return list.map((item) => ConflictoInventarioModel.fromJson(item as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      if (e.response?.data != null && e.response!.data is Map) {
        final d = e.response!.data as Map;
        if (d.containsKey('detail')) throw Exception(d['detail']);
      }
      throw Exception('Error al cargar conflictos de inventario: ${e.message}');
    }
  }

  Future<Map<String, dynamic>> resolverConflicto(int conflictoId, ResolverConflictoInput input) async {
    try {
      final options = await _getAuthOptions();
      final response = await _apiClient.dio.put(
        '/sincronizacion/conflictos/$conflictoId/resolver',
        data: input.toJson(),
        options: options,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return response.data as Map<String, dynamic>;
      }
      throw Exception('Error al resolver conflicto (${response.statusCode})');
    } on DioException catch (e) {
      if (e.response?.data != null && e.response!.data is Map) {
        final d = e.response!.data as Map;
        if (d.containsKey('detail')) throw Exception(d['detail']);
      }
      throw Exception('Error al resolver conflicto: ${e.message}');
    }
  }
}
