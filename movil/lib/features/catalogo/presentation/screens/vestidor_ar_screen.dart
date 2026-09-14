import 'package:flutter/material.dart';
import '../../../../shared/widgets/atelier_scaffold.dart';
import '../../../../core/theme/app_theme.dart';

class VestidorArScreen extends StatelessWidget {
  const VestidorArScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AtelierScaffold(
      currentRoute: '/vestidor_ar',
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.view_in_ar, size: 64, color: AppTheme.goldAccent),
            const SizedBox(height: 16),
            Text(
              'VESTIDOR VIRTUAL (AR)',
              style: Theme.of(context).textTheme.displayMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Cámara de Realidad Aumentada para prueba de prendas de alta costura.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppTheme.mutedColor),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
