import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/storage/local_storage_helper.dart';
import '../../domain/models/reservas_models.dart';

class ReservasRepository {
  final ApiClient _apiClient;

  ReservasRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<Options> _getAuthOptions() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(AppConstants.tokenKey);
    if (token != null && token.isNotEmpty) {
      return Options(headers: {'Authorization': 'Bearer $token'});
    }
    return Options();
  }

  Future<List<SucursalModel>> getSucursales() async {
    try {
      final response = await _apiClient.dio.get(
        '/inventario/sucursales',
        queryParameters: {'activo_solo': true},
      );

      if (response.statusCode == 200) {
        final List<dynamic> list = response.data as List<dynamic>;
        return list.map((item) => SucursalModel.fromJson(item as Map<String, dynamic>)).toList();
      }
      return [];
    } catch (_) {
      return [
        const SucursalModel(id: 1, nombre: 'Atelier Central - Equipetrol', direccion: 'Av. San Martín #450', capacidadProbadores: 4, ciudadNombre: 'Santa Cruz'),
        const SucursalModel(id: 2, nombre: 'Boutique Noir - Ventura Mall', direccion: '4to Anillo y Av. San Martín', capacidadProbadores: 3, ciudadNombre: 'Santa Cruz'),
        const SucursalModel(id: 3, nombre: 'Flagship Store - Calacoto', direccion: 'Calle 21 de Calacoto', capacidadProbadores: 3, ciudadNombre: 'La Paz'),
      ];
    }
  }

  Future<List<ReservaModel>> getMisReservas() async {
    try {
      final options = await _getAuthOptions();
      final response = await _apiClient.dio.get(
        '/reservas',
        options: options,
      );

      if (response.statusCode == 200) {
        final List<dynamic> list = response.data as List<dynamic>;
        return list.map((item) => ReservaModel.fromJson(item as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        try {
          final retryResponse = await _apiClient.dio.get('/reservas');
          if (retryResponse.statusCode == 200) {
            final List<dynamic> list = retryResponse.data as List<dynamic>;
            return list.map((item) => ReservaModel.fromJson(item as Map<String, dynamic>)).toList();
          }
        } catch (_) {}
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<ReservaModel> crearReserva(ReservaCreateRequest request) async {
    try {
      final options = await _getAuthOptions();
      final response = await _apiClient.dio.post(
        '/reservas',
        data: request.toJson(),
        options: options,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return ReservaModel.fromJson(response.data as Map<String, dynamic>);
      } else {
        throw Exception('Error al agendar reserva (${response.statusCode})');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        // Token expirado o inválido: reintentar sin cabecera de autorización caducada
        try {
          final retryResponse = await _apiClient.dio.post(
            '/reservas',
            data: request.toJson(),
          );
          if (retryResponse.statusCode == 200 || retryResponse.statusCode == 201) {
            return ReservaModel.fromJson(retryResponse.data as Map<String, dynamic>);
          }
        } catch (_) {}
      }
      if (e.response?.data != null) {
        final data = e.response!.data;
        if (data is Map<String, dynamic> && data.containsKey('detail')) {
          throw Exception(data['detail']);
        }
      }
      throw Exception('Error al agendar reserva: ${e.message}');
    } catch (e) {
      throw Exception(e.toString().replaceAll('Exception: ', ''));
    }
  }

  Future<ReservaModel> cancelarReserva(int id) async {
    try {
      final options = await _getAuthOptions();
      final response = await _apiClient.dio.post(
        '/reservas/$id/cancelar',
        data: {'motivo': 'Cancelado por el cliente desde la app móvil'},
        options: options,
      );

      if (response.statusCode == 200) {
        return ReservaModel.fromJson(response.data as Map<String, dynamic>);
      } else {
        throw Exception('Error al cancelar reserva');
      }
    } on DioException catch (e) {
      if (e.response?.data != null && e.response!.data is Map) {
        throw Exception(e.response!.data['detail']);
      }
      throw Exception('Error al cancelar reserva: ${e.message}');
    }
  }

  // ==========================================
  // CU14: RESERVAS OFFLINE PARA PROBADOR (SIN PAGO)
  // ==========================================
  Future<String> saveOfflineFittingReservation({
    required int prendaId,
    required String horaEnsayo,
  }) async {
    return await LocalStorageHelper.instance.recordOfflineFittingReservation(
      prendaId: prendaId,
      horaEnsayo: horaEnsayo,
    );
  }

  Future<List<Map<String, dynamic>>> getOfflineReservations() async {
    return await LocalStorageHelper.instance.getOfflineFittingReservations();
  }
}
