import 'package:go_router/go_router.dart';
import '../../features/catalogo/presentation/screens/catalogo_screen.dart';
import '../../features/catalogo/presentation/screens/vestidor_ar_screen.dart';
import '../../features/usuarios/presentation/screens/usuarios_screen.dart';
import '../../features/inventario/presentation/screens/inventario_screen.dart';
import '../../features/reservas/presentation/screens/reservas_screen.dart';
import '../../features/ventas/presentation/screens/ventas_screen.dart';
import '../../features/ia_asistente/presentation/screens/ia_asistente_screen.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/catalogo',
  routes: [
    GoRoute(
      path: '/catalogo',
      builder: (context, state) => const CatalogoScreen(),
      routes: [
        GoRoute(
          path: 'vestidor_ar',
          builder: (context, state) => const VestidorArScreen(),
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
  ],
);
