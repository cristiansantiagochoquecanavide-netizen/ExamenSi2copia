import '../../../../core/network/api_client.dart';
import '../../domain/models/notificacion_model.dart';

class NotificacionesRepository {
  final ApiClient _apiClient;

  NotificacionesRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<List<NotificacionModel>> getNotificaciones({
    String? tipo,
    bool soloNoLeidas = false,
  }) async {
    try {
      final Map<String, dynamic> params = {'limit': 40};
      if (tipo != null && tipo != 'TODAS') {
        params['tipo'] = tipo;
      }
      if (soloNoLeidas) {
        params['solo_no_leidas'] = true;
      }

      final response = await _apiClient.dio.get('/notificaciones', queryParameters: params);
      if (response.statusCode == 200 && response.data is List) {
        final list = response.data as List;
        return list.map((item) => NotificacionModel.fromJson(item as Map<String, dynamic>)).toList();
      }
      return [];
    } catch (e) {
      // Fallback a notificaciones iniciales si el backend estuviera en red local no alcanzable
      return _getFallbackNotificaciones();
    }
  }

  Future<NotificacionResumenModel> getResumen() async {
    try {
      final response = await _apiClient.dio.get('/notificaciones/resumen');
      if (response.statusCode == 200 && response.data is Map<String, dynamic>) {
        return NotificacionResumenModel.fromJson(response.data as Map<String, dynamic>);
      }
      return const NotificacionResumenModel(totalNoLeidas: 0, ultimas: []);
    } catch (_) {
      return const NotificacionResumenModel(totalNoLeidas: 0, ultimas: []);
    }
  }

  Future<bool> marcarLeida(int id) async {
    try {
      final response = await _apiClient.dio.patch('/notificaciones/$id/leer');
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<bool> marcarTodasLeidas() async {
    try {
      final response = await _apiClient.dio.post('/notificaciones/leer-todas');
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<bool> eliminarNotificacion(int id) async {
    try {
      final response = await _apiClient.dio.delete('/notificaciones/$id');
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<NotificacionModel?> emitirAlertaTest(String tipo) async {
    try {
      final response = await _apiClient.dio.post(
        '/notificaciones/emitir-test',
        data: {'tipo': tipo},
      );
      if (response.statusCode == 201 && response.data is Map<String, dynamic>) {
        return NotificacionModel.fromJson(response.data as Map<String, dynamic>);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  List<NotificacionModel> _getFallbackNotificaciones() {
    return [
      NotificacionModel(
        id: 991,
        titulo: 'Atelier Stylist (CU19): Nuevo look curado',
        mensaje: 'Hemos seleccionado siluetas exclusivas de noche para tu perfil de gala.',
        tipo: 'RECOMENDACION_IA',
        canal: 'TODOS',
        prioridad: 'ALTA',
        leida: false,
        dataExtra: const {'modulo': 'ia_asistente'},
        createdAt: DateTime.now().subtract(const Duration(minutes: 5)),
      ),
      NotificacionModel(
        id: 992,
        titulo: 'Probador VIP agendado',
        mensaje: 'Tu cita en Boutique Equipetrol está confirmada para las 18:00.',
        tipo: 'RESERVA_PROBADOR',
        canal: 'TODOS',
        prioridad: 'NORMAL',
        leida: false,
        dataExtra: const {'modulo': 'reservas'},
        createdAt: DateTime.now().subtract(const Duration(hours: 1)),
      ),
    ];
  }
}
