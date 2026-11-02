import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../services/cart_service.dart';
import 'diamond_logo.dart';

class AtelierScaffold extends StatelessWidget {
  final Widget child;
  final String currentRoute;

  const AtelierScaffold({
    super.key,
    required this.child,
    required this.currentRoute,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppTheme.surfaceColor,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Row(
          children: [
            const DiamondLogo(size: 26),
            const SizedBox(width: 10),
            Text(
              'FASHION',
              style: Theme.of(context).textTheme.displayMedium?.copyWith(
                    fontSize: 18,
                    letterSpacing: 2.0,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(width: 7),
            Text(
              'STORE',
              style: Theme.of(context).textTheme.displayMedium?.copyWith(
                    fontSize: 18,
                    letterSpacing: 2.0,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync_outlined, color: Colors.black),
            tooltip: 'Sincronización Offline (CU16)',
            onPressed: () => context.go('/sincronizacion'),
          ),
          IconButton(
            icon: const Icon(Icons.notifications_outlined, color: Colors.black),
            tooltip: 'Alertas & Notificaciones',
            onPressed: () => context.go('/notificaciones'),
          ),
          const SizedBox(width: 6),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(
            color: const Color(0xFFE5E7EB),
            height: 1.0,
          ),
        ),
      ),
      body: child,
      bottomNavigationBar: AnimatedBuilder(
        animation: CartService.instance,
        builder: (context, _) {
          final cartCount = CartService.instance.totalItemsCount;
          return Container(
            decoration: const BoxDecoration(
              color: AppTheme.surfaceColor,
              border: Border(top: BorderSide(color: Color(0xFFE5E7EB), width: 1.0)),
            ),
            child: BottomNavigationBar(
              backgroundColor: AppTheme.surfaceColor,
              currentIndex: _calculateSelectedIndex(currentRoute),
              selectedItemColor: AppTheme.primaryColor,
              unselectedItemColor: AppTheme.mutedColor,
              type: BottomNavigationBarType.fixed,
              elevation: 0,
              onTap: (index) => _onItemTapped(index, context),
              items: [
                const BottomNavigationBarItem(icon: Icon(Icons.checkroom), label: 'Catálogo'),
                const BottomNavigationBarItem(icon: Icon(Icons.view_in_ar), label: 'Vestidor AR'),
                const BottomNavigationBarItem(icon: Icon(Icons.event_seat), label: 'Reservas'),
                BottomNavigationBarItem(
                  icon: Badge(
                    isLabelVisible: cartCount > 0,
                    label: Text('$cartCount', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                    backgroundColor: Colors.black,
                    child: const Icon(Icons.shopping_bag_outlined),
                  ),
                  label: 'Bolsa',
                ),
                const BottomNavigationBarItem(icon: Icon(Icons.auto_awesome), label: 'IA Stylist'),
                const BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Cuenta'),
              ],
            ),
          );
        },
      ),
    );
  }

  int _calculateSelectedIndex(String route) {
    if (route.contains('vestidor_ar')) return 1;
    if (route.startsWith('/reservas')) return 2;
    if (route.startsWith('/ventas')) return 3;
    if (route.startsWith('/ia_asistente')) return 4;
    if (route.startsWith('/usuarios')) return 5;
    return 0;
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go('/catalogo');
        break;
      case 1:
        context.go('/catalogo/vestidor_ar');
        break;
      case 2:
        context.go('/reservas');
        break;
      case 3:
        context.go('/ventas');
        break;
      case 4:
        context.go('/ia_asistente');
        break;
      case 5:
        context.go('/usuarios');
        break;
    }
  }
}
