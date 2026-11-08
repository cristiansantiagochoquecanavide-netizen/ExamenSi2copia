-- =============================================================================
-- ESQUEMA DE BASE DE DATOS ACTUAL: FASHIONSTORE
-- UNIVERSIDAD AUTÓNOMA GABRIEL RENÉ MORENO (UAGRM) - SISTEMAS DE INFORMACIÓN II
-- MOTOR: PostgreSQL 14+
-- ARQUITECTURA: Hexagonal / DDD (FastAPI Backend + Angular Web + Flutter Móvil)
-- TOTAL TABLAS: 31 Tablas estructuradas por Dominios y Casos de Uso (CU)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- LIMPIEZA DE TABLAS (EN ORDEN INVERSO DE DEPENDENCIAS)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS dispositivos_push CASCADE;
DROP TABLE IF EXISTS notificaciones CASCADE;
DROP TABLE IF EXISTS mensajes_chat_ia CASCADE;
DROP TABLE IF EXISTS sesiones_chat_ia CASCADE;
DROP TABLE IF EXISTS interacciones_recomendacion CASCADE;
DROP TABLE IF EXISTS preferencias_estilo_usuario CASCADE;
DROP TABLE IF EXISTS usos_promocion CASCADE;
DROP TABLE IF EXISTS promociones CASCADE;
DROP TABLE IF EXISTS envios_pedido CASCADE;
DROP TABLE IF EXISTS detalles_devolucion CASCADE;
DROP TABLE IF EXISTS devoluciones CASCADE;
DROP TABLE IF EXISTS pagos CASCADE;
DROP TABLE IF EXISTS detalles_venta CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS detalles_reserva CASCADE;
DROP TABLE IF EXISTS reservas CASCADE;
DROP TABLE IF EXISTS detalles_transferencia_stock CASCADE;
DROP TABLE IF EXISTS transferencias_stock CASCADE;
DROP TABLE IF EXISTS detalles_recepcion_mercaderia CASCADE;
DROP TABLE IF EXISTS recepciones_mercaderia CASCADE;
DROP TABLE IF EXISTS proveedores CASCADE;
DROP TABLE IF EXISTS movimientos_inventario CASCADE;
DROP TABLE IF EXISTS inventario_stock CASCADE;
DROP TABLE IF EXISTS calificaciones_prenda CASCADE;
DROP TABLE IF EXISTS prenda_variantes CASCADE;
DROP TABLE IF EXISTS prenda_multimedia CASCADE;
DROP TABLE IF EXISTS prendas CASCADE;
DROP TABLE IF EXISTS temporadas CASCADE;
DROP TABLE IF EXISTS colores CASCADE;
DROP TABLE IF EXISTS tallas CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS sucursales CASCADE;
DROP TABLE IF EXISTS ciudades CASCADE;
DROP TABLE IF EXISTS bitacora_auditoria CASCADE;
DROP TABLE IF EXISTS recuperaciones_password CASCADE;
DROP TABLE IF EXISTS token_blacklist CASCADE;
DROP TABLE IF EXISTS rol_permisos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS permisos CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- =============================================================================
-- DOMINIO 1: SEGURIDAD, RBAC Y AUDITORÍA (CU1, CU2, CU3, CU4)
-- =============================================================================

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    es_sistema BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_roles_nombre ON roles(nombre);

CREATE TABLE permisos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(100) NOT NULL UNIQUE,
    modulo VARCHAR(50) NOT NULL,
    descripcion VARCHAR(255)
);
CREATE INDEX idx_permisos_codigo ON permisos(codigo);
CREATE INDEX idx_permisos_modulo ON permisos(modulo);

CREATE TABLE rol_permisos (
    rol_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id INTEGER NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (rol_id, permiso_id)
);

CREATE TABLE ciudades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_ciudades_nombre ON ciudades(nombre);

CREATE TABLE sucursales (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    horario_atencion VARCHAR(100),
    capacidad_probadores INTEGER DEFAULT 3 NOT NULL,
    ciudad_id INTEGER NOT NULL REFERENCES ciudades(id),
    encargado_id INTEGER, -- FK agregada tras crear usuarios
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_sucursales_nombre ON sucursales(nombre);
CREATE INDEX idx_sucursales_ciudad ON sucursales(ciudad_id);

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    ci_nit VARCHAR(50) NOT NULL UNIQUE,
    telefono VARCHAR(50),
    direccion VARCHAR(255),
    tipo_usuario VARCHAR(20) DEFAULT 'CLIENTE' NOT NULL, -- 'PERSONAL', 'CLIENTE'
    estado VARCHAR(20) DEFAULT 'ACTIVO' NOT NULL,        -- 'ACTIVO', 'INACTIVO', 'BLOQUEADO'
    rol_id INTEGER NOT NULL REFERENCES roles(id),
    sucursal_id INTEGER REFERENCES sucursales(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_ci_nit ON usuarios(ci_nit);
CREATE INDEX idx_usuarios_rol ON usuarios(rol_id);
CREATE INDEX idx_usuarios_tipo ON usuarios(tipo_usuario);

-- Añadir restricción FK a sucursal para el encargado
ALTER TABLE sucursales ADD CONSTRAINT fk_sucursales_encargado FOREIGN KEY (encargado_id) REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE TABLE token_blacklist (
    id SERIAL PRIMARY KEY,
    token VARCHAR(500) NOT NULL UNIQUE,
    user_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    revoked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_token_blacklist_token ON token_blacklist(token);

CREATE TABLE recuperaciones_password (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    token VARCHAR(100) NOT NULL UNIQUE,
    expira_at TIMESTAMP WITH TIME ZONE NOT NULL,
    usado BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_recuperaciones_email ON recuperaciones_password(email);
CREATE INDEX idx_recuperaciones_token ON recuperaciones_password(token);

CREATE TABLE bitacora_auditoria (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_email VARCHAR(150),
    ip_address VARCHAR(50),
    accion VARCHAR(50) NOT NULL,
    modulo VARCHAR(50) NOT NULL,
    detalle TEXT NOT NULL,
    valores_anteriores TEXT,
    valores_nuevos TEXT
);
CREATE INDEX idx_bitacora_timestamp ON bitacora_auditoria(timestamp);
CREATE INDEX idx_bitacora_accion ON bitacora_auditoria(accion);
CREATE INDEX idx_bitacora_modulo ON bitacora_auditoria(modulo);
CREATE INDEX idx_bitacora_usuario ON bitacora_auditoria(usuario_id);

-- =============================================================================
-- DOMINIO 2: CATÁLOGO DE MODA, PARAMÉTRICAS Y MULTIMEDIA AR (CU5, CU6, CU18)
-- =============================================================================

CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    sector VARCHAR(50) DEFAULT 'UNISEX' NOT NULL, -- 'MUJERES', 'HOMBRES', 'UNISEX'
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_categorias_nombre_sector UNIQUE (nombre, sector)
);
CREATE INDEX idx_categorias_nombre ON categorias(nombre);
CREATE INDEX idx_categorias_sector ON categorias(sector);

CREATE TABLE tallas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    descripcion VARCHAR(100),
    orden INTEGER DEFAULT 0 NOT NULL,
    activo BOOLEAN DEFAULT TRUE NOT NULL
);
CREATE INDEX idx_tallas_codigo ON tallas(codigo);

CREATE TABLE colores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    codigo_hex VARCHAR(20),
    codigo_rgb VARCHAR(30),
    activo BOOLEAN DEFAULT TRUE NOT NULL
);
CREATE INDEX idx_colores_nombre ON colores(nombre);

CREATE TABLE temporadas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    fecha_inicio DATE,
    fecha_fin DATE,
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_temporadas_nombre ON temporadas(nombre);
CREATE INDEX idx_temporadas_codigo ON temporadas(codigo);

CREATE TABLE prendas (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    precio_base NUMERIC(10, 2) NOT NULL,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id),
    temporada_id INTEGER NOT NULL REFERENCES temporadas(id),
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_prendas_sku ON prendas(sku);
CREATE INDEX idx_prendas_nombre ON prendas(nombre);
CREATE INDEX idx_prendas_categoria ON prendas(categoria_id);
CREATE INDEX idx_prendas_temporada ON prendas(temporada_id);

CREATE TABLE prenda_multimedia (
    id SERIAL PRIMARY KEY,
    prenda_id INTEGER NOT NULL REFERENCES prendas(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,       -- 'IMAGEN', 'MODELO_3D_GLB', 'MODELO_3D_USDZ'
    url VARCHAR(500) NOT NULL,
    formato VARCHAR(20) NOT NULL,   -- '.glb', '.usdz', '.jpg', '.png', '.webp'
    es_portada BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_multimedia_prenda ON prenda_multimedia(prenda_id);

CREATE TABLE prenda_variantes (
    id SERIAL PRIMARY KEY,
    prenda_id INTEGER NOT NULL REFERENCES prendas(id) ON DELETE CASCADE,
    talla_id INTEGER NOT NULL REFERENCES tallas(id),
    color_id INTEGER NOT NULL REFERENCES colores(id),
    sku_variante VARCHAR(100) NOT NULL UNIQUE,
    codigo_barras VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    CONSTRAINT uq_prenda_talla_color UNIQUE (prenda_id, talla_id, color_id)
);
CREATE INDEX idx_variantes_prenda ON prenda_variantes(prenda_id);
CREATE INDEX idx_variantes_sku ON prenda_variantes(sku_variante);

CREATE TABLE calificaciones_prenda (
    id SERIAL PRIMARY KEY,
    prenda_id INTEGER NOT NULL REFERENCES prendas(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    puntuacion INTEGER NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
    ajuste_talla VARCHAR(20) DEFAULT 'FIEL' NOT NULL, -- 'PEQUENO', 'FIEL', 'GRANDE'
    calidad INTEGER DEFAULT 5 NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    comentario TEXT NOT NULL,
    compra_verificada BOOLEAN DEFAULT FALSE NOT NULL,
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_prenda_usuario_calificacion UNIQUE (prenda_id, usuario_id)
);
CREATE INDEX idx_calificaciones_prenda ON calificaciones_prenda(prenda_id);
CREATE INDEX idx_calificaciones_usuario ON calificaciones_prenda(usuario_id);

-- =============================================================================
-- DOMINIO 3: INVENTARIO, PROVEEDORES Y TRANSFERENCIAS (CU7, CU8, CU9)
-- =============================================================================

CREATE TABLE inventario_stock (
    id SERIAL PRIMARY KEY,
    variante_id INTEGER NOT NULL REFERENCES prenda_variantes(id) ON DELETE CASCADE,
    sucursal_id INTEGER NOT NULL REFERENCES sucursales(id),
    cantidad_disponible INTEGER DEFAULT 0 NOT NULL,
    cantidad_reservada INTEGER DEFAULT 0 NOT NULL,
    stock_minimo INTEGER DEFAULT 5 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_variante_sucursal UNIQUE (variante_id, sucursal_id)
);
CREATE INDEX idx_stock_variante ON inventario_stock(variante_id);
CREATE INDEX idx_stock_sucursal ON inventario_stock(sucursal_id);

CREATE TABLE movimientos_inventario (
    id SERIAL PRIMARY KEY,
    stock_id INTEGER NOT NULL REFERENCES inventario_stock(id) ON DELETE CASCADE,
    tipo_movimiento VARCHAR(50) NOT NULL, -- 'INGRESO_INICIAL', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'VENTA', 'RESERVA_APARTADA', 'DEVOLUCION'
    cantidad INTEGER NOT NULL,
    cantidad_anterior INTEGER NOT NULL,
    cantidad_nueva INTEGER NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_movimientos_stock ON movimientos_inventario(stock_id);

CREATE TABLE proveedores (
    id SERIAL PRIMARY KEY,
    razon_social VARCHAR(150) NOT NULL UNIQUE,
    nit VARCHAR(25) NOT NULL,
    contacto_nombre VARCHAR(100),
    telefono VARCHAR(50),
    email VARCHAR(100),
    direccion VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_proveedores_razon ON proveedores(razon_social);
CREATE INDEX idx_proveedores_nit ON proveedores(nit);

CREATE TABLE recepciones_mercaderia (
    id SERIAL PRIMARY KEY,
    numero_documento VARCHAR(50) NOT NULL,
    proveedor_id INTEGER NOT NULL REFERENCES proveedores(id),
    sucursal_id INTEGER NOT NULL REFERENCES sucursales(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    fecha_recepcion DATE DEFAULT CURRENT_DATE NOT NULL,
    observaciones TEXT,
    costo_total NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_recepciones_doc ON recepciones_mercaderia(numero_documento);
CREATE INDEX idx_recepciones_proveedor ON recepciones_mercaderia(proveedor_id);

CREATE TABLE detalles_recepcion_mercaderia (
    id SERIAL PRIMARY KEY,
    recepcion_id INTEGER NOT NULL REFERENCES recepciones_mercaderia(id) ON DELETE CASCADE,
    variante_id INTEGER NOT NULL REFERENCES prenda_variantes(id),
    cantidad INTEGER NOT NULL,
    costo_unitario NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL
);
CREATE INDEX idx_det_recepcion ON detalles_recepcion_mercaderia(recepcion_id);

CREATE TABLE transferencias_stock (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    sucursal_origen_id INTEGER NOT NULL REFERENCES sucursales(id),
    sucursal_destino_id INTEGER NOT NULL REFERENCES sucursales(id),
    usuario_envia_id INTEGER NOT NULL REFERENCES usuarios(id),
    usuario_recibe_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    estado VARCHAR(20) DEFAULT 'EN_TRANSITO' NOT NULL, -- 'EN_TRANSITO', 'COMPLETADA', 'CANCELADA'
    motivo VARCHAR(255),
    observaciones TEXT,
    fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_recepcion TIMESTAMP WITH TIME ZONE,
    total_prendas INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_transferencias_cod ON transferencias_stock(codigo);
CREATE INDEX idx_transferencias_origen ON transferencias_stock(sucursal_origen_id);
CREATE INDEX idx_transferencias_destino ON transferencias_stock(sucursal_destino_id);

CREATE TABLE detalles_transferencia_stock (
    id SERIAL PRIMARY KEY,
    transferencia_id INTEGER NOT NULL REFERENCES transferencias_stock(id) ON DELETE CASCADE,
    variante_id INTEGER NOT NULL REFERENCES prenda_variantes(id),
    cantidad INTEGER NOT NULL
);
CREATE INDEX idx_det_transferencia ON detalles_transferencia_stock(transferencia_id);

-- =============================================================================
-- DOMINIO 4: RESERVAS DE PROBADORES FÍSICOS (CU13)
-- =============================================================================

CREATE TABLE reservas (
    id SERIAL PRIMARY KEY,
    codigo_reserva VARCHAR(30) NOT NULL UNIQUE,
    cliente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    sucursal_id INTEGER NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    fecha_reserva DATE NOT NULL,
    hora_estimada VARCHAR(10) NOT NULL, -- '15:30'
    estado VARCHAR(20) DEFAULT 'CONFIRMADA' NOT NULL, -- 'PENDIENTE', 'CONFIRMADA', 'EN_PROBADOR', 'COMPLETADA', 'CANCELADA', 'EXPIRADA'
    monto_anticipo NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    moneda VARCHAR(5) DEFAULT 'USD' NOT NULL,
    observaciones TEXT,
    qr_token TEXT,
    probador_asignado VARCHAR(50),
    atendido_por_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_reservas_codigo ON reservas(codigo_reserva);
CREATE INDEX idx_reservas_cliente ON reservas(cliente_id);
CREATE INDEX idx_reservas_sucursal ON reservas(sucursal_id);
CREATE INDEX idx_reservas_estado ON reservas(estado);

CREATE TABLE detalles_reserva (
    id SERIAL PRIMARY KEY,
    reserva_id INTEGER NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
    variante_id INTEGER NOT NULL REFERENCES prenda_variantes(id) ON DELETE RESTRICT,
    cantidad INTEGER DEFAULT 1 NOT NULL,
    precio_unitario NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    subtotal NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    probada BOOLEAN DEFAULT FALSE NOT NULL,
    comprada BOOLEAN DEFAULT FALSE NOT NULL
);
CREATE INDEX idx_detalles_reserva_res ON detalles_reserva(reserva_id);
CREATE INDEX idx_detalles_reserva_var ON detalles_reserva(variante_id);

-- =============================================================================
-- DOMINIO 5: VENTAS, PAGOS, DEVOLUCIONES, ENVÍOS Y PROMOCIONES (CU10, CU11, CU14, CU15, CU16)
-- =============================================================================

CREATE TABLE ventas (
    id SERIAL PRIMARY KEY,
    codigo_venta VARCHAR(50) NOT NULL UNIQUE,
    sucursal_id INTEGER NOT NULL REFERENCES sucursales(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id), -- Cajero
    cliente_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    reserva_id INTEGER REFERENCES reservas(id) ON DELETE SET NULL,
    canal_venta VARCHAR(30) DEFAULT 'FISICA_POS' NOT NULL, -- 'FISICA_POS', 'ONLINE_WEB'
    cliente_nombre VARCHAR(150) DEFAULT 'Consumidor Final' NOT NULL,
    cliente_nit VARCHAR(50) DEFAULT '0' NOT NULL,
    subtotal NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    descuento NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    costo_envio NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    total NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    estado VARCHAR(20) DEFAULT 'PAGADA' NOT NULL, -- 'PAGADA', 'PENDIENTE', 'ANULADA'
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_ventas_codigo ON ventas(codigo_venta);
CREATE INDEX idx_ventas_sucursal ON ventas(sucursal_id);
CREATE INDEX idx_ventas_usuario ON ventas(usuario_id);
CREATE INDEX idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX idx_ventas_estado ON ventas(estado);

CREATE TABLE detalles_venta (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    variante_id INTEGER NOT NULL REFERENCES prenda_variantes(id),
    cantidad INTEGER NOT NULL,
    precio_unitario NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL
);
CREATE INDEX idx_det_venta ON detalles_venta(venta_id);

CREATE TABLE pagos (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER REFERENCES ventas(id) ON DELETE CASCADE,
    reserva_id INTEGER REFERENCES reservas(id) ON DELETE SET NULL,
    metodo_pago VARCHAR(30) NOT NULL, -- 'EFECTIVO', 'TARJETA', 'QR_SIMPLE', 'PAYPAL'
    pasarela VARCHAR(50),             -- 'LIBELULA_BOLIVIA', 'STRIPE_INTL', 'PAYPAL_EXPRESS', 'EFECTIVO_POS'
    monto NUMERIC(12, 2) NOT NULL,
    moneda VARCHAR(10) DEFAULT 'USD' NOT NULL,
    estado_pago VARCHAR(20) DEFAULT 'CONFIRMADO' NOT NULL, -- 'CONFIRMADO', 'PENDIENTE', 'RECHAZADO'
    transaccion_externa_id VARCHAR(100),
    cliente_email VARCHAR(150),
    qr_payload TEXT,
    datos_transaccion TEXT,
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_pagos_venta ON pagos(venta_id);
CREATE INDEX idx_pagos_reserva ON pagos(reserva_id);
CREATE INDEX idx_pagos_transaccion ON pagos(transaccion_externa_id);

CREATE TABLE devoluciones (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    sucursal_id INTEGER NOT NULL REFERENCES sucursales(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    tipo VARCHAR(20) DEFAULT 'DEVOLUCION' NOT NULL, -- 'DEVOLUCION', 'CAMBIO'
    motivo VARCHAR(50) DEFAULT 'CAMBIO_TALLA' NOT NULL,
    estado VARCHAR(20) DEFAULT 'COMPLETADA' NOT NULL,
    total_devuelto NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    total_nuevo NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    diferencia NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    metodo_reembolso VARCHAR(30),
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_devoluciones_cod ON devoluciones(codigo);
CREATE INDEX idx_devoluciones_venta ON devoluciones(venta_id);

CREATE TABLE detalles_devolucion (
    id SERIAL PRIMARY KEY,
    devolucion_id INTEGER NOT NULL REFERENCES devoluciones(id) ON DELETE CASCADE,
    variante_devuelta_id INTEGER NOT NULL REFERENCES prenda_variantes(id),
    cantidad_devuelta INTEGER NOT NULL,
    precio_unitario_devuelto NUMERIC(10, 2) NOT NULL,
    subtotal_devuelto NUMERIC(12, 2) NOT NULL,
    condicion_prenda VARCHAR(30) DEFAULT 'APTO_PARA_VENTA' NOT NULL,
    variante_cambio_id INTEGER REFERENCES prenda_variantes(id) ON DELETE SET NULL,
    cantidad_cambio INTEGER,
    precio_unitario_cambio NUMERIC(10, 2),
    subtotal_cambio NUMERIC(12, 2),
    diferencia_linea NUMERIC(12, 2) DEFAULT 0.00 NOT NULL
);
CREATE INDEX idx_det_devolucion ON detalles_devolucion(devolucion_id);

CREATE TABLE envios_pedido (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER NOT NULL UNIQUE REFERENCES ventas(id) ON DELETE CASCADE,
    codigo_seguimiento VARCHAR(50) NOT NULL UNIQUE,
    tipo_entrega VARCHAR(20) DEFAULT 'DOMICILIO' NOT NULL, -- 'DOMICILIO', 'RECOJO_TIENDA'
    sucursal_recojo_id INTEGER REFERENCES sucursales(id) ON DELETE SET NULL,
    direccion_linea1 VARCHAR(255),
    direccion_linea2 VARCHAR(255),
    ciudad VARCHAR(100),
    departamento VARCHAR(100),
    telefono_contacto VARCHAR(50),
    instrucciones_entrega TEXT,
    costo_envio NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    empresa_courier VARCHAR(100) DEFAULT 'Atelier Courier Express',
    estado_envio VARCHAR(30) DEFAULT 'PREPARANDO' NOT NULL, -- 'PREPARANDO', 'EN_CAMINO', 'ENTREGADO', 'LISTO_RECOJO'
    fecha_estimada_entrega DATE,
    fecha_entregado TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_envios_seguimiento ON envios_pedido(codigo_seguimiento);
CREATE INDEX idx_envios_estado ON envios_pedido(estado_envio);

CREATE TABLE promociones (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    tipo_descuento VARCHAR(30) NOT NULL, -- 'PORCENTAJE', 'MONTO_FIJO', 'ENVIO_GRATIS'
    valor_descuento NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    monto_minimo_compra NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    descuento_maximo NUMERIC(10, 2),
    limite_usos INTEGER,
    usos_actuales INTEGER DEFAULT 0 NOT NULL,
    limite_por_cliente INTEGER DEFAULT 1 NOT NULL,
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    sucursal_id INTEGER REFERENCES sucursales(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_promociones_codigo ON promociones(codigo);
CREATE INDEX idx_promociones_activo ON promociones(activo);

CREATE TABLE usos_promocion (
    id SERIAL PRIMARY KEY,
    promocion_id INTEGER NOT NULL REFERENCES promociones(id) ON DELETE CASCADE,
    venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    monto_descontado NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    fecha_canje TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_usos_promocion ON usos_promocion(promocion_id);
CREATE INDEX idx_usos_venta ON usos_promocion(venta_id);

-- =============================================================================
-- DOMINIO 6: INTELIGENCIA ARTIFICIAL Y ASISTENTE (CU19)
-- =============================================================================

CREATE TABLE preferencias_estilo_usuario (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    sector_preferido VARCHAR(50) DEFAULT 'UNISEX' NOT NULL, -- 'MUJER', 'HOMBRE', 'UNISEX', 'NINOS'
    ocasion_frecuente VARCHAR(50) DEFAULT 'CASUAL' NOT NULL, -- 'GALA', 'FORMAL_OFICINA', 'CASUAL', 'COCTEL', 'URBANO'
    estilos_preferidos TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    colores_favoritos TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    presupuesto_max NUMERIC(10, 2),
    completado BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_preferencias_usuario ON preferencias_estilo_usuario(usuario_id);

CREATE TABLE interacciones_recomendacion (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    prenda_id INTEGER NOT NULL REFERENCES prendas(id) ON DELETE CASCADE,
    tipo_evento VARCHAR(30) NOT NULL, -- 'IMPRESION', 'CLICK', 'OUTFIT_VIEW', 'ADD_TO_CART'
    score_aplicado NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    motivo VARCHAR(100) NOT NULL,     -- 'AFINIDAD_COMPRAS', 'QUIZ_ESTILO', 'TEMPORADA_ACTIVA', 'COMPLETA_LOOK'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_interacciones_usuario ON interacciones_recomendacion(usuario_id);
CREATE INDEX idx_interacciones_prenda ON interacciones_recomendacion(prenda_id);

CREATE TABLE sesiones_chat_ia (
    id SERIAL PRIMARY KEY,
    session_uuid VARCHAR(64) NOT NULL UNIQUE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    titulo VARCHAR(150) DEFAULT 'Consulta con Atelier Concierge' NOT NULL,
    activa BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_sesiones_chat_uuid ON sesiones_chat_ia(session_uuid);
CREATE INDEX idx_sesiones_chat_usuario ON sesiones_chat_ia(usuario_id);

CREATE TABLE mensajes_chat_ia (
    id SERIAL PRIMARY KEY,
    sesion_id INTEGER NOT NULL REFERENCES sesiones_chat_ia(id) ON DELETE CASCADE,
    remitente VARCHAR(20) NOT NULL, -- 'USUARIO', 'ASISTENTE'
    texto TEXT NOT NULL,
    intencion_detectada VARCHAR(50), -- 'BUSCAR_PRENDA', 'CONSULTAR_STOCK', 'COMBINAR_LOOK', 'AGENDAR_PROBADOR', 'POLITICAS_TIENDA', 'SALUDO_GENERAL'
    prendas_adjuntas_ids INTEGER[] DEFAULT '{}'::INTEGER[] NOT NULL,
    sugerencias_rapidas TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_mensajes_chat_sesion ON mensajes_chat_ia(sesion_id);

-- =============================================================================
-- DOMINIO 7: NOTIFICACIONES PUSH Y OMNICANAL
-- =============================================================================

CREATE TABLE notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL,  -- 'RESERVA_PROBADOR', 'ESTADO_PEDIDO', 'PROMOCION', 'RECOMENDACION_IA', 'ALERTA_STOCK', 'SISTEMA'
    canal VARCHAR(50) DEFAULT 'TODOS' NOT NULL, -- 'PUSH', 'IN_APP', 'TODOS'
    prioridad VARCHAR(20) DEFAULT 'NORMAL' NOT NULL, -- 'BAJA', 'NORMAL', 'ALTA', 'URGENTE'
    leida BOOLEAN DEFAULT FALSE NOT NULL,
    data_extra JSONB DEFAULT '{}'::JSONB,
    fecha_leida TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX idx_notificaciones_tipo ON notificaciones(tipo);
CREATE INDEX idx_notificaciones_leida ON notificaciones(leida);

CREATE TABLE dispositivos_push (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    token_dispositivo VARCHAR(500) NOT NULL UNIQUE,
    plataforma VARCHAR(20) DEFAULT 'WEB' NOT NULL, -- 'WEB', 'ANDROID', 'IOS'
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX idx_dispositivos_token ON dispositivos_push(token_dispositivo);
CREATE INDEX idx_dispositivos_usuario ON dispositivos_push(usuario_id);

-- =============================================================================
-- FIN DEL ESQUEMA DDL ACTUAL (31 TABLAS)
-- =============================================================================
