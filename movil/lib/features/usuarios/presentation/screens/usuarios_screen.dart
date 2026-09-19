import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../shared/widgets/atelier_scaffold.dart';
import '../../../../core/theme/app_theme.dart';
import '../../data/repositories/auth_repository.dart';
import '../../domain/models/usuario_model.dart';

class UsuariosScreen extends StatefulWidget {
  const UsuariosScreen({super.key});

  @override
  State<UsuariosScreen> createState() => _UsuariosScreenState();
}

class _UsuariosScreenState extends State<UsuariosScreen> {
  final AuthRepository _authRepository = AuthRepository();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _isLoading = false;
  bool _isCheckingSession = true;
  bool _obscurePassword = true;
  String? _errorMessage;
  UsuarioModel? _currentUser;

  @override
  void initState() {
    super.initState();
    _checkInitialSession();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _checkInitialSession() async {
    final user = await _authRepository.getCurrentUser();
    if (mounted) {
      setState(() {
        _currentUser = user;
        _isCheckingSession = false;
      });
    }
  }

  void _fillRole(String role) {
    setState(() {
      _errorMessage = null;
      if (role == 'ADMIN') {
        _emailController.text = 'AdminFashion@gmail.com';
        _passwordController.text = 'Admin123';
      } else if (role == 'ENCARGADO') {
        _emailController.text = 'EncargadoSucursal@gmail.com';
        _passwordController.text = 'Encargado123';
      } else if (role == 'CAJERO') {
        _emailController.text = 'CajeroFashion@gmail.com';
        _passwordController.text = 'Cajero123';
      } else {
        _emailController.text = 'ClienteFashion@gmail.com';
        _passwordController.text = 'Cliente123';
      }
    });
  }

  Future<void> _handleLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      setState(() {
        _errorMessage = 'Por favor ingresá tu correo y contraseña.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _authRepository.login(email: email, password: password);
      if (mounted) {
        setState(() {
          _currentUser = res.usuario;
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            duration: const Duration(seconds: 3),
            backgroundColor: AppTheme.primaryColor,
            content: Text('¡Bienvenido, ${res.usuario.nombre}!'),
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

  Future<void> _handleLogout() async {
    setState(() {
      _isLoading = true;
    });
    await _authRepository.logout();
    if (mounted) {
      setState(() {
        _currentUser = null;
        _emailController.clear();
        _passwordController.clear();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AtelierScaffold(
      currentRoute: '/usuarios',
      child: _isCheckingSession
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
              child: _currentUser != null ? _buildProfileView() : _buildLoginView(),
            ),
    );
  }

  Widget _buildLoginView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Editorial Header
        Center(
          child: Column(
            children: [
              Text(
                'ATELIER NOIR • PRIVATE ACCESS',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      letterSpacing: 2.0,
                      color: AppTheme.mutedColor,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                'FashionStore',
                style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      fontSize: 30,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                'Ingresá tus credenciales para acceder a la plataforma editorial y gestión de alta costura.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.mutedColor,
                      height: 1.4,
                    ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Quick Role Buttons Card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFF9FAFB),
            border: Border.all(color: const Color(0xFFE5E7EB)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'ACCESO RÁPIDO POR ROL',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                    ),
              ),
              const SizedBox(height: 2),
              Text(
                'Probá las vistas web/móvil según cada rol:',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.mutedColor,
                      fontSize: 12,
                    ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  _buildRoleChip('Admin', 'ADMIN'),
                  _buildRoleChip('Encargado', 'ENCARGADO'),
                  _buildRoleChip('Cajero', 'CAJERO'),
                  _buildRoleChip('Cliente', 'CLIENTE'),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Error Banner
        if (_errorMessage != null) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              border: Border.all(color: const Color(0xFFFECACA)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '!',
                  style: TextStyle(
                    color: Color(0xFFDC2626),
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(
                      color: Color(0xFF991B1B),
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Form Fields
        Text(
          'CORREO ELECTRÓNICO',
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          enabled: !_isLoading,
          decoration: const InputDecoration(
            hintText: 'ejemplo@fashionstore.com',
            contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.zero,
              borderSide: BorderSide(color: Color(0xFFD1D5DB)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.zero,
              borderSide: BorderSide(color: AppTheme.primaryColor, width: 1.5),
            ),
          ),
        ),
        const SizedBox(height: 16),

        Text(
          'CONTRASEÑA',
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          enabled: !_isLoading,
          decoration: InputDecoration(
            hintText: '••••••••',
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            border: const OutlineInputBorder(
              borderRadius: BorderRadius.zero,
              borderSide: BorderSide(color: Color(0xFFD1D5DB)),
            ),
            focusedBorder: const OutlineInputBorder(
              borderRadius: BorderRadius.zero,
              borderSide: BorderSide(color: AppTheme.primaryColor, width: 1.5),
            ),
            suffixIcon: IconButton(
              icon: Icon(
                _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                color: AppTheme.mutedColor,
                size: 20,
              ),
              onPressed: () {
                setState(() {
                  _obscurePassword = !_obscurePassword;
                });
              },
            ),
          ),
        ),
        const SizedBox(height: 24),

        // Submit Button
        ElevatedButton(
          onPressed: _isLoading ? null : _handleLogin,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryColor,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
          ),
          child: _isLoading
              ? const SizedBox(
                  height: 18,
                  width: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Text(
                  'INICIAR SESIÓN',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.2,
                  ),
                ),
        ),
        const SizedBox(height: 24),

        // Footer
        Column(
          children: [
            Text(
              'SISTEMA SEGURO CON TOKENS JWT',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    fontSize: 10,
                    color: AppTheme.subtleColor,
                  ),
            ),
            const SizedBox(height: 12),
            GestureDetector(
              onTap: () => context.go('/catalogo'),
              child: Text(
                'Explorar catálogo como invitado →',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      decoration: TextDecoration.underline,
                    ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildRoleChip(String label, String roleKey) {
    return InkWell(
      onTap: () => _fillRole(roleKey),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: const Color(0xFFD1D5DB)),
        ),
        child: Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Color(0xFF111827),
          ),
        ),
      ),
    );
  }

  Widget _buildProfileView() {
    final user = _currentUser!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Profile Header
        Center(
          child: Column(
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor,
                  shape: BoxShape.rectangle,
                  border: Border.all(color: AppTheme.borderColor),
                ),
                alignment: Alignment.center,
                child: Text(
                  user.nombre.isNotEmpty ? user.nombre[0].toUpperCase() : 'U',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                user.nombreCompleto,
                style: Theme.of(context).textTheme.displayMedium,
              ),
              const SizedBox(height: 4),
              Text(
                user.email,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.mutedColor,
                    ),
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F4F6),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: Text(
                  user.rol?.nombre.toUpperCase() ?? user.tipoUsuario.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.2,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),

        // User Info Details Card
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: const Color(0xFFFAFAFA),
            border: Border.all(color: const Color(0xFFE5E7EB)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildInfoRow('ESTADO', user.estado, isStatus: true),
              const Divider(color: Color(0xFFE5E7EB), height: 20),
              _buildInfoRow('CI / NIT', user.ciNit.isNotEmpty ? user.ciNit : 'No registrado'),
              const Divider(color: Color(0xFFE5E7EB), height: 20),
              _buildInfoRow('TELÉFONO', user.telefono ?? 'No registrado'),
              const Divider(color: Color(0xFFE5E7EB), height: 20),
              _buildInfoRow('DIRECCIÓN', user.direccion ?? 'No registrada'),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Navigation & Actions
        if (user.isAdmin || user.isEncargado) ...[
          ElevatedButton.icon(
            onPressed: () => context.go('/reportes'),
            icon: const Icon(Icons.bar_chart, color: Color(0xFFE9C349)),
            label: const Text(
              'REPORTES & DASHBOARD (IA)',
              style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF131313),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
              side: const BorderSide(color: Color(0xFFE9C349)),
            ),
          ),
          const SizedBox(height: 12),
        ] else if (user.isCajero) ...[
          ElevatedButton.icon(
            onPressed: () => context.go('/ventas'),
            icon: const Icon(Icons.point_of_sale, color: Color(0xFFE9C349)),
            label: const Text(
              'PUNTO DE VENTA (POS)',
              style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF131313),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
              side: const BorderSide(color: Color(0xFFE9C349)),
            ),
          ),
          const SizedBox(height: 12),
        ] else ...[
          ElevatedButton.icon(
            onPressed: () => context.go('/reservas'),
            icon: const Icon(Icons.event_seat, color: Color(0xFFE9C349)),
            label: const Text(
              'MIS RESERVAS DE PROBADOR',
              style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF131313),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
              side: const BorderSide(color: Color(0xFFE9C349)),
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: () => context.go('/ventas'),
            icon: const Icon(Icons.shopping_bag_outlined, color: Colors.white),
            label: const Text(
              'MI BOLSA DE COMPRAS',
              style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF131313),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => context.go('/ia_asistente'),
            icon: const Icon(Icons.auto_awesome, color: Color(0xFF131313)),
            label: const Text(
              'ASESOR DE MODA (IA)',
              style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2),
            ),
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF131313),
              side: const BorderSide(color: Color(0xFF131313)),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
            ),
          ),
          const SizedBox(height: 12),
        ],
        ElevatedButton(
          onPressed: () => context.go('/catalogo'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryColor,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
          ),
          child: const Text(
            'IR AL CATÁLOGO',
            style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2),
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: _isLoading ? null : _handleLogout,
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFFDC2626),
            side: const BorderSide(color: Color(0xFFDC2626)),
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
          ),
          child: const Text(
            'CERRAR SESIÓN',
            style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.2),
          ),
        ),
      ],
    );
  }

  Widget _buildInfoRow(String label, String value, {bool isStatus = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: Color(0xFF6B7280),
            letterSpacing: 0.8,
          ),
        ),
        if (isStatus)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              border: Border.all(color: const Color(0xFFA7F3D0)),
            ),
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: Color(0xFF047857),
              ),
            ),
          )
        else
          Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: Color(0xFF111827),
            ),
          ),
      ],
    );
  }
}
