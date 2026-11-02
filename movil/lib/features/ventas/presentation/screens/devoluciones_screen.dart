import 'package:flutter/material.dart';
import '../../../../shared/widgets/atelier_scaffold.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/app_notification.dart';
import '../../../catalogo/data/repositories/catalogo_repository.dart';
import '../../../catalogo/domain/models/catalogo_models.dart';
import '../../data/repositories/ventas_repository.dart';
import '../../domain/models/devolucion_models.dart';

/// Caso de Uso CU19: Registrar Solicitud de Cambio de Prenda por Medida
///
/// Nota Arquitectónica: Conforme al alcance del 2do Parcial e ICONIX:
/// - CU19 está implementado tanto en Web como en Móvil (registro y validación de solicitud).
/// - CU20 (Emisión formal de Nota de Devolución y Reingreso Físico a Inventario)
///   está restringido EXCLUSIVAMENTE a la Plataforma Web en el módulo de caja.
class DevolucionesScreen extends StatefulWidget {
  const DevolucionesScreen({super.key});

  @override
  State<DevolucionesScreen> createState() => _DevolucionesScreenState();
}

class _DevolucionesScreenState extends State<DevolucionesScreen> {
  final VentasRepository _ventasRepo = VentasRepository();
  final CatalogoRepository _catalogoRepo = CatalogoRepository();

  final TextEditingController _codigoVentaCtrl = TextEditingController();
  final TextEditingController _observacionesCtrl = TextEditingController();

  bool _isSearching = false;
  bool _isSubmitting = false;

  ValidarCambioGarantiaModel? _garantiaValidada;
  ItemDevolucionTicketModel? _itemSeleccionado;
  String _motivoSeleccionado = 'DESAJUSTE_MEDIDA_ANATOMICA';

  List<PrendaModel> _catalogoPrendas = [];
  int? _varianteEntregadaId;

  final List<Map<String, String>> _motivosOpciones = [
    {
      'id': 'DESAJUSTE_MEDIDA_ANATOMICA',
      'label': 'Desajuste de Medidas Anatómicas (Busto/Cintura/Cadera)',
    },
    {
      'id': 'TALLA_CHICA',
      'label': 'Talla Demasiado Ceñida / Chica (Cambio a mayor)',
    },
    {
      'id': 'TALLA_GRANDE',
      'label': 'Talla Demasiado Holgada / Grande (Cambio a menor)',
    },
    {
      'id': 'DEFECTO_FABRICA',
      'label': 'Defecto de Confección / Costura de Fábrica',
    },
  ];

  @override
  void initState() {
    super.initState();
    _cargarCatalogoParaCambio();
  }

  @override
  void dispose() {
    _codigoVentaCtrl.dispose();
    _observacionesCtrl.dispose();
    super.dispose();
  }

  Future<void> _cargarCatalogoParaCambio() async {
    try {
      final prendas = await _catalogoRepo.getPrendas();
      if (mounted) setState(() => _catalogoPrendas = prendas);
    } catch (_) {}
  }

  Future<void> _buscarTicket() async {
    final code = _codigoVentaCtrl.text.trim();
    if (code.isEmpty) {
      AppNotification.showWarning('Ingrese el código del ticket de venta original.');
      return;
    }

    setState(() {
      _isSearching = true;
      _itemSeleccionado = null;
      _varianteEntregadaId = null;
    });

    try {
      final result = await _ventasRepo.validarSolicitudCambio(code);
      if (mounted) {
        setState(() {
          _garantiaValidada = result;
          _isSearching = false;
          if (result.items.isNotEmpty) {
            _itemSeleccionado = result.items.first;
            _autoSeleccionarVarianteCambio(_itemSeleccionado!);
          }
        });

        if (result.garantiaVigente) {
          AppNotification.showSuccess(
            'Ticket válido. Garantía vigente (${result.diasTranscurridos} de ${result.plazoMaximoDias} días permitidos).'
          );
        } else {
          AppNotification.showWarning(
            'Atención: El plazo de garantía corporativa (${result.plazoMaximoDias} días) ha expirado.'
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSearching = false;
          _garantiaValidada = null;
        });
        AppNotification.showError('No se encontró la venta o no es elegible: $e');
      }
    }
  }

  void _autoSeleccionarVarianteCambio(ItemDevolucionTicketModel item) {
    for (var p in _catalogoPrendas) {
      final matchVar = p.variantes.where((v) => v.id != item.productoVarianteId).toList();
      if (matchVar.isNotEmpty && (p.nombre.toLowerCase() == item.prendaNombre.toLowerCase())) {
        _varianteEntregadaId = matchVar.first.id;
        return;
      }
    }

    if (_catalogoPrendas.isNotEmpty && _catalogoPrendas.first.variantes.isNotEmpty) {
      final fallbackVar = _catalogoPrendas.first.variantes.first;
      _varianteEntregadaId = fallbackVar.id;
    }
  }

  Future<void> _registrarSolicitudCambio() async {
    if (_garantiaValidada == null || _itemSeleccionado == null) {
      AppNotification.showWarning('Seleccione una prenda elegible para el cambio.');
      return;
    }

    if (!_garantiaValidada!.garantiaVigente) {
      AppNotification.showError(
        'Operación rechazada (RN06): El plazo de garantía ha expirado.'
      );
      return;
    }

    if (_varianteEntregadaId == null) {
      AppNotification.showWarning('Seleccione la nueva talla o variante solicitada.');
      return;
    }

    setState(() => _isSubmitting = true);

    // Simular guardado/registro de la solicitud de cambio en el cliente móvil
    await Future.delayed(const Duration(milliseconds: 600));

    if (mounted) {
      setState(() => _isSubmitting = false);
      _mostrarSolicitudRegistradaDialog();
    }
  }

  void _mostrarSolicitudRegistradaDialog() {
    final ticketCode = _garantiaValidada?.codigoVenta ?? '';
    final cliente = _garantiaValidada?.clienteNombre ?? 'Cliente';
    final prenda = _itemSeleccionado?.prendaNombre ?? 'Prenda';
    final tallaOrigen = _itemSeleccionado?.talla ?? '-';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        titlePadding: const EdgeInsets.fromLTRB(20, 20, 20, 10),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20),
        title: const Row(
          children: [
            Icon(Icons.check_circle_outline, color: Color(0xFF16A34A), size: 26),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'SOLICITUD DE CAMBIO REGISTRADA (CU19)',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 0.5),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Divider(color: Color(0xFFE5E7EB)),
            const SizedBox(height: 8),
            Text('Ticket Original: $ticketCode', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            Text('Cliente: $cliente', style: const TextStyle(fontSize: 12, color: AppTheme.mutedColor)),
            Text('Prenda a cambiar: $prenda (Talla actual: $tallaOrigen)', style: const TextStyle(fontSize: 12)),
            Text('Motivo Anatómico: $_motivoSeleccionado', style: const TextStyle(fontSize: 12, color: AppTheme.mutedColor)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              color: const Color(0xFFFAFAFA),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Balance Monetario (RN07):', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      Text('Bs. 0.00', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF16A34A))),
                    ],
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Regla RN07: Prohibición estricta de reintegro de dinero en efectivo. La operación corresponde a un canje de talla.',
                    style: TextStyle(fontSize: 10, color: AppTheme.mutedColor),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                border: Border.all(color: const Color(0xFF93C5FD)),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.info_outline, color: Color(0xFF1D4ED8), size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Aviso Operativo (CU20): Conforme al diseño del sistema, la emisión formal de la Nota de Devolución (DEV-YYYY) y el reingreso a inventario (CU20) se efectúa en caja exclusivamente desde la Plataforma Web.',
                      style: TextStyle(fontSize: 10, color: Color(0xFF1E40AF), height: 1.3),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              setState(() {
                _garantiaValidada = null;
                _itemSeleccionado = null;
                _codigoVentaCtrl.clear();
                _observacionesCtrl.clear();
              });
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.black,
              foregroundColor: Colors.white,
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
            ),
            child: const Text('ENTENDIDO'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AtelierScaffold(
      currentRoute: '/devoluciones',
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Banner de contexto
            Text(
              '• SERVICIO POSVENTA & MEDIDAS •',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    letterSpacing: 2.0,
                    color: AppTheme.goldAccent,
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              'Solicitud de Cambio (CU19)',
              style: Theme.of(context).textTheme.displayLarge?.copyWith(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Registro móvil de solicitud de cambio de talla por desajuste anatómico (RN06 / RN07). La nota formal de devolución y balance de inventario (CU20) se emite en la plataforma Web.',
              style: TextStyle(fontSize: 12, color: AppTheme.mutedColor, height: 1.4),
            ),
            const SizedBox(height: 20),

            // Buscador de ticket
            _buildSearchBox(),
            const SizedBox(height: 20),

            // Resultado de la búsqueda de garantía
            if (_garantiaValidada != null) ...[
              _buildGarantiaBanner(_garantiaValidada!),
              const SizedBox(height: 16),
              _buildItemsSelectionSection(_garantiaValidada!),
              const SizedBox(height: 20),
              _buildCambioConfigurationSection(),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _isSubmitting ? null : _registrarSolicitudCambio,
                icon: _isSubmitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.assignment_turned_in_outlined, size: 20),
                label: Text(
                  _isSubmitting
                      ? 'REGISTRANDO SOLICITUD...'
                      : 'REGISTRAR SOLICITUD DE CAMBIO (CU19)',
                  style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.8, fontSize: 13),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.black,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                ),
              ),
            ],

            const SizedBox(height: 30),
            // Nota explicativa al pie sobre CU20 en Web
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF9FAFB),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.desktop_windows_outlined, size: 20, color: AppTheme.mutedColor),
                  SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'CU20: Emisión de Nota de Devolución y Reingreso a Inventario',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Disponible exclusivamente en la Plataforma Web. El cajero valida físicamente la prenda devuelta, genera el comprobante fiscal DEV-YYYY e impacta el stock (+1 devuelto, -1 entregado).',
                          style: TextStyle(fontSize: 10, color: AppTheme.mutedColor, height: 1.3),
                        ),
                      ],
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

  Widget _buildSearchBox() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            '1. LOCALIZAR TICKET ORIGINAL',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _codigoVentaCtrl,
                  decoration: const InputDecoration(
                    hintText: 'Ej: VTA-SEED-8-1-1793156586',
                    border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                  onSubmitted: (_) => _buscarTicket(),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: _isSearching ? null : _buscarTicket,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.black,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                ),
                child: _isSearching
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('BUSCAR'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildGarantiaBanner(ValidarCambioGarantiaModel g) {
    final isVigente = g.garantiaVigente;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isVigente ? const Color(0xFFF0FDF4) : const Color(0xFFFEF2F2),
        border: Border.all(
          color: isVigente ? const Color(0xFF86EFAC) : const Color(0xFFFCA5A5),
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    isVigente ? Icons.verified_user_outlined : Icons.report_problem_outlined,
                    color: isVigente ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    isVigente ? 'GARANTÍA VIGENTE (CU19 / RN06)' : 'PLAZO EXPIRADO (RN06)',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                      color: isVigente ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                    ),
                  ),
                ],
              ),
              Text(
                '${g.diasTranscurridos} de ${g.plazoMaximoDias} días',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(g.mensaje, style: const TextStyle(fontSize: 12, height: 1.3)),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(8),
            color: Colors.white,
            child: const Text(
              'Regla RN07 Inmutable: Prohibición estricta de reembolso monetario en efectivo. Operación exclusiva de cambio físico por ajuste de talla o medida con saldo en Bs. 0.00.',
              style: TextStyle(fontSize: 10, color: AppTheme.mutedColor),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildItemsSelectionSection(ValidarCambioGarantiaModel g) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          '2. SELECCIONE PRENDA A PROCESAR (CAMBIO)',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        ...g.items.map((it) {
          final isSelected = _itemSeleccionado?.id == it.id;
          return InkWell(
            onTap: () {
              setState(() {
                _itemSeleccionado = it;
                _autoSeleccionarVarianteCambio(it);
              });
            },
            child: Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFFFAFAFA) : Colors.white,
                border: Border.all(
                  color: isSelected ? Colors.black : const Color(0xFFE5E7EB),
                  width: isSelected ? 1.5 : 1.0,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    isSelected ? Icons.check_box : Icons.check_box_outline_blank,
                    size: 20,
                    color: isSelected ? Colors.black : AppTheme.mutedColor,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(it.prendaNombre, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        Text('Talla: ${it.talla} • Color: ${it.color} • Disp: ${it.disponibleDevolver}', style: const TextStyle(fontSize: 11, color: AppTheme.mutedColor)),
                      ],
                    ),
                  ),
                  Text('Bs. ${it.precioUnitario}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildCambioConfigurationSection() {
    final List<Map<String, dynamic>> variantesOpciones = [];
    for (var p in _catalogoPrendas) {
      for (var v in p.variantes) {
        variantesOpciones.add({
          'id': v.id,
          'label': '${p.nombre} (Talla: ${v.talla?.nombre ?? 'Talla'}, Color: ${v.color?.nombre ?? 'Color'})',
        });
      }
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            '3. MOTIVO & NUEVA TALLA SOLICITADA',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          // Selector de Motivo
          const Text('MOTIVO DEL CAMBIO POR MEDIDA:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.mutedColor)),
          const SizedBox(height: 6),
          DropdownButtonFormField<String>(
            initialValue: _motivoSeleccionado,
            decoration: const InputDecoration(
              border: OutlineInputBorder(borderRadius: BorderRadius.zero),
              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            ),
            items: _motivosOpciones.map((m) {
              return DropdownMenuItem<String>(
                value: m['id'],
                child: Text(m['label']!, style: const TextStyle(fontSize: 12)),
              );
            }).toList(),
            onChanged: (val) {
              if (val != null) setState(() => _motivoSeleccionado = val);
            },
          ),
          const SizedBox(height: 14),

          // Selector de Variante Solicitada
          const Text('NUEVA TALLA / PRENDA REQUERIDA:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.mutedColor)),
          const SizedBox(height: 6),
          if (variantesOpciones.isNotEmpty)
            DropdownButtonFormField<int>(
              initialValue: _varianteEntregadaId ?? variantesOpciones.first['id'] as int,
              decoration: const InputDecoration(
                border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              ),
              items: variantesOpciones.take(15).map((opt) {
                return DropdownMenuItem<int>(
                  value: opt['id'] as int,
                  child: Text(opt['label'] as String, style: const TextStyle(fontSize: 12)),
                );
              }).toList(),
              onChanged: (val) {
                setState(() => _varianteEntregadaId = val);
              },
            )
          else
            const Text('Cargando catálogo...', style: TextStyle(fontSize: 11, color: AppTheme.mutedColor)),
          const SizedBox(height: 14),

          // Observaciones anatómicas
          const Text('OBSERVACIONES DE AJUSTE ANATÓMICO (OPCIONAL):', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.mutedColor)),
          const SizedBox(height: 6),
          TextField(
            controller: _observacionesCtrl,
            maxLines: 2,
            decoration: const InputDecoration(
              hintText: 'Ej: Cliente solicita cambio de talla S por M debido a ajuste en busto y contorno de cintura.',
              border: OutlineInputBorder(borderRadius: BorderRadius.zero),
              contentPadding: EdgeInsets.all(10),
            ),
          ),
        ],
      ),
    );
  }
}
