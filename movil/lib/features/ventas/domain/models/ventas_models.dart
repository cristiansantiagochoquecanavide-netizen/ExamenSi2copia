class DetalleVentaInput {
  final int varianteId;
  final int cantidad;
  final double? precioUnitario;

  const DetalleVentaInput({
    required this.varianteId,
    required this.cantidad,
    this.precioUnitario,
  });

  Map<String, dynamic> toJson() => {
        'variante_id': varianteId,
        'cantidad': cantidad,
        if (precioUnitario != null) 'precio_unitario': precioUnitario,
      };
}

class DatosEnvioInput {
  final String tipoEntrega; // DOMICILIO, RECOJO_TIENDA
  final String? direccionLinea1;
  final String? ciudad;
  final String? departamento;
  final String? telefonoContacto;
  final String? instruccionesEntrega;

  const DatosEnvioInput({
    this.tipoEntrega = 'DOMICILIO',
    this.direccionLinea1,
    this.ciudad,
    this.departamento,
    this.telefonoContacto,
    this.instruccionesEntrega,
  });

  Map<String, dynamic> toJson() => {
        'tipo_entrega': tipoEntrega,
        if (direccionLinea1 != null) 'direccion_linea1': direccionLinea1,
        if (ciudad != null) 'ciudad': ciudad,
        if (departamento != null) 'departamento': departamento,
        if (telefonoContacto != null) 'telefono_contacto': telefonoContacto,
        if (instruccionesEntrega != null) 'instrucciones_entrega': instruccionesEntrega,
      };
}

class DatosTarjetaInput {
  final String numero;
  final String mesExp;
  final String anioExp;
  final String cvc;
  final String titular;

  const DatosTarjetaInput({
    required this.numero,
    required this.mesExp,
    required this.anioExp,
    required this.cvc,
    required this.titular,
  });

  Map<String, dynamic> toJson() => {
        'numero': numero,
        'mes_exp': mesExp,
        'anio_exp': anioExp,
        'cvc': cvc,
        'titular': titular,
      };
}

class PagoOnlineInput {
  final String metodoPago; // QR_SIMPLE, TARJETA, EFECTIVO, PAYPAL
  final String? pasarela; // LIBELULA_BOLIVIA, STRIPE_INTL
  final double? monto;
  final String moneda;
  final String? clienteEmail;
  final DatosTarjetaInput? datosTarjeta;

  const PagoOnlineInput({
    required this.metodoPago,
    this.pasarela,
    this.monto,
    this.moneda = 'BOB',
    this.clienteEmail,
    this.datosTarjeta,
  });

  Map<String, dynamic> toJson() => {
        'metodo_pago': metodoPago,
        if (pasarela != null) 'pasarela': pasarela,
        if (monto != null) 'monto': monto,
        'moneda': moneda,
        if (clienteEmail != null) 'cliente_email': clienteEmail,
        if (datosTarjeta != null) 'datos_tarjeta': datosTarjeta!.toJson(),
      };
}

class VentaOnlineCheckoutRequest {
  final String clienteNombre;
  final String clienteEmail;
  final String clienteNit;
  final String? clienteTelefono;
  final List<DetalleVentaInput> detalles;
  final DatosEnvioInput? envio;
  final PagoOnlineInput pago;

  const VentaOnlineCheckoutRequest({
    required this.clienteNombre,
    required this.clienteEmail,
    this.clienteNit = '0',
    this.clienteTelefono,
    required this.detalles,
    this.envio,
    required this.pago,
  });

  Map<String, dynamic> toJson() => {
        'cliente_nombre': clienteNombre,
        'cliente_email': clienteEmail,
        'cliente_nit': clienteNit,
        if (clienteTelefono != null) 'cliente_telefono': clienteTelefono,
        'detalles': detalles.map((d) => d.toJson()).toList(),
        if (envio != null) 'envio': envio!.toJson(),
        'pago': pago.toJson(),
      };
}

class EnvioResponseModel {
  final int id;
  final String codigoSeguimiento;
  final String tipoEntrega;
  final String estadoEnvio;
  final double costoEnvio;
  final String? direccionLinea1;
  final String? ciudad;

  const EnvioResponseModel({
    required this.id,
    required this.codigoSeguimiento,
    required this.tipoEntrega,
    required this.estadoEnvio,
    required this.costoEnvio,
    this.direccionLinea1,
    this.ciudad,
  });

  factory EnvioResponseModel.fromJson(Map<String, dynamic> json) {
    return EnvioResponseModel(
      id: json['id'] as int? ?? 0,
      codigoSeguimiento: json['codigo_seguimiento'] as String? ?? '',
      tipoEntrega: json['tipo_entrega'] as String? ?? 'DOMICILIO',
      estadoEnvio: json['estado_envio'] as String? ?? 'PREPARANDO',
      costoEnvio: (json['costo_envio'] is num) ? (json['costo_envio'] as num).toDouble() : 0.0,
      direccionLinea1: json['direccion_linea1'] as String?,
      ciudad: json['ciudad'] as String?,
    );
  }
}

class VentaResponseModel {
  final int id;
  final String codigoVenta;
  final String clienteNombre;
  final double subtotal;
  final double descuento;
  final double costoEnvio;
  final double total;
  final String estado;
  final String createdAt;
  final EnvioResponseModel? envio;

  const VentaResponseModel({
    required this.id,
    required this.codigoVenta,
    required this.clienteNombre,
    required this.subtotal,
    required this.descuento,
    required this.costoEnvio,
    required this.total,
    required this.estado,
    required this.createdAt,
    this.envio,
  });

  factory VentaResponseModel.fromJson(Map<String, dynamic> json) {
    return VentaResponseModel(
      id: json['id'] as int? ?? 0,
      codigoVenta: json['codigo_venta'] as String? ?? '',
      clienteNombre: json['cliente_nombre'] as String? ?? 'Cliente',
      subtotal: (json['subtotal'] is num) ? (json['subtotal'] as num).toDouble() : double.tryParse(json['subtotal']?.toString() ?? '0') ?? 0.0,
      descuento: (json['descuento'] is num) ? (json['descuento'] as num).toDouble() : double.tryParse(json['descuento']?.toString() ?? '0') ?? 0.0,
      costoEnvio: (json['costo_envio'] is num) ? (json['costo_envio'] as num).toDouble() : double.tryParse(json['costo_envio']?.toString() ?? '0') ?? 0.0,
      total: (json['total'] is num) ? (json['total'] as num).toDouble() : double.tryParse(json['total']?.toString() ?? '0') ?? 0.0,
      estado: json['estado'] as String? ?? 'COMPLETADO',
      createdAt: json['created_at'] as String? ?? '',
      envio: json['envio'] != null ? EnvioResponseModel.fromJson(json['envio'] as Map<String, dynamic>) : null,
    );
  }
}
