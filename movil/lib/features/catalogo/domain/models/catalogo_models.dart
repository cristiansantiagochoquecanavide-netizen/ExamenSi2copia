import '../../../../core/constants/app_constants.dart';

class CategoriaModel {
  final int id;
  final String nombre;
  final String? descripcion;
  final String sector;
  final bool activo;

  const CategoriaModel({
    required this.id,
    required this.nombre,
    this.descripcion,
    required this.sector,
    required this.activo,
  });

  factory CategoriaModel.fromJson(Map<String, dynamic> json) {
    return CategoriaModel(
      id: json['id'] as int? ?? 0,
      nombre: json['nombre'] as String? ?? '',
      descripcion: json['descripcion'] as String?,
      sector: json['sector'] as String? ?? 'UNISEX',
      activo: json['activo'] as bool? ?? true,
    );
  }
}

class TallaModel {
  final int id;
  final String codigo;
  final String? descripcion;
  final int orden;
  final bool activo;

  const TallaModel({
    required this.id,
    required this.codigo,
    this.descripcion,
    required this.orden,
    required this.activo,
  });

  factory TallaModel.fromJson(Map<String, dynamic> json) {
    return TallaModel(
      id: json['id'] as int? ?? 0,
      codigo: json['codigo'] as String? ?? '',
      descripcion: json['descripcion'] as String?,
      orden: json['orden'] as int? ?? 0,
      activo: json['activo'] as bool? ?? true,
    );
  }
}

class ColorModel {
  final int id;
  final String nombre;
  final String? codigoHex;
  final String? codigoRgb;
  final bool activo;

  const ColorModel({
    required this.id,
    required this.nombre,
    this.codigoHex,
    this.codigoRgb,
    required this.activo,
  });

  factory ColorModel.fromJson(Map<String, dynamic> json) {
    return ColorModel(
      id: json['id'] as int? ?? 0,
      nombre: json['nombre'] as String? ?? '',
      codigoHex: json['codigo_hex'] as String?,
      codigoRgb: json['codigo_rgb'] as String?,
      activo: json['activo'] as bool? ?? true,
    );
  }
}

class PrendaMultimediaModel {
  final int id;
  final int prendaId;
  final String tipo;
  final String url;
  final String formato;
  final bool esPortada;

  const PrendaMultimediaModel({
    required this.id,
    required this.prendaId,
    required this.tipo,
    required this.url,
    required this.formato,
    required this.esPortada,
  });

  factory PrendaMultimediaModel.fromJson(Map<String, dynamic> json) {
    return PrendaMultimediaModel(
      id: json['id'] as int? ?? 0,
      prendaId: json['prenda_id'] as int? ?? 0,
      tipo: json['tipo'] as String? ?? 'IMAGEN',
      url: json['url'] as String? ?? '',
      formato: json['formato'] as String? ?? '.jpg',
      esPortada: json['es_portada'] as bool? ?? false,
    );
  }

  String get urlResuelta => PrendaModel.resolveImageUrl(url);
}

class PrendaVarianteModel {
  final int id;
  final int prendaId;
  final int tallaId;
  final int colorId;
  final String skuVariante;
  final bool activo;
  final TallaModel? talla;
  final ColorModel? color;

  const PrendaVarianteModel({
    required this.id,
    required this.prendaId,
    required this.tallaId,
    required this.colorId,
    required this.skuVariante,
    required this.activo,
    this.talla,
    this.color,
  });

  factory PrendaVarianteModel.fromJson(Map<String, dynamic> json) {
    return PrendaVarianteModel(
      id: json['id'] as int? ?? 0,
      prendaId: json['prenda_id'] as int? ?? 0,
      tallaId: json['talla_id'] as int? ?? 0,
      colorId: json['color_id'] as int? ?? 0,
      skuVariante: json['sku_variante'] as String? ?? '',
      activo: json['activo'] as bool? ?? true,
      talla: json['talla'] != null ? TallaModel.fromJson(json['talla'] as Map<String, dynamic>) : null,
      color: json['color'] != null ? ColorModel.fromJson(json['color'] as Map<String, dynamic>) : null,
    );
  }
}

class PrendaModel {
  final int id;
  final String sku;
  final String nombre;
  final String descripcion;
  final double precioBase;
  final int categoriaId;
  final int temporadaId;
  final bool activo;
  final CategoriaModel? categoria;
  final List<PrendaMultimediaModel> multimedia;
  final List<PrendaVarianteModel> variantes;

  const PrendaModel({
    required this.id,
    required this.sku,
    required this.nombre,
    required this.descripcion,
    required this.precioBase,
    required this.categoriaId,
    required this.temporadaId,
    required this.activo,
    this.categoria,
    this.multimedia = const [],
    this.variantes = const [],
  });

  static String resolveImageUrl(
    String? rawUrl, {
    String defaultFallback =
        'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop',
  }) {
    if (rawUrl == null || rawUrl.trim().isEmpty) {
      return defaultFallback;
    }
    var u = rawUrl.trim();
    if (u.startsWith('blob:') || u.startsWith('data:')) {
      return u;
    }
    final uri = Uri.tryParse(AppConstants.apiBaseUrl);
    final currentHost = (uri != null && uri.hasAuthority)
        ? '${uri.scheme}://${uri.authority}'
        : 'http://10.0.2.2:8000';

    if (u.startsWith('/static/')) {
      return '$currentHost$u';
    }
    if (u.startsWith('static/')) {
      return '$currentHost/$u';
    }
    if (u.contains('localhost:8000')) {
      return u.replaceAll('http://localhost:8000', currentHost);
    }
    if (u.contains('10.0.2.2:8000')) {
      return u.replaceAll('http://10.0.2.2:8000', currentHost);
    }
    if (u.contains('127.0.0.1:8000')) {
      return u.replaceAll('http://127.0.0.1:8000', currentHost);
    }
    if (u.contains('backend:8000')) {
      return u.replaceAll('http://backend:8000', currentHost);
    }
    return u;
  }

  String get portadaUrl {
    if (multimedia.isEmpty) {
      if (nombre.toLowerCase().contains('trench')) {
        return 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop';
      }
      return 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop';
    }
    final portada = multimedia.firstWhere(
      (m) => m.esPortada && m.tipo == 'IMAGEN',
      orElse: () => multimedia.firstWhere(
        (m) => m.tipo == 'IMAGEN',
        orElse: () => multimedia.first,
      ),
    );
    final url = portada.url.trim();
    if (url.isEmpty) {
      if (nombre.toLowerCase().contains('trench')) {
        return 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=800&auto=format&fit=crop';
      }
      return 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop';
    }
    return resolveImageUrl(url);
  }

  List<String> get imagenesUrls {
    final imgs = <String>[];
    if (multimedia.isNotEmpty) {
      // 1. Portadas primero
      final portadas = multimedia.where((m) => m.esPortada && m.tipo == 'IMAGEN').toList();
      for (final p in portadas) {
        final u = p.urlResuelta;
        if (u.isNotEmpty && !imgs.contains(u)) {
          imgs.add(u);
        }
      }

      // 2. Otras imágenes
      final otras = multimedia.where((m) => m.tipo == 'IMAGEN' && !m.esPortada).toList();
      for (final o in otras) {
        final u = o.urlResuelta;
        if (u.isNotEmpty && !imgs.contains(u)) {
          imgs.add(u);
        }
      }
    }
    if (imgs.isEmpty) {
      imgs.add(portadaUrl);
    }
    return imgs;
  }

  int get totalImagenes => imagenesUrls.length;

  bool get tieneModelo3D {
    return multimedia.any((m) => m.tipo.startsWith('MODELO_3D'));
  }

  String get precioFormatted {
    return 'Bs. ${precioBase.toStringAsFixed(2)}';
  }

  factory PrendaModel.fromJson(Map<String, dynamic> json) {
    return PrendaModel(
      id: json['id'] as int? ?? 0,
      sku: json['sku'] as String? ?? '',
      nombre: json['nombre'] as String? ?? '',
      descripcion: json['descripcion'] as String? ?? '',
      precioBase: (json['precio_base'] is num) ? (json['precio_base'] as num).toDouble() : double.tryParse(json['precio_base']?.toString() ?? '0') ?? 0.0,
      categoriaId: json['categoria_id'] as int? ?? 0,
      temporadaId: json['temporada_id'] as int? ?? 0,
      activo: json['activo'] as bool? ?? true,
      categoria: json['categoria'] != null ? CategoriaModel.fromJson(json['categoria'] as Map<String, dynamic>) : null,
      multimedia: (json['multimedia'] as List<dynamic>?)
              ?.map((m) => PrendaMultimediaModel.fromJson(m as Map<String, dynamic>))
              .toList() ??
          [],
      variantes: (json['variantes'] as List<dynamic>?)
              ?.map((v) => PrendaVarianteModel.fromJson(v as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class VtonTryOnModel {
  final String status;
  final String resultUrl;
  final int prendaId;
  final String prendaNombre;
  final String prendaCategoria;
  final double precio;
  final double calceScore;
  final int anchoHombrosPx;
  final String mensaje;

  const VtonTryOnModel({
    required this.status,
    required this.resultUrl,
    required this.prendaId,
    required this.prendaNombre,
    required this.prendaCategoria,
    required this.precio,
    required this.calceScore,
    required this.anchoHombrosPx,
    required this.mensaje,
  });

  factory VtonTryOnModel.fromJson(Map<String, dynamic> json) {
    return VtonTryOnModel(
      status: json['status'] as String? ?? 'success',
      resultUrl: PrendaModel.resolveImageUrl(json['result_url'] as String? ?? ''),
      prendaId: json['prenda_id'] as int? ?? 0,
      prendaNombre: json['prenda_nombre'] as String? ?? '',
      prendaCategoria: json['prenda_categoria'] as String? ?? 'Alta Costura',
      precio: (json['precio'] is num) ? (json['precio'] as num).toDouble() : 0.0,
      calceScore: (json['calce_score'] is num) ? (json['calce_score'] as num).toDouble() : 95.0,
      anchoHombrosPx: json['ancho_hombros_px'] as int? ?? 200,
      mensaje: json['mensaje'] as String? ?? '',
    );
  }
}
