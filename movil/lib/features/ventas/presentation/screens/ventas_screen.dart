import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../shared/widgets/atelier_scaffold.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/services/cart_service.dart';
import '../../../usuarios/data/repositories/auth_repository.dart';
import '../../../usuarios/domain/models/usuario_model.dart';
import '../../data/repositories/ventas_repository.dart';
import '../../domain/models/ventas_models.dart';

class VentasScreen extends StatefulWidget {
  const VentasScreen({super.key});

  @override
  State<VentasScreen> createState() => _VentasScreenState();
}

class _VentasScreenState extends State<VentasScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final CartService _cartService = CartService.instance;
  final VentasRepository _ventasRepository = VentasRepository();
  final AuthRepository _authRepository = AuthRepository();

  String _tipoEntrega = 'DOMICILIO';
  UsuarioModel? _currentUser;
  List<VentaResponseModel> _misPedidos = [];
  bool _isLoadingPedidos = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _cartService.addListener(_onCartChanged);
    _loadUserData();
    _loadPedidos();
  }

  @override
  void dispose() {
    _cartService.removeListener(_onCartChanged);
    _tabController.dispose();
    super.dispose();
  }

  void _onCartChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _loadUserData() async {
    final user = await _authRepository.getCurrentUser();
    if (mounted) setState(() => _currentUser = user);
  }

  Future<void> _loadPedidos() async {
    setState(() => _isLoadingPedidos = true);
    final pedidos = await _ventasRepository.getPedidosOnline();
    if (mounted) {
      setState(() {
        _misPedidos = pedidos;
        _isLoadingPedidos = false;
      });
    }
  }

  void _handleDeleteItem(int index) {
    if (index < 0 || index >= _cartService.items.length) return;
    final item = _cartService.items[index];

    if (item.cantidad > 1) {
      showModalBottomSheet(
        context: context,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        builder: (ctx) => Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'MODIFICAR PRENDA EN BOLSA',
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1.2, color: AppTheme.mutedColor),
              ),
              const SizedBox(height: 6),
              Text(
                'Tenés ${item.cantidad} unidades de "${item.prenda.nombre}".',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              const Text(
                '¿Deseás restar 1 unidad o eliminar todo este producto de la bolsa?',
                style: TextStyle(fontSize: 13, color: AppTheme.mutedColor),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  _cartService.updateQuantity(index, item.cantidad - 1);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.black,
                  foregroundColor: Colors.white,
                  shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text('RESTAR 1 UNIDAD (DEJAR EN 1)', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
              ),
              const SizedBox(height: 10),
              OutlinedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  _cartService.removeItem(index);
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFDC2626),
                  side: const BorderSide(color: Color(0xFFDC2626)),
                  shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text('ELIMINAR PRODUCTO COMPLETO', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
              ),
            ],
          ),
        ),
      );
    } else {
      _cartService.removeItem(index);
    }
  }

  void _openCheckoutDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _CheckoutModal(
        cartService: _cartService,
        tipoEntrega: _tipoEntrega,
        currentUser: _currentUser,
        onSuccess: () {
          _loadPedidos();
          _tabController.animateTo(1);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AtelierScaffold(
      currentRoute: '/ventas',
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
              tabs: [
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('BOLSA DE COMPRAS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.0)),
                      if (_cartService.totalItemsCount > 0) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: const BoxDecoration(color: Colors.black),
                          child: Text(
                            '${_cartService.totalItemsCount}',
                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const Tab(
                  child: Text('MIS PEDIDOS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.0)),
                ),
              ],
            ),
          ),

          // Tab Views
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildCartView(),
                _buildPedidosView(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCartView() {
    final items = _cartService.items;

    if (items.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.shopping_bag_outlined, size: 64, color: Color(0xFFD1D5DB)),
              const SizedBox(height: 16),
              Text('Tu bolsa de compras está vacía', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              const Text(
                'Explorá la colección de alta costura y agregá tus prendas favoritas.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppTheme.mutedColor, fontSize: 13),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => context.go('/catalogo'),
                child: const Text('EXPLORAR CATÁLOGO'),
              ),
            ],
          ),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Items List
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final item = items[index];
              return Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Image Thumbnail
                    ClipRRect(
                      borderRadius: BorderRadius.zero,
                      child: SizedBox(
                        width: 72,
                        height: 90,
                        child: Image.network(
                          item.prenda.portadaUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: const Color(0xFFF3F4F6),
                            child: const Icon(Icons.checkroom, color: AppTheme.mutedColor),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),

                    // Details
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.prenda.nombre,
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              if (item.talla != null)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  margin: const EdgeInsets.only(right: 6),
                                  decoration: BoxDecoration(border: Border.all(color: const Color(0xFFD1D5DB))),
                                  child: Text('Talla: ${item.talla!.codigo}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                                ),
                              if (item.color != null)
                                Text(
                                  item.color!.nombre,
                                  style: const TextStyle(fontSize: 11, color: AppTheme.mutedColor),
                                ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '\$${item.subtotal.toStringAsFixed(2)}',
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                          ),
                        ],
                      ),
                    ),

                    // Quantity Controls & Trash
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: const Icon(Icons.delete_outline, size: 22, color: Color(0xFFEF4444)),
                          onPressed: () => _handleDeleteItem(index),
                        ),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            InkWell(
                              onTap: () => _cartService.updateQuantity(index, item.cantidad - 1),
                              child: Container(
                                width: 28,
                                height: 28,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF9FAFB),
                                  border: Border.all(color: const Color(0xFFD1D5DB)),
                                ),
                                child: const Icon(Icons.remove, size: 16),
                              ),
                            ),
                            Container(
                              constraints: const BoxConstraints(minWidth: 32),
                              alignment: Alignment.center,
                              child: Text(
                                '${item.cantidad}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                            ),
                            InkWell(
                              onTap: () => _cartService.updateQuantity(index, item.cantidad + 1),
                              child: Container(
                                width: 28,
                                height: 28,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF9FAFB),
                                  border: Border.all(color: const Color(0xFFD1D5DB)),
                                ),
                                child: const Icon(Icons.add, size: 16),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 20),

          // Modalidad de Entrega Selector
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF9FAFB),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('MODALIDAD DE ENTREGA', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1.0)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () => setState(() => _tipoEntrega = 'DOMICILIO'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                          decoration: BoxDecoration(
                            color: _tipoEntrega == 'DOMICILIO' ? Colors.black : Colors.white,
                            border: Border.all(color: _tipoEntrega == 'DOMICILIO' ? Colors.black : const Color(0xFFD1D5DB)),
                          ),
                          child: Text(
                            'Despacho Domicilio',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: _tipoEntrega == 'DOMICILIO' ? Colors.white : Colors.black,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: InkWell(
                        onTap: () => setState(() => _tipoEntrega = 'RECOJO_TIENDA'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                          decoration: BoxDecoration(
                            color: _tipoEntrega == 'RECOJO_TIENDA' ? Colors.black : Colors.white,
                            border: Border.all(color: _tipoEntrega == 'RECOJO_TIENDA' ? Colors.black : const Color(0xFFD1D5DB)),
                          ),
                          child: Text(
                            'Recojo en Sucursal',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: _tipoEntrega == 'RECOJO_TIENDA' ? Colors.white : Colors.black,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Order Summary Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFFAFAFA),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Column(
              children: [
                _buildSummaryRow('Subtotal', '\$${_cartService.subtotal.toStringAsFixed(2)}'),
                const SizedBox(height: 8),
                _buildSummaryRow('Envío', _tipoEntrega == 'DOMICILIO' ? 'Cortesía (Alta Costura)' : 'Gratis en Tienda', isHighlight: true),
                const Divider(height: 20, color: Color(0xFFE5E7EB)),
                _buildSummaryRow('Total', '\$${_cartService.total.toStringAsFixed(2)}', isTotal: true),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Checkout Button
          ElevatedButton(
            onPressed: _openCheckoutDialog,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.black,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
            ),
            child: const Text('CONTINUAR AL CHECKOUT (PAGOS)', style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2)),
          ),
        ],
      ),
    );
  }

  Widget _buildPedidosView() {
    if (_isLoadingPedidos) {
      return const Center(child: CircularProgressIndicator(color: Colors.black));
    }

    if (_misPedidos.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.receipt_long_outlined, size: 64, color: Color(0xFFD1D5DB)),
              const SizedBox(height: 16),
              Text('No tenés pedidos registrados', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              const Text(
                'Tus compras digitales e historial de órdenes aparecerán aquí.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppTheme.mutedColor, fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadPedidos,
      color: Colors.black,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _misPedidos.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final pedido = _misPedidos[index];
          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('ORDEN: ${pedido.codigoVenta}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, letterSpacing: 0.5)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      color: pedido.estado == 'COMPLETADO' ? const Color(0xFFECFDF5) : const Color(0xFFFEF3C7),
                      child: Text(
                        pedido.estado,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: pedido.estado == 'COMPLETADO' ? const Color(0xFF047857) : const Color(0xFFB45309),
                        ),
                      ),
                    ),
                  ],
                ),
                const Divider(height: 18, color: Color(0xFFE5E7EB)),
                if (pedido.envio != null) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Seguimiento:', style: TextStyle(fontSize: 12, color: AppTheme.mutedColor)),
                      Text(pedido.envio!.codigoSeguimiento, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Estado de Envío:', style: TextStyle(fontSize: 12, color: AppTheme.mutedColor)),
                      Text(pedido.envio!.estadoEnvio, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.blue)),
                    ],
                  ),
                  const SizedBox(height: 6),
                ],
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    Text('\$${pedido.total.toStringAsFixed(2)}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isTotal = false, bool isHighlight = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isTotal ? 14 : 12,
            fontWeight: isTotal ? FontWeight.w800 : FontWeight.w500,
            color: isTotal ? Colors.black : const Color(0xFF4B5563),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isTotal ? 16 : 12,
            fontWeight: isTotal ? FontWeight.w800 : FontWeight.w600,
            color: isHighlight ? const Color(0xFF047857) : Colors.black,
          ),
        ),
      ],
    );
  }
}

class _CheckoutModal extends StatefulWidget {
  final CartService cartService;
  final String tipoEntrega;
  final UsuarioModel? currentUser;
  final VoidCallback onSuccess;

  const _CheckoutModal({
    required this.cartService,
    required this.tipoEntrega,
    required this.currentUser,
    required this.onSuccess,
  });

  @override
  State<_CheckoutModal> createState() => _CheckoutModalState();
}

class _CheckoutModalState extends State<_CheckoutModal> {
  final VentasRepository _repository = VentasRepository();

  late TextEditingController _nombreCtrl;
  late TextEditingController _emailCtrl;
  late TextEditingController _direccionCtrl;
  late TextEditingController _ciudadCtrl;

  String _metodoPago = 'QR_SIMPLE'; // QR_SIMPLE o TARJETA
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _nombreCtrl = TextEditingController(text: widget.currentUser?.nombreCompleto ?? 'Cliente Fashion');
    _emailCtrl = TextEditingController(text: widget.currentUser?.email ?? 'cliente@fashionstore.com');
    _direccionCtrl = TextEditingController(text: widget.currentUser?.direccion ?? 'Av. San Martín #123');
    _ciudadCtrl = TextEditingController(text: 'Santa Cruz');
  }

  @override
  void dispose() {
    _nombreCtrl.dispose();
    _emailCtrl.dispose();
    _direccionCtrl.dispose();
    _ciudadCtrl.dispose();
    super.dispose();
  }

  Future<void> _submitCheckout() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final detalles = widget.cartService.items
          .map((i) => DetalleVentaInput(
                varianteId: i.varianteId,
                cantidad: i.cantidad,
                precioUnitario: i.prenda.precioBase,
              ))
          .toList();

      final request = VentaOnlineCheckoutRequest(
        clienteNombre: _nombreCtrl.text.trim(),
        clienteEmail: _emailCtrl.text.trim(),
        clienteNit: widget.currentUser?.ciNit ?? '0',
        detalles: detalles,
        envio: DatosEnvioInput(
          tipoEntrega: widget.tipoEntrega,
          direccionLinea1: _direccionCtrl.text.trim(),
          ciudad: _ciudadCtrl.text.trim(),
        ),
        pago: PagoOnlineInput(
          metodoPago: _metodoPago,
          pasarela: _metodoPago == 'QR_SIMPLE' ? 'LIBELULA_BOLIVIA' : 'STRIPE_INTL',
          monto: widget.cartService.total,
          moneda: 'USD',
          clienteEmail: _emailCtrl.text.trim(),
          datosTarjeta: _metodoPago == 'TARJETA'
              ? const DatosTarjetaInput(
                  numero: '4532000000001234',
                  mesExp: '12',
                  anioExp: '28',
                  cvc: '123',
                  titular: 'CLIENTE FASHION',
                )
              : null,
        ),
      );

      final result = await _repository.procesarCheckout(request);

      if (mounted) {
        widget.cartService.clear();
        Navigator.pop(context);
        widget.onSuccess();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            duration: const Duration(seconds: 3),
            backgroundColor: Colors.black,
            content: Text('¡Compra procesada con éxito! Orden: ${result.codigoVenta}'),
            behavior: SnackBarBehavior.floating,
          ),
        );
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

  @override
  Widget build(BuildContext context) {
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
            decoration: BoxDecoration(color: const Color(0xFFD1D5DB), borderRadius: BorderRadius.circular(2)),
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('CHECKOUT & PASARELA DE PAGO', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1.5, color: AppTheme.mutedColor)),
                  const SizedBox(height: 4),
                  Text('Finalizar Compra', style: Theme.of(context).textTheme.displayMedium),
                  const SizedBox(height: 16),

                  if (_errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      color: const Color(0xFFFEF2F2),
                      child: Text(_errorMessage!, style: const TextStyle(color: Color(0xFF991B1B), fontSize: 12)),
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Datos del Cliente
                  const Text('DATOS DEL DESTINATARIO', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _nombreCtrl,
                    decoration: const InputDecoration(labelText: 'Nombre Completo', border: OutlineInputBorder(borderRadius: BorderRadius.zero)),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _emailCtrl,
                    decoration: const InputDecoration(labelText: 'Correo Electrónico', border: OutlineInputBorder(borderRadius: BorderRadius.zero)),
                  ),
                  if (widget.tipoEntrega == 'DOMICILIO') ...[
                    const SizedBox(height: 10),
                    TextField(
                      controller: _direccionCtrl,
                      decoration: const InputDecoration(labelText: 'Dirección de Entrega', border: OutlineInputBorder(borderRadius: BorderRadius.zero)),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _ciudadCtrl,
                      decoration: const InputDecoration(labelText: 'Ciudad / Departamento', border: OutlineInputBorder(borderRadius: BorderRadius.zero)),
                    ),
                  ],
                  const SizedBox(height: 20),

                  // Pasarela de Pagos Selector
                  const Text('SELECCIONAR PASARELA DE PAGO', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => _metodoPago = 'QR_SIMPLE'),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: _metodoPago == 'QR_SIMPLE' ? const Color(0xFFF3F4F6) : Colors.white,
                              border: Border.all(color: _metodoPago == 'QR_SIMPLE' ? Colors.black : const Color(0xFFD1D5DB), width: _metodoPago == 'QR_SIMPLE' ? 1.5 : 1.0),
                            ),
                            child: const Column(
                              children: [
                                Icon(Icons.qr_code_2, size: 28),
                                SizedBox(height: 4),
                                Text('QR Simple', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                                Text('Libélula Bolivia', style: TextStyle(fontSize: 10, color: AppTheme.mutedColor)),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => _metodoPago = 'TARJETA'),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: _metodoPago == 'TARJETA' ? const Color(0xFFF3F4F6) : Colors.white,
                              border: Border.all(color: _metodoPago == 'TARJETA' ? Colors.black : const Color(0xFFD1D5DB), width: _metodoPago == 'TARJETA' ? 1.5 : 1.0),
                            ),
                            child: const Column(
                              children: [
                                Icon(Icons.credit_card, size: 28),
                                SizedBox(height: 4),
                                Text('Tarjeta Crédito', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                                Text('Stripe Sandbox', style: TextStyle(fontSize: 10, color: AppTheme.mutedColor)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Total a Pagar
                  Container(
                    padding: const EdgeInsets.all(14),
                    color: const Color(0xFFF9FAFB),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('TOTAL A PAGAR:', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                        Text('\$${widget.cartService.total.toStringAsFixed(2)} USD', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Submit Button
                  ElevatedButton(
                    onPressed: _isLoading ? null : _submitCheckout,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                    ),
                    child: _isLoading
                        ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Text(
                            _metodoPago == 'QR_SIMPLE' ? 'PAGAR CON QR SIMPLE' : 'CONFIRMAR PAGO CON TARJETA',
                            style: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.0),
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
}
