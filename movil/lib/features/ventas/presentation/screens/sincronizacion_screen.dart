import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../shared/widgets/atelier_scaffold.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/storage/local_storage_helper.dart';
import '../../../../core/utils/app_notification.dart';
import '../../data/repositories/sincronizacion_repository.dart';
import '../../domain/models/sincronizacion_models.dart';

class SincronizacionScreen extends StatefulWidget {
  const SincronizacionScreen({super.key});

  @override
  State<SincronizacionScreen> createState() => _SincronizacionScreenState();
}

class _SincronizacionScreenState extends State<SincronizacionScreen> {
  final SincronizacionRepository _syncRepo = SincronizacionRepository();

  int _pendingCount = 0;
  List<Map<String, dynamic>> _offlineSales = [];
  List<Map<String, dynamic>> _offlineReservations = [];
  bool _isLoadingLocal = true;
  bool _isSyncing = false;
  SincronizacionBatchResponseModel? _lastBatchResult;

  @override
  void initState() {
    super.initState();
    _loadLocalPendingData();
  }

  Future<void> _loadLocalPendingData() async {
    setState(() => _isLoadingLocal = true);
    try {
      final count = await LocalStorageHelper.instance.getPendingOperationsCount();
      final sales = await LocalStorageHelper.instance.getOfflineSales();
      final reservations = await LocalStorageHelper.instance.getOfflineFittingReservations();
      if (mounted) {
        setState(() {
          _pendingCount = count;
          _offlineSales = sales;
          _offlineReservations = reservations;
          _isLoadingLocal = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingLocal = false);
    }
  }

  Future<void> _ejecutarSincronizacion() async {
    if (_pendingCount == 0) {
      AppNotification.showInfo('No hay transacciones offline pendientes de sincronizar en SQLite.');
      return;
    }

    setState(() => _isSyncing = true);

    try {
      final result = await _syncRepo.sincronizarTodoDesdeSQLite(sucursalId: 1);
      if (mounted) {
        setState(() {
          _lastBatchResult = result;
          _isSyncing = false;
        });

        // Recargar datos locales tras purgar confirmados
        await _loadLocalPendingData();

        if (result.conflictosStock > 0) {
          AppNotification.showWarning(
            'Sincronización completada con ${result.conflictosStock} conflicto(s) de inventario detectados (CU17).',
          );
        } else {
          AppNotification.showSuccess(
            'Lote sincronizado: ${result.procesadosExitosamente} procesados, ${result.duplicadosIdempotentes} duplicados idempotentes.',
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSyncing = false);
        AppNotification.showError('Error al sincronizar con el servidor: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AtelierScaffold(
      currentRoute: '/sincronizacion',
      child: RefreshIndicator(
        onRefresh: _loadLocalPendingData,
        color: Colors.black,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header Editorial Atelier Noir
              Text(
                '• PROTOCOLO OFFLINE-FIRST •',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      letterSpacing: 2.0,
                      color: AppTheme.goldAccent,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                'Sincronización Batch (CU16)',
                style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      fontSize: 26,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Vaciado de operaciones offline retenidas en SQLite, garantía de idempotencia UUIDv4 (RN04) y detección de colisiones de inventario central.',
                style: TextStyle(fontSize: 13, color: AppTheme.mutedColor, height: 1.4),
              ),
              const SizedBox(height: 24),

              // Tarjetas Métricas de Operaciones Pendientes
              _buildMetricsRow(),
              const SizedBox(height: 20),

              // Botón de Acción Principal CU16
              ElevatedButton.icon(
                onPressed: _isSyncing ? null : _ejecutarSincronizacion,
                icon: _isSyncing
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.sync_rounded, size: 20),
                label: Text(
                  _isSyncing
                      ? 'SINCRONIZANDO LOTE CON SERVIDOR...'
                      : 'SINCRONIZAR OPERACIONES OFFLINE (CU16)',
                  style: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.0, fontSize: 13),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.black,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                ),
              ),
              const SizedBox(height: 12),

              // Acceso rápido a CU17 (Conflictos de Inventario)
              OutlinedButton.icon(
                onPressed: () => context.go('/conflictos'),
                icon: const Icon(Icons.rule_folder_outlined, size: 18),
                label: const Text(
                  'GESTIONAR CONFLICTOS DE INVENTARIO (CU17)',
                  style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0.8, fontSize: 12),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFE5E7EB)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                ),
              ),
              const SizedBox(height: 28),

              // Card de Resultados del Último Lote Sincronizado
              if (_lastBatchResult != null) ...[
                _buildBatchResultCard(_lastBatchResult!),
                const SizedBox(height: 28),
              ],

              // Sección: Operaciones Retenidas en SQLite
              _buildLocalTransactionsList(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricsRow() {
    return Row(
      children: [
        Expanded(
          child: _MetricCard(
            title: 'VENTAS SQLITE',
            value: '${_offlineSales.length}',
            subtitle: 'Contado en efectivo (CU15)',
            icon: Icons.point_of_sale_outlined,
            color: const Color(0xFFD97706),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _MetricCard(
            title: 'RESERVAS SQLITE',
            value: '${_offlineReservations.length}',
            subtitle: 'Probador físico (CU14)',
            icon: Icons.checkroom_outlined,
            color: const Color(0xFF2563EB),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _MetricCard(
            title: 'TOTAL COLA',
            value: '$_pendingCount',
            subtitle: 'Pendientes de envío',
            icon: Icons.cloud_upload_outlined,
            color: _pendingCount > 0 ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
          ),
        ),
      ],
    );
  }

  Widget _buildBatchResultCard(SincronizacionBatchResponseModel res) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFE5E7EB), width: 1.5),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'RESULTADOS DEL LOTE RECIENTE',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      letterSpacing: 1.2,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.mutedColor,
                    ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                color: res.conflictosStock > 0 ? const Color(0xFFFEF2F2) : const Color(0xFFF0FDF4),
                child: Text(
                  res.conflictosStock > 0 ? 'CON CONFLICTOS' : 'SINCRONIZADO',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: res.conflictosStock > 0 ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _ResultStat(label: 'Total', count: res.totalRecibidos, color: Colors.black),
              _ResultStat(label: 'Confirmados', count: res.procesadosExitosamente, color: const Color(0xFF16A34A)),
              _ResultStat(label: 'Duplicados', count: res.duplicadosIdempotentes, color: const Color(0xFF2563EB)),
              _ResultStat(label: 'Conflictos', count: res.conflictosStock, color: const Color(0xFFDC2626)),
            ],
          ),
          const Divider(height: 30, color: Color(0xFFF3F4F6)),
          Text(
            'DETALLE DE TRANSACCIONES DEL LOTE:',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade700),
          ),
          const SizedBox(height: 10),
          ...res.resultados.map((item) => _buildResultItemRow(item)),
        ],
      ),
    );
  }

  Widget _buildResultItemRow(SincronizacionResultadoItemModel item) {
    Color badgeBg;
    Color badgeFg;
    IconData icon;

    switch (item.estado) {
      case 'SINCRONIZADO':
        badgeBg = const Color(0xFFDCFCE7);
        badgeFg = const Color(0xFF166534);
        icon = Icons.check_circle_outline;
        break;
      case 'DUPLICADO_IDEMPOTENTE':
        badgeBg = const Color(0xFFDBEAFE);
        badgeFg = const Color(0xFF1E40AF);
        icon = Icons.copy_rounded;
        break;
      case 'CONFLICTO_STOCK':
        badgeBg = const Color(0xFFFEE2E2);
        badgeFg = const Color(0xFF991B1B);
        icon = Icons.warning_amber_rounded;
        break;
      default:
        badgeBg = const Color(0xFFF3F4F6);
        badgeFg = const Color(0xFF374151);
        icon = Icons.error_outline;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFAFAFA),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: badgeFg),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  item.codigoReferencia != null
                      ? '${item.tipoOperacion} • ${item.codigoReferencia}'
                      : '${item.tipoOperacion} • UUID: ${item.uuidOperacion.substring(0, 8)}...',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                color: badgeBg,
                child: Text(
                  item.estado,
                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: badgeFg),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            item.mensaje,
            style: const TextStyle(fontSize: 11, color: AppTheme.mutedColor),
          ),
        ],
      ),
    );
  }

  Widget _buildLocalTransactionsList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'COLA EN MEMORIA LOCAL SQLITE ($_pendingCount)',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    letterSpacing: 1.2,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.mutedColor,
                  ),
            ),
            IconButton(
              icon: const Icon(Icons.refresh, size: 18),
              onPressed: _loadLocalPendingData,
              tooltip: 'Recargar SQLite',
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (_isLoadingLocal)
          const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator(color: Colors.black)))
        else if (_pendingCount == 0)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFFF9FAFB),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: const Column(
              children: [
                Icon(Icons.cloud_done_outlined, size: 36, color: Color(0xFF16A34A)),
                SizedBox(height: 10),
                Text(
                  'Cola Local Completamente Sincronizada',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                SizedBox(height: 4),
                Text(
                  'No hay ventas ni reservas pendientes en SQLite. Todas las transacciones están asentadas en PostgreSQL.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: AppTheme.mutedColor),
                ),
              ],
            ),
          )
        else ...[
          // Ventas en espera
          ..._offlineSales.map((s) => _buildSaleRow(s)),
          // Reservas en espera
          ..._offlineReservations.map((r) => _buildReservationRow(r)),
        ],
      ],
    );
  }

  Widget _buildSaleRow(Map<String, dynamic> sale) {
    final uuid = (sale['uuid'] as String? ?? 'UUID').substring(0, 8);
    final monto = sale['monto_total'] ?? 0.0;
    final fecha = sale['fecha_registro'] ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            color: const Color(0xFFFEF3C7),
            child: const Icon(Icons.point_of_sale, size: 20, color: Color(0xFFB45309)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('VENTA CONTADO #$uuid', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                Text('Fecha: $fecha', style: const TextStyle(fontSize: 11, color: AppTheme.mutedColor)),
                const Text('Método: EFECTIVO (CU15)', style: TextStyle(fontSize: 11, color: Color(0xFFB45309), fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          Text('Bs. $monto', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
        ],
      ),
    );
  }

  Widget _buildReservationRow(Map<String, dynamic> res) {
    final uuid = (res['uuid'] as String? ?? 'UUID').substring(0, 8);
    final hora = res['hora_ensayo'] ?? '15:00';
    final prendaId = res['prenda_id'] ?? 1;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            color: const Color(0xFFDBEAFE),
            child: const Icon(Icons.checkroom, size: 20, color: Color(0xFF1D4ED8)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('RESERVA PROBADOR #$uuid', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                Text('Prenda ID: $prendaId • Hora ensayo: $hora', style: const TextStyle(fontSize: 11, color: AppTheme.mutedColor)),
                const Text('Sin pago previo (CU14)', style: TextStyle(fontSize: 11, color: Color(0xFF1D4ED8), fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          const Text('Bs. 0.00', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color color;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color)),
          const SizedBox(height: 2),
          Text(title, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(fontSize: 9, color: AppTheme.mutedColor), maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

class _ResultStat extends StatelessWidget {
  final String label;
  final int count;
  final Color color;

  const _ResultStat({required this.label, required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('$count', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: const TextStyle(fontSize: 10, color: AppTheme.mutedColor)),
      ],
    );
  }
}
