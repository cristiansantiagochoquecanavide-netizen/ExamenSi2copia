import '../../../../core/network/api_client.dart';
import '../../../catalogo/domain/models/catalogo_models.dart';
import '../../domain/models/ia_asistente_model.dart';

class IaAsistenteRepository {
  final ApiClient _apiClient;

  IaAsistenteRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<IaAsistenteStatusModel> fetchStatus() async {
    try {
      final response = await _apiClient.dio.get('/ia_asistente/status');
      if (response.statusCode == 200) {
        return IaAsistenteStatusModel.fromJson(response.data as Map<String, dynamic>);
      }
      return const IaAsistenteStatusModel(
        domain: 'ia_asistente',
        status: 'ready',
        message: 'Motor de Recomendaciones Activo',
      );
    } catch (_) {
      return const IaAsistenteStatusModel(
        domain: 'ia_asistente',
        status: 'ready',
        message: 'Modo Offline / Stylist Neuronal Local Activo',
      );
    }
  }

  List<IaMensajeModel> getInitialMessages() {
    return [
      IaMensajeModel(
        id: 'msg-init',
        texto: '¡Hola! Soy tu Concierge & Asistente de Estilo en Atelier Noir. ¿En qué ocasión o prenda te gustaría que te asesore hoy?',
        remitente: MensajeRemitente.asistente,
        fecha: DateTime.now(),
      ),
    ];
  }

  Future<IaMensajeModel> consultarStylist({
    required String prompt,
    required List<PrendaModel> catalogo,
  }) async {
    // Simula procesamiento neuronal con latencia natural de conversación
    await Future.delayed(const Duration(milliseconds: 900));

    final query = prompt.toLowerCase();
    List<PrendaModel> recomendadas = [];
    String respuestaTexto = '';
    String? occasionTag;

    if (query.contains('gala') || query.contains('noche') || query.contains('fiesta') || query.contains('elegante') || query.contains('vestido')) {
      occasionTag = 'Gala & Evening';
      recomendadas = catalogo.where((p) =>
        p.nombre.toLowerCase().contains('vestido') ||
        p.nombre.toLowerCase().contains('noir') ||
        p.nombre.toLowerCase().contains('seda') ||
        (p.categoria?.sector == 'MUJER')
      ).take(2).toList();

      if (recomendadas.isEmpty && catalogo.isNotEmpty) {
        recomendadas = catalogo.take(2).toList();
      }

      respuestaTexto = 'Para una ocasión de gala nocturna, la clave reside en la pureza de líneas y telas nobles. Te recomiendo piezas con caída estructurada en tonalidades oscuras o satinadas. Podés combinarlas con accesorios minimalistas dorados para acentuar el porte sin sobrecargar el conjunto.';
    } else if (query.contains('formal') || query.contains('trabajo') || query.contains('blazer') || query.contains('oficina') || query.contains('traje')) {
      occasionTag = 'Business & Formal';
      recomendadas = catalogo.where((p) =>
        p.nombre.toLowerCase().contains('blazer') ||
        p.nombre.toLowerCase().contains('pantalon') ||
        p.nombre.toLowerCase().contains('camisa') ||
        (p.categoria?.sector == 'HOMBRE') ||
        (p.categoria?.sector == 'UNISEX')
      ).take(2).toList();

      if (recomendadas.isEmpty && catalogo.isNotEmpty) {
        recomendadas = catalogo.take(2).toList();
      }

      respuestaTexto = 'Para un entorno formal o corporativo contemporáneo, un corte sartorial impecable es mandatorio. Sugiero una paleta monocromática en gris marengo, azul marino o negro profundo, priorizando tejidos de lana fría o lino italiano.';
    } else if (query.contains('casual') || query.contains('dia') || query.contains('verano') || query.contains('primavera') || query.contains('fresco')) {
      occasionTag = 'Casual Chic';
      recomendadas = catalogo.where((p) =>
        p.nombre.toLowerCase().contains('lino') ||
        p.nombre.toLowerCase().contains('algodon') ||
        p.nombre.toLowerCase().contains('casual')
      ).take(2).toList();

      if (recomendadas.isEmpty && catalogo.isNotEmpty) {
        recomendadas = catalogo.take(2).toList();
      }

      respuestaTexto = 'Para un look casual chic de alta costura, buscamos siluetas descontracturadas pero con una confección pulcra. Las fibras naturales transpirables (lino y algodón orgánico) aportan sofisticación sin perder comodidad.';
    } else if (query.contains('precio') || query.contains('oferta') || query.contains('descuento') || query.contains('promocion')) {
      occasionTag = 'Precios & Colección';
      recomendadas = catalogo.take(2).toList();
      respuestaTexto = 'Nuestras piezas de alta costura reflejan la excelencia en materiales y confección artesanal. Podés explorar los precios vigentes directamente en nuestro catálogo exclusivo o agendar una cita en probador físico para una prueba personalizada.';
    } else {
      occasionTag = 'Asesoría Personalizada';
      // Buscar prendas por coincidencia parcial de palabras
      final palabras = query.split(' ');
      recomendadas = catalogo.where((p) {
        return palabras.any((palabra) => palabra.length > 3 && p.nombre.toLowerCase().contains(palabra));
      }).take(2).toList();

      if (recomendadas.isEmpty && catalogo.isNotEmpty) {
        recomendadas = [catalogo.first];
      }

      respuestaTexto = 'Excelente consulta. En Atelier Noir diseñamos cada prenda con un enfoque atemporal. Te sugiero explorar estas alternativas de nuestra última colección que destacan por su versatilidad y acabado premium:';
    }

    return IaMensajeModel(
      id: 'msg-${DateTime.now().millisecondsSinceEpoch}',
      texto: respuestaTexto,
      remitente: MensajeRemitente.asistente,
      fecha: DateTime.now(),
      prendasRecomendadas: recomendadas.isNotEmpty ? recomendadas : null,
      occasionTag: occasionTag,
    );
  }
}

