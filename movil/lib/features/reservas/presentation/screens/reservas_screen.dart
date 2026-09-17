import 'package:flutter/material.dart';
import '../../../../shared/widgets/atelier_scaffold.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/app_notification.dart';
import '../../../catalogo/data/repositories/catalogo_repository.dart';
import '../../../catalogo/domain/models/catalogo_models.dart';
import '../../data/repositories/reservas_repository.dart';
import '../../domain/models/reservas_models.dart';

class ReservasScreen extends StatefulWidget {
  const ReservasScreen({super.key});

  @override
  State<ReservasScreen> createState() => _ReservasScreenState();
}

class _ReservasScreenState extends State<ReservasScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ReservasRepository _reservasRepo = ReservasRepository();
  final CatalogoRepository _catalogoRepo = CatalogoRepository();

  List<SucursalModel> _sucursales = [];
  SucursalModel? _selectedSucursal;
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 1));
  String _selectedTime = '16:00';
  final List<String> _timeSlots = ['10:00', '11:30', '14:30', '16:00', '17:30', '19:00'];

  final List<PrendaModel> _selectedPrendas = [];
  List<ReservaModel> _misReservas = [];
  bool _isLoading = false;
  bool _isLoadingReservas = false;
  String _metodoPago = 'QR_SIMPLE';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadInitialData();
    _loadMisReservas();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    final sucursales = await _reservasRepo.getSucursales();
    if (mounted) {
      setState(() {
        _sucursales = sucursales;
        if (_sucursales.isNotEmpty) {
          _selectedSucursal = _sucursales.first;
        }
      });
    }

    // Cargar prendas seleccionadas desde ReservasDraftService
    for (var p in ReservasDraftService.instance.selectedPrendas) {
      if (!_selectedPrendas.any((item) => item.id == p.id) && _selectedPrendas.length < 3) {
        _selectedPrendas.add(p);
      }
    }
    if (mounted) setState(() {});
  }

  Future<void> _loadMisReservas() async {
    setState(() => _isLoadingReservas = true);
    final list = await _reservasRepo.getMisReservas();
    if (mounted) {
      setState(() {
        _misReservas = list;
        _isLoadingReservas = false;
      });
    }
  }

  void _openPrendaPicker() async {
    final allPrendas = await _catalogoRepo.getPrendas();
    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      builder: (ctx) {
        String searchQuery = '';
        String selectedSector = 'TODAS';

        return StatefulBuilder(
          builder: (context, setModalState) {
            // Filtrar prendas por sector y búsqueda
            final filtered = allPrendas.where((p) {
              final matchesSector = selectedSector == 'TODAS' || (p.categoria?.sector == selectedSector);
              final matchesSearch = searchQuery.isEmpty ||
                  p.nombre.toLowerCase().contains(searchQuery.toLowerCase()) ||
                  p.descripcion.toLowerCase().contains(searchQuery.toLowerCase());
              return matchesSector && matchesSearch;
            }).toList();

            return Container(
              height: MediaQuery.of(context).size.height * 0.88,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'CATÁLOGO EXCLUSIVO • ATELIER',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: AppTheme.mutedColor),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Elegí prendas (${_selectedPrendas.length}/3)',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Search Bar
                  TextField(
                    onChanged: (val) => setModalState(() => searchQuery = val.trim()),
                    decoration: const InputDecoration(
                      hintText: 'Buscar por prenda, tela o estilo...',
                      hintStyle: TextStyle(fontSize: 12, color: AppTheme.mutedColor),
                      prefixIcon: Icon(Icons.search, size: 18, color: AppTheme.mutedColor),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      fillColor: AppTheme.surfaceContainer,
                      filled: true,
                      border: OutlineInputBorder(borderRadius: BorderRadius.zero, borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Sector Chips
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: ['TODAS', 'MUJER', 'HOMBRE', 'NIÑOS', 'UNISEX'].map((sector) {
                        final isSel = selectedSector == sector;
                        return Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ChoiceChip(
                            label: Text(sector, style: TextStyle(fontSize: 10, fontWeight: isSel ? FontWeight.w800 : FontWeight.w600)),
                            selected: isSel,
                            selectedColor: Colors.black,
                            backgroundColor: AppTheme.surfaceContainer,
                            labelStyle: TextStyle(color: isSel ? Colors.white : Colors.black87),
                            side: BorderSide(color: isSel ? Colors.black : const Color(0xFFE5E7EB)),
                            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                            onSelected: (_) => setModalState(() => selectedSector = sector),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // 2-Column Visual Grid
                  Expanded(
                    child: filtered.isEmpty
                        ? const Center(
                            child: Text('No se encontraron prendas con esos criterios', style: TextStyle(color: AppTheme.mutedColor, fontSize: 13)),
                          )
                        : GridView.builder(
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              childAspectRatio: 0.70,
                              crossAxisSpacing: 10,
                              mainAxisSpacing: 10,
                            ),
                            itemCount: filtered.length,
                            itemBuilder: (context, idx) {
                              final prenda = filtered[idx];
                              final isSelected = _selectedPrendas.any((p) => p.id == prenda.id);

                              return InkWell(
                                onTap: () {
                                  setState(() {
                                    if (isSelected) {
                                      _selectedPrendas.removeWhere((p) => p.id == prenda.id);
                                      ReservasDraftService.instance.removePrenda(prenda.id);
                                    } else if (_selectedPrendas.length < 3) {
                                      _selectedPrendas.add(prenda);
                                      ReservasDraftService.instance.addPrenda(prenda);
                                    } else {
                                      AppNotification.showSuccess('Límite de 3 prendas alcanzado');
                                    }
                                  });
                                  setModalState(() {});
                                },
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    border: Border.all(
                                      color: isSelected ? AppTheme.goldAccent : const Color(0xFFE5E7EB),
                                      width: isSelected ? 2.0 : 1.0,
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Image with selector badge
                                      Expanded(
                                        child: Stack(
                                          fit: StackFit.expand,
                                          children: [
                                            Image.network(
                                              prenda.portadaUrl,
                                              fit: BoxFit.cover,
                                              errorBuilder: (_, __, ___) => Container(
                                                color: AppTheme.surfaceContainer,
                                                child: const Icon(Icons.checkroom, color: AppTheme.mutedColor, size: 32),
                                              ),
                                            ),
                                            Positioned(
                                              top: 6,
                                              right: 6,
                                              child: Container(
                                                padding: const EdgeInsets.all(4),
                                                decoration: BoxDecoration(
                                                  color: isSelected ? Colors.black : Colors.white.withValues(alpha: 0.85),
                                                  border: Border.all(color: Colors.black),
                                                ),
                                                child: Icon(
                                                  isSelected ? Icons.check : Icons.add,
                                                  size: 14,
                                                  color: isSelected ? AppTheme.goldAccent : Colors.black,
                                                ),
                                              ),
                                            ),
                                            Positioned(
                                              bottom: 6,
                                              left: 6,
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                                color: Colors.black.withValues(alpha: 0.75),
                                                child: Text(
                                                  prenda.categoria?.sector ?? 'UNISEX',
                                                  style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.white),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      // Text Details
                                      Padding(
                                        padding: const EdgeInsets.all(8.0),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              prenda.nombre,
                                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              'Bs ${prenda.precioBase.toStringAsFixed(2)}',
                                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.goldAccent),
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

                  // Bottom Action Bar
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: const BoxDecoration(
                      border: Border(top: BorderSide(color: Color(0xFFE5E7EB))),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () {
                              Navigator.pop(ctx);
                              // Navega al catálogo principal para explorar
                              DefaultTabController.of(context);
                            },
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.black,
                              side: const BorderSide(color: Colors.black),
                              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            child: const Text('EXPLORAR CATÁLOGO', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () => Navigator.pop(ctx),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.black,
                              foregroundColor: Colors.white,
                              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            child: Text(
                              'CONFIRMAR (${_selectedPrendas.length}/3)',
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _submitReserva() async {
    if (_selectedSucursal == null) {
      AppNotification.showSuccess('Por favor seleccioná una sucursal.');
      return;
    }

    if (_selectedPrendas.isEmpty) {
      AppNotification.showSuccess('Por favor seleccioná al menos 1 prenda para probar.');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final formattedDate =
          '${_selectedDate.year.toString().padLeft(4, '0')}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}';

      final detalles = _selectedPrendas.map((p) {
        final varianteId = p.variantes.isNotEmpty ? p.variantes.first.id : p.id;
        return DetalleReservaInput(varianteId: varianteId, cantidad: 1);
      }).toList();

      final request = ReservaCreateRequest(
        sucursalId: _selectedSucursal!.id,
        fechaReserva: formattedDate,
        horaEstimada: _selectedTime,
        montoAnticipo: 10.0,
        moneda: 'USD',
        observaciones: 'Reserva generada desde FashionStore Mobile',
        detalles: detalles,
      );

      final reserva = await _reservasRepo.crearReserva(request);

      if (mounted) {
        setState(() {
          _selectedPrendas.clear();
          _isLoading = false;
        });

        _loadMisReservas();
        _tabController.animateTo(1);

        _showSuccessModal(reserva);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        AppNotification.showSuccess('Error: ${e.toString().replaceAll('Exception: ', '')}');
      }
    }
  }

  void _showSuccessModal(ReservaModel reserva) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.check_circle_outline, color: Color(0xFF047857), size: 56),
            const SizedBox(height: 12),
            const Text(
              '¡CITA AGENDADA & ANTICIPO CONFIRMADO!',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, letterSpacing: 0.5),
            ),
            const SizedBox(height: 8),
            Text(
              'Código de Reserva: ${reserva.codigoReserva}',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(16),
              color: const Color(0xFFF9FAFB),
              child: Column(
                children: [
                  _buildDetailRow('Sucursal:', reserva.sucursal?.nombre ?? _selectedSucursal?.nombre ?? 'Boutique Central'),
                  const SizedBox(height: 6),
                  _buildDetailRow('Fecha y Turno:', '${reserva.fechaReserva} a las ${reserva.horaEstimada}'),
                  const SizedBox(height: 6),
                  _buildDetailRow('Anticipo Abonado:', '\$${reserva.montoAnticipo.toStringAsFixed(2)} USD (Garantía)'),
                ],
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.black,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
              ),
              child: const Text('VER MIS CITAS', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  void _showQRModal(ReservaModel reserva) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('PASE DIGITAL DE PROBADOR', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.5, color: AppTheme.mutedColor)),
            const SizedBox(height: 6),
            Text(reserva.codigoReserva, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(border: Border.all(color: Colors.black, width: 2)),
              child: const Icon(Icons.qr_code_2, size: 160),
            ),
            const SizedBox(height: 14),
            Text(
              'Mostrá este código al encargado al llegar a ${reserva.sucursal?.nombre ?? 'la tienda'}.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: AppTheme.mutedColor),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.black, foregroundColor: Colors.white),
              child: const Text('CERRAR PASE'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AtelierScaffold(
      currentRoute: '/reservas',
      child: Column(
        children: [
          // Tab Header
          Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: Color(0xFFE5E7EB))),
            ),
            child: TabBar(
              controller: _tabController,
              labelColor: Colors.black,
              unselectedLabelColor: AppTheme.mutedColor,
              indicatorColor: Colors.black,
              indicatorWeight: 2,
              tabs: const [
                Tab(child: Text('AGENDAR CITA', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.0))),
                Tab(child: Text('MIS CITAS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.0))),
              ],
            ),
          ),

          // Tab Views
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildAgendarView(),
                _buildMisReservasView(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAgendarView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Editorial Header
          Text(
            '• ATELIER NOIR • FITTING ROOM CONCIERGE •',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  letterSpacing: 2.0,
                  color: AppTheme.mutedColor,
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 4),
          Text('Reserva de Probador', style: Theme.of(context).textTheme.displayLarge?.copyWith(fontSize: 26)),
          const SizedBox(height: 6),
          const Text(
            'Apartá hasta 3 prendas exclusivas para probártelas en una de nuestras boutiques con atención personalizada.',
            style: TextStyle(color: AppTheme.mutedColor, fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 20),

          // 1. Selector de Prendas
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('1. PRENDAS A PROBAR (MÁX. 3)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.0)),
              if (_selectedPrendas.length < 3)
                TextButton.icon(
                  onPressed: _openPrendaPicker,
                  icon: const Icon(Icons.add, size: 16),
                  label: const Text('Elegir Prenda', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
            ],
          ),
          const SizedBox(height: 8),
          if (_selectedPrendas.isEmpty)
            InkWell(
              onTap: _openPrendaPicker,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFFD1D5DB), style: BorderStyle.solid),
                ),
                child: const Column(
                  children: [
                    Icon(Icons.checkroom_outlined, size: 36, color: AppTheme.mutedColor),
                    SizedBox(height: 8),
                    Text('No has seleccionado prendas aún', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    SizedBox(height: 4),
                    Text('Tocá aquí para elegir del catálogo', style: TextStyle(color: AppTheme.mutedColor, fontSize: 11)),
                  ],
                ),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _selectedPrendas.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, idx) {
                final p = _selectedPrendas[idx];
                return Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(border: Border.all(color: const Color(0xFFE5E7EB))),
                  child: Row(
                    children: [
                      Image.network(p.portadaUrl, width: 44, height: 52, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.checkroom)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(p.nombre, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            Text(p.precioFormatted, style: const TextStyle(color: AppTheme.mutedColor, fontSize: 12)),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, size: 18, color: Colors.black54),
                        onPressed: () => setState(() => _selectedPrendas.removeAt(idx)),
                      ),
                    ],
                  ),
                );
              },
            ),
          const SizedBox(height: 24),

          // 2. Sucursal
          const Text('2. SELECCIONAR BOUTIQUE / SUCURSAL', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.0)),
          const SizedBox(height: 8),
          if (_sucursales.isNotEmpty)
            DropdownButtonFormField<SucursalModel>(
              initialValue: _selectedSucursal,
              decoration: const InputDecoration(
                contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.zero),
              ),
              items: _sucursales.map((s) {
                return DropdownMenuItem(
                  value: s,
                  child: Text('${s.nombre} (${s.ciudadNombre ?? "Tienda"})', style: const TextStyle(fontSize: 13)),
                );
              }).toList(),
              onChanged: (val) => setState(() => _selectedSucursal = val),
            ),
          const SizedBox(height: 24),

          // 3. Fecha y Hora
          const Text('3. FECHA Y HORARIO DE ATENCIÓN', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.0)),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _selectedDate,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 30)),
                    );
                    if (picked != null) setState(() => _selectedDate = picked);
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                  ),
                  icon: const Icon(Icons.calendar_today, size: 16),
                  label: Text('${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}', style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _timeSlots.map((slot) {
              final isSel = _selectedTime == slot;
              return InkWell(
                onTap: () => setState(() => _selectedTime = slot),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSel ? Colors.black : Colors.white,
                    border: Border.all(color: isSel ? Colors.black : const Color(0xFFD1D5DB)),
                  ),
                  child: Text(slot, style: TextStyle(color: isSel ? Colors.white : Colors.black, fontWeight: FontWeight.bold, fontSize: 12)),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),

          // 4. Pago Mandatorio de Anticipo
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF9FAFB),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('4. PAGO MANDATORIO DE ANTICIPO', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1.0)),
                const SizedBox(height: 4),
                const Text(
                  'Garantía de probador: \$10.00 USD (Se descuenta del total si decidís comprar en sucursal).',
                  style: TextStyle(fontSize: 12, color: AppTheme.mutedColor),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () => setState(() => _metodoPago = 'QR_SIMPLE'),
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: _metodoPago == 'QR_SIMPLE' ? Colors.black : Colors.white,
                            border: Border.all(color: _metodoPago == 'QR_SIMPLE' ? Colors.black : const Color(0xFFD1D5DB)),
                          ),
                          child: Text(
                            'QR Simple',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: _metodoPago == 'QR_SIMPLE' ? Colors.white : Colors.black),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: InkWell(
                        onTap: () => setState(() => _metodoPago = 'TARJETA'),
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: _metodoPago == 'TARJETA' ? Colors.black : Colors.white,
                            border: Border.all(color: _metodoPago == 'TARJETA' ? Colors.black : const Color(0xFFD1D5DB)),
                          ),
                          child: Text(
                            'Tarjeta Crédito',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: _metodoPago == 'TARJETA' ? Colors.white : Colors.black),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Submit Button
          ElevatedButton(
            onPressed: _isLoading ? null : _submitReserva,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.black,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
            ),
            child: _isLoading
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('CONFIRMAR RESERVA Y ABONAR (\$10.00 USD)', style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.0)),
          ),
        ],
      ),
    );
  }

  Widget _buildMisReservasView() {
    if (_isLoadingReservas) {
      return const Center(child: CircularProgressIndicator(color: Colors.black));
    }

    if (_misReservas.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.event_seat_outlined, size: 64, color: Color(0xFFD1D5DB)),
              const SizedBox(height: 16),
              Text('No tenés citas programadas', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              const Text(
                'Agendá tu turno para probarte prendas exclusivas en tienda física.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppTheme.mutedColor, fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadMisReservas,
      color: Colors.black,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _misReservas.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final rsv = _misReservas[index];
          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(border: Border.all(color: const Color(0xFFE5E7EB))),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('CITA: ${rsv.codigoReserva}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      color: rsv.estado == 'CONFIRMADA' ? const Color(0xFFECFDF5) : const Color(0xFFFEF3C7),
                      child: Text(
                        rsv.estado,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: rsv.estado == 'CONFIRMADA' ? const Color(0xFF047857) : const Color(0xFFB45309),
                        ),
                      ),
                    ),
                  ],
                ),
                const Divider(height: 18, color: Color(0xFFE5E7EB)),
                _buildDetailRow('Sucursal:', rsv.sucursal?.nombre ?? 'Boutique Noir'),
                const SizedBox(height: 4),
                _buildDetailRow('Horario:', '${rsv.fechaReserva} - ${rsv.horaEstimada}'),
                const SizedBox(height: 4),
                _buildDetailRow('Prendas apartadas:', '${rsv.detalles.length} artículo(s)'),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _showQRModal(rsv),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.black,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                        ),
                        icon: const Icon(Icons.qr_code, size: 16),
                        label: const Text('VER PASE QR', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.mutedColor)),
        Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
