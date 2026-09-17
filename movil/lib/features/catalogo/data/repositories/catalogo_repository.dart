import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/models/catalogo_models.dart';

class CatalogoRepository {
  final ApiClient _apiClient;

  CatalogoRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<List<PrendaModel>> getPrendas({
    String? sector,
    int? categoriaId,
    int? temporadaId,
    String? search,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'activo_solo': true,
        'limit': 50,
      };

      if (sector != null && sector.isNotEmpty && sector != 'TODAS') {
        queryParams['sector'] = sector;
      }
      if (categoriaId != null) {
        queryParams['categoria_id'] = categoriaId;
      }
      if (temporadaId != null) {
        queryParams['temporada_id'] = temporadaId;
      }

      final response = await _apiClient.dio.get(
        '/catalogo/prendas',
        queryParameters: queryParams,
      );

      if (response.statusCode == 200) {
        final List<dynamic> list = response.data as List<dynamic>;
        var prendas = list.map((item) => PrendaModel.fromJson(item as Map<String, dynamic>)).toList();

        if (search != null && search.trim().isNotEmpty) {
          final query = search.trim().toLowerCase();
          prendas = prendas
              .where((p) =>
                  p.nombre.toLowerCase().contains(query) ||
                  p.descripcion.toLowerCase().contains(query) ||
                  p.sku.toLowerCase().contains(query))
              .toList();
        }

        return prendas;
      } else {
        throw Exception('Error al obtener catálogo (${response.statusCode})');
      }
    } on DioException catch (e) {
      throw Exception('Error de red al consultar catálogo: ${e.message}');
    } catch (e) {
      throw Exception('Error inesperado en catálogo: $e');
    }
  }

  Future<List<CategoriaModel>> getCategorias() async {
    try {
      final response = await _apiClient.dio.get(
        '/catalogo/categorias',
        queryParameters: {'activo_solo': true},
      );

      if (response.statusCode == 200) {
        final List<dynamic> list = response.data as List<dynamic>;
        return list.map((item) => CategoriaModel.fromJson(item as Map<String, dynamic>)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<PrendaModel?> getPrendaById(int id) async {
    try {
      final response = await _apiClient.dio.get('/catalogo/prendas/$id');
      if (response.statusCode == 200) {
        return PrendaModel.fromJson(response.data as Map<String, dynamic>);
      }
    } catch (_) {}
    return null;
  }
}
