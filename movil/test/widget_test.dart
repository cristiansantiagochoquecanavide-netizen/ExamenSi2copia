import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:fashionstore_mobile/main.dart';
import 'package:fashionstore_mobile/shared/services/cart_service.dart';
import 'package:fashionstore_mobile/features/catalogo/domain/models/catalogo_models.dart';
import 'package:fashionstore_mobile/features/usuarios/domain/models/usuario_model.dart';
import 'package:fashionstore_mobile/features/ventas/domain/models/ventas_models.dart';
import 'package:fashionstore_mobile/features/ventas/domain/models/sincronizacion_models.dart';
import 'package:fashionstore_mobile/features/ventas/domain/models/devolucion_models.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('Domain Models Tests', () {
    test('PrendaModel parses correctly from json', () {
      final json = {
        'id': 1,
        'sku': 'NOIR-001',
        'nombre': 'Vestido Noche Seda Noir',
        'descripcion': 'Vestido de fiesta corte imperio',
        'precio_base': 650.0,
        'categoria_id': 1,
        'temporada_id': 1,
        'activo': true,
        'categoria': {
          'id': 1,
          'nombre': 'Vestidos & Gala',
          'sector': 'MUJERES',
          'activo': true,
        },
        'multimedia': [
          {
            'id': 1,
            'prenda_id': 1,
            'tipo': 'IMAGEN',
            'url': 'https://example.com/vestido.jpg',
            'formato': '.jpg',
            'es_portada': true,
          },
          {
            'id': 2,
            'prenda_id': 1,
            'tipo': 'MODELO_3D_GLB',
            'url': 'https://example.com/vestido.glb',
            'formato': '.glb',
            'es_portada': false,
          }
        ],
        'variantes': [
          {
            'id': 10,
            'prenda_id': 1,
            'talla_id': 1,
            'color_id': 1,
            'sku_variante': 'NOIR-001-S-NEG',
            'activo': true,
            'talla': {'id': 1, 'codigo': 'S', 'orden': 1, 'activo': true},
            'color': {'id': 1, 'nombre': 'Negro Noir', 'codigo_hex': '#000000', 'activo': true},
          }
        ]
      };

      final model = PrendaModel.fromJson(json);
      expect(model.id, 1);
      expect(model.nombre, 'Vestido Noche Seda Noir');
      expect(model.precioBase, 650.0);
      expect(model.tieneModelo3D, isTrue);
      expect(model.portadaUrl, 'https://example.com/vestido.jpg');
      expect(model.variantes.length, 1);
      expect(model.variantes.first.talla?.codigo, 'S');
    });

    test('UsuarioModel parses correctly from json', () {
      final json = {
        'id': 1,
        'email': 'AdminFashion@gmail.com',
        'nombre': 'Admin',
        'apellido': 'FashionStore',
        'ci_nit': '1234567',
        'tipo_usuario': 'ADMIN',
        'estado': 'ACTIVO',
        'rol_id': 1,
        'rol': {
          'id': 1,
          'nombre': 'Administrador',
        }
      };

      final user = UsuarioModel.fromJson(json);
      expect(user.id, 1);
      expect(user.email, 'AdminFashion@gmail.com');
      expect(user.nombreCompleto, 'Admin FashionStore');
      expect(user.rol?.nombre, 'Administrador');
    });

    test('VentaResponseModel parses correctly', () {
      final json = {
        'id': 101,
        'codigo_venta': 'VTA-2026-001',
        'cliente_nombre': 'Maria Lopez',
        'subtotal': 650.0,
        'descuento': 0.0,
        'costo_envio': 0.0,
        'total': 650.0,
        'estado': 'COMPLETADO',
        'created_at': '2026-09-17T12:00:00Z',
        'envio': {
          'id': 5,
          'codigo_seguimiento': 'ENV-88421',
          'tipo_entrega': 'DOMICILIO',
          'estado_envio': 'PREPARANDO',
          'costo_envio': 0.0,
        }
      };

      final venta = VentaResponseModel.fromJson(json);
      expect(venta.codigoVenta, 'VTA-2026-001');
      expect(venta.total, 650.0);
      expect(venta.envio?.codigoSeguimiento, 'ENV-88421');
    });

    test('CU16 SincronizacionBatchResponseModel parses correctly', () {
      final json = {
        'total_recibidos': 2,
        'procesados_exitosamente': 1,
        'duplicados_idempotentes': 1,
        'conflictos_stock': 0,
        'errores': 0,
        'resultados': [
          {
            'uuid_operacion': '1111-2222-3333-4444',
            'tipo_operacion': 'VENTA_LOCAL',
            'estado': 'SINCRONIZADO',
            'mensaje': 'Venta offline confirmada.',
            'codigo_referencia': 'VTA-OFF-20261101-111122',
          },
          {
            'uuid_operacion': '5555-6666-7777-8888',
            'tipo_operacion': 'VENTA_LOCAL',
            'estado': 'DUPLICADO_IDEMPOTENTE',
            'mensaje': 'Idempotencia verificada (RN04).',
          }
        ]
      };

      final batch = SincronizacionBatchResponseModel.fromJson(json);
      expect(batch.totalRecibidos, 2);
      expect(batch.procesadosExitosamente, 1);
      expect(batch.duplicadosIdempotentes, 1);
      expect(batch.resultados.length, 2);
      expect(batch.resultados[0].estado, 'SINCRONIZADO');
      expect(batch.resultados[1].estado, 'DUPLICADO_IDEMPOTENTE');
    });

    test('CU17 ConflictoInventarioModel parses correctly', () {
      final json = {
        'id': 10,
        'sincronizacion_id': 5,
        'uuid_operacion': '9999-aaaa-bbbb-cccc',
        'sucursal_id': 1,
        'sucursal_nombre': 'Sucursal Central',
        'producto_variante_id': 20,
        'prenda_nombre': 'Chaqueta Cuero Atelier',
        'talla': 'M',
        'color': 'Negro',
        'cantidad_solicitada': 1,
        'stock_disponible_servidor': 0,
        'estado_resolucion': 'PENDIENTE_RESOLUCION',
        'fecha_deteccion': '2026-11-01T20:00:00Z',
      };

      final conflicto = ConflictoInventarioModel.fromJson(json);
      expect(conflicto.id, 10);
      expect(conflicto.estadoResolucion, 'PENDIENTE_RESOLUCION');
      expect(conflicto.stockDisponibleServidor, 0);
      expect(conflicto.cantidadSolicitada, 1);

      const resolver = ResolverConflictoInput(
        accion: 'TRASPASO_INMEDIATO',
        observaciones: 'Traspaso de emergencia desde Sucursal Norte',
        sucursalProveedoraId: 2,
      );
      expect(resolver.toJson()['accion'], 'TRASPASO_INMEDIATO');
      expect(resolver.toJson()['sucursal_proveedora_id'], 2);
    });

    test('CU19 y CU20 ValidarCambioGarantiaModel y NotaDevolucionResponseModel parse correctly', () {
      final jsonGarantia = {
        'venta_id': 4,
        'codigo_venta': 'VTA-20261101-0001',
        'fecha_venta': '2026-11-01T15:00:00Z',
        'dias_transcurridos': 1,
        'plazo_maximo_dias': 7,
        'garantia_vigente': true,
        'permite_cambio_talla': true,
        'admite_reembolso_dinero': false, // RN07
        'mensaje': 'Garantía vigente para cambio de talla.',
        'sucursal_id': 1,
        'sucursal_nombre': 'Sucursal Central',
        'cliente_nombre': 'María Gómez',
        'items': [
          {
            'id': 1,
            'producto_variante_id': 10,
            'prenda_nombre': 'Vestido Seda Noir',
            'talla': 'S',
            'color': 'Negro',
            'precio_unitario': 650.0,
            'cantidad': 1,
            'subtotal': 650.0,
            'cantidad_devuelta_previa': 0,
            'disponible_devolver': 1,
          }
        ]
      };

      final g = ValidarCambioGarantiaModel.fromJson(jsonGarantia);
      expect(g.garantiaVigente, isTrue);
      expect(g.admiteReembolsoDinero, isFalse); // RN07
      expect(g.items.first.prendaNombre, 'Vestido Seda Noir');

      final jsonNota = {
        'id': 1,
        'codigo_devolucion': 'DEV-2026-0001',
        'venta_id': 4,
        'codigo_venta': 'VTA-20261101-0001',
        'sucursal_id': 1,
        'motivo': 'DESAJUSTE_MEDIDA_ANATOMICA',
        'fecha_emision': '2026-11-01T20:30:00Z',
        'total_devuelto': 0.0,
        'detalles': [
          {
            'id': 1,
            'variante_devuelta_id': 10,
            'cantidad_devuelta': 1,
            'variante_entregada_id': 11,
            'cantidad_entregada': 1,
            'diferencia_monetaria': 0.0,
          }
        ]
      };

      final nota = NotaDevolucionResponseModel.fromJson(jsonNota);
      expect(nota.codigoDevolucion, 'DEV-2026-0001');
      expect(nota.detalles.first.diferenciaMonetaria, 0.0);
    });
  });

  group('CartService Tests', () {
    test('CartService correctly adds, increments, decrements, and clears items', () {
      final cart = CartService.instance;
      cart.clear();
      expect(cart.items.isEmpty, isTrue);

      const prenda = PrendaModel(
        id: 1,
        sku: 'NOIR-001',
        nombre: 'Vestido Noir',
        descripcion: 'Test',
        precioBase: 200.0,
        categoriaId: 1,
        temporadaId: 1,
        activo: true,
      );

      const talla = TallaModel(id: 1, codigo: 'M', orden: 1, activo: true);
      const color = ColorModel(id: 1, nombre: 'Negro', activo: true);

      // Add item
      cart.addItem(prenda: prenda, talla: talla, color: color, varianteId: 10, cantidad: 1);
      expect(cart.totalItemsCount, 1);
      expect(cart.subtotal, 200.0);

      // Add same item (increments quantity)
      cart.addItem(prenda: prenda, talla: talla, color: color, varianteId: 10, cantidad: 2);
      expect(cart.totalItemsCount, 3);
      expect(cart.subtotal, 600.0);

      // Update quantity
      cart.updateQuantity(0, 1);
      expect(cart.totalItemsCount, 1);
      expect(cart.subtotal, 200.0);

      // Remove item
      cart.removeItem(0);
      expect(cart.totalItemsCount, 0);
      expect(cart.items.isEmpty, isTrue);
    });
  });

  testWidgets('FashionStoreApp smoke test boots with Atelier branding', (WidgetTester tester) async {
    await tester.pumpWidget(const FashionStoreApp());
    await tester.pumpAndSettle();

    expect(find.text('FASHION'), findsOneWidget);
    expect(find.text('STORE'), findsOneWidget);
  });
}
