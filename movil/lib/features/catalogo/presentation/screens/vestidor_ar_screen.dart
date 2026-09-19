import 'dart:ui' as ui;
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:dio/dio.dart';
import 'package:go_router/go_router.dart';
import '../../../../shared/widgets/atelier_scaffold.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/app_notification.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../shared/services/cart_service.dart';
import '../../data/repositories/catalogo_repository.dart';
import '../../domain/models/catalogo_models.dart';
import '../widgets/prenda_detail_modal.dart';

class VestidorArScreen extends StatefulWidget {
  final PrendaModel? initialPrenda;

  const VestidorArScreen({
    super.key,
    this.initialPrenda,
  });

  @override
  State<VestidorArScreen> createState() => _VestidorArScreenState();
}

class _VestidorArScreenState extends State<VestidorArScreen> with SingleTickerProviderStateMixin {
  final CatalogoRepository _catalogoRepository = CatalogoRepository();

  // Cámara & Modos
  CameraController? _cameraController;
  List<CameraDescription> _availableCameras = [];
  int _selectedCameraIndex = 0;
  bool _isCameraInitialized = false;
  bool _isCameraLoading = false;
  bool _useStudioSimulator = false; // Arranca directamente con la cámara activa
  bool _showGuidelines = true;

  // Virtual Try-On Snapshot State
  List<PrendaModel> _allPrendas = [];
  bool _isProcessingVton = false;
  VtonTryOnModel? _vtonResult;
  List<int>? _lastCapturedUserBytes;
  bool _showLiveOverlay = false; // Oculta el sticker estático en la cámara por defecto

  // Prenda Única Activa (CU17: Probador enfocado en la prenda elegida)
  PrendaModel? _selectedPrenda;
  bool _isLoading = true;

  // AI Background Removal (V-TON overlay)
  String? _nobgUrl;         // Transparent PNG URL returned by rembg endpoint
  bool _isProcessingBg = false;  // True while waiting for the AI pipeline

  // Transformaciones Interactivas Anywear V-TON (Amoldado Anatómico)
  Offset _garmentPosition = const Offset(0, 40); // Centrado a la altura del cuello/pecho
  double _garmentScaleX = 1.05; // Ancho de hombros
  double _garmentScaleY = 1.05; // Largo de torso
  double _garmentRotation = 0.0;
  double _garmentOpacity = 0.96;
  BlendMode _blendMode = BlendMode.srcOver;

  // Gestos Multi-touch (Pinch to zoom & Rotate)
  double _baseScaleX = 1.05;
  double _baseScaleY = 1.05;
  double _baseRotation = 0.0;

  // Animación de pulso Anywear Live
  AnimationController? _pulseController;
  Animation<double>? _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _initPulseAnimation();
    _initCamerasAndCatalogo();
  }

  void _initPulseAnimation() {
    try {
      _pulseController ??= AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 1400),
      )..repeat(reverse: true);
      _pulseAnimation = Tween<double>(begin: 0.6, end: 1.0).animate(
        CurvedAnimation(parent: _pulseController!, curve: Curves.easeInOut),
      );
    } catch (_) {}
  }

  @override
  void dispose() {
    _pulseController?.dispose();
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

  Future<void> _initCamerasAndCatalogo() async {
    // 1. Cargar la prenda
    final list = await _catalogoRepository.getPrendas();
    _allPrendas = list;
    if (widget.initialPrenda != null) {
      _selectedPrenda = widget.initialPrenda;
    } else if (list.isNotEmpty) {
      _selectedPrenda = list.first;
    }
    _isLoading = false;

    if (mounted) setState(() {});

    // 2. Trigger AI background removal in parallel with camera init
    if (_selectedPrenda != null) {
      _fetchNobgUrl(_selectedPrenda!.id);
    }

    // 2. Iniciar cámara en vivo automáticamente
    try {
      _availableCameras = await availableCameras();
      if (_availableCameras.isNotEmpty) {
        final frontIdx = _availableCameras.indexWhere(
          (c) => c.lensDirection == CameraLensDirection.front,
        );
        _selectedCameraIndex = frontIdx != -1 ? frontIdx : 0;
        await _initCameraController(_availableCameras[_selectedCameraIndex]);
        if (mounted) {
          setState(() {
            _useStudioSimulator = false;
          });
        }
      } else {
        if (mounted) {
          setState(() => _useStudioSimulator = true);
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() => _useStudioSimulator = true);
      }
    }
  }

  /// Calls the backend AI pipeline to remove the garment background.
  /// On success, sets [_nobgUrl] to the transparent PNG URL.
  /// Falls back gracefully — if the AI fails, the original image is used.
  Future<void> _fetchNobgUrl(int prendaId) async {
    if (!mounted) return;
    setState(() => _isProcessingBg = true);

    try {
      final dio = Dio();
      // Replace 10.0.2.2 → localhost for the backend call (same machine)
      final baseUrl = AppConstants.apiBaseUrl.replaceFirst('10.0.2.2', '10.0.2.2');
      final response = await dio.post(
        '$baseUrl/catalogo/prendas/$prendaId/remove-background',
        options: Options(
          receiveTimeout: const Duration(seconds: 60), // First call downloads ONNX model
          sendTimeout: const Duration(seconds: 10),
        ),
      );

      if (response.statusCode == 200 && response.data is Map) {
        final nobgUrl = response.data['nobg_url'] as String?;
        if (nobgUrl != null && nobgUrl.isNotEmpty && mounted) {
          final resolvedUrl = PrendaModel.resolveImageUrl(nobgUrl);
          setState(() => _nobgUrl = resolvedUrl);
        }
      }
    } catch (_) {
      // Silently degrade: overlay will use the original portada image
    } finally {
      if (mounted) setState(() => _isProcessingBg = false);
    }
  }

  Future<void> _toggleCameraMode() async {
    if (_useStudioSimulator) {
      if (_availableCameras.isEmpty) {
        try {
          _availableCameras = await availableCameras();
        } catch (_) {}
      }

      if (_availableCameras.isEmpty) {
        AppNotification.showSuccess('Cámara física no disponible. Activo Modo Estudio');
        return;
      }

      setState(() => _isCameraLoading = true);

      try {
        final frontIdx = _availableCameras.indexWhere(
          (c) => c.lensDirection == CameraLensDirection.front,
        );
        _selectedCameraIndex = frontIdx != -1 ? frontIdx : 0;

        await _initCameraController(_availableCameras[_selectedCameraIndex]);
        if (mounted) {
          setState(() {
            _useStudioSimulator = false;
            _isCameraLoading = false;
          });
        }
      } catch (e) {
        if (mounted) {
          setState(() {
            _useStudioSimulator = true;
            _isCameraLoading = false;
          });
          AppNotification.showSuccess('Modo Estudio activo');
        }
      }
    } else {
      _safeDisposeCamera();
      if (mounted) {
        setState(() {
          _useStudioSimulator = true;
          _isCameraInitialized = false;
        });
      }
    }
  }

  Future<void> _switchCameraDirection() async {
    if (_availableCameras.length <= 1) return;
    setState(() => _isCameraLoading = true);
    _selectedCameraIndex = (_selectedCameraIndex + 1) % _availableCameras.length;
    await _initCameraController(_availableCameras[_selectedCameraIndex]);
    if (mounted) {
      setState(() => _isCameraLoading = false);
    }
  }

  Future<void> _initCameraController(CameraDescription camera) async {
    _safeDisposeCamera();
    final controller = CameraController(
      camera,
      ResolutionPreset.high,
      enableAudio: false,
    );

    try {
      await controller.initialize();
      if (mounted) {
        setState(() {
          _cameraController = controller;
          _isCameraInitialized = true;
        });
      }
    } catch (e) {
      _safeDisposeCamera();
      if (mounted) {
        setState(() {
          _isCameraInitialized = false;
          _useStudioSimulator = true;
        });
      }
    }
  }

  void _resetPosition() {
    setState(() {
      _garmentPosition = const Offset(0, 40);
      _garmentScaleX = 1.05;
      _garmentScaleY = 1.05;
      _garmentRotation = 0.0;
      _garmentOpacity = 0.96;
    });
    AppNotification.showSuccess('Prenda ajustada al centro de hombros');
  }

  Future<void> _capturarYProbarVton([PrendaModel? targetPrenda]) async {
    final prenda = targetPrenda ?? _selectedPrenda;
    if (prenda == null) return;

    List<int>? imageBytes = _lastCapturedUserBytes;

    if (imageBytes == null) {
      if (_cameraController != null && _cameraController!.value.isInitialized) {
        try {
          setState(() => _isProcessingVton = true);
          final xfile = await _cameraController!.takePicture();
          imageBytes = await xfile.readAsBytes();
          _lastCapturedUserBytes = imageBytes;
        } catch (e) {
          setState(() => _isProcessingVton = false);
          AppNotification.showSuccess('No se pudo capturar la foto de la cámara.');
          return;
        }
      } else {
        setState(() => _isProcessingVton = true);
        imageBytes = await _createStudioTestImageBytes();
        _lastCapturedUserBytes = imageBytes;
      }
    } else {
      setState(() => _isProcessingVton = true);
    }

    try {
      final res = await _catalogoRepository.probarPrendaVton(
        imageBytes: imageBytes,
        filename: 'foto_usuario_${DateTime.now().millisecondsSinceEpoch}.jpg',
        prendaId: prenda.id,
      );

      if (mounted) {
        setState(() {
          _vtonResult = res;
          _selectedPrenda = prenda;
          _isProcessingVton = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isProcessingVton = false);
        AppNotification.showSuccess('Error en Virtual Try-On: $e');
      }
    }
  }

  Future<List<int>> _createStudioTestImageBytes() async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder, const Rect.fromLTWH(0, 0, 480, 640));
    final bgPaint = Paint()..color = const Color(0xFFE5E7EB);
    canvas.drawRect(const Rect.fromLTWH(0, 0, 480, 640), bgPaint);

    final bodyPaint = Paint()..color = const Color(0xFFD1D5DB);
    canvas.drawOval(const Rect.fromLTWH(190, 80, 100, 120), bodyPaint);
    final path = Path()
      ..moveTo(140, 240)
      ..lineTo(340, 240)
      ..lineTo(310, 520)
      ..lineTo(170, 520)
      ..close();
    canvas.drawPath(path, bodyPaint);

    final picture = recorder.endRecording();
    final img = await picture.toImage(480, 640);
    final byteData = await img.toByteData(format: ui.ImageByteFormat.png);
    return byteData!.buffer.asUint8List();
  }

  Widget _buildVtonResultImage(String url) {
    final cleanUrl = url.trim();
    if (cleanUrl.startsWith('data:') || cleanUrl.startsWith('/9j/') || cleanUrl.startsWith('iVBORw')) {
      try {
        final commaIdx = cleanUrl.indexOf(',');
        final base64String = commaIdx != -1 ? cleanUrl.substring(commaIdx + 1).trim() : cleanUrl;
        final bytes = base64Decode(base64String);
        return Image.memory(
          bytes,
          fit: BoxFit.contain,
          gaplessPlayback: true,
          errorBuilder: (context, error, stackTrace) => Center(
            child: Text(
              'Error al renderizar imagen generada: $error',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70, fontSize: 12),
            ),
          ),
        );
      } catch (e) {
        return Center(
          child: Text(
            'Error al procesar formato de imagen: $e',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),
        );
      }
    }

    return Image.network(
      cleanUrl,
      fit: BoxFit.contain,
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) return child;
        return const Center(
          child: CircularProgressIndicator(color: AppTheme.goldAccent),
        );
      },
      errorBuilder: (context, error, stackTrace) => const Center(
        child: Text(
          'Error al cargar imagen generada',
          style: TextStyle(color: Colors.white70),
        ),
      ),
    );
  }

  Widget _buildVtonResultView() {
    final res = _vtonResult!;
    return Stack(
      children: [
        // 1. Imagen Resultante en Alta Resolución
        Positioned.fill(
          child: Container(
            color: Colors.black,
            child: InteractiveViewer(
              minScale: 1.0,
              maxScale: 3.0,
              child: _buildVtonResultImage(res.resultUrl),
            ),
          ),
        ),

        // 2. Barra Superior: Métricas de Calce & Botón Nueva Foto
        Positioned(
          top: 12,
          left: 14,
          right: 14,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.85),
              border: Border.all(color: AppTheme.goldAccent),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.5),
                  blurRadius: 10,
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.auto_awesome, color: AppTheme.goldAccent, size: 16),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'LOOK ATELIER • AI V-TON',
                          style: TextStyle(
                            color: AppTheme.goldAccent,
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.2,
                          ),
                        ),
                        Text(
                          'CALCE ANATÓMICO: ${res.calceScore}%',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                TextButton.icon(
                  onPressed: () {
                    setState(() {
                      _vtonResult = null;
                      _lastCapturedUserBytes = null;
                    });
                  },
                  icon: const Icon(Icons.camera_alt, color: Colors.white, size: 14),
                  label: const Text(
                    'NUEVA FOTO',
                    style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                  ),
                  style: TextButton.styleFrom(
                    backgroundColor: Colors.white12,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  ),
                ),
              ],
            ),
          ),
        ),

        // 3. Suite Inferior: Carrusel de Prendas y Acciones de Compra
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: _buildVtonResultBottomSuite(),
        ),

        // 4. Overlay si está cambiando de prenda
        if (_isProcessingVton)
          Positioned.fill(
            child: _buildVtonProcessingOverlay(),
          ),
      ],
    );
  }

  Widget _buildVtonResultBottomSuite() {
    final p = _selectedPrenda!;
    return Container(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.95),
        border: const Border(top: BorderSide(color: Color(0xFF27272A), width: 1.2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.8),
            blurRadius: 18,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Título del Carrusel
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'PROBAR OTRA PRENDA EN ESTA FOTO',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.8),
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.0,
                    ),
                  ),
                  Text(
                    '${_allPrendas.length} DISPONIBLES',
                    style: const TextStyle(
                      color: AppTheme.goldAccent,
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Carrusel Horizontal de Prendas
              SizedBox(
                height: 64,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _allPrendas.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final item = _allPrendas[index];
                    final isSelected = item.id == p.id;
                    return InkWell(
                      onTap: () {
                        if (!isSelected && !_isProcessingVton) {
                          _capturarYProbarVton(item);
                        }
                      },
                      child: Container(
                        width: 170,
                        padding: const EdgeInsets.all(5),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1C1C1E),
                          border: Border.all(
                            color: isSelected ? AppTheme.goldAccent : Colors.white24,
                            width: isSelected ? 1.8 : 1.0,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 38,
                              height: 52,
                              color: Colors.black,
                              child: Image.network(
                                item.portadaUrl,
                                fit: BoxFit.contain,
                                errorBuilder: (_, __, ___) => const Icon(
                                  Icons.checkroom,
                                  color: AppTheme.goldAccent,
                                  size: 16,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    item.nombre,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Bs ${item.precioBase.toStringAsFixed(0)}',
                                    style: const TextStyle(
                                      color: AppTheme.goldAccent,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 12),

              // Botones de Acción: Añadir a Bolsa y Reservar
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white38),
                        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                        padding: const EdgeInsets.symmetric(vertical: 13),
                      ),
                      onPressed: () => context.go('/reservas'),
                      child: const Text(
                        'RESERVAR PROBADOR',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.6),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.goldAccent,
                        foregroundColor: Colors.black,
                        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                        padding: const EdgeInsets.symmetric(vertical: 13),
                      ),
                      onPressed: () {
                        CartService.instance.addItem(prenda: p);
                        AppNotification.showSuccess('"${p.nombre}" añadida a la bolsa');
                      },
                      child: const Text(
                        'AÑADIR A BOLSA',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.6),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVtonProcessingOverlay() {
    return Container(
      color: Colors.black.withValues(alpha: 0.88),
      child: Center(
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 24),
          padding: const EdgeInsets.all(28),
          decoration: BoxDecoration(
            color: const Color(0xFF141414),
            border: Border.all(color: AppTheme.goldAccent, width: 1.2),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(
                width: 44,
                height: 44,
                child: CircularProgressIndicator(
                  color: AppTheme.goldAccent,
                  strokeWidth: 2.5,
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'PROCESANDO VIRTUAL TRY-ON (IA)',
                style: TextStyle(
                  color: AppTheme.goldAccent,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'Aislando prenda textil de alta costura y amoldándola anatómicamente a tu silueta...',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.8),
                  fontSize: 11,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    _initPulseAnimation();

    if (_isLoading) {
      return const AtelierScaffold(
        currentRoute: '/catalogo/vestidor_ar',
        child: Center(child: CircularProgressIndicator(color: AppTheme.goldAccent)),
      );
    }

    if (_vtonResult != null) {
      return AtelierScaffold(
        currentRoute: '/catalogo/vestidor_ar',
        child: _buildVtonResultView(),
      );
    }

    return AtelierScaffold(
      currentRoute: '/catalogo/vestidor_ar',
      child: Stack(
        children: [
          // 1. Fondo: Feed Cámara en Vivo o Simulador de Estudio Maniquí
          Positioned.fill(
            child: _buildBackgroundFeed(),
          ),

          // 2. Guías de Pose y Alineación Anatómica (Anywear Pose Guide)
          if (_showGuidelines)
            Positioned.fill(
              child: _buildARGuidelines(),
            ),

          // 3. Prenda Amoldada al Cuerpo (Solo si activa el modo overlay en vivo)
          if (_showLiveOverlay && _selectedPrenda != null)
            Positioned.fill(
              child: _buildAnatomicalGarment(),
            ),

          // 4. Barra Superior de Estado Anywear V-TON & Switchers
          Positioned(
            top: 10,
            left: 12,
            right: 12,
            child: _buildTopVtonBar(),
          ),

          // 5. Sidebar de Calibración Anatómica Fina (solo si live overlay está activo)
          if (_showLiveOverlay)
            Positioned(
              right: 12,
              top: 75,
              child: _buildAnatomicalSidebar(),
            ),

          // 6. Indicador de Calce Inteligente
          Positioned(
            top: 75,
            left: 12,
            child: _buildHintBadge(),
          ),

          // 7. Suite Inferior Enfocada en Captura y V-TON
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _buildPrendaActionSuite(),
          ),

          // 8. Overlay de Procesamiento si está capturando
          if (_isProcessingVton)
            Positioned.fill(
              child: _buildVtonProcessingOverlay(),
            ),
        ],
      ),
    );
  }

  Widget _buildBackgroundFeed() {
    if (!_useStudioSimulator && _isCameraInitialized && _cameraController != null) {
      return SizedBox.expand(
        child: FittedBox(
          fit: BoxFit.cover,
          child: SizedBox(
            width: _cameraController!.value.previewSize?.height ?? 1,
            height: _cameraController!.value.previewSize?.width ?? 1,
            child: CameraPreview(_cameraController!),
          ),
        ),
      );
    }

    if (_isCameraLoading) {
      return Container(
        color: Colors.black,
        child: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(color: AppTheme.goldAccent),
              SizedBox(height: 12),
              Text(
                'CONECTANDO CÁMARA EN VIVO...',
                style: TextStyle(color: Colors.white70, fontSize: 10, letterSpacing: 1.2),
              ),
            ],
          ),
        ),
      );
    }

    // Modo Estudio Runway con Spotlight y Maniquí Editorial
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFF18181B),
            Color(0xFF0F0F12),
            Color(0xFF000000),
          ],
        ),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Positioned(
            top: 40,
            child: Container(
              width: 340,
              height: 340,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppTheme.goldAccent.withValues(alpha: 0.12),
                    Colors.white.withValues(alpha: 0.04),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.accessibility_new_rounded,
                size: 260,
                color: Colors.white.withValues(alpha: 0.15),
              ),
              const SizedBox(height: 90),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTopVtonBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.85),
        border: Border.all(color: Colors.white12),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Live Pulse Status
          Row(
            children: [
              if (_pulseAnimation != null)
                AnimatedBuilder(
                  animation: _pulseAnimation!,
                  builder: (context, child) {
                    return Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _useStudioSimulator
                            ? const Color(0xFFEAB308).withValues(alpha: _pulseAnimation!.value)
                            : const Color(0xFF22C55E).withValues(alpha: _pulseAnimation!.value),
                      ),
                    );
                  },
                )
              else
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _useStudioSimulator ? const Color(0xFFEAB308) : const Color(0xFF22C55E),
                  ),
                ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'ANYWEAR V-TON',
                    style: TextStyle(
                      color: AppTheme.goldAccent,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.2,
                    ),
                  ),
                  Text(
                    _useStudioSimulator ? 'STUDIO SIMULATOR' : 'LIVE CAMERA FEED',
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 8,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.6,
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Botones de control rápido
          Row(
            children: [
              // Toggle Cámara / Modo Estudio
              InkWell(
                onTap: _toggleCameraMode,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                  decoration: BoxDecoration(
                    color: _useStudioSimulator ? const Color(0xFF262626) : AppTheme.goldAccent,
                    border: Border.all(color: AppTheme.goldAccent),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _useStudioSimulator ? Icons.videocam : Icons.palette_outlined,
                        size: 13,
                        color: _useStudioSimulator ? AppTheme.goldAccent : Colors.black,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _useStudioSimulator ? 'CÁMARA' : 'ESTUDIO',
                        style: TextStyle(
                          color: _useStudioSimulator ? Colors.white : Colors.black,
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 6),

              // Switch Front/Back Camera
              if (!_useStudioSimulator && _availableCameras.length > 1) ...[
                IconButton(
                  icon: const Icon(Icons.flip_camera_ios, color: Colors.white, size: 16),
                  padding: const EdgeInsets.all(6),
                  constraints: const BoxConstraints(),
                  tooltip: 'Cambiar cámara',
                  onPressed: _switchCameraDirection,
                  style: IconButton.styleFrom(backgroundColor: Colors.white12),
                ),
                const SizedBox(width: 6),
              ],

              // Toggle Guías
              IconButton(
                icon: Icon(
                  _showGuidelines ? Icons.grid_on : Icons.grid_off,
                  color: _showGuidelines ? AppTheme.goldAccent : Colors.white60,
                  size: 16,
                ),
                padding: const EdgeInsets.all(6),
                constraints: const BoxConstraints(),
                tooltip: 'Guías de calce',
                onPressed: () => setState(() => _showGuidelines = !_showGuidelines),
                style: IconButton.styleFrom(backgroundColor: Colors.white12),
              ),
              const SizedBox(width: 6),

              // Toggle Overlay 2D en vivo
              IconButton(
                icon: Icon(
                  _showLiveOverlay ? Icons.layers : Icons.layers_clear,
                  color: _showLiveOverlay ? AppTheme.goldAccent : Colors.white60,
                  size: 16,
                ),
                padding: const EdgeInsets.all(6),
                constraints: const BoxConstraints(),
                tooltip: _showLiveOverlay ? 'Ocultar silueta 2D' : 'Ver silueta 2D',
                onPressed: () => setState(() => _showLiveOverlay = !_showLiveOverlay),
                style: IconButton.styleFrom(backgroundColor: Colors.white12),
              ),
              const SizedBox(width: 6),

              // Reset Prenda
              IconButton(
                icon: const Icon(Icons.restart_alt, color: Colors.white, size: 16),
                padding: const EdgeInsets.all(6),
                constraints: const BoxConstraints(),
                tooltip: 'Recentrar calce',
                onPressed: _resetPosition,
                style: IconButton.styleFrom(backgroundColor: Colors.white12),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHintBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.85),
        border: Border.all(color: AppTheme.goldAccent.withValues(alpha: 0.7)),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.camera_alt, color: AppTheme.goldAccent, size: 14),
          SizedBox(width: 8),
          Text(
            'Enfocá tus hombros en las guías y tocá "TOMAR FOTO"',
            style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }

  Widget _buildAnatomicalSidebar() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.85),
        border: Border.all(color: Colors.white24),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Ancho de Hombros (Scale X)
          const Text('HOMBRO', style: TextStyle(color: AppTheme.goldAccent, fontSize: 7, fontWeight: FontWeight.w900)),
          InkWell(
            onTap: () {
              setState(() {
                if (_garmentScaleX < 1.8) _garmentScaleX += 0.06;
              });
            },
            child: const Padding(
              padding: EdgeInsets.all(3.0),
              child: Icon(Icons.add, color: Colors.white, size: 15),
            ),
          ),
          Text(
            '${(_garmentScaleX * 100).toInt()}%',
            style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w800),
          ),
          InkWell(
            onTap: () {
              setState(() {
                if (_garmentScaleX > 0.6) _garmentScaleX -= 0.06;
              });
            },
            child: const Padding(
              padding: EdgeInsets.all(3.0),
              child: Icon(Icons.remove, color: Colors.white, size: 15),
            ),
          ),
          const Divider(color: Colors.white24, height: 10),

          // Largo de Torso (Scale Y)
          const Text('TORSO', style: TextStyle(color: AppTheme.goldAccent, fontSize: 7, fontWeight: FontWeight.w900)),
          InkWell(
            onTap: () {
              setState(() {
                if (_garmentScaleY < 1.8) _garmentScaleY += 0.06;
              });
            },
            child: const Padding(
              padding: EdgeInsets.all(3.0),
              child: Icon(Icons.add, color: Colors.white, size: 15),
            ),
          ),
          Text(
            '${(_garmentScaleY * 100).toInt()}%',
            style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w800),
          ),
          InkWell(
            onTap: () {
              setState(() {
                if (_garmentScaleY > 0.6) _garmentScaleY -= 0.06;
              });
            },
            child: const Padding(
              padding: EdgeInsets.all(3.0),
              child: Icon(Icons.remove, color: Colors.white, size: 15),
            ),
          ),
          const Divider(color: Colors.white24, height: 10),

          // Fusión de tela con cámara
          InkWell(
            onTap: () {
              setState(() {
                _blendMode = _blendMode == BlendMode.srcOver ? BlendMode.multiply : BlendMode.srcOver;
                _garmentOpacity = _blendMode == BlendMode.multiply ? 0.88 : 0.96;
              });
            },
            child: Column(
              children: [
                Icon(
                  _blendMode == BlendMode.multiply ? Icons.auto_fix_high : Icons.auto_fix_normal,
                  color: _blendMode == BlendMode.multiply ? AppTheme.goldAccent : Colors.white70,
                  size: 15,
                ),
                const SizedBox(height: 2),
                Text(
                  _blendMode == BlendMode.multiply ? 'FUSIÓN' : 'NATURAL',
                  style: TextStyle(
                    color: _blendMode == BlendMode.multiply ? AppTheme.goldAccent : Colors.white60,
                    fontSize: 7,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnatomicalGarment() {
    // Use the AI-stripped transparent PNG if ready; otherwise fall back to original portada
    final imageUrl = _nobgUrl ?? _selectedPrenda!.portadaUrl;
    final isUsingNobg = _nobgUrl != null;

    return Center(
      child: Transform.translate(
        offset: _garmentPosition,
        child: Transform.rotate(
          angle: _garmentRotation,
          child: Transform.scale(
            scaleX: _garmentScaleX,
            scaleY: _garmentScaleY,
            child: Opacity(
              opacity: _garmentOpacity,
              child: GestureDetector(
                onScaleStart: (details) {
                  _baseScaleX = _garmentScaleX;
                  _baseScaleY = _garmentScaleY;
                  _baseRotation = _garmentRotation;
                },
                onScaleUpdate: (details) {
                  setState(() {
                    _garmentPosition += details.focalPointDelta;
                    _garmentScaleX = (_baseScaleX * details.scale).clamp(0.5, 2.5);
                    _garmentScaleY = (_baseScaleY * details.scale).clamp(0.5, 2.5);
                    if (details.rotation != 0.0) {
                      _garmentRotation = _baseRotation + details.rotation;
                    }
                  });
                },
                onDoubleTap: _resetPosition,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Garment image — transparent PNG when nobg is ready, otherwise portada
                    SizedBox(
                      width: 300,
                      height: 420,
                      child: _isProcessingBg && _nobgUrl == null
                          // Loading state: show spinner over faded portada
                          ? Stack(
                              alignment: Alignment.center,
                              children: [
                                Image.network(
                                  _selectedPrenda!.portadaUrl,
                                  fit: BoxFit.contain,
                                  color: Colors.white24,
                                  colorBlendMode: BlendMode.modulate,
                                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                                ),
                                Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const CircularProgressIndicator(
                                      color: AppTheme.goldAccent,
                                      strokeWidth: 2,
                                    ),
                                    const SizedBox(height: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      color: Colors.black54,
                                      child: const Text(
                                        'ANALIZANDO PRENDA...',
                                        style: TextStyle(
                                          color: AppTheme.goldAccent,
                                          fontSize: 9,
                                          fontWeight: FontWeight.w800,
                                          letterSpacing: 1.0,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            )
                          // Ready: transparent PNG overlays camera perfectly
                          : Image.network(
                              imageUrl,
                              fit: BoxFit.contain,
                              alignment: Alignment.topCenter,
                              errorBuilder: (_, __, ___) => const Icon(
                                Icons.checkroom,
                                size: 100,
                                color: AppTheme.goldAccent,
                              ),
                            ),
                    ),

                    // Badge: shows if AI layer is active
                    if (isUsingNobg)
                      Positioned(
                        bottom: 0,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                          color: Colors.black.withValues(alpha: 0.75),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.auto_awesome, color: AppTheme.goldAccent, size: 9),
                              SizedBox(width: 4),
                              Text(
                                'AI V-TON ACTIVO',
                                style: TextStyle(
                                  color: AppTheme.goldAccent,
                                  fontSize: 8,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.8,
                                ),
                              ),
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

  Widget _buildARGuidelines() {
    return IgnorePointer(
      child: CustomPaint(
        painter: _ARGuidelinesPainter(),
      ),
    );
  }

  Widget _buildPrendaActionSuite() {
    if (_selectedPrenda == null) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.94),
          border: const Border(top: BorderSide(color: Color(0xFF27272A))),
        ),
        child: SafeArea(
          top: false,
          child: Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.goldAccent,
                    foregroundColor: Colors.black,
                    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  icon: const Icon(Icons.arrow_back, size: 16),
                  label: const Text(
                    'SELECCIONAR PRENDA EN CATÁLOGO',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 11),
                  ),
                  onPressed: () => context.go('/catalogo'),
                ),
              ),
            ],
          ),
        ),
      );
    }

    final p = _selectedPrenda!;

    return Container(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.95),
        border: const Border(top: BorderSide(color: Color(0xFF27272A), width: 1.2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.8),
            blurRadius: 18,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Fila 1: Resumen de la Prenda Seleccionada (Miniatura, Nombre, Categoría y Precio)
              Row(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1C1C1E),
                      border: Border.all(color: AppTheme.goldAccent.withValues(alpha: 0.7)),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(3.0),
                      child: Image.network(
                        p.portadaUrl,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => const Icon(
                          Icons.checkroom,
                          color: AppTheme.goldAccent,
                          size: 20,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          p.categoria?.nombre.toUpperCase() ?? 'ALTA COSTURA',
                          style: const TextStyle(
                            color: AppTheme.goldAccent,
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          p.nombre,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Text(
                    'Bs ${p.precioBase.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Fila 2: Acciones Directas con Botón Principal TOMAR FOTO & PROBAR CON IA
              Row(
                children: [
                  // Botón Ficha Técnica
                  IconButton(
                    icon: const Icon(Icons.info_outline, color: Colors.white70),
                    tooltip: 'Ficha técnica',
                    padding: const EdgeInsets.all(8),
                    constraints: const BoxConstraints(),
                    onPressed: () => PrendaDetailModal.show(context, p),
                  ),
                  const SizedBox(width: 8),

                  // Botón Principal: TOMAR FOTO & PROBAR CON IA
                  Expanded(
                    flex: 3,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.goldAccent,
                        foregroundColor: Colors.black,
                        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      icon: const Icon(Icons.camera_alt, color: Colors.black, size: 18),
                      label: const Text(
                        'TOMAR FOTO & PROBAR CON IA',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.8,
                        ),
                      ),
                      onPressed: _isProcessingVton ? null : () => _capturarYProbarVton(),
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Botón Añadir a la Bolsa
                  IconButton(
                    icon: const Icon(Icons.shopping_bag_outlined, color: AppTheme.goldAccent),
                    tooltip: 'Añadir a la bolsa',
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0xFF1C1C1E),
                      side: const BorderSide(color: Colors.white24),
                      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                      padding: const EdgeInsets.all(12),
                    ),
                    onPressed: () {
                      CartService.instance.addItem(prenda: p);
                      AppNotification.showSuccess('"${p.nombre}" agregada a la bolsa');
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}


class _ARGuidelinesPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final goldPaint = Paint()
      ..color = const Color(0xFFD4AF37).withValues(alpha: 0.35)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    final double cx = size.width / 2;
    final double cy = size.height * 0.38;

    // Eje vertical simétrico
    canvas.drawLine(Offset(cx, cy - 120), Offset(cx, cy + 180), goldPaint);

    // Óvalo de la cabeza
    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, cy - 90), width: 50, height: 65),
      goldPaint,
    );

    // Línea y marcas de hombros
    canvas.drawLine(Offset(cx - 95, cy - 45), Offset(cx + 95, cy - 45), goldPaint);
    canvas.drawCircle(Offset(cx - 95, cy - 45), 3, goldPaint);
    canvas.drawCircle(Offset(cx + 95, cy - 45), 3, goldPaint);

    // Línea de pecho / torso
    canvas.drawLine(Offset(cx - 75, cy + 20), Offset(cx + 75, cy + 20), goldPaint);

    // Línea de cintura
    canvas.drawLine(Offset(cx - 65, cy + 85), Offset(cx + 65, cy + 85), goldPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
