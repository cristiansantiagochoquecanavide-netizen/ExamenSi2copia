import 'package:flutter/material.dart';
import '../../../../shared/widgets/atelier_scaffold.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/app_notification.dart';
import '../../../ventas/data/repositories/sincronizacion_repository.dart';
import '../../../ventas/domain/models/sincronizacion_models.dart';
import '../../data/repositories/inventario_repository.dart';

class ConflictosScreen extends StatefulWidget {
  const ConflictosScreen({super.key});

  @override
  State<ConflictosScreen> createState() => _ConflictosScreenState();
}

class _ConflictosScreenState extends State<ConflictosScreen> {
  final SincronizacionRepository _syncRepo = SincronizacionRepository();
  final InventarioRepository _inventarioRepo = InventarioRepository();

  List<ConflictoInventarioModel> _conflictos = [];
  List<Map<String, dynamic>> _sucursales = [];
  bool _isLoading = true;
  String _filtroEstado = 'PENDIENTE_RESOLUCION'; // 'TODOS', 'PENDIENTE_RESOLUCION', 'RESUELTO'

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  Future<void> _cargarDatos() async {
    setState(() => _isLoading = true);
    try {
      final sucursales = await _inventarioRepo.getSucursales();
      final estadoParam = _filtroEstado == 'TODOS' ? null : _filtroEstado;
      final conflictos = await _syncRepo.listarConflictos(estadoResolucion: estadoParam);

      if (mounted) {
        setState(() {
          _sucursales = sucursales;
          _conflictos = conflictos;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        AppNotification.showError('Error al cargar conflictos: $e');
      }
    }
  }

  void _abrirModalArbitraje(ConflictoInventarioModel conflicto) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      builder: (ctx) => _ArbitrajeModal(
        conflicto: conflicto,
        sucursales: _sucursales,
        onResolved: () {
          _cargarDatos();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pendientesCount = _conflictos.where((c) => c.estadoResolucion == 'PENDIENTE_RESOLUCION').length;

    return AtelierScaffold(
      currentRoute: '/conflictos',
      child: RefreshIndicator(
        onRefresh: _cargarDatos,
        color: Colors.black,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header Editorial
              Text(
                '• CONSISTENCIA DE INVENTARIO •',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      letterSpacing: 2.0,
                      color: AppTheme.goldAccent,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                'Resolución de Conflictos (CU17)',
                style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      fontSize: 26,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Arbitraje de discrepancias producidas por ventas fuera de línea cuyo stock se agotó en el servidor central antes de sincronizar.',
                style: TextStyle(fontSize: 13, color: AppTheme.mutedColor, height: 1.4),
              ),
              const SizedBox(height: 20),

              // Botones de filtro de estado
              Row(
                children: [
                  _FilterChip(
                    label: 'PENDIENTES',
                    badge: '$pendientesCount',
                    selected: _filtroEstado == 'PENDIENTE_RESOLUCION',
                    onTap: () {
                      setState(() => _filtroEstado = 'PENDIENTE_RESOLUCION');
                      _cargarDatos();
                    },
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'RESUELTOS',
                    selected: _filtroEstado == 'RESUELTO',
                    onTap: () {
                      setState(() => _filtroEstado = 'RESUELTO');
                      _cargarDatos();
                    },
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'TODOS',
                    selected: _filtroEstado == 'TODOS',
                    onTap: () {
                      setState(() => _filtroEstado = 'TODOS');
                      _cargarDatos();
                    },
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Contenido principal
              if (_isLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: CircularProgressIndicator(color: Colors.black),
                  ),
                )
              else if (_conflictos.isEmpty)
                Container(
                  padding: const EdgeInsets.all(32),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9FAFB),
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.check_circle_outline, size: 42, color: Color(0xFF16A34A)),
                      const SizedBox(height: 12),
                      Text(
                        _filtroEstado == 'PENDIENTE_RESOLUCION'
                            ? 'No Hay Conflictos de Stock Pendientes'
                            : 'No se encontraron registros de conflicto',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Todas las operaciones offline han sido conciliadas de manera consistente.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, color: AppTheme.mutedColor),
                      ),
                    ],
                  ),
                )
              else
                ..._conflictos.map((c) => _buildConflictoCard(c)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildConflictoCard(ConflictoInventarioModel conflicto) {
    final isPendiente = conflicto.estadoResolucion == 'PENDIENTE_RESOLUCION';
    final prendaNombre = conflicto.prendaNombre ?? 'Variante #${conflicto.productoVarianteId}';
    final talla = conflicto.talla ?? 'Talla Única';
    final color = conflicto.color ?? 'N/A';
    final sucursal = conflicto.sucursalNombre ?? 'Sucursal #${conflicto.sucursalId}';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(
          color: isPendiente ? const Color(0xFFFCA5A5) : const Color(0xFFE5E7EB),
          width: isPendiente ? 1.5 : 1.0,
        ),
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                color: isPendiente ? const Color(0xFFFEF2F2) : const Color(0xFFF0FDF4),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isPendiente ? Icons.warning_amber_rounded : Icons.check_circle,
                      size: 14,
                      color: isPendiente ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      isPendiente ? 'PENDIENTE DE RESOLUCIÓN' : 'RESUELTO',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                        color: isPendiente ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                'Conflicto #${conflicto.id}',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.mutedColor),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            prendaNombre,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: -0.2),
          ),
          const SizedBox(height: 4),
          Text(
            'Talla: $talla • Color: $color • Sucursal: $sucursal',
            style: const TextStyle(fontSize: 12, color: AppTheme.mutedColor),
          ),
          const SizedBox(height: 14),

          // Discrepancia visual: Cantidad Solicitada vs Servidor
          Container(
            padding: const EdgeInsets.all(12),
            color: const Color(0xFFFAFAFA),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Column(
                  children: [
                    const Text('SOLICITADO OFFLINE', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: AppTheme.mutedColor)),
                    const SizedBox(height: 2),
                    Text('${conflicto.cantidadSolicitada} un.', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFFDC2626))),
                  ],
                ),
                Container(height: 28, width: 1, color: const Color(0xFFE5E7EB)),
                Column(
                  children: [
                    const Text('DISPONIBLE SERVIDOR', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: AppTheme.mutedColor)),
                    const SizedBox(height: 2),
                    Text('${conflicto.stockDisponibleServidor} un.', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          if (isPendiente)
            ElevatedButton.icon(
              onPressed: () => _abrirModalArbitraje(conflicto),
              icon: const Icon(Icons.gavel, size: 16),
              label: const Text(
                'ARBITRAR / RESOLVER CONFLICTO (CU17)',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 0.8),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.black,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
              ),
            )
          else ...[
            Container(
              padding: const EdgeInsets.all(10),
              color: const Color(0xFFF9FAFB),
              child: Text(
                'Resolución completada: ${conflicto.fechaResolucion ?? 'Fecha registrada'}',
                style: const TextStyle(fontSize: 11, color: Color(0xFF16A34A), fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final String? badge;
  final bool selected;
  final VoidCallback onTap;

  const _FilterChip({required this.label, this.badge, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? Colors.black : Colors.white,
          border: Border.all(color: selected ? Colors.black : const Color(0xFFE5E7EB)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: selected ? Colors.white : Colors.black,
              ),
            ),
            if (badge != null && badge != '0') ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: selected ? Colors.white : const Color(0xFFDC2626),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  badge!,
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: selected ? Colors.black : Colors.white,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ArbitrajeModal extends StatefulWidget {
  final ConflictoInventarioModel conflicto;
  final List<Map<String, dynamic>> sucursales;
  final VoidCallback onResolved;

  const _ArbitrajeModal({
    required this.conflicto,
    required this.sucursales,
    required this.onResolved,
  });

  @override
  State<_ArbitrajeModal> createState() => _ArbitrajeModalState();
}

class _ArbitrajeModalState extends State<_ArbitrajeModal> {
  final SincronizacionRepository _syncRepo = SincronizacionRepository();
  final TextEditingController _obsCtrl = TextEditingController();

  String _accionSeleccionada = 'TRASPASO_INMEDIATO'; // TRASPASO_INMEDIATO, ADMITIR_SALDO_NEGATIVO, ANULAR_VENTA
  int? _sucursalProveedoraId;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    final otras = widget.sucursales.where((s) => s['id'] != widget.conflicto.sucursalId).toList();
    if (otras.isNotEmpty) {
      _sucursalProveedoraId = otras.first['id'] as int?;
    }
  }

  @override
  void dispose() {
    _obsCtrl.dispose();
    super.dispose();
  }

  Future<void> _submitResolucion() async {
    final obs = _obsCtrl.text.trim();
    if (obs.length < 5) {
      AppNotification.showWarning('La justificación técnica debe contener al menos 5 caracteres.');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final input = ResolverConflictoInput(
        accion: _accionSeleccionada,
        observaciones: obs,
        sucursalProveedoraId: _accionSeleccionada == 'TRASPASO_INMEDIATO' ? _sucursalProveedoraId : null,
      );

      await _syncRepo.resolverConflicto(widget.conflicto.id, input);

      if (mounted) {
        Navigator.pop(context);
        AppNotification.showSuccess('Conflicto #${widget.conflicto.id} resuelto mediante arbitraje.');
        widget.onResolved();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        AppNotification.showError('Error al resolver: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final otrasSucursales = widget.sucursales.where((s) => s['id'] != widget.conflicto.sucursalId).toList();

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'ARBITRAJE DE INVENTARIO (CU17)',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1.0, color: AppTheme.mutedColor),
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 20),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Conciliar Conflicto #${widget.conflicto.id}',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              '${widget.conflicto.prendaNombre ?? 'Prenda'} • Talla: ${widget.conflicto.talla ?? 'M'} • Solicitado: ${widget.conflicto.cantidadSolicitada} un.',
              style: const TextStyle(fontSize: 13, color: AppTheme.mutedColor),
            ),
            const Divider(height: 28),

            const Text(
              'SELECCIONE ESTRATEGIA ARBITRAL ICONIX:',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),

            // Estrategia 1: TRASPASO_INMEDIATO (CU12)
            _buildOptionCard(
              id: 'TRASPASO_INMEDIATO',
              title: '1. Traspaso Inmediato de Emergencia (CU12)',
              desc: 'Solicita el stock faltante a otra sucursal de la red para cubrir la venta física.',
              icon: Icons.local_shipping_outlined,
            ),
            const SizedBox(height: 8),

            // Selector de sucursal origen si aplica
            if (_accionSeleccionada == 'TRASPASO_INMEDIATO' && otrasSucursales.isNotEmpty) ...[
              Container(
                padding: const EdgeInsets.all(12),
                color: const Color(0xFFF9FAFB),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('SUCURSAL ORIGEN PROVEEDORA:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.mutedColor)),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<int>(
                      initialValue: _sucursalProveedoraId,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                        contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      ),
                      items: otrasSucursales.map((s) {
                        return DropdownMenuItem<int>(
                          value: s['id'] as int,
                          child: Text('${s['nombre']} (${s['ciudad']?['nombre'] ?? 'Ciudad'})'),
                        );
                      }).toList(),
                      onChanged: (val) => setState(() => _sucursalProveedoraId = val),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
            ],

            // Estrategia 2: ADMITIR_SALDO_NEGATIVO
            _buildOptionCard(
              id: 'ADMITIR_SALDO_NEGATIVO',
              title: '2. Admitir Saldo Negativo Transitorio',
              desc: 'Permite asentar la venta reduciendo el inventario central bajo cero hasta reposición.',
              icon: Icons.trending_down,
            ),
            const SizedBox(height: 8),

            // Estrategia 3: ANULAR_VENTA
            _buildOptionCard(
              id: 'ANULAR_VENTA',
              title: '3. Anular Venta de Contingencia',
              desc: 'Descarta la transacción por inconsistencia irresoluble y genera nota de auditoría.',
              icon: Icons.cancel_outlined,
            ),
            const SizedBox(height: 16),

            // Campo de justificación
            const Text(
              'JUSTIFICACIÓN TÉCNICA / OBSERVACIÓN ARBITRAL:',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _obsCtrl,
              maxLines: 2,
              decoration: const InputDecoration(
                hintText: 'Ej: Stock provisto de emergencia desde Sucursal Norte para conciliar venta offline.',
                border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                contentPadding: EdgeInsets.all(12),
              ),
            ),
            const SizedBox(height: 20),

            // Botón de confirmación
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submitResolucion,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.black,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
              ),
              child: _isSubmitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text(
                      'CONFIRMAR RESOLUCIÓN ARBITRAL',
                      style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.8),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOptionCard({
    required String id,
    required String title,
    required String desc,
    required IconData icon,
  }) {
    final isSelected = _accionSeleccionada == id;
    return InkWell(
      onTap: () => setState(() => _accionSeleccionada = id),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFFAFAFA) : Colors.white,
          border: Border.all(
            color: isSelected ? Colors.black : const Color(0xFFE5E7EB),
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
              size: 18,
              color: isSelected ? Colors.black : AppTheme.mutedColor,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 2),
                  Text(desc, style: const TextStyle(fontSize: 11, color: AppTheme.mutedColor)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
