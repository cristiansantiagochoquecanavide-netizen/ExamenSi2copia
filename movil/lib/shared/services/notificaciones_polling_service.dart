import 'dart:async';
import '../../core/routes/app_router.dart';
import '../../features/notificaciones/data/repositories/notificaciones_repository.dart';
import '../widgets/whatsapp_notification_banner.dart';

class NotificacionesPollingService {
  static final NotificacionesPollingService instance = NotificacionesPollingService._internal();

  NotificacionesPollingService._internal();

  final NotificacionesRepository _repository = NotificacionesRepository();
  Timer? _timer;
  final Set<int> _seenPromoIds = <int>{};
  bool _initialized = false;

  void start() {
    if (_timer != null) return;

    // Primer chequeo tras 2 segundos del arranque
    Future.delayed(const Duration(seconds: 2), _checkPromociones);

    // Polling recurrente cada 9 segundos (regla de los 10s)
    _timer = Timer.periodic(const Duration(seconds: 9), (_) => _checkPromociones());
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  Future<void> _checkPromociones() async {
    try {
      final items = await _repository.getNotificaciones(tipo: 'PROMOCION');
      if (items.isEmpty) {
        _initialized = true;
        return;
      }

      if (!_initialized) {
        // Carga inicial: registramos las promociones existentes para no duplicar
        for (final p in items) {
          _seenPromoIds.add(p.id);
        }
        _initialized = true;
      } else {
        // En cada ciclo posterior: si un admin crea un nuevo cupón, salta la alerta
        for (final p in items) {
          if (!_seenPromoIds.contains(p.id)) {
            _seenPromoIds.add(p.id);

            final cupon = p.dataExtra?['cupon']?.toString() ??
                p.dataExtra?['codigo_cupon']?.toString() ??
                'ATELIER20';

            // Ventana emergente estilo WhatsApp solo para cupones de descuento
            WhatsAppNotificationBanner.show(
              cupon: cupon,
              titulo: p.titulo.isNotEmpty ? p.titulo : 'FASHION STORE • CUPÓN EXCLUSIVO',
              mensaje: '¡No te pierdas el cupón: $cupon!',
              descuento: p.mensaje,
              onUsar: () {
                appRouter.go('/ventas');
              },
            );
            break;
          }
        }
      }
    } catch (_) {
      // Silenciar errores de conexión puntual
    }
  }
}
