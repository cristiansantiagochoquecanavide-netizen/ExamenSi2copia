import 'package:flutter/material.dart';
import '../../../../shared/widgets/atelier_scaffold.dart';
import '../../../../core/theme/app_theme.dart';
import '../../data/repositories/inventario_repository.dart';

class InventarioScreen extends StatefulWidget {
  const InventarioScreen({super.key});

  @override
  State<InventarioScreen> createState() => _InventarioScreenState();
}

class _InventarioScreenState extends State<InventarioScreen> {
  final InventarioRepository _repository = InventarioRepository();

  // CU11: Consulta de Inventario Multi-sucursal
  final TextEditingController _varianteCtrl = TextEditingController(text: '1');
  List<Map<String, dynamic>> _stockItems = [];
  bool _isLoadingStock = false;
  String? _stockError;

  @override
  void initState() {
    super.initState();
    _consultarStock();
  }

  @override
  void dispose() {
    _varianteCtrl.dispose();
    super.dispose();
  }

  Future<void> _consultarStock() async {
    final vId = int.tryParse(_varianteCtrl.text.trim()) ?? 1;
    setState(() {
      _isLoadingStock = true;
      _stockError = null;
    });

    try {
      final items = await _repository.getStockMultiSucursal(varianteId: vId);
      if (mounted) {
        setState(() {
          _stockItems = items;
          _isLoadingStock = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _stockError = 'Error al consultar stock en tiempo real: $e';
          _isLoadingStock = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AtelierScaffold(
      currentRoute: '/inventario',
      child: RefreshIndicator(
        onRefresh: _consultarStock,
        color: Colors.black,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header Editorial
              Text(
                '• GESTIÓN LOGÍSTICA & STOCK •',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      letterSpacing: 1.5,
                      color: AppTheme.mutedColor,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                'Inventario Multi-Sucursal',
                style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      fontSize: 26,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Consulta de disponibilidad física entre tiendas en tiempo real (CU11 - Vendedor / Cliente).',
                style: TextStyle(fontSize: 12, color: AppTheme.mutedColor, height: 1.4),
              ),
              const SizedBox(height: 20),

              // Buscador de Variante / Prenda
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'CONSULTAR DISPONIBILIDAD DE VARIANTE (CU11)',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _varianteCtrl,
                            keyboardType: TextInputType.number,
                            onSubmitted: (_) => _consultarStock(),
                            decoration: const InputDecoration(
                              labelText: 'ID de Variante de Prenda',
                              hintText: 'Ej. 1',
                              prefixIcon: Icon(Icons.tag, size: 18),
                              border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        ElevatedButton.icon(
                          onPressed: _isLoadingStock ? null : _consultarStock,
                          icon: _isLoadingStock
                              ? const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Icon(Icons.search, size: 16),
                          label: const Text(
                            'BUSCAR',
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.black,
                            foregroundColor: Colors.white,
                            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              if (_stockError != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  color: const Color(0xFFFEE2E2),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Color(0xFF991B1B), size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _stockError!,
                          style: const TextStyle(color: Color(0xFF991B1B), fontSize: 11),
                        ),
                      ),
                    ],
                  ),
                ),

              // Lista de Sucursales con Stock
              if (_stockItems.isEmpty && !_isLoadingStock && _stockError == null)
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: const Center(
                    child: Text(
                      'No se encontraron registros de stock para esta variante.',
                      style: TextStyle(color: AppTheme.mutedColor, fontSize: 12),
                    ),
                  ),
                ),

              ..._stockItems.map((item) {
                final nombre = item['nombre_sucursal'] ?? item['sucursal_nombre'] ?? 'Sucursal';
                final direccion = item['direccion'] ?? 'Sin dirección registrada';
                final tel = item['telefono'] ?? 'Sin teléfono';
                final stock = item['stock_disponible'] ?? item['stock_actual'] ?? 0;
                final isAvailable = stock > 0;

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(
                      color: isAvailable ? const Color(0xFFE2E8F0) : const Color(0xFFFECDD3),
                      width: 1.0,
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: isAvailable ? const Color(0xFFF0FDF4) : const Color(0xFFFFF1F2),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.store,
                          color: isAvailable ? const Color(0xFF166534) : const Color(0xFF9F1239),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              nombre,
                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              direccion,
                              style: const TextStyle(fontSize: 11, color: AppTheme.mutedColor),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Contacto: $tel',
                              style: const TextStyle(fontSize: 10, color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '$stock',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                              color: isAvailable ? const Color(0xFF166534) : const Color(0xFF991B1B),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: isAvailable ? const Color(0xFFDCFCE7) : const Color(0xFFFEE2E2),
                              borderRadius: BorderRadius.circular(2),
                            ),
                            child: Text(
                              isAvailable ? 'DISPONIBLE' : 'AGOTADO',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: isAvailable ? const Color(0xFF166534) : const Color(0xFF991B1B),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }),

              const SizedBox(height: 20),

              // Nota informativa de rol: Traspasos son exclusivos de Web
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.info_outline, size: 18, color: Color(0xFF64748B)),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Nota de Distribución: Los Traspasos de Inventario (CU12: Solicitud/Despacho y CU13: Recepción Conforme) corresponden a los roles Encargado Origen y Encargado Destino, operándose exclusivamente en el sistema Web.',
                        style: TextStyle(fontSize: 10.5, color: Color(0xFF64748B), height: 1.4),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
