import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/catalogo/domain/models/catalogo_models.dart';
import '../../features/catalogo/presentation/screens/catalogo_screen.dart';
import '../../features/catalogo/presentation/screens/vestidor_ar_screen.dart';
import '../../features/usuarios/presentation/screens/usuarios_screen.dart';
import '../../features/inventario/presentation/screens/inventario_screen.dart';
import '../../features/reservas/presentation/screens/reservas_screen.dart';
import '../../features/ventas/presentation/screens/ventas_screen.dart';
import '../../features/ia_asistente/presentation/screens/ia_asistente_screen.dart';
import '../../features/notificaciones/presentation/screens/notificaciones_screen.dart';
import '../../features/reportes/presentation/screens/reportes_screen.dart';
import '../../features/ventas/presentation/screens/sincronizacion_screen.dart';
import '../../features/inventario/presentation/screens/conflictos_screen.dart';
import '../../features/ventas/presentation/screens/devoluciones_screen.dart';

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

final GoRouter appRouter = GoRouter(
  navigatorKey: rootNavigatorKey,
  initialLocation: '/catalogo',
  routes: [
    GoRoute(
      path: '/catalogo',
      builder: (context, state) => const CatalogoScreen(),
      routes: [
        GoRoute(
          path: 'vestidor_ar',
          builder: (context, state) => VestidorArScreen(
            initialPrenda: state.extra is PrendaModel ? state.extra as PrendaModel : null,
          ),
        ),
      ],
    ),
    GoRoute(
      path: '/usuarios',
      builder: (context, state) => const UsuariosScreen(),
    ),
    GoRoute(
      path: '/inventario',
      builder: (context, state) => const InventarioScreen(),
    ),
    GoRoute(
      path: '/reservas',
      builder: (context, state) => const ReservasScreen(),
    ),
    GoRoute(
      path: '/ventas',
      builder: (context, state) => const VentasScreen(),
    ),
    GoRoute(
      path: '/ia_asistente',
      builder: (context, state) => const IaAsistenteScreen(),
    ),
    GoRoute(
      path: '/notificaciones',
      builder: (context, state) => const NotificacionesScreen(),
    ),
    GoRoute(
      path: '/reportes',
      builder: (context, state) => const ReportesScreen(),
    ),
    // Presentación 2: CU16, CU17, CU19
    GoRoute(
      path: '/sincronizacion',
      builder: (context, state) => const SincronizacionScreen(),
    ),
    GoRoute(
      path: '/conflictos',
      builder: (context, state) => const ConflictosScreen(),
    ),
    GoRoute(
      path: '/devoluciones',
      builder: (context, state) => const DevolucionesScreen(),
    ),
  ],
);
