import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'core/routes/app_router.dart';
import 'core/utils/app_notification.dart';
import 'shared/services/notificaciones_polling_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  NotificacionesPollingService.instance.start();
  runApp(const FashionStoreApp());
}

class FashionStoreApp extends StatelessWidget {
  const FashionStoreApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'FashionStore Mobile',
      debugShowCheckedModeBanner: false,
      scaffoldMessengerKey: rootScaffoldMessengerKey,
      theme: AppTheme.lightTheme,
      routerConfig: appRouter,
    );
  }
}
