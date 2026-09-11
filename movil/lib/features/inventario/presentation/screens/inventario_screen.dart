import 'package:flutter/material.dart';
import '../../../../shared/widgets/atelier_scaffold.dart';
import '../../../../core/theme/app_theme.dart';

class InventarioScreen extends StatelessWidget {
  const InventarioScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AtelierScaffold(
      currentRoute: '/inventario',
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Inventario y Sucursales',
              style: Theme.of(context).textTheme.displayLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Disponibilidad fisica por sucursal, colores y tallas',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.mutedColor,
                  ),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surfaceColor,
                border: Border.all(color: AppTheme.borderColor),
                borderRadius: BorderRadius.zero,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('MODULO MOVIL LISTO', style: Theme.of(context).textTheme.labelSmall),
                  const SizedBox(height: 8),
                  const Text('Arquitectura Feature-Driven enlazada al Backend FastAPI.'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
