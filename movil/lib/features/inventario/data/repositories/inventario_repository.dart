import '../../../../core/network/api_client.dart';

class InventarioRepository {
  final ApiClient _apiClient = ApiClient();

  /// CU11: Consulta de disponibilidad de inventario multi-sucursal en tiempo real (Vendedor / Cliente)
  Future<List<Map<String, dynamic>>> getStockMultiSucursal({required int varianteId}) async {
    final response = await _apiClient.dio.get(
      '/inventario/sucursales-stock',
      queryParameters: {'variante_id': varianteId},
    );
    if (response.data is List) {
      return List<Map<String, dynamic>>.from(response.data);
    }
    return [];
  }

  /// Listado de sucursales acotadas al tenant
  Future<List<Map<String, dynamic>>> getSucursales() async {
    final response = await _apiClient.dio.get('/inventario/sucursales');
    if (response.data is List) {
      return List<Map<String, dynamic>>.from(response.data);
    }
    return [];
  }
}
