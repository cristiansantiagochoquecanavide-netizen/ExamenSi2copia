/// FashionStore Mobile - Modelos para Sincronización Offline e Idempotencia (CU16 y CU17)
/// INF412 - Sistemas de Información 2
library;

class SincronizacionResultadoItemModel {
  final String uuidOperacion;
  final String tipoOperacion;
  final String estado; // SINCRONIZADO, DUPLICADO_IDEMPOTENTE, CONFLICTO_STOCK, ERROR
  final String mensaje;
  final String? codigoReferencia;

  const SincronizacionResultadoItemModel({
    required this.uuidOperacion,
    required this.tipoOperacion,
    required this.estado,
    required this.mensaje,
    this.codigoReferencia,
  });

  factory SincronizacionResultadoItemModel.fromJson(Map<String, dynamic> json) {
    return SincronizacionResultadoItemModel(
      uuidOperacion: json['uuid_operacion'] as String? ?? '',
      tipoOperacion: json['tipo_operacion'] as String? ?? '',
      estado: json['estado'] as String? ?? 'ERROR',
      mensaje: json['mensaje'] as String? ?? '',
      codigoReferencia: json['codigo_referencia'] as String?,
    );
  }
}

class SincronizacionBatchResponseModel {
  final int totalRecibidos;
  final int procesadosExitosamente;
  final int duplicadosIdempotentes;
  final int conflictosStock;
  final int errores;
  final List<SincronizacionResultadoItemModel> resultados;

  const SincronizacionBatchResponseModel({
    required this.totalRecibidos,
    required this.procesadosExitosamente,
    required this.duplicadosIdempotentes,
    required this.conflictosStock,
    required this.errores,
    required this.resultados,
  });

  factory SincronizacionBatchResponseModel.fromJson(Map<String, dynamic> json) {
    final list = json['resultados'] as List<dynamic>? ?? [];
    return SincronizacionBatchResponseModel(
      totalRecibidos: json['total_recibidos'] as int? ?? 0,
      procesadosExitosamente: json['procesados_exitosamente'] as int? ?? 0,
      duplicadosIdempotentes: json['duplicados_idempotentes'] as int? ?? 0,
      conflictosStock: json['conflictos_stock'] as int? ?? 0,
      errores: json['errores'] as int? ?? 0,
      resultados: list.map((item) => SincronizacionResultadoItemModel.fromJson(item as Map<String, dynamic>)).toList(),
    );
  }
}

/// Modelo para CU17: Detección y Arbitraje de Conflictos de Consistencia de Inventario
class ConflictoInventarioModel {
  final int id;
  final int sincronizacionId;
  final String? uuidOperacion;
  final int sucursalId;
  final String? sucursalNombre;
  final int productoVarianteId;
  final String? prendaNombre;
  final String? talla;
  final String? color;
  final int cantidadSolicitada;
  final int stockDisponibleServidor;
  final String estadoResolucion; // PENDIENTE_RESOLUCION, RESUELTO
  final String fechaDeteccion;
  final String? fechaResolucion;
  final int? resueltoPorUsuarioId;

  const ConflictoInventarioModel({
    required this.id,
    required this.sincronizacionId,
    this.uuidOperacion,
    required this.sucursalId,
    this.sucursalNombre,
    required this.productoVarianteId,
    this.prendaNombre,
    this.talla,
    this.color,
    required this.cantidadSolicitada,
    required this.stockDisponibleServidor,
    required this.estadoResolucion,
    required this.fechaDeteccion,
    this.fechaResolucion,
    this.resueltoPorUsuarioId,
  });

  factory ConflictoInventarioModel.fromJson(Map<String, dynamic> json) {
    return ConflictoInventarioModel(
      id: json['id'] as int? ?? 0,
      sincronizacionId: json['sincronizacion_id'] as int? ?? 0,
      uuidOperacion: json['uuid_operacion'] as String?,
      sucursalId: json['sucursal_id'] as int? ?? 0,
      sucursalNombre: json['sucursal_nombre'] as String?,
      productoVarianteId: json['producto_variante_id'] as int? ?? 0,
      prendaNombre: json['prenda_nombre'] as String?,
      talla: json['talla'] as String?,
      color: json['color'] as String?,
      cantidadSolicitada: json['cantidad_solicitada'] as int? ?? 0,
      stockDisponibleServidor: json['stock_disponible_servidor'] as int? ?? 0,
      estadoResolucion: json['estado_resolucion'] as String? ?? 'PENDIENTE_RESOLUCION',
      fechaDeteccion: json['fecha_deteccion'] as String? ?? '',
      fechaResolucion: json['fecha_resolucion'] as String?,
      resueltoPorUsuarioId: json['resuelto_por_usuario_id'] as int?,
    );
  }
}

class ResolverConflictoInput {
  final String accion; // TRASPASO_INMEDIATO, ADMITIR_SALDO_NEGATIVO, ANULAR_VENTA
  final String observaciones;
  final int? sucursalProveedoraId;

  const ResolverConflictoInput({
    required this.accion,
    required this.observaciones,
    this.sucursalProveedoraId,
  });

  Map<String, dynamic> toJson() => {
        'accion': accion,
        'observaciones': observaciones,
        if (sucursalProveedoraId != null) 'sucursal_proveedora_id': sucursalProveedoraId,
      };
}
