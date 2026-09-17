import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/routes/app_router.dart';
import '../../../../core/utils/app_notification.dart';
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

  @override
  void initState() {
    super.initState();
    if (widget.prenda.variantes.isNotEmpty) {
      _selectedTalla = widget.prenda.variantes.first.talla;
      _selectedColor = widget.prenda.variantes.first.color;
    }
  }

  @override
  Widget build(BuildContext context) {
    final prenda = widget.prenda;
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
                  // Prenda Image with AR Badge
                  Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.zero,
                        child: AspectRatio(
                          aspectRatio: 1.0,
                          child: Image.network(
                            prenda.portadaUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              color: const Color(0xFFF3F4F6),
                              child: const Icon(Icons.checkroom, size: 64, color: AppTheme.mutedColor),
                            ),
                          ),
                        ),
                      ),
                      if (prenda.tieneModelo3D)
                        Positioned(
                          top: 12,
                          left: 12,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            color: Colors.black,
                            child: const Row(
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
                    ],
                  ),
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

                  // Action Buttons
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(context);
                      appRouter.go('/catalogo/vestidor_ar');
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

                  ElevatedButton.icon(
                    onPressed: () {
                      final added = ReservasDraftService.instance.addPrenda(prenda);
                      Navigator.pop(context);
                      if (added) {
                        AppNotification.showSuccess(
                          '"${prenda.nombre}" agregada a tu cita de probador (${ReservasDraftService.instance.selectedPrendas.length}/3)',
                        );
                      } else {
                        AppNotification.showSuccess(
                          'Ya tenés el límite de 3 prendas para tu cita de probador',
                        );
                      }
                      appRouter.go('/reservas');
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
                      'RESERVAR EN PROBADOR FÍSICO',
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
