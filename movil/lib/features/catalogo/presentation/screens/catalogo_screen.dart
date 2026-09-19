import 'package:flutter/material.dart';
import '../../../../shared/widgets/atelier_scaffold.dart';
import '../../../../core/theme/app_theme.dart';
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
  final List<String> _sectores = ['TODAS', 'MUJERES', 'HOMBRES', 'UNISEX'];

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
          _prendas = prendas;
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
                      return _buildProductCard(context, prenda);
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

  Widget _buildProductCard(BuildContext context, PrendaModel prenda) {
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
            // Image with Badges
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.network(
                    prenda.portadaUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: const Color(0xFFF3F4F6),
                      child: const Center(
                        child: Icon(Icons.checkroom, size: 40, color: AppTheme.mutedColor),
                      ),
                    ),
                  ),
                  // AR Badge if applicable
                  if (prenda.tieneModelo3D)
                    Positioned(
                      top: 6,
                      right: 6,
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
