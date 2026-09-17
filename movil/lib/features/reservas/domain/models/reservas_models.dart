import '../../../catalogo/domain/models/catalogo_models.dart';

class SucursalModel {
  final int id;
  final String nombre;
  final String? direccion;
  final String? telefono;
  final int capacidadProbadores;
  final bool activo;
  final String? ciudadNombre;

  const SucursalModel({
    required this.id,
    required this.nombre,
    this.direccion,
    this.telefono,
    this.capacidadProbadores = 3,
    this.activo = true,
    this.ciudadNombre,
  });

  factory SucursalModel.fromJson(Map<String, dynamic> json) {
    return SucursalModel(
      id: json['id'] as int? ?? 0,
      nombre: json['nombre'] as String? ?? '',
      direccion: json['direccion'] as String?,
      telefono: json['telefono'] as String?,
      capacidadProbadores: json['capacidad_probadores'] as int? ?? 3,
      activo: json['activo'] as bool? ?? true,
      ciudadNombre: json['ciudad'] != null ? json['ciudad']['nombre'] as String? : null,
    );
  }
}

class DetalleReservaInput {
  final int varianteId;
  final int cantidad;

  const DetalleReservaInput({
    required this.varianteId,
    this.cantidad = 1,
  });

  Map<String, dynamic> toJson() => {
        'variante_id': varianteId,
        'cantidad': cantidad,
      };
}

class ReservaCreateRequest {
  final int sucursalId;
  final String fechaReserva; // YYYY-MM-DD
  final String horaEstimada; // HH:MM
  final double montoAnticipo;
  final String moneda;
  final String? observaciones;
  final List<DetalleReservaInput> detalles;

  const ReservaCreateRequest({
    required this.sucursalId,
    required this.fechaReserva,
    required this.horaEstimada,
    this.montoAnticipo = 10.0,
    this.moneda = 'USD',
    this.observaciones,
    required this.detalles,
  });

  Map<String, dynamic> toJson() => {
        'sucursal_id': sucursalId,
        'fecha_reserva': fechaReserva,
        'hora_estimada': horaEstimada,
        'monto_anticipo': montoAnticipo,
        'moneda': moneda,
        if (observaciones != null) 'observaciones': observaciones,
        'detalles': detalles.map((d) => d.toJson()).toList(),
      };
}

class DetalleReservaModel {
  final int id;
  final int varianteId;
  final int cantidad;
  final double precioUnitario;
  final double subtotal;
  final bool probada;
  final bool comprada;
  final PrendaVarianteModel? variante;

  const DetalleReservaModel({
    required this.id,
    required this.varianteId,
    required this.cantidad,
    required this.precioUnitario,
    required this.subtotal,
    required this.probada,
    required this.comprada,
    this.variante,
  });

  factory DetalleReservaModel.fromJson(Map<String, dynamic> json) {
    return DetalleReservaModel(
      id: json['id'] as int? ?? 0,
      varianteId: json['variante_id'] as int? ?? 0,
      cantidad: json['cantidad'] as int? ?? 1,
      precioUnitario: (json['precio_unitario'] is num) ? (json['precio_unitario'] as num).toDouble() : 0.0,
      subtotal: (json['subtotal'] is num) ? (json['subtotal'] as num).toDouble() : 0.0,
      probada: json['probada'] as bool? ?? false,
      comprada: json['comprada'] as bool? ?? false,
      variante: json['variante'] != null ? PrendaVarianteModel.fromJson(json['variante'] as Map<String, dynamic>) : null,
    );
  }
}

class ReservaModel {
  final int id;
  final String codigoReserva;
  final int clienteId;
  final int sucursalId;
  final String fechaReserva;
  final String horaEstimada;
  final String estado;
  final double montoAnticipo;
  final String moneda;
  final String? observaciones;
  final String? qrToken;
  final String? qrSvg;
  final String? probadorAsignado;
  final SucursalModel? sucursal;
  final List<DetalleReservaModel> detalles;

  const ReservaModel({
    required this.id,
    required this.codigoReserva,
    required this.clienteId,
    required this.sucursalId,
    required this.fechaReserva,
    required this.horaEstimada,
    required this.estado,
    required this.montoAnticipo,
    required this.moneda,
    this.observaciones,
    this.qrToken,
    this.qrSvg,
    this.probadorAsignado,
    this.sucursal,
    this.detalles = const [],
  });

  factory ReservaModel.fromJson(Map<String, dynamic> json) {
    return ReservaModel(
      id: json['id'] as int? ?? 0,
      codigoReserva: json['codigo_reserva'] as String? ?? '',
      clienteId: json['cliente_id'] as int? ?? 0,
      sucursalId: json['sucursal_id'] as int? ?? 0,
      fechaReserva: json['fecha_reserva'] as String? ?? '',
      horaEstimada: json['hora_estimada'] as String? ?? '',
      estado: json['estado'] as String? ?? 'CONFIRMADA',
      montoAnticipo: (json['monto_anticipo'] is num) ? (json['monto_anticipo'] as num).toDouble() : 0.0,
      moneda: json['moneda'] as String? ?? 'USD',
      observaciones: json['observaciones'] as String?,
      qrToken: json['qr_token'] as String?,
      qrSvg: json['qr_svg'] as String?,
      probadorAsignado: json['probador_asignado'] as String?,
      sucursal: json['sucursal'] != null ? SucursalModel.fromJson(json['sucursal'] as Map<String, dynamic>) : null,
      detalles: (json['detalles'] as List<dynamic>?)
              ?.map((d) => DetalleReservaModel.fromJson(d as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class ReservasDraftService {
  static final ReservasDraftService instance = ReservasDraftService._();
  ReservasDraftService._();

  final List<PrendaModel> _selectedPrendas = [];

  List<PrendaModel> get selectedPrendas => _selectedPrendas;

  bool addPrenda(PrendaModel prenda) {
    if (_selectedPrendas.any((p) => p.id == prenda.id)) return true;
    if (_selectedPrendas.length >= 3) return false;
    _selectedPrendas.add(prenda);
    return true;
  }

  void removePrenda(int prendaId) {
    _selectedPrendas.removeWhere((p) => p.id == prendaId);
  }

  void clear() {
    _selectedPrendas.clear();
  }
}

