import '../../../catalogo/domain/models/catalogo_models.dart';

enum MensajeRemitente { usuario, asistente }

class IaMensajeModel {
  final String id;
  final String texto;
  final MensajeRemitente remitente;
  final DateTime fecha;
  final List<PrendaModel>? prendasRecomendadas;
  final String? occasionTag;

  const IaMensajeModel({
    required this.id,
    required this.texto,
    required this.remitente,
    required this.fecha,
    this.prendasRecomendadas,
    this.occasionTag,
  });
}

class IaAsistenteStatusModel {
  final String domain;
  final String status;
  final String message;

  const IaAsistenteStatusModel({
    required this.domain,
    required this.status,
    required this.message,
  });

  factory IaAsistenteStatusModel.fromJson(Map<String, dynamic> json) {
    return IaAsistenteStatusModel(
      domain: json['domain']?.toString() ?? 'ia_asistente',
      status: json['status']?.toString() ?? 'ready',
      message: json['message']?.toString() ?? json['description']?.toString() ?? 'Motor de IA operativo',
    );
  }
}

