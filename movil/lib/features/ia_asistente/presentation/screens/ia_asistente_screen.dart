import 'package:flutter/material.dart';
import '../../../../shared/widgets/atelier_scaffold.dart';
import '../../../../core/theme/app_theme.dart';

class IaAsistenteScreen extends StatelessWidget {
  const IaAsistenteScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AtelierScaffold(
      currentRoute: '/ia_asistente',
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Estilista IA',
              style: Theme.of(context).textTheme.displayLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Recomendaciones personalizadas segun preferencias y estilo',
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
