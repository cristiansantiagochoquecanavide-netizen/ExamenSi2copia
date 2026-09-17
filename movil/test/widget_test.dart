import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:fashionstore_mobile/main.dart';
import 'package:fashionstore_mobile/shared/services/cart_service.dart';
import 'package:fashionstore_mobile/features/catalogo/domain/models/catalogo_models.dart';
import 'package:fashionstore_mobile/features/usuarios/domain/models/usuario_model.dart';
import 'package:fashionstore_mobile/features/ventas/domain/models/ventas_models.dart';

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
