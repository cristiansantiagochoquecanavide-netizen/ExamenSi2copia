import '../../../../core/network/api_client.dart';
import '../../../catalogo/data/repositories/catalogo_repository.dart';
import '../../../catalogo/domain/models/catalogo_models.dart';
import '../../domain/models/ia_asistente_model.dart';

class IaAsistenteRepository {
  final ApiClient _apiClient;
  String? _sessionUuid;

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
    // 1. Asegurar catálogo
    List<PrendaModel> localCatalogo = catalogo;
    if (localCatalogo.isEmpty) {
      try {
        localCatalogo = await CatalogoRepository().getPrendas();
      } catch (_) {}
    }

    // 2. Intentar llamar al endpoint de IA Concierge RAG del backend
    try {
      final payload = <String, dynamic>{
        'texto': prompt.trim(),
        if (_sessionUuid != null) 'session_uuid': _sessionUuid,
      };

      final response = await _apiClient.dio.post(
        '/ia_asistente/chat',
        data: payload,
      );

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        final String respuestaTexto = data['texto']?.toString() ??
            data['respuesta_texto']?.toString() ??
            'Aquí tenés algunas recomendaciones seleccionadas especialmente para vos:';
        final String? intencion = data['intencion_detectada']?.toString();

        List<PrendaModel> recomendadas = [];
        final rawPrendas = data['prendas_recomendadas'] as List<dynamic>?;
        if (rawPrendas != null && rawPrendas.isNotEmpty) {
          for (var item in rawPrendas) {
            if (item is Map<String, dynamic>) {
              final id = item['id'] as int? ?? 0;
              final match = localCatalogo.where((p) => p.id == id).toList();
              if (match.isNotEmpty) {
                recomendadas.add(match.first);
              } else {
                // Construir modelo a partir del item del backend si no está en caché local
                final imgUrl = item['imagen_url']?.toString() ?? '';
                recomendadas.add(
                  PrendaModel(
                    id: id,
                    sku: item['sku']?.toString() ?? '',
                    nombre: item['nombre']?.toString() ?? 'Prenda Exclusiva',
                    descripcion: item['descripcion']?.toString() ?? 'Selección curada por Atelier Stylist AI',
                    precioBase: (item['precio_base'] as num?)?.toDouble() ?? 250.0,
                    categoriaId: 0,
                    temporadaId: 0,
                    activo: true,
                    categoria: CategoriaModel(
                      id: 0,
                      nombre: item['categoria_nombre']?.toString() ?? 'Alta Costura',
                      sector: item['sector']?.toString() ?? 'UNISEX',
                      activo: true,
                    ),
                    multimedia: [
                      if (imgUrl.isNotEmpty)
                        PrendaMultimediaModel(
                          id: 0,
                          prendaId: id,
                          tipo: 'IMAGEN',
                          url: imgUrl,
                          formato: '.webp',
                          esPortada: true,
                        ),
                    ],
                  ),
                );
              }
            }
          }
        }

        // Si el backend no devolvió prendas específicas en el array, filtrar con heurística
        if (recomendadas.isEmpty && localCatalogo.isNotEmpty) {
          recomendadas = _filtrarRecomendacionesLocales(prompt, localCatalogo);
        }

        return IaMensajeModel(
          id: 'msg-${DateTime.now().millisecondsSinceEpoch}',
          texto: respuestaTexto,
          remitente: MensajeRemitente.asistente,
          fecha: DateTime.now(),
          prendasRecomendadas: recomendadas.isNotEmpty ? recomendadas : null,
          occasionTag: _detectarOccasionTag(prompt, intencion),
        );
      }
    } catch (_) {}

    // Fallback Offline / Heurístico con simulación de latencia natural
    await Future.delayed(const Duration(milliseconds: 600));
    return _consultarStylistLocal(prompt, localCatalogo);
  }

  String _detectarOccasionTag(String prompt, String? intencion) {
    final q = prompt.toLowerCase();
    if (q.contains('gala') || q.contains('noche') || q.contains('fiesta') || q.contains('elegante') || q.contains('vestido')) {
      return 'Gala & Evening';
    } else if (q.contains('formal') || q.contains('trabajo') || q.contains('oficina') || q.contains('blazer') || q.contains('traje')) {
      return 'Business & Formal';
    } else if (q.contains('casual') || q.contains('verano') || q.contains('primavera') || q.contains('diario')) {
      return 'Casual Chic';
    } else if (q.contains('precio') || q.contains('oferta') || q.contains('descuento')) {
      return 'Colección & Precios';
    }
    if (intencion != null && intencion.isNotEmpty) {
      return intencion.replaceAll('_', ' ');
    }
    return 'Recomendación de Estilo';
  }

  List<PrendaModel> _filtrarRecomendacionesLocales(String prompt, List<PrendaModel> catalogo) {
    if (catalogo.isEmpty) return [];
    final q = prompt.toLowerCase();

    bool checkSector(PrendaModel p, String sec) {
      final s = p.categoria?.sector.toUpperCase() ?? '';
      if (sec == 'MUJER') return s.contains('MUJER');
      if (sec == 'HOMBRE') return s.contains('HOMBRE');
      return s == sec;
    }

    if (q.contains('gala') || q.contains('noche') || q.contains('fiesta') || q.contains('elegante') || q.contains('vestido')) {
      final matches = catalogo.where((p) =>
        p.nombre.toLowerCase().contains('vestido') ||
        p.nombre.toLowerCase().contains('gala') ||
        p.nombre.toLowerCase().contains('seda') ||
        p.nombre.toLowerCase().contains('blusa') ||
        checkSector(p, 'MUJER')
      ).toList();
      if (matches.isNotEmpty) return matches.take(3).toList();
    } else if (q.contains('formal') || q.contains('trabajo') || q.contains('oficina') || q.contains('blazer') || q.contains('traje')) {
      final matches = catalogo.where((p) =>
        p.nombre.toLowerCase().contains('camisa') ||
        p.nombre.toLowerCase().contains('chaqueta') ||
        p.nombre.toLowerCase().contains('pantalon') ||
        checkSector(p, 'HOMBRE')
      ).toList();
      if (matches.isNotEmpty) return matches.take(3).toList();
    } else if (q.contains('casual') || q.contains('verano') || q.contains('primavera') || q.contains('diario')) {
      final matches = catalogo.where((p) =>
        p.nombre.toLowerCase().contains('short') ||
        p.nombre.toLowerCase().contains('polera') ||
        p.nombre.toLowerCase().contains('buzo') ||
        p.nombre.toLowerCase().contains('wide leg') ||
        p.nombre.toLowerCase().contains('lino') ||
        p.nombre.toLowerCase().contains('algodon')
      ).toList();
      if (matches.isNotEmpty) return matches.take(3).toList();
    }

    // Coincidencia por palabras del usuario
    final words = q.split(RegExp(r'\s+')).where((w) => w.length >= 3).toList();
    final wordMatches = catalogo.where((p) {
      final pName = p.nombre.toLowerCase();
      final pDesc = p.descripcion.toLowerCase();
      return words.any((w) => pName.contains(w) || pDesc.contains(w));
    }).toList();

    if (wordMatches.isNotEmpty) return wordMatches.take(3).toList();

    return catalogo.take(2).toList();
  }

  IaMensajeModel _consultarStylistLocal(String prompt, List<PrendaModel> catalogo) {
    final query = prompt.toLowerCase();
    final recomendadas = _filtrarRecomendacionesLocales(prompt, catalogo);
    String respuestaTexto = '';
    final occasionTag = _detectarOccasionTag(prompt, null);

    if (query.contains('gala') || query.contains('noche') || query.contains('fiesta') || query.contains('elegante') || query.contains('vestido')) {
      respuestaTexto = 'Para una ocasión de gala nocturna, la clave reside en la pureza de líneas y telas nobles. Te recomiendo piezas con caída estructurada en tonalidades oscuras o satinadas. Podés combinarlas con accesorios minimalistas dorados para acentuar el porte sin sobrecargar el conjunto:';
    } else if (query.contains('formal') || query.contains('trabajo') || query.contains('blazer') || query.contains('oficina') || query.contains('traje')) {
      respuestaTexto = 'Para un entorno formal o corporativo contemporáneo, un corte sartorial impecable es mandatorio. Sugiero una paleta monocromática en gris marengo, azul marino o negro profundo, priorizando tejidos de lana fría o lino italiano:';
    } else if (query.contains('casual') || query.contains('dia') || query.contains('verano') || query.contains('primavera') || query.contains('fresco')) {
      respuestaTexto = 'Para un look casual chic de alta costura, buscamos siluetas descontracturadas pero con una confección pulcra. Las fibras naturales transpirables (lino y algodón orgánico) aportan sofisticación sin perder comodidad:';
    } else if (query.contains('precio') || query.contains('oferta') || query.contains('descuento') || query.contains('promocion')) {
      respuestaTexto = 'Nuestras piezas de alta costura reflejan la excelencia en materiales y confección artesanal. Podés explorar los precios vigentes directamente en nuestro catálogo exclusivo o agendar una cita en probador físico para una prueba personalizada.';
    } else {
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
