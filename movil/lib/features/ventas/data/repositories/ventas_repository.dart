import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/models/ventas_models.dart';

class VentasRepository {
  final ApiClient _apiClient;

  VentasRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<Options> _getAuthOptions() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(AppConstants.tokenKey);
    if (token != null && token.isNotEmpty) {
      return Options(headers: {'Authorization': 'Bearer $token'});
    }
    return Options();
  }

  Future<VentaResponseModel> procesarCheckout(VentaOnlineCheckoutRequest request) async {
    try {
      final options = await _getAuthOptions();
      final response = await _apiClient.dio.post(
        '/ventas/checkout-online',
        data: request.toJson(),
        options: options,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return VentaResponseModel.fromJson(response.data as Map<String, dynamic>);
      } else {
        throw Exception('Error al procesar la venta digital (${response.statusCode})');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        try {
          final retryResponse = await _apiClient.dio.post(
            '/ventas/checkout-online',
            data: request.toJson(),
          );
          if (retryResponse.statusCode == 200 || retryResponse.statusCode == 201) {
            return VentaResponseModel.fromJson(retryResponse.data as Map<String, dynamic>);
          }
        } catch (_) {}
      }
      if (e.response?.data != null) {
        final data = e.response!.data;
        if (data is Map<String, dynamic> && data.containsKey('detail')) {
          throw Exception(data['detail']);
        }
      }
      throw Exception('Error en checkout: ${e.message}');
    } catch (e) {
      throw Exception(e.toString().replaceAll('Exception: ', ''));
    }
  }

  Future<List<VentaResponseModel>> getPedidosOnline() async {
    try {
      final options = await _getAuthOptions();
      final response = await _apiClient.dio.get(
        '/ventas/pedidos-online',
        options: options,
      );

      if (response.statusCode == 200) {
        final List<dynamic> list = response.data as List<dynamic>;
        return list.map((item) => VentaResponseModel.fromJson(item as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        try {
          final retryResponse = await _apiClient.dio.get('/ventas/pedidos-online');
          if (retryResponse.statusCode == 200) {
            final List<dynamic> list = retryResponse.data as List<dynamic>;
            return list.map((item) => VentaResponseModel.fromJson(item as Map<String, dynamic>)).toList();
          }
        } catch (_) {}
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<Map<String, dynamic>> crearPromocion({
    required String codigo,
    required String nombre,
    String? descripcion,
    required double valorDescuento,
    String tipoDescuento = 'PORCENTAJE',
  }) async {
    try {
      final options = await _getAuthOptions();
      final now = DateTime.now();
      final payload = {
        'codigo': codigo.trim().toUpperCase(),
        'nombre': nombre.trim(),
        'descripcion': descripcion ?? 'Promoción exclusiva FashionStore',
        'tipo_descuento': tipoDescuento,
        'valor_descuento': valorDescuento,
        'monto_minimo_compra': 0,
        'limite_por_cliente': 1,
        'fecha_inicio': now.toIso8601String(),
        'fecha_fin': now.add(const Duration(days: 30)).toIso8601String(),
        'activo': true,
      };

      final response = await _apiClient.dio.post(
        '/ventas/promociones',
        data: payload,
        options: options,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return response.data as Map<String, dynamic>;
      }
      throw Exception('Error al crear promoción (${response.statusCode})');
    } on DioException catch (e) {
      if (e.response?.data != null && e.response!.data is Map) {
        final d = e.response!.data as Map;
        if (d.containsKey('detail')) throw Exception(d['detail']);
      }
      throw Exception('Error al crear promoción: ${e.message}');
    }
  }
}
