import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../shared/widgets/atelier_scaffold.dart';
import '../../../../shared/widgets/whatsapp_notification_banner.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/app_notification.dart';
import '../../domain/models/notificacion_model.dart';
import '../../data/repositories/notificaciones_repository.dart';

class NotificacionesScreen extends StatefulWidget {
  const NotificacionesScreen({super.key});

  @override
  State<NotificacionesScreen> createState() => _NotificacionesScreenState();
}

class _NotificacionesScreenState extends State<NotificacionesScreen> {
  final NotificacionesRepository _repository = NotificacionesRepository();
  List<NotificacionModel> _notificaciones = [];
  bool _isLoading = true;
  String _selectedFilter = 'TODAS';

  final List<Map<String, String>> _filtros = [
    {'id': 'TODAS', 'label': 'Todas'},
    {'id': 'NO_LEIDAS', 'label': 'No Leídas'},
    {'id': 'RECOMENDACION_IA', 'label': '✨ IA Stylist (CU19)'},
    {'id': 'RESERVA_PROBADOR', 'label': '🕒 Probadores'},
    {'id': 'ESTADO_PEDIDO', 'label': '🛍️ Pedidos'},
    {'id': 'PROMOCION', 'label': '🏷️ Promos'},
  ];

  @override
  void initState() {
    super.initState();
    _cargarNotificaciones();
  }

  Future<void> _cargarNotificaciones() async {
    setState(() => _isLoading = true);
    final items = await _repository.getNotificaciones(
      tipo: _selectedFilter == 'NO_LEIDAS' ? null : _selectedFilter,
      soloNoLeidas: _selectedFilter == 'NO_LEIDAS',
    );
    if (mounted) {
      setState(() {
        _notificaciones = items;
        _isLoading = false;
      });
    }
  }

  Future<void> _marcarTodasLeidas() async {
    await _repository.marcarTodasLeidas();
    if (mounted) {
      setState(() {
        _notificaciones = _notificaciones.map((n) => n.copyWith(leida: true)).toList();
      });
      AppNotification.showSuccess('Todas las alertas marcadas como leídas');
    }
  }

  Future<void> _onNotifTap(NotificacionModel notif) async {
    if (!notif.leida) {
      await _repository.marcarLeida(notif.id);
      if (mounted) {
        setState(() {
          _notificaciones = _notificaciones.map((n) => n.id == notif.id ? n.copyWith(leida: true) : n).toList();
        });
      }
    }

    // Redirección inteligente según el tipo de caso de uso
    if (!mounted) return;
    if (notif.tipo == 'RECOMENDACION_IA') {
      context.go('/ia_asistente');
    } else if (notif.tipo == 'RESERVA_PROBADOR') {
      context.go('/reservas');
    } else if (notif.tipo == 'ESTADO_PEDIDO') {
      context.go('/ventas');
    } else if (notif.tipo == 'PROMOCION') {
      context.go('/catalogo');
    }
  }

  Future<void> _eliminarNotif(int id) async {
    await _repository.eliminarNotificacion(id);
    if (mounted) {
      setState(() {
        _notificaciones.removeWhere((n) => n.id == id);
      });
      AppNotification.showSuccess('Notificación descartada');
    }
  }

  Future<void> _simularAlerta(String tipo) async {
    final nueva = await _repository.emitirAlertaTest(tipo);
    if (nueva != null && mounted) {
      setState(() {
        _notificaciones.insert(0, nueva);
      });
      AppNotification.showSuccess('Alerta en vivo recibida: ${nueva.titulo}');
    }
  }

  Future<void> _simularAlertaCupon5s() async {
    AppNotification.showSuccess('Simulación programada: En 5 segundos recibirás el cupón...');
    
    await Future.delayed(const Duration(seconds: 5));
    if (!mounted) return;

    final nueva = await _repository.emitirAlertaTest('PROMOCION');
    if (nueva != null && mounted) {
      setState(() {
        _notificaciones.insert(0, nueva);
      });
    }

    final codigoCupon = nueva?.dataExtra?['cupon']?.toString() ??
        nueva?.dataExtra?['codigo_cupon']?.toString() ??
        'ATELIER20';

    // Notificación emergente estilo WhatsApp (Heads-up banner)
    WhatsAppNotificationBanner.show(
      cupon: codigoCupon,
      titulo: nueva?.titulo.isNotEmpty == true ? nueva!.titulo : 'FASHION STORE • PROMOCIÓN',
      mensaje: '¡No te pierdas el cupón: $codigoCupon!',
      descuento: nueva?.mensaje ?? 'Aprovechá un 20% de descuento en tu próxima compra online.',
      onUsar: () {
        context.go('/ventas');
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _notificaciones.where((n) => !n.leida).length;

    return AtelierScaffold(
      currentRoute: '/notificaciones',
      child: Column(
        children: [
          // Header de la pantalla
          Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: Color(0xFFE5E7EB), width: 1.0)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'ALERTAS & NOTIFICACIONES',
                      style: Theme.of(context).textTheme.displayMedium?.copyWith(
                            fontSize: 15,
                            letterSpacing: 1.2,
                            fontWeight: FontWeight.bold,
                            color: Colors.black,
                          ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      unreadCount > 0 ? '$unreadCount alertas sin leer' : 'Bandeja al día',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                    ),
                  ],
                ),
                if (unreadCount > 0)
                  TextButton(
                    onPressed: _marcarTodasLeidas,
                    child: const Text(
                      'Marcar leídas',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.goldAccent,
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Barra de Filtros por Chips
          Container(
            height: 48,
            color: const Color(0xFFF9FAFB),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: _filtros.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final filtro = _filtros[index];
                final isSelected = _selectedFilter == filtro['id'];
                return ChoiceChip(
                  label: Text(
                    filtro['label']!,
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      color: isSelected ? Colors.white : Colors.black87,
                    ),
                  ),
                  selected: isSelected,
                  selectedColor: Colors.black,
                  backgroundColor: Colors.white,
                  side: BorderSide(color: isSelected ? Colors.black : const Color(0xFFD1D5DB)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  showCheckmark: false,
                  onSelected: (selected) {
                    if (selected) {
                      setState(() => _selectedFilter = filtro['id']!);
                      _cargarNotificaciones();
                    }
                  },
                );
              },
            ),
          ),

          // Lista de Notificaciones
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Colors.black))
                : _notificaciones.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.notifications_none_outlined, size: 54, color: Colors.grey),
                            const SizedBox(height: 12),
                            const Text(
                              'No tenés notificaciones en esta sección',
                              style: TextStyle(fontSize: 14, color: Colors.grey),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: _selectedFilter == 'PROMOCION' ? const Color(0xFF047857) : Colors.black,
                                foregroundColor: Colors.white,
                                shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                              ),
                              onPressed: _selectedFilter == 'PROMOCION'
                                  ? _simularAlertaCupon5s
                                  : () => _simularAlerta(_selectedFilter == 'TODAS' || _selectedFilter == 'NO_LEIDAS' ? 'RECOMENDACION_IA' : _selectedFilter),
                              child: Text(
                                _selectedFilter == 'PROMOCION'
                                    ? '🏷️ Simular Cupón en Promos (5s)'
                                    : 'Simular Alerta de IA (CU19)',
                              ),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        color: Colors.black,
                        onRefresh: _cargarNotificaciones,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          itemCount: _notificaciones.length,
                          itemBuilder: (context, index) {
                            final notif = _notificaciones[index];
                            return Dismissible(
                              key: Key('notif_${notif.id}'),
                              direction: DismissDirection.endToStart,
                              background: Container(
                                alignment: Alignment.centerRight,
                                padding: const EdgeInsets.only(right: 20),
                                color: Colors.red.shade700,
                                child: const Icon(Icons.delete_outline, color: Colors.white),
                              ),
                              onDismissed: (_) => _eliminarNotif(notif.id),
                              child: InkWell(
                                onTap: () => _onNotifTap(notif),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                  decoration: BoxDecoration(
                                    color: notif.leida ? Colors.white : const Color(0xFFFCFAF6),
                                    border: Border(
                                      bottom: const BorderSide(color: Color(0xFFF3F4F6), width: 1),
                                      left: notif.leida
                                          ? BorderSide.none
                                          : const BorderSide(color: AppTheme.goldAccent, width: 4),
                                    ),
                                  ),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Ícono de Tipo
                                      Container(
                                        width: 38,
                                        height: 38,
                                        decoration: BoxDecoration(
                                          color: _getBgColorForType(notif.tipo),
                                          borderRadius: BorderRadius.circular(8),
                                          border: Border.all(color: const Color(0xFFE5E7EB)),
                                        ),
                                        child: Icon(
                                          _getIconForType(notif.tipo),
                                          size: 20,
                                          color: _getIconColorForType(notif.tipo),
                                        ),
                                      ),
                                      const SizedBox(width: 14),

                                      // Contenido
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                Text(
                                                  _getLabelForType(notif.tipo).toUpperCase(),
                                                  style: const TextStyle(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.bold,
                                                    letterSpacing: 0.8,
                                                    color: Color(0xFF9CA3AF),
                                                  ),
                                                ),
                                                Text(
                                                  _formatTime(notif.createdAt),
                                                  style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF)),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 3),
                                            Text(
                                              notif.titulo,
                                              style: TextStyle(
                                                fontSize: 13.5,
                                                fontWeight: notif.leida ? FontWeight.w600 : FontWeight.bold,
                                                color: Colors.black,
                                              ),
                                            ),
                                            const SizedBox(height: 3),
                                            Text(
                                              notif.mensaje,
                                              style: const TextStyle(fontSize: 12, color: Color(0xFF4B5563), height: 1.3),
                                            ),
                                            if (notif.tipo == 'RECOMENDACION_IA')
                                              const Padding(
                                                padding: EdgeInsets.only(top: 6),
                                                child: Text(
                                                  'Abrir Atelier Stylist →',
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.bold,
                                                    color: AppTheme.goldAccent,
                                                  ),
                                                ),
                                              ),
                                          ],
                                        ),
                                      ),

                                      IconButton(
                                        icon: const Icon(Icons.close, size: 16, color: Color(0xFF9CA3AF)),
                                        onPressed: () => _eliminarNotif(notif.id),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),

          // Botones de Simulación Rápida (Evaluación)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: const BoxDecoration(
              color: Color(0xFFF9FAFB),
              border: Border(top: BorderSide(color: Color(0xFFE5E7EB))),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  const Text('Simular:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  const SizedBox(width: 8),
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      side: const BorderSide(color: Color(0xFFD1D5DB)),
                    ),
                    onPressed: () => _simularAlerta('RECOMENDACION_IA'),
                    child: const Text('✨ IA (CU19)', style: TextStyle(fontSize: 11, color: Colors.black)),
                  ),
                  const SizedBox(width: 6),
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      backgroundColor: const Color(0xFFECFDF5),
                      side: const BorderSide(color: Color(0xFF10B981)),
                    ),
                    onPressed: _simularAlertaCupon5s,
                    child: const Text(
                      '🏷️ Promo (5s)',
                      style: TextStyle(fontSize: 11, color: Color(0xFF047857), fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 6),
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      side: const BorderSide(color: Color(0xFFD1D5DB)),
                    ),
                    onPressed: () => _simularAlerta('RESERVA_PROBADOR'),
                    child: const Text('🕒 Cita', style: TextStyle(fontSize: 11, color: Colors.black)),
                  ),
                  const SizedBox(width: 6),
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      side: const BorderSide(color: Color(0xFFD1D5DB)),
                    ),
                    onPressed: () => _simularAlerta('ESTADO_PEDIDO'),
                    child: const Text('🛍️ Pedido', style: TextStyle(fontSize: 11, color: Colors.black)),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  IconData _getIconForType(String tipo) {
    switch (tipo) {
      case 'RECOMENDACION_IA': return Icons.auto_awesome;
      case 'RESERVA_PROBADOR': return Icons.access_time_filled;
      case 'ESTADO_PEDIDO': return Icons.local_shipping;
      case 'PROMOCION': return Icons.local_offer;
      case 'ALERTA_STOCK': return Icons.warning_amber_rounded;
      default: return Icons.notifications;
    }
  }

  Color _getIconColorForType(String tipo) {
    switch (tipo) {
      case 'RECOMENDACION_IA': return const Color(0xFFB45309);
      case 'RESERVA_PROBADOR': return const Color(0xFF1D4ED8);
      case 'ESTADO_PEDIDO': return const Color(0xFF047857);
      case 'PROMOCION': return const Color(0xFFBE185D);
      case 'ALERTA_STOCK': return const Color(0xFFD97706);
      default: return Colors.black;
    }
  }

  Color _getBgColorForType(String tipo) {
    switch (tipo) {
      case 'RECOMENDACION_IA': return const Color(0xFFFEF3C7);
      case 'RESERVA_PROBADOR': return const Color(0xFFDBEAFE);
      case 'ESTADO_PEDIDO': return const Color(0xFFD1FAE5);
      case 'PROMOCION': return const Color(0xFFFCE7F3);
      case 'ALERTA_STOCK': return const Color(0xFFFEF9C3);
      default: return const Color(0xFFF3F4F6);
    }
  }

  String _getLabelForType(String tipo) {
    switch (tipo) {
      case 'RECOMENDACION_IA': return 'Atelier Stylist (CU19)';
      case 'RESERVA_PROBADOR': return 'Probador Físico';
      case 'ESTADO_PEDIDO': return 'Envío / Pedido';
      case 'PROMOCION': return 'Descuento';
      case 'ALERTA_STOCK': return 'Inventario';
      default: return 'Alerta';
    }
  }

  String _formatTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) {
      return 'hace ${diff.inMinutes}m';
    } else if (diff.inHours < 24) {
      return 'hace ${diff.inHours}h';
    }
    return '${dt.day}/${dt.month}';
  }
}
