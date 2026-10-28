class RolModel {
  final int id;
  final String nombre;
  final String? descripcion;

  const RolModel({
    required this.id,
    required this.nombre,
    this.descripcion,
  });

  factory RolModel.fromJson(Map<String, dynamic> json) {
    return RolModel(
      id: json['id'] as int? ?? 0,
      nombre: json['nombre'] as String? ?? '',
      descripcion: json['descripcion'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'nombre': nombre,
        'descripcion': descripcion,
      };
}

class UsuarioModel {
  final int id;
  final String email;
  final String nombre;
  final String apellido;
  final String ciNit;
  final String? telefono;
  final String? direccion;
  final String tipoUsuario;
  final String estado;
  final int rolId;
  final int? sucursalId;
  final int? empresaId;
  final String? subdominio;
  final String? planCodigo;
  final RolModel? rol;

  const UsuarioModel({
    required this.id,
    required this.email,
    required this.nombre,
    required this.apellido,
    required this.ciNit,
    this.telefono,
    this.direccion,
    required this.tipoUsuario,
    required this.estado,
    required this.rolId,
    this.sucursalId,
    this.empresaId,
    this.subdominio,
    this.planCodigo,
    this.rol,
  });

  String get nombreCompleto => '$nombre $apellido'.trim();
  String get rolNombre => (rol?.nombre.isNotEmpty == true ? rol!.nombre : tipoUsuario).toUpperCase();

  bool get isAdmin => rolNombre == 'ADMINISTRADOR' || rolNombre == 'ADMIN';
  bool get isEncargado => rolNombre == 'ENCARGADO' || rolNombre == 'ENCARGADO_SUCURSAL';
  bool get isCajero => rolNombre == 'CAJERO';
  bool get isStaff => isAdmin || isEncargado || isCajero;
  bool get isCliente => !isStaff || rolNombre == 'CLIENTE';

  factory UsuarioModel.fromJson(Map<String, dynamic> json) {
    return UsuarioModel(
      id: json['id'] as int? ?? 0,
      email: json['email'] as String? ?? '',
      nombre: json['nombre'] as String? ?? '',
      apellido: json['apellido'] as String? ?? '',
      ciNit: json['ci_nit'] as String? ?? '',
      telefono: json['telefono'] as String?,
      direccion: json['direccion'] as String?,
      tipoUsuario: json['tipo_usuario'] as String? ?? 'CLIENTE',
      estado: json['estado'] as String? ?? 'ACTIVO',
      rolId: json['rol_id'] as int? ?? 0,
      sucursalId: json['sucursal_id'] as int?,
      empresaId: json['empresa_id'] as int? ?? json['empresaId'] as int?,
      subdominio: json['subdominio'] as String?,
      planCodigo: json['plan_codigo'] as String?,
      rol: json['rol'] != null ? RolModel.fromJson(json['rol'] as Map<String, dynamic>) : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'nombre': nombre,
        'apellido': apellido,
        'ci_nit': ciNit,
        'telefono': telefono,
        'direccion': direccion,
        'tipo_usuario': tipoUsuario,
        'estado': estado,
        'rol_id': rolId,
        'sucursal_id': sucursalId,
        'empresa_id': empresaId,
        'subdominio': subdominio,
        'plan_codigo': planCodigo,
        'rol': rol?.toJson(),
      };
}

class TokenResponseModel {
  final String accessToken;
  final String tokenType;
  final int expiresIn;
  final UsuarioModel usuario;

  const TokenResponseModel({
    required this.accessToken,
    required this.tokenType,
    required this.expiresIn,
    required this.usuario,
  });

  factory TokenResponseModel.fromJson(Map<String, dynamic> json) {
    return TokenResponseModel(
      accessToken: json['access_token'] as String? ?? '',
      tokenType: json['token_type'] as String? ?? 'bearer',
      expiresIn: json['expires_in'] as int? ?? 3600,
      usuario: UsuarioModel.fromJson(json['usuario'] as Map<String, dynamic>? ?? {}),
    );
  }
}
