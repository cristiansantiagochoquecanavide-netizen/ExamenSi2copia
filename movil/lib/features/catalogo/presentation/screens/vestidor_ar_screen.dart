import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:go_router/go_router.dart';
import '../../../../shared/widgets/atelier_scaffold.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/app_notification.dart';
import '../../../../shared/services/cart_service.dart';
import '../../data/repositories/catalogo_repository.dart';
import '../../domain/models/catalogo_models.dart';
import '../widgets/prenda_detail_modal.dart';

class VestidorArScreen extends StatefulWidget {
  const VestidorArScreen({super.key});

  @override
  State<VestidorArScreen> createState() => _VestidorArScreenState();
}

class _VestidorArScreenState extends State<VestidorArScreen> {
  final CatalogoRepository _catalogoRepository = CatalogoRepository();

  CameraController? _cameraController;
  List<CameraDescription>? _cameras;
  bool _isCameraInitialized = false;
  bool _useStudioSimulator = true; // Por defecto o fallback para emulador
  bool _showGuidelines = true;

  List<PrendaModel> _prendas = [];
  PrendaModel? _selectedPrenda;
  bool _isLoading = true;

  // Transformaciones interactivas de la prenda en AR
  Offset _garmentPosition = const Offset(0, 0);
  double _garmentScale = 1.0;
  double _garmentOpacity = 0.92;

  @override
  void initState() {
    super.initState();
    _loadCatalogo();
  }

  @override
  void dispose() {
    _safeDisposeCamera();
    super.dispose();
  }

  void _safeDisposeCamera() {
    try {
      final controller = _cameraController;
      _cameraController = null;
      if (controller != null && controller.value.isInitialized) {
        controller.dispose();
      }
    } catch (_) {}
  }

  Future<void> _loadCatalogo() async {
    final list = await _catalogoRepository.getPrendas();
    if (mounted) {
      setState(() {
        _prendas = list;
        if (list.isNotEmpty) {
          _selectedPrenda = list.first;
        }
        _isLoading = false;
      });
    }
  }

  Future<void> _toggleCameraMode() async {
    if (_useStudioSimulator) {
      // Activar cámara bajo demanda
      try {
        _cameras ??= await availableCameras();
        if (_cameras != null && _cameras!.isNotEmpty) {
          final frontCamera = _cameras!.firstWhere(
            (c) => c.lensDirection == CameraLensDirection.front,
            orElse: () => _cameras!.first,
          );

          final controller = CameraController(
            frontCamera,
            ResolutionPreset.medium,
            enableAudio: false,
          );

          await controller.initialize();
          if (mounted) {
            setState(() {
              _cameraController = controller;
              _isCameraInitialized = true;
              _useStudioSimulator = false;
            });
          }
        } else {
          AppNotification.showSuccess('Cámara no detectada, permaneciendo en Modo Estudio');
        }
      } catch (_) {
        if (mounted) {
          setState(() {
            _useStudioSimulator = true;
            _isCameraInitialized = false;
          });
          AppNotification.showSuccess('Modo Estudio activo (Cámara virtual de emulador)');
        }
      }
    } else {
      // Cambiar a modo estudio y liberar recursos de cámara
      _safeDisposeCamera();
      if (mounted) {
        setState(() {
          _useStudioSimulator = true;
          _isCameraInitialized = false;
        });
      }
    }
  }

  void _resetPosition() {
    setState(() {
      _garmentPosition = const Offset(0, 0);
      _garmentScale = 1.0;
      _garmentOpacity = 0.92;
    });
  }

  void _capturarLook() {
    if (_selectedPrenda == null) return;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        title: const Row(
          children: [
            Icon(Icons.auto_awesome, color: AppTheme.goldAccent, size: 20),
            SizedBox(width: 8),
            Text('LOOK ATELIER GUARDADO', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 1.0)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 180,
              width: double.infinity,
              color: AppTheme.surfaceContainer,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Image.network(
                    _selectedPrenda!.portadaUrl,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => const Icon(Icons.checkroom, size: 48, color: AppTheme.mutedColor),
                  ),
                  Positioned(
                    bottom: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      color: Colors.black.withValues(alpha: 0.8),
                      child: const Text('AR FITTING • LOOK #15', style: TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(_selectedPrenda!.nombre, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
            const SizedBox(height: 4),
            Text('Bs ${_selectedPrenda!.precioBase.toStringAsFixed(2)}', style: const TextStyle(color: AppTheme.goldAccent, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            const Text(
              'Tu captura de ajuste virtual ha sido registrada con las proporciones y caída recomendadas.',
              style: TextStyle(fontSize: 12, color: AppTheme.mutedColor),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('CERRAR', style: TextStyle(color: AppTheme.mutedColor, fontSize: 11, fontWeight: FontWeight.w700)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.black,
              foregroundColor: Colors.white,
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
            ),
            onPressed: () {
              CartService.instance.addItem(prenda: _selectedPrenda!);
              Navigator.pop(ctx);
              AppNotification.showSuccess('"${_selectedPrenda!.nombre}" añadida a tu bolsa');
            },
            child: const Text('AÑADIR A LA BOLSA', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AtelierScaffold(
      currentRoute: '/catalogo/vestidor_ar',
      child: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.black))
          : Stack(
              children: [
                // 1. Capa de Fondo: Cámara en Vivo o Simulador de Estudio Maniquí
                Positioned.fill(
                  child: _buildBackgroundFeed(),
                ),

                // 2. Capa de Guías de Alineación AR
                if (_showGuidelines)
                  Positioned.fill(
                    child: _buildARGuidelines(),
                  ),

                // 3. Capa Interactiva de la Prenda (Drag / Scale)
                if (_selectedPrenda != null)
                  Positioned.fill(
                    child: _buildInteractiveGarment(),
                  ),

                // 4. Barra Superior de Controles AR
                Positioned(
                  top: 12,
                  left: 16,
                  right: 16,
                  child: _buildTopControls(),
                ),

                // 5. Barra Lateral de Ajuste Fino (Escala y Opacidad)
                Positioned(
                  right: 16,
                  top: 100,
                  bottom: 180,
                  child: _buildAdjustmentSidebar(),
                ),

                // 6. Carrusel Inferior de Selección de Prendas & Botones de Acción
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: _buildBottomSuite(),
                ),
              ],
            ),
    );
  }

  Widget _buildBackgroundFeed() {
    if (!_useStudioSimulator && _isCameraInitialized && _cameraController != null) {
      return CameraPreview(_cameraController!);
    }

    // Modo Estudio / Maniquí Virtual para pasarela y pruebas
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFF1E1E24),
            Color(0xFF121214),
            Color(0xFF09090B),
          ],
        ),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Spotlight de pasarela
          Positioned(
            top: 20,
            child: Container(
              width: 320,
              height: 320,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    Colors.white.withValues(alpha: 0.12),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          // Silueta editorial de silueta/maniquí
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.accessibility_new_rounded,
                size: 260,
                color: Colors.white.withValues(alpha: 0.18),
              ),
              const SizedBox(height: 60),
            ],
          ),
          Positioned(
            top: 70,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.6),
                border: Border.all(color: Colors.white24),
              ),
              child: const Text(
                'STUDIO SIMULATOR • CALIBRACIÓN VIRTUAL',
                style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1.2),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildARGuidelines() {
    return IgnorePointer(
      child: CustomPaint(
        painter: _ARGuidelinesPainter(),
      ),
    );
  }

  Widget _buildInteractiveGarment() {
    return Center(
      child: Transform.translate(
        offset: _garmentPosition,
        child: Transform.scale(
          scale: _garmentScale,
          child: Opacity(
            opacity: _garmentOpacity,
            child: GestureDetector(
              onPanUpdate: (details) {
                setState(() {
                  _garmentPosition += details.delta;
                });
              },
              child: Container(
                width: 240,
                height: 300,
                decoration: BoxDecoration(
                  border: Border.all(
                    color: AppTheme.goldAccent.withValues(alpha: 0.3),
                    width: 1,
                  ),
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Image.network(
                      _selectedPrenda!.portadaUrl,
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => const Icon(Icons.checkroom, size: 100, color: AppTheme.goldAccent),
                    ),
                    // Indicador de arrastre sutil
                    Positioned(
                      bottom: 4,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        color: Colors.black.withValues(alpha: 0.7),
                        child: const Row(
                          children: [
                            Icon(Icons.open_with, color: Colors.white70, size: 10),
                            SizedBox(width: 4),
                            Text('ARRASTRAR', style: TextStyle(color: Colors.white70, fontSize: 8, fontWeight: FontWeight.w700)),
                          ],
                        ),
                      ),
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

  Widget _buildTopControls() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Modo Cámara / Simulador
        InkWell(
          onTap: _toggleCameraMode,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.75),
              border: Border.all(color: AppTheme.goldAccent.withValues(alpha: 0.5)),
            ),
            child: Row(
              children: [
                Icon(
                  _useStudioSimulator ? Icons.videocam_outlined : Icons.palette_outlined,
                  size: 14,
                  color: AppTheme.goldAccent,
                ),
                const SizedBox(width: 6),
                Text(
                  _useStudioSimulator ? 'ACTIVAR CÁMARA' : 'MODO ESTUDIO',
                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.8),
                ),
              ],
            ),
          ),
        ),

        // Botones rápidos: Guías & Reset
        Row(
          children: [
            IconButton(
              icon: Icon(
                _showGuidelines ? Icons.grid_on : Icons.grid_off,
                color: _showGuidelines ? AppTheme.goldAccent : Colors.white60,
                size: 20,
              ),
              tooltip: 'Guías de proporción',
              onPressed: () => setState(() => _showGuidelines = !_showGuidelines),
              style: IconButton.styleFrom(backgroundColor: Colors.black54),
            ),
            const SizedBox(width: 6),
            IconButton(
              icon: const Icon(Icons.restart_alt, color: Colors.white, size: 20),
              tooltip: 'Centrar prenda',
              onPressed: _resetPosition,
              style: IconButton.styleFrom(backgroundColor: Colors.black54),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildAdjustmentSidebar() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.75),
        border: Border.all(color: Colors.white24),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.zoom_in, color: Colors.white70, size: 16),
          const SizedBox(height: 4),
          // Botón Aumentar Escala
          InkWell(
            onTap: () {
              setState(() {
                if (_garmentScale < 1.8) _garmentScale += 0.1;
              });
            },
            child: const Padding(
              padding: EdgeInsets.all(4.0),
              child: Icon(Icons.add, color: Colors.white, size: 16),
            ),
          ),
          Text('${(_garmentScale * 100).toInt()}%', style: const TextStyle(color: AppTheme.goldAccent, fontSize: 9, fontWeight: FontWeight.bold)),
          // Botón Reducir Escala
          InkWell(
            onTap: () {
              setState(() {
                if (_garmentScale > 0.6) _garmentScale -= 0.1;
              });
            },
            child: const Padding(
              padding: EdgeInsets.all(4.0),
              child: Icon(Icons.remove, color: Colors.white, size: 16),
            ),
          ),
          const Divider(color: Colors.white24, height: 16),
          const Icon(Icons.opacity, color: Colors.white70, size: 16),
          const SizedBox(height: 4),
          // Toggle opacidad
          InkWell(
            onTap: () {
              setState(() {
                _garmentOpacity = _garmentOpacity < 0.7 ? 1.0 : 0.65;
              });
            },
            child: Text(
              '${(_garmentOpacity * 100).toInt()}%',
              style: const TextStyle(color: Colors.white70, fontSize: 9, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomSuite() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.92),
        border: const Border(top: BorderSide(color: Color(0xFF374151))),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 1. Selector de Prenda (Carrusel Horizontal)
            SizedBox(
              height: 84,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                scrollDirection: Axis.horizontal,
                itemCount: _prendas.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, idx) {
                  final prenda = _prendas[idx];
                  final isSelected = _selectedPrenda?.id == prenda.id;
                  return InkWell(
                    onTap: () => setState(() => _selectedPrenda = prenda),
                    child: Container(
                      width: 68,
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFF262626) : const Color(0xFF141414),
                        border: Border.all(
                          color: isSelected ? AppTheme.goldAccent : Colors.white24,
                          width: isSelected ? 1.5 : 1.0,
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Image.network(
                            prenda.portadaUrl,
                            height: 38,
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => const Icon(Icons.checkroom, color: Colors.white70, size: 24),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            prenda.nombre,
                            style: TextStyle(
                              fontSize: 8,
                              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                              color: isSelected ? Colors.white : Colors.white70,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            // 2. Barra de Acciones de Compra y Cita
            if (_selectedPrenda != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                child: Row(
                  children: [
                    // Botón Capturar Look
                    InkWell(
                      onTap: _capturarLook,
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF262626),
                          border: Border.all(color: AppTheme.goldAccent),
                        ),
                        child: const Icon(Icons.camera_alt_outlined, color: AppTheme.goldAccent, size: 20),
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Botón Detalles
                    IconButton(
                      icon: const Icon(Icons.info_outline, color: Colors.white),
                      tooltip: 'Detalles de la prenda',
                      onPressed: () => PrendaDetailModal.show(context, _selectedPrenda!),
                    ),
                    const SizedBox(width: 8),

                    // Botón Probar en Sucursal (Reservas)
                    Expanded(
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: const BorderSide(color: Colors.white54),
                          shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        onPressed: () => context.go('/reservas'),
                        child: const Text(
                          'RESERVAR PROBADOR',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.8),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Botón Añadir a la Bolsa
                    Expanded(
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.goldAccent,
                          foregroundColor: Colors.black,
                          shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        onPressed: () {
                          CartService.instance.addItem(prenda: _selectedPrenda!);
                          AppNotification.showSuccess('"${_selectedPrenda!.nombre}" agregada a tu bolsa');
                        },
                        child: const Text(
                          'AÑADIR A BOLSA',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.8),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ARGuidelinesPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFFD4AF37).withValues(alpha: 0.35)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    final double cx = size.width / 2;
    final double cy = size.height * 0.42;

    // Eje vertical de alineación
    canvas.drawLine(Offset(cx, cy - 140), Offset(cx, cy + 160), paint);

    // Línea de hombros
    canvas.drawLine(Offset(cx - 90, cy - 80), Offset(cx + 90, cy - 80), paint);

    // Línea de cintura
    canvas.drawLine(Offset(cx - 70, cy + 20), Offset(cx + 70, cy + 20), paint);

    // Círculo de referencia
    canvas.drawCircle(Offset(cx, cy - 80), 6, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

