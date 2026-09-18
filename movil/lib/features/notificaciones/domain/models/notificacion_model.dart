class NotificacionModel {
  final int id;
  final int? usuarioId;
  final String titulo;
  final String mensaje;
  final String tipo; // RESERVA_PROBADOR, ESTADO_PEDIDO, PROMOCION, RECOMENDACION_IA, ALERTA_STOCK, SISTEMA
  final String canal;
  final String prioridad;
  final bool leida;
  final Map<String, dynamic>? dataExtra;
  final DateTime? fechaLeida;
  final DateTime createdAt;

  const NotificacionModel({
    required this.id,
    this.usuarioId,
    required this.titulo,
    required this.mensaje,
    required this.tipo,
    required this.canal,
    required this.prioridad,
    required this.leida,
    this.dataExtra,
    this.fechaLeida,
    required this.createdAt,
  });

  factory NotificacionModel.fromJson(Map<String, dynamic> json) {
    return NotificacionModel(
      id: json['id'] as int? ?? 0,
      usuarioId: json['usuario_id'] as int?,
      titulo: json['titulo'] as String? ?? 'Alerta FashionStore',
      mensaje: json['mensaje'] as String? ?? '',
      tipo: json['tipo'] as String? ?? 'SISTEMA',
      canal: json['canal'] as String? ?? 'TODOS',
      prioridad: json['prioridad'] as String? ?? 'NORMAL',
      leida: json['leida'] as bool? ?? false,
      dataExtra: json['data_extra'] != null ? Map<String, dynamic>.from(json['data_extra'] as Map) : null,
      fechaLeida: json['fecha_leida'] != null ? DateTime.tryParse(json['fecha_leida'].toString()) : null,
      createdAt: json['created_at'] != null
          ? (DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now())
          : DateTime.now(),
    );
  }

  NotificacionModel copyWith({bool? leida, DateTime? fechaLeida}) {
    return NotificacionModel(
      id: id,
      usuarioId: usuarioId,
      titulo: titulo,
      mensaje: mensaje,
      tipo: tipo,
      canal: canal,
      prioridad: prioridad,
      leida: leida ?? this.leida,
      dataExtra: dataExtra,
      fechaLeida: fechaLeida ?? this.fechaLeida,
      createdAt: createdAt,
    );
  }
}

class NotificacionResumenModel {
  final int totalNoLeidas;
  final List<NotificacionModel> ultimas;

  const NotificacionResumenModel({
    required this.totalNoLeidas,
    required this.ultimas,
  });

  factory NotificacionResumenModel.fromJson(Map<String, dynamic> json) {
    final list = json['ultimas'] as List<dynamic>? ?? [];
    return NotificacionResumenModel(
      totalNoLeidas: json['total_no_leidas'] as int? ?? 0,
      ultimas: list.map((item) => NotificacionModel.fromJson(item as Map<String, dynamic>)).toList(),
    );
  }
}
