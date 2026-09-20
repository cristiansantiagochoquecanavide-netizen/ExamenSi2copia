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
}
