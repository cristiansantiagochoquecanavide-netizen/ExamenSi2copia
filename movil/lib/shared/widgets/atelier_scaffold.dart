import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';

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
        title: Row(
          children: [
            Text(
              'FASHIONSTORE',
              style: Theme.of(context).textTheme.displayMedium?.copyWith(
                    fontSize: 18,
                    letterSpacing: 2.0,
                  ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                border: Border.all(color: AppTheme.goldAccent),
                borderRadius: BorderRadius.zero,
              ),
              child: Text(
                'NOIR',
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ),
          ],
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(
            color: AppTheme.borderColor,
            height: 1.0,
          ),
        ),
      ),
      body: child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppTheme.surfaceColor,
          border: Border(top: BorderSide(color: AppTheme.borderColor, width: 1.0)),
        ),
        child: BottomNavigationBar(
          backgroundColor: AppTheme.surfaceColor,
          currentIndex: _calculateSelectedIndex(currentRoute),
          selectedItemColor: AppTheme.primaryColor,
          unselectedItemColor: AppTheme.mutedColor,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
          onTap: (index) => _onItemTapped(index, context),
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.checkroom), label: 'Cat?logo'),
            BottomNavigationBarItem(icon: Icon(Icons.view_in_ar), label: 'Vestidor AR'),
            BottomNavigationBarItem(icon: Icon(Icons.event_seat), label: 'Reservas'),
            BottomNavigationBarItem(icon: Icon(Icons.shopping_bag_outlined), label: 'Bolsa'),
            BottomNavigationBarItem(icon: Icon(Icons.auto_awesome), label: 'IA Stylist'),
            BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Cuenta'),
          ],
        ),
      ),
    );
  }

  int _calculateSelectedIndex(String route) {
    if (route.startsWith('/vestidor_ar')) return 1;
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
