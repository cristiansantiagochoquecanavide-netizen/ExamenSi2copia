/// FashionStore Mobile - Modelos para Cambio de Prenda por Medida y Notas de Devolución (CU19 y CU20)
/// Reglas de Negocio: RN06 (Plazo Garantía), RN07 (Cero Dinero en Efectivo), RN08 (Balance Atómico Stock)
/// INF412 - Sistemas de Información 2
library;

class ItemDevolucionTicketModel {
  final int id;
  final int productoVarianteId;
  final String prendaNombre;
  final String talla;
  final String color;
  final double precioUnitario;
  final int cantidad;
  final double subtotal;
  final int cantidadDevueltaPrevia;
  final int disponibleDevolver;

  const ItemDevolucionTicketModel({
    required this.id,
    required this.productoVarianteId,
    required this.prendaNombre,
    required this.talla,
    required this.color,
    required this.precioUnitario,
    required this.cantidad,
    required this.subtotal,
    required this.cantidadDevueltaPrevia,
    required this.disponibleDevolver,
  });

  factory ItemDevolucionTicketModel.fromJson(Map<String, dynamic> json) {
    return ItemDevolucionTicketModel(
      id: json['id'] as int? ?? json['detalle_id'] as int? ?? 0,
      productoVarianteId: json['producto_variante_id'] as int? ?? json['variante_id'] as int? ?? 0,
      prendaNombre: json['prenda_nombre'] as String? ?? 'Prenda',
      talla: json['talla'] as String? ?? 'M',
      color: json['color'] as String? ?? 'Negro',
      precioUnitario: (json['precio_unitario'] is num)
          ? (json['precio_unitario'] as num).toDouble()
          : double.tryParse(json['precio_unitario']?.toString() ?? '0') ?? 0.0,
      cantidad: json['cantidad'] as int? ?? json['cantidad_comprada'] as int? ?? 1,
      subtotal: (json['subtotal'] is num)
          ? (json['subtotal'] as num).toDouble()
          : double.tryParse(json['subtotal']?.toString() ?? '0') ?? 0.0,
      cantidadDevueltaPrevia: json['cantidad_devuelta_previa'] as int? ?? json['cantidad_ya_devuelta'] as int? ?? 0,
      disponibleDevolver: json['disponible_devolver'] as int? ?? json['cantidad_disponible_devolucion'] as int? ?? 1,
    );
  }
}

class ValidarCambioGarantiaModel {
  final int ventaId;
  final String codigoVenta;
  final String fechaVenta;
  final int diasTranscurridos;
  final int plazoMaximoDias;
  final bool garantiaVigente;
  final bool permiteCambioTalla;
  final bool admiteReembolsoDinero; // RN07: Siempre false
  final String mensaje;
  final int sucursalId;
  final String sucursalNombre;
  final String clienteNombre;
  final List<ItemDevolucionTicketModel> items;

  const ValidarCambioGarantiaModel({
    required this.ventaId,
    required this.codigoVenta,
    required this.fechaVenta,
    required this.diasTranscurridos,
    required this.plazoMaximoDias,
    required this.garantiaVigente,
    required this.permiteCambioTalla,
    required this.admiteReembolsoDinero,
    required this.mensaje,
    required this.sucursalId,
    required this.sucursalNombre,
    required this.clienteNombre,
    required this.items,
  });

  factory ValidarCambioGarantiaModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>? ?? [];
    return ValidarCambioGarantiaModel(
      ventaId: json['venta_id'] as int? ?? 0,
      codigoVenta: json['codigo_venta'] as String? ?? '',
      fechaVenta: json['fecha_venta'] as String? ?? '',
      diasTranscurridos: json['dias_transcurridos'] as int? ?? 0,
      plazoMaximoDias: json['plazo_maximo_dias'] as int? ?? 7,
      garantiaVigente: json['garantia_vigente'] as bool? ?? false,
      permiteCambioTalla: json['permite_cambio_talla'] as bool? ?? false,
      admiteReembolsoDinero: json['admite_reembolso_dinero'] as bool? ?? false,
      mensaje: json['mensaje'] as String? ?? '',
      sucursalId: json['sucursal_id'] as int? ?? 1,
      sucursalNombre: json['sucursal_nombre'] as String? ?? 'Sucursal Central',
      clienteNombre: json['cliente_nombre'] as String? ?? 'Cliente',
      items: rawItems.map((e) => ItemDevolucionTicketModel.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}

class ItemNotaDevolucionInput {
  final int varianteDevueltaId;
  final int cantidadDevuelta;
  final int varianteEntregadaId;
  final int cantidadEntregada;
  final double diferenciaMonetaria; // RN07: 0.0

  const ItemNotaDevolucionInput({
    required this.varianteDevueltaId,
    this.cantidadDevuelta = 1,
    required this.varianteEntregadaId,
    this.cantidadEntregada = 1,
    this.diferenciaMonetaria = 0.0,
  });

  Map<String, dynamic> toJson() => {
        'variante_devuelta_id': varianteDevueltaId,
        'cantidad_devuelta': cantidadDevuelta,
        'variante_entregada_id': varianteEntregadaId,
        'cantidad_entregada': cantidadEntregada,
        'diferencia_monetaria': diferenciaMonetaria,
      };
}

class NotaDevolucionFormalInput {
  final int ventaId;
  final int sucursalId;
  final String motivo; // TALLA_CHICA, TALLA_GRANDE, DESAJUSTE_MEDIDA_ANATOMICA, DEFECTO_FABRICA
  final String? observaciones;
  final List<ItemNotaDevolucionInput> detalles;

  const NotaDevolucionFormalInput({
    required this.ventaId,
    required this.sucursalId,
    required this.motivo,
    this.observaciones,
    required this.detalles,
  });

  Map<String, dynamic> toJson() => {
        'venta_id': ventaId,
        'sucursal_id': sucursalId,
        'motivo': motivo,
        if (observaciones != null) 'observaciones': observaciones,
        'detalles': detalles.map((d) => d.toJson()).toList(),
      };
}

class DetalleNotaDevolucionResponseModel {
  final int id;
  final int varianteDevueltaId;
  final String? prendaDevueltaNombre;
  final String? tallaDevuelta;
  final int cantidadDevuelta;
  final int varianteEntregadaId;
  final String? prendaEntregadaNombre;
  final String? tallaEntregada;
  final int cantidadEntregada;
  final double diferenciaMonetaria;

  const DetalleNotaDevolucionResponseModel({
    required this.id,
    required this.varianteDevueltaId,
    this.prendaDevueltaNombre,
    this.tallaDevuelta,
    required this.cantidadDevuelta,
    required this.varianteEntregadaId,
    this.prendaEntregadaNombre,
    this.tallaEntregada,
    required this.cantidadEntregada,
    required this.diferenciaMonetaria,
  });

  factory DetalleNotaDevolucionResponseModel.fromJson(Map<String, dynamic> json) {
    return DetalleNotaDevolucionResponseModel(
      id: json['id'] as int? ?? 0,
      varianteDevueltaId: json['variante_devuelta_id'] as int? ?? 0,
      prendaDevueltaNombre: json['prenda_devuelta_nombre'] as String?,
      tallaDevuelta: json['talla_devuelta'] as String?,
      cantidadDevuelta: json['cantidad_devuelta'] as int? ?? 1,
      varianteEntregadaId: json['variante_entregada_id'] as int? ?? 0,
      prendaEntregadaNombre: json['prenda_entregada_nombre'] as String?,
      tallaEntregada: json['talla_entregada'] as String?,
      cantidadEntregada: json['cantidad_entregada'] as int? ?? 1,
      diferenciaMonetaria: (json['diferencia_monetaria'] is num)
          ? (json['diferencia_monetaria'] as num).toDouble()
          : double.tryParse(json['diferencia_monetaria']?.toString() ?? '0') ?? 0.0,
    );
  }
}

class NotaDevolucionResponseModel {
  final int id;
  final String codigoDevolucion;
  final int ventaId;
  final String codigoVenta;
  final int sucursalId;
  final String? sucursalNombre;
  final int? clienteId;
  final String? clienteNombre;
  final String motivo;
  final String? observaciones;
  final String fechaEmision;
  final double totalDevuelto;
  final List<DetalleNotaDevolucionResponseModel> detalles;

  const NotaDevolucionResponseModel({
    required this.id,
    required this.codigoDevolucion,
    required this.ventaId,
    required this.codigoVenta,
    required this.sucursalId,
    this.sucursalNombre,
    this.clienteId,
    this.clienteNombre,
    required this.motivo,
    this.observaciones,
    required this.fechaEmision,
    required this.totalDevuelto,
    required this.detalles,
  });

  factory NotaDevolucionResponseModel.fromJson(Map<String, dynamic> json) {
    final rawDetalles = json['detalles'] as List<dynamic>? ?? [];
    return NotaDevolucionResponseModel(
      id: json['id'] as int? ?? 0,
      codigoDevolucion: json['codigo_devolucion'] as String? ?? '',
      ventaId: json['venta_id'] as int? ?? 0,
      codigoVenta: json['codigo_venta'] as String? ?? '',
      sucursalId: json['sucursal_id'] as int? ?? 1,
      sucursalNombre: json['sucursal_nombre'] as String?,
      clienteId: json['cliente_id'] as int?,
      clienteNombre: json['cliente_nombre'] as String?,
      motivo: json['motivo'] as String? ?? '',
      observaciones: json['observaciones'] as String?,
      fechaEmision: json['fecha_emision'] as String? ?? '',
      totalDevuelto: (json['total_devuelto'] is num)
          ? (json['total_devuelto'] as num).toDouble()
          : double.tryParse(json['total_devuelto']?.toString() ?? '0') ?? 0.0,
      detalles: rawDetalles.map((d) => DetalleNotaDevolucionResponseModel.fromJson(d as Map<String, dynamic>)).toList(),
    );
  }
}
