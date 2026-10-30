import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/routes/app_router.dart';
import '../../../../core/utils/app_notification.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/storage/local_storage_helper.dart';
import '../../../../shared/services/cart_service.dart';
import '../../../reservas/domain/models/reservas_models.dart';
import '../../domain/models/catalogo_models.dart';

class PrendaDetailModal extends StatefulWidget {
  final PrendaModel prenda;

  const PrendaDetailModal({super.key, required this.prenda});

  static Future<void> show(BuildContext context, PrendaModel prenda) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PrendaDetailModal(prenda: prenda),
    );
  }

  @override
  State<PrendaDetailModal> createState() => _PrendaDetailModalState();
}

class _PrendaDetailModalState extends State<PrendaDetailModal> {
  TallaModel? _selectedTalla;
  ColorModel? _selectedColor;
  late final PageController _imagePageController;
  int _currentImageIndex = 0;
  bool _isLoadingStock = false;
  List<dynamic>? _stockSucursales;
  String? _stockError;

  PrendaVarianteModel _getCurrentVariante() {
    return widget.prenda.variantes.firstWhere(
      (v) =>
          (_selectedTalla == null || v.tallaId == _selectedTalla!.id) &&
          (_selectedColor == null || v.colorId == _selectedColor!.id),
      orElse: () => widget.prenda.variantes.isNotEmpty
          ? widget.prenda.variantes.first
          : PrendaVarianteModel(
              id: widget.prenda.id,
              prendaId: widget.prenda.id,
              tallaId: _selectedTalla?.id ?? 0,
              colorId: _selectedColor?.id ?? 0,
              skuVariante: widget.prenda.sku,
              activo: true,
            ),
    );
  }

  Future<void> _fetchStockSucursales() async {
    setState(() {
      _isLoadingStock = true;
      _stockError = null;
    });
    try {
      final v = _getCurrentVariante();
      final res = await ApiClient().dio.get(
        '/inventario/sucursales-stock',
        queryParameters: {'variante_id': v.id},
      );
      if (mounted) {
        setState(() {
          _stockSucursales = res.data is List ? (res.data as List) : [];
          _isLoadingStock = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _stockError = 'No se pudo consultar stock en red. Verifique conexión.';
          _isLoadingStock = false;
        });
      }
    }
  }

  @override
  void initState() {
    super.initState();
    _imagePageController = PageController();
    if (widget.prenda.variantes.isNotEmpty) {
      _selectedTalla = widget.prenda.variantes.first.talla;
      _selectedColor = widget.prenda.variantes.first.color;
    }
  }

  @override
  void dispose() {
    _imagePageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final prenda = widget.prenda;
    final images = prenda.imagenesUrls;
    final totalImages = images.length;
    final availableTallas = prenda.variantes
        .map((v) => v.talla)
        .where((t) => t != null)
        .cast<TallaModel>()
        .fold<Map<int, TallaModel>>({}, (map, t) => map..putIfAbsent(t.id, () => t))
        .values
        .toList();

    final availableColores = prenda.variantes
        .map((v) => v.color)
        .where((c) => c != null)
        .cast<ColorModel>()
        .fold<Map<int, ColorModel>>({}, (map, c) => map..putIfAbsent(c.id, () => c))
        .values
        .toList();

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(16),
          topRight: Radius.circular(16),
        ),
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFD1D5DB),
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Galería de Imágenes Interactiva (Estilo Web Atelier)
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                    ),
                    child: Stack(
                      children: [
                        AspectRatio(
                          aspectRatio: 1.0,
                          child: PageView.builder(
                            controller: _imagePageController,
                            itemCount: totalImages,
                            onPageChanged: (idx) {
                              setState(() => _currentImageIndex = idx);
                            },
                            itemBuilder: (context, idx) {
                              return InteractiveViewer(
                                minScale: 1.0,
                                maxScale: 2.5,
                                child: Image.network(
                                  images[idx],
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(
                                    color: const Color(0xFFF3F4F6),
                                    child: const Center(
                                      child: Icon(Icons.checkroom, size: 64, color: AppTheme.mutedColor),
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),

                        // Flecha anterior (si hay más de 1 imagen)
                        if (totalImages > 1)
                          Positioned(
                            left: 8,
                            top: 0,
                            bottom: 0,
                            child: Center(
                              child: InkWell(
                                onTap: () {
                                  final prevIdx = (_currentImageIndex - 1 + totalImages) % totalImages;
                                  _imagePageController.animateToPage(
                                    prevIdx,
                                    duration: const Duration(milliseconds: 250),
                                    curve: Curves.easeInOut,
                                  );
                                },
                                child: Container(
                                  width: 34,
                                  height: 34,
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: 0.65),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.chevron_left, color: Colors.white, size: 22),
                                ),
                              ),
                            ),
                          ),

                        // Flecha siguiente (si hay más de 1 imagen)
                        if (totalImages > 1)
                          Positioned(
                            right: 8,
                            top: 0,
                            bottom: 0,
                            child: Center(
                              child: InkWell(
                                onTap: () {
                                  final nextIdx = (_currentImageIndex + 1) % totalImages;
                                  _imagePageController.animateToPage(
                                    nextIdx,
                                    duration: const Duration(milliseconds: 250),
                                    curve: Curves.easeInOut,
                                  );
                                },
                                child: Container(
                                  width: 34,
                                  height: 34,
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: 0.65),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.chevron_right, color: Colors.white, size: 22),
                                ),
                              ),
                            ),
                          ),

                        // Badge AR 3D
                        if (prenda.tieneModelo3D)
                          Positioned(
                            top: 12,
                            left: 12,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              color: Colors.black,
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.view_in_ar, size: 14, color: Colors.white),
                                  SizedBox(width: 4),
                                  Text(
                                    '3D / AR LISTO',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 1.0,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),

                        // Píldora Contadora de Fotos (igual a .gallery-counter-pill de la web)
                        if (totalImages > 1)
                          Positioned(
                            bottom: 12,
                            right: 12,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0F172A).withValues(alpha: 0.8),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.photo_library_outlined, size: 12, color: Colors.white),
                                  const SizedBox(width: 5),
                                  Text(
                                    '${_currentImageIndex + 1} / $totalImages',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),

                  // Tira de Miniaturas Clickeables (igual a .gallery-thumbs-row de la web)
                  if (totalImages > 1) ...[
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 60,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: totalImages,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (context, idx) {
                          final isSelected = idx == _currentImageIndex;
                          return InkWell(
                            onTap: () {
                              _imagePageController.animateToPage(
                                idx,
                                duration: const Duration(milliseconds: 250),
                                curve: Curves.easeInOut,
                              );
                            },
                            child: Container(
                              width: 60,
                              height: 60,
                              decoration: BoxDecoration(
                                border: Border.all(
                                  color: isSelected ? Colors.black : const Color(0xFFE2E8F0),
                                  width: isSelected ? 2.5 : 1.0,
                                ),
                                color: const Color(0xFFF8FAFC),
                              ),
                              child: Image.network(
                                images[idx],
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(Icons.broken_image, size: 20, color: AppTheme.mutedColor),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                  const SizedBox(height: 18),

                  // Header Tags
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        prenda.categoria?.nombre.toUpperCase() ?? 'ALTA COSTURA',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.5,
                          color: AppTheme.mutedColor,
                        ),
                      ),
                      Text(
                        'SKU: ${prenda.sku}',
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppTheme.subtleColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Title & Price
                  Text(
                    prenda.nombre,
                    style: Theme.of(context).textTheme.displayMedium?.copyWith(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    prenda.precioFormatted,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: Colors.black,
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Description
                  Text(
                    prenda.descripcion,
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF4B5563),
                      height: 1.5,
                    ),
                  ),
                  const Divider(height: 32, color: Color(0xFFE5E7EB)),

                  // Talla Selector
                  if (availableTallas.isNotEmpty) ...[
                    const Text(
                      'SELECCIONAR TALLA',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.0,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: availableTallas.map((t) {
                        final isSelected = _selectedTalla?.id == t.id;
                        return InkWell(
                          onTap: () => setState(() => _selectedTalla = t),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: isSelected ? Colors.black : Colors.white,
                              border: Border.all(
                                color: isSelected ? Colors.black : const Color(0xFFD1D5DB),
                              ),
                            ),
                            child: Text(
                              t.codigo,
                              style: TextStyle(
                                color: isSelected ? Colors.white : Colors.black,
                                fontWeight: FontWeight.w700,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 18),
                  ],

                  // Color Selector
                  if (availableColores.isNotEmpty) ...[
                    const Text(
                      'SELECCIONAR COLOR',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.0,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: availableColores.map((c) {
                        final isSelected = _selectedColor?.id == c.id;
                        return InkWell(
                          onTap: () => setState(() => _selectedColor = c),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFFF3F4F6) : Colors.white,
                              border: Border.all(
                                color: isSelected ? Colors.black : const Color(0xFFD1D5DB),
                                width: isSelected ? 1.5 : 1.0,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (c.codigoHex != null && c.codigoHex!.isNotEmpty)
                                  Container(
                                    width: 12,
                                    height: 12,
                                    margin: const EdgeInsets.only(right: 6),
                                    decoration: BoxDecoration(
                                      color: _parseColor(c.codigoHex!),
                                      shape: BoxShape.circle,
                                      border: Border.all(color: Colors.black26),
                                    ),
                                  ),
                                Text(
                                  c.nombre,
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // CU06 / CU07: Guía Anatómica de Medidas en cm
                  Container(
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      borderRadius: BorderRadius.circular(8),
                      color: const Color(0xFFF8FAFC),
                    ),
                    child: Theme(
                      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                      child: ExpansionTile(
                        leading: const Icon(Icons.straighten, size: 18, color: Colors.black87),
                        title: const Text(
                          'GUÍA ANATÓMICA DE MEDIDAS (CM)',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.8,
                          ),
                        ),
                        subtitle: const Text(
                          'Consulta las medidas en centímetros por talla (CU06)',
                          style: TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                        ),
                        children: [
                          Padding(
                            padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                            child: Column(
                              children: [
                                Table(
                                  border: TableBorder.all(color: const Color(0xFFE2E8F0)),
                                  children: [
                                    const TableRow(
                                      decoration: BoxDecoration(color: Color(0xFF0F172A)),
                                      children: [
                                        Padding(
                                          padding: EdgeInsets.all(6),
                                          child: Text('TALLA', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                                        ),
                                        Padding(
                                          padding: EdgeInsets.all(6),
                                          child: Text('PECHO', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                                        ),
                                        Padding(
                                          padding: EdgeInsets.all(6),
                                          child: Text('CINTURA', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                                        ),
                                        Padding(
                                          padding: EdgeInsets.all(6),
                                          child: Text('CADERA', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                                        ),
                                        Padding(
                                          padding: EdgeInsets.all(6),
                                          child: Text('LARGO', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                                        ),
                                      ],
                                    ),
                                    ...['XS', 'S', 'M', 'L', 'XL'].map((tallaCode) {
                                      final isCur = _selectedTalla?.codigo == tallaCode;
                                      final pcm = tallaCode == 'XS' ? 82 : (tallaCode == 'S' ? 88 : (tallaCode == 'M' ? 94 : (tallaCode == 'L' ? 102 : 110)));
                                      final ccm = pcm - 18;
                                      final cadcm = pcm + 6;
                                      final lcm = tallaCode == 'XS' ? 68 : (tallaCode == 'S' ? 70 : (tallaCode == 'M' ? 72 : 74));
                                      return TableRow(
                                        decoration: BoxDecoration(color: isCur ? const Color(0xFFFEF3C7) : Colors.white),
                                        children: [
                                          Padding(
                                            padding: const EdgeInsets.all(6),
                                            child: Text(tallaCode, style: TextStyle(fontSize: 10, fontWeight: isCur ? FontWeight.w900 : FontWeight.normal), textAlign: TextAlign.center),
                                          ),
                                          Padding(
                                            padding: const EdgeInsets.all(6),
                                            child: Text('$pcm cm', style: const TextStyle(fontSize: 10), textAlign: TextAlign.center),
                                          ),
                                          Padding(
                                            padding: const EdgeInsets.all(6),
                                            child: Text('$ccm cm', style: const TextStyle(fontSize: 10), textAlign: TextAlign.center),
                                          ),
                                          Padding(
                                            padding: const EdgeInsets.all(6),
                                            child: Text('$cadcm cm', style: const TextStyle(fontSize: 10), textAlign: TextAlign.center),
                                          ),
                                          Padding(
                                            padding: const EdgeInsets.all(6),
                                            child: Text('$lcm cm', style: const TextStyle(fontSize: 10), textAlign: TextAlign.center),
                                          ),
                                        ],
                                      );
                                    }),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFF1F2),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: const Color(0xFFFECDD3)),
                                  ),
                                  child: const Text(
                                    'Garantía de Calce (RN07): 7 días para cambio de talla sin recargo. Estrictamente sin reembolso de dinero.',
                                    style: TextStyle(fontSize: 9, color: Color(0xFF9F1239)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Action Buttons
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      appRouter.go('/catalogo/vestidor_ar', extra: prenda);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: Colors.black,
                      side: const BorderSide(color: Colors.black, width: 1.5),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                    ),
                    icon: const Icon(Icons.view_in_ar, size: 20),
                    label: const Text(
                      'PROBAR EN VESTIDOR VIRTUAL (AR)',
                      style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.0),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // CU11: Botón Consulta de Stock Multi-sucursal en Tiempo Real
                  ElevatedButton.icon(
                    onPressed: _isLoadingStock ? null : _fetchStockSucursales,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E293B),
                      foregroundColor: const Color(0xFFFDE68A),
                      side: const BorderSide(color: Color(0xFFF59E0B)),
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                    ),
                    icon: _isLoadingStock
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFFDE68A)),
                          )
                        : const Icon(Icons.storefront_outlined, size: 18),
                    label: Text(
                      _isLoadingStock ? 'CONSULTANDO EXISTENCIAS...' : 'VER STOCK OTRAS SUCURSALES (CU11)',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 0.8),
                    ),
                  ),
                  if (_stockSucursales != null) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        border: Border.all(color: const Color(0xFFCBD5E1)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'EXISTENCIAS MULTI-SUCURSAL EN TIEMPO REAL:',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                          ),
                          const SizedBox(height: 6),
                          ..._stockSucursales!.map((item) {
                            final sucursal = item['sucursal_nombre'] ?? 'Sucursal';
                            final ciudad = item['ciudad_nombre'] ?? '';
                            final stock = item['stock_actual'] ?? 0;
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 2.0),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('• $sucursal ($ciudad)', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                                  Text(
                                    '$stock uds',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: stock > 0 ? const Color(0xFF166534) : const Color(0xFF991B1B),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
                  ],
                  if (_stockError != null) ...[
                    const SizedBox(height: 6),
                    Text(_stockError!, style: const TextStyle(fontSize: 10, color: Color(0xFFDC2626))),
                  ],
                  const SizedBox(height: 10),

                  // CU14: Reserva en Probador Físico sin Pago Previo con Guardado en SQLite
                  ElevatedButton.icon(
                    onPressed: () async {
                      final horaActual = '${DateTime.now().hour.toString().padLeft(2, '0')}:${DateTime.now().minute.toString().padLeft(2, '0')}';
                      
                      // Guardar en SQLite local sin pago monetario previo (CU14)
                      final resUuid = await LocalStorageHelper.instance.recordOfflineFittingReservation(
                        prendaId: prenda.id,
                        horaEnsayo: horaActual,
                      );
                      
                      final ticket = 'VEST-${resUuid.substring(0, 8).toUpperCase()}';
                      ReservasDraftService.instance.addPrenda(prenda);
                      if (context.mounted) {
                        Navigator.pop(context);
                        AppNotification.showSuccess(
                          'Prenda apartada para probador físico en SQLite (UUID: $ticket). 0 pago previo (CU14)',
                        );
                        appRouter.go('/reservas');
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF3F4F6),
                      foregroundColor: Colors.black,
                      side: const BorderSide(color: Color(0xFFD1D5DB), width: 1.0),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                    ),
                    icon: const Icon(Icons.event_seat_outlined, size: 20),
                    label: const Text(
                      'RESERVAR EN PROBADOR FÍSICO (CU14)',
                      style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.0),
                    ),
                  ),
                  const SizedBox(height: 10),

                  ElevatedButton.icon(
                    onPressed: () {
                      final variante = prenda.variantes.firstWhere(
                        (v) =>
                            (_selectedTalla == null || v.tallaId == _selectedTalla!.id) &&
                            (_selectedColor == null || v.colorId == _selectedColor!.id),
                        orElse: () => prenda.variantes.isNotEmpty
                            ? prenda.variantes.first
                            : PrendaVarianteModel(
                                id: prenda.id,
                                prendaId: prenda.id,
                                tallaId: _selectedTalla?.id ?? 0,
                                colorId: _selectedColor?.id ?? 0,
                                skuVariante: prenda.sku,
                                activo: true,
                              ),
                      );

                      CartService.instance.addItem(
                        prenda: prenda,
                        talla: _selectedTalla,
                        color: _selectedColor,
                        varianteId: variante.id,
                        cantidad: 1,
                      );

                      Navigator.pop(context);
                      AppNotification.showSuccess(
                        '"${prenda.nombre}" agregada a la Bolsa',
                        actionLabel: 'VER BOLSA',
                        onAction: () => appRouter.go('/ventas'),
                        duration: const Duration(seconds: 3),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                    ),
                    icon: const Icon(Icons.shopping_bag_outlined, size: 20),
                    label: const Text(
                      'AGREGAR A LA BOLSA',
                      style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.0),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _parseColor(String hex) {
    try {
      final clean = hex.replaceAll('#', '');
      return Color(int.parse('FF$clean', radix: 16));
    } catch (_) {
      return Colors.grey;
    }
  }
}
