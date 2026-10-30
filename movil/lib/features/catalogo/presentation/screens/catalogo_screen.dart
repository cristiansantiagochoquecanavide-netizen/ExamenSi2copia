import 'package:flutter/material.dart';
import '../../../../shared/widgets/atelier_scaffold.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/app_notification.dart';
import '../../data/repositories/catalogo_repository.dart';
import '../../domain/models/catalogo_models.dart';
import '../widgets/prenda_detail_modal.dart';

class CatalogoScreen extends StatefulWidget {
  const CatalogoScreen({super.key});

  @override
  State<CatalogoScreen> createState() => _CatalogoScreenState();
}

class _CatalogoScreenState extends State<CatalogoScreen> {
  final CatalogoRepository _repository = CatalogoRepository();
  final TextEditingController _searchController = TextEditingController();

  List<PrendaModel> _prendas = [];
  bool _isLoading = true;
  String? _errorMessage;

  String _selectedSector = 'TODAS';
  String _selectedPriceFilter = 'TODOS';
  String? _tenantNombre;
  String? _planCodigo;
  final List<String> _sectores = ['TODAS', 'MUJERES', 'HOMBRES', 'UNISEX'];
  bool _isSyncing = false;

  Future<void> _syncOfflineCatalog() async {
    setState(() => _isSyncing = true);
    try {
      final count = await _repository.syncCatalogToLocalStorage();
      if (mounted) {
        AppNotification.showSuccess(
          'Catálogo offline sincronizado: $count prendas con medidas guardadas en SQLite (CU08)',
        );
      }
    } catch (e) {
      if (mounted) {
        AppNotification.showError('Error al sincronizar offline: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isSyncing = false);
      }
    }
  }

  @override
  void initState() {
    super.initState();
    _loadPrendas();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadPrendas() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final sectorParam = _selectedSector == 'TODAS' ? null : _selectedSector;
      final prendas = await _repository.getPrendas(
        sector: sectorParam,
        search: _searchController.text,
      );

      if (mounted) {
        setState(() {
          var filtered = prendas;
          if (_selectedPriceFilter == 'MENOR_200') {
            filtered = filtered.where((p) => p.precioBase < 200).toList();
          } else if (_selectedPriceFilter == '200_400') {
            filtered = filtered.where((p) => p.precioBase >= 200 && p.precioBase <= 400).toList();
          } else if (_selectedPriceFilter == 'MAYOR_400') {
            filtered = filtered.where((p) => p.precioBase > 400).toList();
          }
          _prendas = filtered;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  void _onSectorSelected(String sector) {
    setState(() {
      _selectedSector = sector;
    });
    _loadPrendas();
  }

  String _getSectorLabel(String sector) {
    switch (sector) {
      case 'TODAS':
        return 'TODAS';
      case 'MUJERES':
        return 'MUJER';
      case 'HOMBRES':
        return 'HOMBRE';
      case 'UNISEX':
        return 'UNISEX';
      default:
        return sector;
    }
  }

  @override
  Widget build(BuildContext context) {
    return AtelierScaffold(
      currentRoute: '/catalogo',
      child: RefreshIndicator(
        color: AppTheme.primaryColor,
        onRefresh: _loadPrendas,
        child: CustomScrollView(
          slivers: [
            // Header Section
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '• CATÁLOGO DIGITAL CON AR •',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            letterSpacing: 2.0,
                            color: AppTheme.mutedColor,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Colección',
                      style: Theme.of(context).textTheme.displayLarge?.copyWith(
                            fontSize: 32,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Sastrería contemporánea, siluetas desestructuradas y tecnología de Realidad Aumentada (AR) con modelos 3D.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppTheme.mutedColor,
                            height: 1.4,
                          ),
                    ),
                    const SizedBox(height: 16),

                    
                    // Multi-tenant Active Badge (CU05)
                    if (_tenantNombre != null)
                      Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: _tenantNombre!.contains('Urban') ? const Color(0xFFF0FDF4) : const Color(0xFFEEF2FF),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: _tenantNombre!.contains('Urban') ? const Color(0xFFBBF7D0) : const Color(0xFFC7D2FE),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.apartment,
                              size: 14,
                              color: _tenantNombre!.contains('Urban') ? const Color(0xFF166534) : const Color(0xFF3730A3),
                            ),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                '$_tenantNombre • $_planCodigo',
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: _tenantNombre!.contains('Urban') ? const Color(0xFF166534) : const Color(0xFF3730A3),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                    // Search Input
                    TextField(
                      controller: _searchController,
                      onSubmitted: (_) => _loadPrendas(),
                      decoration: InputDecoration(
                        hintText: 'Buscar prendas, SKU, telas...',
                        hintStyle: const TextStyle(fontSize: 13, color: AppTheme.subtleColor),
                        prefixIcon: const Icon(Icons.search, size: 20, color: AppTheme.mutedColor),
                        suffixIcon: _searchController.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 18),
                                onPressed: () {
                                  _searchController.clear();
                                  _loadPrendas();
                                },
                              )
                            : null,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        border: const OutlineInputBorder(
                          borderRadius: BorderRadius.zero,
                          borderSide: BorderSide(color: Color(0xFFE5E7EB)),
                        ),
                        focusedBorder: const OutlineInputBorder(
                          borderRadius: BorderRadius.zero,
                          borderSide: BorderSide(color: Colors.black, width: 1.5),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // CU08: Botón Sincronización Catálogo Offline (SQLite)
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: _isSyncing ? null : _syncOfflineCatalog,
                        icon: _isSyncing
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF92400E)),
                              )
                            : const Icon(Icons.download_for_offline_outlined, size: 16),
                        label: Text(
                          _isSyncing ? 'SINCRONIZANDO CON SQLITE...' : 'DESCARGAR CATÁLOGO OFFLINE (CU08)',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFEF3C7),
                          foregroundColor: const Color(0xFF92400E),
                          elevation: 0,
                          side: const BorderSide(color: Color(0xFFF59E0B)),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Sector Filter Pills
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: _sectores.map((sector) {
                          final isSelected = _selectedSector == sector;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8.0),
                            child: InkWell(
                              onTap: () => _onSectorSelected(sector),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                decoration: BoxDecoration(
                                  color: isSelected ? Colors.black : Colors.white,
                                  border: Border.all(
                                    color: isSelected ? Colors.black : const Color(0xFFD1D5DB),
                                  ),
                                ),
                                child: Text(
                                  _getSectorLabel(sector),
                                  style: TextStyle(
                                    color: isSelected ? Colors.white : const Color(0xFF111827),
                                    fontWeight: FontWeight.w700,
                                    fontSize: 11,
                                    letterSpacing: 1.0,
                                  ),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 8),
                    // Price Filter Chips (CU07)
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          {'key': 'TODOS', 'label': 'Todos los precios'},
                          {'key': 'MENOR_200', 'label': '< Bs. 200'},
                          {'key': '200_400', 'label': 'Bs. 200 - 400'},
                          {'key': 'MAYOR_400', 'label': '> Bs. 400'},
                        ].map((pf) {
                          final isSel = _selectedPriceFilter == pf['key'];
                          return Padding(
                            padding: const EdgeInsets.only(right: 6.0),
                            child: InkWell(
                              onTap: () {
                                setState(() {
                                  _selectedPriceFilter = pf['key']!;
                                });
                                _loadPrendas();
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: isSel ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  pf['label']!,
                                  style: TextStyle(
                                    color: isSel ? Colors.white : const Color(0xFF475569),
                                    fontSize: 10,
                                    fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                                  ),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Content State (Loading, Error, or Product Grid)
            if (_isLoading)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: CircularProgressIndicator(color: AppTheme.primaryColor),
                ),
              )
            else if (_errorMessage != null)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Center(
                    child: SingleChildScrollView(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.cloud_off_outlined, size: 48, color: AppTheme.mutedColor),
                          const SizedBox(height: 12),
                          Text(
                            'No se pudo cargar el catálogo',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _errorMessage!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 12, color: AppTheme.mutedColor),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: _loadPrendas,
                            child: const Text('REINTENTAR'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              )
            else if (_prendas.isEmpty)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.inventory_2_outlined, size: 48, color: AppTheme.subtleColor),
                      SizedBox(height: 12),
                      Text(
                        'No hay prendas disponibles en este sector',
                        style: TextStyle(color: AppTheme.mutedColor, fontSize: 14),
                      ),
                    ],
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.62,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 16,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final prenda = _prendas[index];
                      return _CatalogoProductCard(prenda: prenda);
                    },
                    childCount: _prendas.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _CatalogoProductCard extends StatefulWidget {
  final PrendaModel prenda;

  const _CatalogoProductCard({required this.prenda});

  @override
  State<_CatalogoProductCard> createState() => _CatalogoProductCardState();
}

class _CatalogoProductCardState extends State<_CatalogoProductCard> {
  late final PageController _pageController;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final prenda = widget.prenda;
    final images = prenda.imagenesUrls;
    final total = images.length;

    return InkWell(
      onTap: () => PrendaDetailModal.show(context, prenda),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image Slider / Stack with Badges
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  PageView.builder(
                    controller: _pageController,
                    itemCount: total,
                    onPageChanged: (idx) {
                      setState(() => _currentIndex = idx);
                    },
                    itemBuilder: (context, idx) {
                      return Image.network(
                        images[idx],
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          color: const Color(0xFFF3F4F6),
                          child: const Center(
                            child: Icon(Icons.checkroom, size: 40, color: AppTheme.mutedColor),
                          ),
                        ),
                      );
                    },
                  ),

                  // AR Badge if applicable (top-left)
                  if (prenda.tieneModelo3D)
                    Positioned(
                      top: 6,
                      left: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                        color: Colors.black.withAlpha(220),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.view_in_ar, size: 12, color: Colors.white),
                            SizedBox(width: 3),
                            Text(
                              'AR',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                  // Number of images badge (top-right) e.g. "1/3" or "3 fotos"
                  if (total > 1)
                    Positioned(
                      top: 6,
                      right: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.72),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.photo_library_outlined, size: 10, color: Colors.white),
                            const SizedBox(width: 3),
                            Text(
                              '${_currentIndex + 1}/$total',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                  // Sector tag bottom left
                  Positioned(
                    bottom: 6,
                    left: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      color: Colors.white.withAlpha(235),
                      child: Text(
                        prenda.categoria?.nombre.toUpperCase() ?? 'PRENDA',
                        style: const TextStyle(
                          fontSize: 8,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                          color: Colors.black,
                        ),
                      ),
                    ),
                  ),

                  // Dots pagination indicator bottom right if multiple images
                  if (total > 1)
                    Positioned(
                      bottom: 8,
                      right: 8,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: List.generate(total, (i) {
                          final active = i == _currentIndex;
                          return Container(
                            margin: const EdgeInsets.symmetric(horizontal: 1.5),
                            width: active ? 10 : 4,
                            height: 4,
                            decoration: BoxDecoration(
                              color: active ? Colors.white : Colors.white.withValues(alpha: 0.5),
                              borderRadius: BorderRadius.circular(2),
                              boxShadow: const [
                                BoxShadow(color: Colors.black26, blurRadius: 1),
                              ],
                            ),
                          );
                        }),
                      ),
                    ),
                ],
              ),
            ),

            // Card Body
            Padding(
              padding: const EdgeInsets.all(10.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    prenda.nombre,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF111827),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    prenda.descripcion,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppTheme.mutedColor,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    prenda.precioFormatted,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: Colors.black,
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
