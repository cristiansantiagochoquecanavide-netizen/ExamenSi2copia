import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../shared/widgets/atelier_scaffold.dart';
import '../../../../shared/widgets/qr_code_painter.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/app_notification.dart';
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
                            'Bs. ${item.subtotal.toStringAsFixed(2)}',
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
                _buildSummaryRow('Subtotal', 'Bs. ${_cartService.subtotal.toStringAsFixed(2)}'),
                const SizedBox(height: 8),
                _buildSummaryRow('Envío', _tipoEntrega == 'DOMICILIO' ? 'Cortesía (Alta Costura)' : 'Gratis en Tienda', isHighlight: true),
                const Divider(height: 20, color: Color(0xFFE5E7EB)),
                _buildSummaryRow('Total', 'Bs. ${_cartService.total.toStringAsFixed(2)}', isTotal: true),
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
      return RefreshIndicator(
        onRefresh: _loadPedidos,
        color: Colors.black,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(32.0),
          children: [
            SizedBox(height: MediaQuery.of(context).size.height * 0.15),
            const Icon(Icons.receipt_long_outlined, size: 64, color: Color(0xFFD1D5DB)),
            const SizedBox(height: 16),
            Text(
              'No tenés pedidos registrados',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'Tus compras digitales e historial de órdenes aparecerán aquí.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.mutedColor, fontSize: 13),
            ),
            const SizedBox(height: 20),
            Center(
              child: OutlinedButton.icon(
                onPressed: _loadPedidos,
                icon: const Icon(Icons.refresh, size: 16),
                label: const Text('ACTUALIZAR PEDIDOS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.black,
                  side: const BorderSide(color: Colors.black),
                  shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
              ),
            ),
          ],
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
                    Text('Bs. ${pedido.total.toStringAsFixed(2)}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
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

enum _CheckoutStep { form, qrDisplay, success }

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

  // Controladores de Tarjeta de Crédito
  late TextEditingController _tarjetaNumeroCtrl;
  late TextEditingController _tarjetaTitularCtrl;
  late TextEditingController _tarjetaExpCtrl;
  late TextEditingController _tarjetaCvcCtrl;

  _CheckoutStep _step = _CheckoutStep.form;
  String _metodoPago = 'QR_SIMPLE'; // QR_SIMPLE o TARJETA
  bool _isLoading = false;
  bool _isVerifying = false;
  String? _errorMessage;

  String _codigoRecaudacion = '';
  Timer? _countdownTimer;
  int _remainingSeconds = 300; // 5 minutos para expiración QR
  VentaResponseModel? _createdVenta;

  @override
  void initState() {
    super.initState();
    _nombreCtrl = TextEditingController(text: widget.currentUser?.nombreCompleto ?? 'Cliente Fashion');
    _emailCtrl = TextEditingController(text: widget.currentUser?.email ?? 'cliente@fashionstore.com');
    _direccionCtrl = TextEditingController(text: widget.currentUser?.direccion ?? 'Av. San Martín #123');
    _ciudadCtrl = TextEditingController(text: 'Santa Cruz');

    _tarjetaNumeroCtrl = TextEditingController(text: '4532 0000 0000 1234');
    _tarjetaTitularCtrl = TextEditingController(text: widget.currentUser?.nombreCompleto.toUpperCase() ?? 'CLIENTE FASHION');
    _tarjetaExpCtrl = TextEditingController(text: '12/28');
    _tarjetaCvcCtrl = TextEditingController(text: '123');
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _nombreCtrl.dispose();
    _emailCtrl.dispose();
    _direccionCtrl.dispose();
    _ciudadCtrl.dispose();
    _tarjetaNumeroCtrl.dispose();
    _tarjetaTitularCtrl.dispose();
    _tarjetaExpCtrl.dispose();
    _tarjetaCvcCtrl.dispose();
    super.dispose();
  }

  void _startCountdown() {
    _countdownTimer?.cancel();
    _remainingSeconds = 300;
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds > 0) {
        if (mounted) setState(() => _remainingSeconds--);
      } else {
        timer.cancel();
      }
    });
  }

  String _formatCountdown(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  void _generateAndShowQR() {
    if (_nombreCtrl.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Por favor ingresa tu nombre completo.');
      return;
    }
    if (_emailCtrl.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Por favor ingresa tu correo electrónico.');
      return;
    }

    final randHex = Random().nextInt(0xFFFFFF).toRadixString(16).padLeft(6, '0').toUpperCase();
    final now = DateTime.now();
    final dateStr = '${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}';

    setState(() {
      _codigoRecaudacion = 'LIB-QR-$dateStr-$randHex';
      _errorMessage = null;
      _step = _CheckoutStep.qrDisplay;
    });

    _startCountdown();
  }

  Future<void> _verifyQRPayment() async {
    setState(() {
      _isVerifying = true;
      _errorMessage = null;
    });

    // Simulación de 3 segundos de verificación con la pasarela bancaria / Libélula
    await Future.delayed(const Duration(seconds: 3));

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
          metodoPago: 'QR_SIMPLE',
          pasarela: 'LIBELULA_BOLIVIA',
          monto: widget.cartService.total,
          moneda: 'BOB',
          clienteEmail: _emailCtrl.text.trim(),
        ),
      );

      final result = await _repository.procesarCheckout(request);

      if (mounted) {
        _countdownTimer?.cancel();
        widget.cartService.clear();
        widget.onSuccess();
        setState(() {
          _isVerifying = false;
          _createdVenta = result;
          _step = _CheckoutStep.success;
        });

        AppNotification.showSuccess(
          'Tu pedido #${result.codigoVenta} fue procesado correctamente.',
          title: 'Compra Realizada con éxito',
          actionLabel: 'VER BOLSA O CARRITO',
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceAll('Exception: ', '');
          _isVerifying = false;
        });
      }
    }
  }

  Future<void> _submitCardCheckout() async {
    if (_nombreCtrl.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Por favor ingresa el nombre completo del destinatario.');
      return;
    }
    if (_emailCtrl.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Por favor ingresa el correo electrónico.');
      return;
    }
    if (_tarjetaNumeroCtrl.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Por favor ingresa el número de tarjeta.');
      return;
    }
    if (_tarjetaTitularCtrl.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Por favor ingresa el nombre del titular.');
      return;
    }
    if (_tarjetaExpCtrl.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Por favor ingresa la fecha de expiración (MM/AA).');
      return;
    }
    if (_tarjetaCvcCtrl.text.trim().isEmpty) {
      setState(() => _errorMessage = 'Por favor ingresa el código CVC / CVV.');
      return;
    }

    final expParts = _tarjetaExpCtrl.text.trim().split('/');
    final mesExp = expParts.isNotEmpty ? expParts[0].trim().padLeft(2, '0') : '12';
    final anioExp = expParts.length > 1 ? expParts[1].trim() : '28';
    final rawCardNumber = _tarjetaNumeroCtrl.text.replaceAll(' ', '').replaceAll('-', '').trim();

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
          metodoPago: 'TARJETA',
          pasarela: 'STRIPE_INTL',
          monto: widget.cartService.total,
          moneda: 'BOB',
          clienteEmail: _emailCtrl.text.trim(),
          datosTarjeta: DatosTarjetaInput(
            numero: rawCardNumber,
            mesExp: mesExp,
            anioExp: anioExp,
            cvc: _tarjetaCvcCtrl.text.trim(),
            titular: _tarjetaTitularCtrl.text.trim().toUpperCase(),
          ),
        ),
      );

      final result = await _repository.procesarCheckout(request);

      if (mounted) {
        widget.cartService.clear();
        widget.onSuccess();
        setState(() {
          _isLoading = false;
          _createdVenta = result;
          _step = _CheckoutStep.success;
        });

        AppNotification.showSuccess(
          'Tu pedido #${result.codigoVenta} fue procesado correctamente.',
          title: 'Compra Realizada con éxito',
          actionLabel: 'VER BOLSA O CARRITO',
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

  // CU15: Procesamiento de Venta de Contado en Contingencia Offline (SQLite con UUIDv4)
  Future<void> _submitOfflineCheckout() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final items = widget.cartService.items
          .map((i) => {
                'variante_id': i.varianteId,
                'cantidad': i.cantidad,
                'precio_unitario': i.prenda.precioBase,
                'nombre': i.prenda.nombre,
              })
          .toList();

      final offlineUuid = await _repository.saveOfflineCashSale(
        montoTotal: widget.cartService.total,
        items: items,
      );

      final codigoVenta = 'VTA-OFF-${offlineUuid.substring(0, 8).toUpperCase()}';
      final ventaOffline = VentaResponseModel(
        id: 0,
        codigoVenta: codigoVenta,
        clienteNombre: _nombreCtrl.text.trim().isEmpty ? 'Cliente Mostrador' : _nombreCtrl.text.trim(),
        subtotal: widget.cartService.total,
        descuento: 0.0,
        costoEnvio: 0.0,
        total: widget.cartService.total,
        estado: 'REGISTRADO_OFFLINE',
        createdAt: DateTime.now().toUtc().toIso8601String(),
        envio: EnvioResponseModel(
          id: 0,
          tipoEntrega: 'TIENDA_FISICA',
          direccionLinea1: 'Retiro en Mostrador',
          ciudad: 'Santa Cruz',
          codigoSeguimiento: 'OFFLINE-$offlineUuid',
          estadoEnvio: 'ENTREGADO_EN_TIENDA',
          costoEnvio: 0.0,
        ),
      );

      if (mounted) {
        widget.cartService.clear();
        widget.onSuccess();
        setState(() {
          _isLoading = false;
          _createdVenta = ventaOffline;
          _step = _CheckoutStep.success;
        });

        AppNotification.showSuccess(
          'Venta en efectivo guardada en SQLite con UUIDv4 ($codigoVenta). Idempotencia garantizada (CU15)',
          title: 'Cobro Offline Registrado',
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Error al registrar venta local: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.90,
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
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              child: _buildCurrentStep(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentStep() {
    switch (_step) {
      case _CheckoutStep.form:
        return _buildFormStep();
      case _CheckoutStep.qrDisplay:
        return _buildQRDisplayStep();
      case _CheckoutStep.success:
        return _buildSuccessStep();
    }
  }

  // -------------------------------------------------------------
  // PASO 1: Formulario de Destinatario & Selección de Pasarela
  // -------------------------------------------------------------
  Widget _buildFormStep() {
    return SingleChildScrollView(
      key: const ValueKey('form_step'),
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
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: Color(0xFF991B1B), size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(_errorMessage!, style: const TextStyle(color: Color(0xFF991B1B), fontSize: 12)),
                  ),
                ],
              ),
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
          const Text('SELECCIONAR MÉTODO / PASARELA DE PAGO', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () => setState(() {
                    _metodoPago = 'QR_SIMPLE';
                    _errorMessage = null;
                  }),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                    decoration: BoxDecoration(
                      color: _metodoPago == 'QR_SIMPLE' ? const Color(0xFFF3F4F6) : Colors.white,
                      border: Border.all(color: _metodoPago == 'QR_SIMPLE' ? Colors.black : const Color(0xFFD1D5DB), width: _metodoPago == 'QR_SIMPLE' ? 1.5 : 1.0),
                    ),
                    child: const Column(
                      children: [
                        Icon(Icons.qr_code_2, size: 24),
                        SizedBox(height: 4),
                        Text('QR Simple', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11)),
                        Text('Libélula', style: TextStyle(fontSize: 9, color: AppTheme.mutedColor)),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: InkWell(
                  onTap: () => setState(() {
                    _metodoPago = 'TARJETA';
                    _errorMessage = null;
                  }),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                    decoration: BoxDecoration(
                      color: _metodoPago == 'TARJETA' ? const Color(0xFFF3F4F6) : Colors.white,
                      border: Border.all(color: _metodoPago == 'TARJETA' ? Colors.black : const Color(0xFFD1D5DB), width: _metodoPago == 'TARJETA' ? 1.5 : 1.0),
                    ),
                    child: const Column(
                      children: [
                        Icon(Icons.credit_card, size: 24),
                        SizedBox(height: 4),
                        Text('Tarjeta', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11)),
                        Text('Stripe', style: TextStyle(fontSize: 9, color: AppTheme.mutedColor)),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: InkWell(
                  onTap: () => setState(() {
                    _metodoPago = 'EFECTIVO_OFFLINE';
                    _errorMessage = null;
                  }),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                    decoration: BoxDecoration(
                      color: _metodoPago == 'EFECTIVO_OFFLINE' ? const Color(0xFFFEF3C7) : Colors.white,
                      border: Border.all(color: _metodoPago == 'EFECTIVO_OFFLINE' ? const Color(0xFFD97706) : const Color(0xFFD1D5DB), width: _metodoPago == 'EFECTIVO_OFFLINE' ? 1.5 : 1.0),
                    ),
                    child: const Column(
                      children: [
                        Icon(Icons.payments_outlined, size: 24, color: Color(0xFF92400E)),
                        SizedBox(height: 4),
                        Text('Efectivo', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11, color: Color(0xFF92400E))),
                        Text('Offline CU15', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFFB45309))),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),

          // CU15: Banner informativo de Contingencia Offline en Efectivo
          if (_metodoPago == 'EFECTIVO_OFFLINE') ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.offline_bolt, color: Color(0xFFD97706), size: 26),
                  SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'MODO CONTINGENCIA OFFLINE (CU15)',
                          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 11, color: Color(0xFF92400E)),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Cobro en efectivo guardado localmente en SQLite con UUIDv4 para sincronización asíncrona segura sin duplicidad.',
                          style: TextStyle(fontSize: 10, color: Color(0xFF78350F), height: 1.3),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Formulario Dinámico de Tarjeta de Crédito (Stripe Sandbox)
          if (_metodoPago == 'TARJETA') ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF9FAFB),
                border: Border.all(color: const Color(0xFFD1D5DB)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('DATOS DE LA TARJETA', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.8)),
                      Row(
                        children: [
                          Icon(Icons.lock_outline, size: 12, color: Color(0xFF047857)),
                          SizedBox(width: 4),
                          Text('STRIPE SECURE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF047857))),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _tarjetaNumeroCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Número de Tarjeta',
                      prefixIcon: Icon(Icons.credit_card, size: 20),
                      border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                      hintText: '4532 0000 0000 1234',
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _tarjetaTitularCtrl,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(
                      labelText: 'Nombre del Titular (como figura en la tarjeta)',
                      prefixIcon: Icon(Icons.person_outline, size: 20),
                      border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _tarjetaExpCtrl,
                          keyboardType: TextInputType.datetime,
                          decoration: const InputDecoration(
                            labelText: 'Vencimiento (MM/AA)',
                            prefixIcon: Icon(Icons.calendar_today_outlined, size: 18),
                            border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                            hintText: '12/28',
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: _tarjetaCvcCtrl,
                          keyboardType: TextInputType.number,
                          obscureText: true,
                          decoration: const InputDecoration(
                            labelText: 'CVC / CVV',
                            prefixIcon: Icon(Icons.lock_outline, size: 18),
                            border: OutlineInputBorder(borderRadius: BorderRadius.zero),
                            hintText: '123',
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 24),

          // Total a Pagar
          Container(
            padding: const EdgeInsets.all(14),
            color: const Color(0xFFF9FAFB),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('TOTAL A PAGAR:', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                Text('Bs. ${widget.cartService.total.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Action Button
          ElevatedButton(
            onPressed: _isLoading
                ? null
                : (_metodoPago == 'QR_SIMPLE'
                    ? _generateAndShowQR
                    : (_metodoPago == 'TARJETA' ? _submitCardCheckout : _submitOfflineCheckout)),
            style: ElevatedButton.styleFrom(
              backgroundColor: _metodoPago == 'EFECTIVO_OFFLINE' ? const Color(0xFFD97706) : Colors.black,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
            ),
            child: _isLoading
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : Text(
                    _metodoPago == 'QR_SIMPLE'
                        ? 'PAGAR CON QR SIMPLE'
                        : (_metodoPago == 'TARJETA'
                            ? 'CONFIRMAR PAGO CON TARJETA'
                            : 'REGISTRAR COBRO EN EFECTIVO (CU15)'),
                    style: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.0),
                  ),
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // PASO 2: Visualización de Código QR & Botón "VERIFICAR PAGO"
  // -------------------------------------------------------------
  Widget _buildQRDisplayStep() {
    final totalBob = widget.cartService.total;

    return SingleChildScrollView(
      key: const ValueKey('qr_step'),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header de Pasarela
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('PASARELA DE PAGO BOLIVIA', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1.2, color: AppTheme.mutedColor)),
                  SizedBox(height: 2),
                  Text('QR Simple Libélula', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  border: Border.all(color: const Color(0xFFF59E0B)),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.timer_outlined, size: 14, color: Color(0xFFB45309)),
                    const SizedBox(width: 4),
                    Text(
                      _formatCountdown(_remainingSeconds),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFFB45309)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              color: const Color(0xFFFEF2F2),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: Color(0xFF991B1B), size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(_errorMessage!, style: const TextStyle(color: Color(0xFF991B1B), fontSize: 12)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
          ],

          // Tarjeta del QR
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: const Color(0xFFD4AF37), width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              children: [
                // Monto
                Text(
                  'Bs. ${totalBob.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.black),
                ),
                const Text(
                  'Moneda Nacional (BOB)',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.mutedColor),
                ),
                const SizedBox(height: 16),

                // Canvas del QR Code
                Container(
                  width: 210,
                  height: 210,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                  ),
                  child: CustomPaint(
                    size: const Size(190, 190),
                    painter: _QRCodePainter(
                      data: 'LIBELULA-BO|REC:$_codigoRecaudacion|MONTO:$totalBob|CLI:${_emailCtrl.text}',
                      primaryColor: Colors.black,
                      backgroundColor: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Código de Recaudación
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  color: const Color(0xFFF3F4F6),
                  child: Text(
                    _codigoRecaudacion,
                    style: const TextStyle(fontFamily: 'monospace', fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Instrucciones de Pago
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF9FAFB),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('INSTRUCCIONES DE PAGO:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.8)),
                SizedBox(height: 6),
                Text('1. Abre tu aplicación bancaria móvil (BNB, BCP, Banco Unión, GanaMóvil, etc.)', style: TextStyle(fontSize: 11, color: Color(0xFF4B5563))),
                SizedBox(height: 3),
                Text('2. Selecciona la opción de Pago con QR Simple.', style: TextStyle(fontSize: 11, color: Color(0xFF4B5563))),
                SizedBox(height: 3),
                Text('3. Escanea el código superior y confirma la transferencia.', style: TextStyle(fontSize: 11, color: Color(0xFF4B5563))),
                SizedBox(height: 3),
                Text('4. Presiona el botón "VERIFICAR PAGO" para confirmar tu pedido.', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.black)),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Botón Principal: VERIFICAR PAGO
          ElevatedButton.icon(
            onPressed: _isVerifying ? null : _verifyQRPayment,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFD4AF37),
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
            ),
            icon: _isVerifying
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                : const Icon(Icons.verified_user_outlined, size: 20),
            label: Text(
              _isVerifying ? 'VERIFICANDO PAGO CON EL BANCO...' : 'VERIFICAR PAGO',
              style: const TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.0, fontSize: 13),
            ),
          ),
          const SizedBox(height: 10),

          // Botón Secundario: Volver
          OutlinedButton(
            onPressed: _isVerifying
                ? null
                : () {
                    _countdownTimer?.cancel();
                    setState(() => _step = _CheckoutStep.form);
                  },
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.black,
              side: const BorderSide(color: Color(0xFFD1D5DB)),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
            ),
            child: const Text('CAMBIAR MÉTODO DE PAGO', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // PASO 3: Pantalla de ¡PAGO EXITOSO!
  // -------------------------------------------------------------
  Widget _buildSuccessStep() {
    final orderCode = _createdVenta?.codigoVenta ?? 'VTA-ONL-2026';
    final tracking = _createdVenta?.envio?.codigoSeguimiento ?? 'ENV-SEGUIMIENTO-ACTIVO';
    final total = _createdVenta?.total ?? widget.cartService.total;

    return SingleChildScrollView(
      key: const ValueKey('success_step'),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 10),
          // Icono Éxito
          Center(
            child: Container(
              width: 76,
              height: 76,
              decoration: const BoxDecoration(
                color: Color(0xFFECFDF5),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle_rounded,
                color: Color(0xFF10B981),
                size: 54,
              ),
            ),
          ),
          const SizedBox(height: 16),

          const Center(
            child: Text(
              '¡PAGO EXITOSO!',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.0,
                color: Color(0xFF047857),
              ),
            ),
          ),
          const SizedBox(height: 4),
          const Center(
            child: Text(
              'Tu compra ha sido acreditada y registrada con éxito en Atelier Noir.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Color(0xFF4B5563)),
            ),
          ),
          const SizedBox(height: 24),

          // Resumen de Orden
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF9FAFB),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildReceiptRow('N° de Orden:', orderCode, isBold: true),
                const Divider(height: 16, color: Color(0xFFE5E7EB)),
                _buildReceiptRow('Destinatario:', _nombreCtrl.text.trim()),
                const SizedBox(height: 6),
                _buildReceiptRow(
                  'Método:',
                  _metodoPago == 'QR_SIMPLE'
                      ? 'QR Simple (Libélula)'
                      : (_metodoPago == 'TARJETA'
                          ? 'Tarjeta de Crédito'
                          : 'Efectivo Contado (Contingencia Offline CU15)'),
                ),
                const SizedBox(height: 6),
                _buildReceiptRow('Código de Envío:', tracking, isHighlight: true),
                const Divider(height: 16, color: Color(0xFFE5E7EB)),
                _buildReceiptRow('Total Pagado:', 'Bs. ${total.toStringAsFixed(2)}', isTotal: true),
              ],
            ),
          ),
          const SizedBox(height: 28),

          // Botón Finalizar
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.black,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
            ),
            child: const Text(
              'VER MIS PEDIDOS / CONTINUAR',
              style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.0),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReceiptRow(String label, String value, {bool isBold = false, bool isTotal = false, bool isHighlight = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isTotal ? 13 : 11,
            fontWeight: isTotal ? FontWeight.w800 : FontWeight.w500,
            color: const Color(0xFF6B7280),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isTotal ? 15 : 12,
            fontWeight: (isBold || isTotal) ? FontWeight.w900 : FontWeight.w700,
            color: isHighlight
                ? const Color(0xFF047857)
                : (isTotal ? Colors.black : const Color(0xFF111827)),
          ),
        ),
      ],
    );
  }
}

/// Painter personalizado reutilizado desde AtelierQRCodePainter
typedef _QRCodePainter = AtelierQRCodePainter;

