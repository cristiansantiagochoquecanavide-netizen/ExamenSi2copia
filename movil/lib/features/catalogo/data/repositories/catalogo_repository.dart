import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/storage/local_storage_helper.dart';
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

  Future<VtonTryOnModel> probarPrendaVton({
    required List<int> imageBytes,
    required String filename,
    required int prendaId,
  }) async {
    try {
      final formData = FormData.fromMap({
        'foto_usuario': MultipartFile.fromBytes(imageBytes, filename: filename),
        'prenda_id': prendaId,
      });

      final response = await _apiClient.dio.post(
        '/catalogo/vton/try-on',
        data: formData,
        options: Options(
          receiveTimeout: const Duration(seconds: 45),
          sendTimeout: const Duration(seconds: 20),
        ),
      );

      if (response.statusCode == 200 && response.data is Map<String, dynamic>) {
        return VtonTryOnModel.fromJson(response.data as Map<String, dynamic>);
      } else {
        throw Exception('Respuesta inesperada del servidor de Virtual Try-On');
      }
    } on DioException catch (e) {
      final detail = e.response?.data is Map ? e.response?.data['detail'] : e.message;
      throw Exception('Fallo en Virtual Try-On: $detail');
    } catch (e) {
      throw Exception('Error en Virtual Try-On: $e');
    }
  }

  // ==========================================
  // CU08: CATÁLOGO LOCAL EN SQLITE (sqflite)
  // ==========================================
  Future<List<Map<String, dynamic>>> syncCatalogToLocalStorage() async {
    try {
      final response = await _apiClient.dio.get('/catalogo/sincronizar-local');
      if (response.statusCode == 200) {
        final List<dynamic> rawList = response.data as List<dynamic>;
        final items = rawList.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        await LocalStorageHelper.instance.cacheCatalog(items);
        return items;
      }
      return await LocalStorageHelper.instance.getLocalCatalog();
    } catch (_) {
      return await LocalStorageHelper.instance.getLocalCatalog();
    }
  }

  Future<List<Map<String, dynamic>>> getLocalCatalog() async {
    return await LocalStorageHelper.instance.getLocalCatalog();
  }
}
