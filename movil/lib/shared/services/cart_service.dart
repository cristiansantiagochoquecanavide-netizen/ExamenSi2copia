import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../features/catalogo/domain/models/catalogo_models.dart';

class CartItem {
  final PrendaModel prenda;
  final TallaModel? talla;
  final ColorModel? color;
  final int varianteId;
  int cantidad;

  CartItem({
    required this.prenda,
    this.talla,
    this.color,
    required this.varianteId,
    this.cantidad = 1,
  });

  double get subtotal => prenda.precioBase * cantidad;

  Map<String, dynamic> toJson() => {
        'prenda': {
          'id': prenda.id,
          'sku': prenda.sku,
          'nombre': prenda.nombre,
          'descripcion': prenda.descripcion,
          'precio_base': prenda.precioBase,
          'categoria_id': prenda.categoriaId,
          'temporada_id': prenda.temporadaId,
          'activo': prenda.activo,
          'categoria': prenda.categoria != null
              ? {
                  'id': prenda.categoria!.id,
                  'nombre': prenda.categoria!.nombre,
                  'sector': prenda.categoria!.sector,
                  'activo': prenda.categoria!.activo,
                }
              : null,
          'multimedia': prenda.multimedia
              .map((m) => {
                    'id': m.id,
                    'prenda_id': m.prendaId,
                    'tipo': m.tipo,
                    'url': m.url,
                    'formato': m.formato,
                    'es_portada': m.esPortada,
                  })
              .toList(),
        },
        'talla': talla != null
            ? {
                'id': talla!.id,
                'codigo': talla!.codigo,
                'orden': talla!.orden,
                'activo': talla!.activo,
              }
            : null,
        'color': color != null
            ? {
                'id': color!.id,
                'nombre': color!.nombre,
                'codigo_hex': color!.codigoHex,
                'activo': color!.activo,
              }
            : null,
        'variante_id': varianteId,
        'cantidad': cantidad,
      };

  factory CartItem.fromJson(Map<String, dynamic> json) {
    return CartItem(
      prenda: PrendaModel.fromJson(json['prenda'] as Map<String, dynamic>),
      talla: json['talla'] != null ? TallaModel.fromJson(json['talla'] as Map<String, dynamic>) : null,
      color: json['color'] != null ? ColorModel.fromJson(json['color'] as Map<String, dynamic>) : null,
      varianteId: json['variante_id'] as int? ?? 0,
      cantidad: json['cantidad'] as int? ?? 1,
    );
  }
}

class CartService extends ChangeNotifier {
  static final CartService instance = CartService._();
  CartService._() {
    _loadCart();
  }

  static const String _storageKey = 'fashionstore_cart_items';
  final List<CartItem> _items = [];

  List<CartItem> get items => List.unmodifiable(_items);

  int get totalItemsCount => _items.fold(0, (sum, i) => sum + i.cantidad);

  double get subtotal => _items.fold(0.0, (sum, i) => sum + i.subtotal);

  double get costoEnvio => _items.isEmpty ? 0.0 : 0.0; // Envío de cortesía para Alta Costura

  double get total => subtotal + costoEnvio;

  Future<void> _loadCart() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_storageKey);
      if (saved != null && saved.isNotEmpty) {
        final List<dynamic> list = jsonDecode(saved);
        _items.clear();
        for (var item in list) {
          _items.add(CartItem.fromJson(item as Map<String, dynamic>));
        }
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> _saveCart() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = jsonEncode(_items.map((i) => i.toJson()).toList());
      await prefs.setString(_storageKey, data);
    } catch (_) {}
  }

  void addItem({
    required PrendaModel prenda,
    TallaModel? talla,
    ColorModel? color,
    int? varianteId,
    int cantidad = 1,
  }) {
    final vId = varianteId ?? (prenda.variantes.isNotEmpty ? prenda.variantes.first.id : prenda.id);

    final existingIndex = _items.indexWhere(
      (i) => i.prenda.id == prenda.id && i.talla?.id == talla?.id && i.color?.id == color?.id,
    );

    if (existingIndex != -1) {
      _items[existingIndex].cantidad += cantidad;
    } else {
      _items.add(
        CartItem(
          prenda: prenda,
          talla: talla,
          color: color,
          varianteId: vId,
          cantidad: cantidad,
        ),
      );
    }

    _saveCart();
    notifyListeners();
  }

  void updateQuantity(int index, int cantidad) {
    if (index >= 0 && index < _items.length) {
      if (cantidad <= 0) {
        _items.removeAt(index);
      } else {
        _items[index].cantidad = cantidad;
      }
      _saveCart();
      notifyListeners();
    }
  }

  void removeItem(int index) {
    if (index >= 0 && index < _items.length) {
      _items.removeAt(index);
      _saveCart();
      notifyListeners();
    }
  }

  void clear() {
    _items.clear();
    _saveCart();
    notifyListeners();
  }
}
