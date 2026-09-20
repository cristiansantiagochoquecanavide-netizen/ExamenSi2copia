import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/routes/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/app_notification.dart';

class WhatsAppNotificationBanner {
  static OverlayEntry? _currentEntry;
  static Timer? _dismissTimer;

  static void show({
    required String cupon,
    String? titulo,
    String? mensaje,
    String? descuento,
    VoidCallback? onUsar,
    Duration duration = const Duration(seconds: 7),
  }) {
    // Si ya hay un banner mostrándose, cancelarlo suavemente
    dismiss();

    final overlayState = rootNavigatorKey.currentState?.overlay;
    if (overlayState == null) return;

    // Vibración háptica similar a la llegada de un mensaje
    HapticFeedback.heavyImpact();

    late OverlayEntry entry;
    entry = OverlayEntry(
      builder: (context) => _WhatsAppBannerWidget(
        cupon: cupon,
        titulo: titulo ?? 'FASHION STORE • PROMOCIÓN',
        mensaje: mensaje ?? '¡No te pierdas el cupón: $cupon!',
        descuento: descuento,
        onDismiss: () => dismiss(),
        onUsar: () {
          dismiss();
          Clipboard.setData(ClipboardData(text: cupon));
          AppNotification.showSuccess(
            '¡Cupón "$cupon" copiado al portapapeles! Aplicálo en tu Bolsa de compras.',
            actionLabel: 'IR A BOLSA',
            onAction: () => appRouter.go('/ventas'),
          );
          if (onUsar != null) {
            onUsar();
          } else {
            appRouter.go('/ventas');
          }
        },
      ),
    );

    _currentEntry = entry;
    overlayState.insert(entry);

    _dismissTimer = Timer(duration, () {
      dismiss();
    });
  }

  static void dismiss() {
    _dismissTimer?.cancel();
    _dismissTimer = null;
    if (_currentEntry != null) {
      _currentEntry?.remove();
      _currentEntry = null;
    }
  }
}

class _WhatsAppBannerWidget extends StatefulWidget {
  final String cupon;
  final String titulo;
  final String mensaje;
  final String? descuento;
  final VoidCallback onDismiss;
  final VoidCallback onUsar;

  const _WhatsAppBannerWidget({
    required this.cupon,
    required this.titulo,
    required this.mensaje,
    this.descuento,
    required this.onDismiss,
    required this.onUsar,
  });

  @override
  State<_WhatsAppBannerWidget> createState() => _WhatsAppBannerWidgetState();
}

class _WhatsAppBannerWidgetState extends State<_WhatsAppBannerWidget>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<Offset> _slideAnimation;
  late final Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, -1.2),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeOutBack,
        reverseCurve: Curves.easeInCubic,
      ),
    );

    _fadeAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeIn,
    );

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _handleDismiss() async {
    await _controller.reverse();
    widget.onDismiss();
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;

    return Positioned(
      top: topPadding + 8,
      left: 12,
      right: 12,
      child: Material(
        color: Colors.transparent,
        child: SlideTransition(
          position: _slideAnimation,
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: GestureDetector(
              onVerticalDragUpdate: (details) {
                // Deslizar hacia arriba para descartar
                if (details.primaryDelta != null && details.primaryDelta! < -4) {
                  _handleDismiss();
                }
              },
              child: Container(
                decoration: BoxDecoration(
                  // Fondo oscuro tipo WhatsApp Heads-up Popup con borde dorado sutil
                  color: const Color(0xFF18181B), // Zinc 900
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: AppTheme.goldAccent.withValues(alpha: 0.45),
                    width: 1.2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.45),
                      blurRadius: 18,
                      offset: const Offset(0, 8),
                      spreadRadius: 1,
                    ),
                  ],
                ),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Fila superior: Logo tipo WhatsApp, Nombre App y hora
                    Row(
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          decoration: const BoxDecoration(
                            color: Color(0xFF25D366), // Verde WhatsApp característico
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.local_offer_rounded,
                            size: 16,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  widget.titulo,
                                  style: const TextStyle(
                                    color: Color(0xFFE2E8F0),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.8,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 6),
                              const Text(
                                '• ahora',
                                style: TextStyle(
                                  color: Color(0xFF94A3B8),
                                  fontSize: 10,
                                ),
                              ),
                              const SizedBox(width: 6),
                            ],
                          ),
                        ),
                        InkWell(
                          onTap: _handleDismiss,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.1),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.close,
                              size: 14,
                              color: Color(0xFF94A3B8),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 10),

                    // Mensaje principal destacado
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(width: 36), // Alineado con el contenido tras el avatar
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '¡No te pierdas el cupón: ${widget.cupon}!',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  height: 1.25,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                widget.descuento ??
                                    'Aprovechá descuento exclusivo en alta costura. Tocá para copiarlo y aplicarlo en tu Bolsa.',
                                style: const TextStyle(
                                  color: Color(0xFFCBD5E1),
                                  fontSize: 12,
                                  height: 1.35,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    // Barra de acción rápida: Botón de usar cupón
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed: _handleDismiss,
                          style: TextButton.styleFrom(
                            foregroundColor: const Color(0xFF94A3B8),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: const Text(
                            'DESCARTAR',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton.icon(
                          onPressed: widget.onUsar,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF25D366), // Verde botón de acción
                            foregroundColor: Colors.white,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20),
                            ),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          icon: const Icon(Icons.copy_rounded, size: 14),
                          label: Text(
                            'USAR: ${widget.cupon}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
