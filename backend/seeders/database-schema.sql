-- ==============================================================================
-- FASHIONSTORE SAAS MULTITENANT - ESQUEMA DE BASE DE DATOS (POSTGRESQL 14+)
-- SEGUNDO EXAMEN PARCIAL - SISTEMAS DE INFORMACIÓN 2 (INF412)
-- DOCENTE: MSc. Ing. Angélica Garzón Cuéllar
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- MÓDULO 7: PLATAFORMA SAAS MULTITENANT Y PLANES DE SUSCRIPCIÓN
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS plan_suscripcion (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,          -- 'BASICO', 'INTERMEDIO', 'VIP'
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio_mensual NUMERIC(10, 2) NOT NULL CHECK (precio_mensual >= 0),
    limite_sucursales INT NOT NULL DEFAULT 1,     -- Básico: 2, Intermedio/Profesional: 10, VIP: 999
    permite_ia BOOLEAN DEFAULT FALSE,            -- Solo Intermedio/Profesional y VIP
    permite_offline BOOLEAN DEFAULT FALSE,       -- Solo Intermedio/Profesional y VIP
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS empresa (
    id SERIAL PRIMARY KEY,                       -- tenant_id en todo el sistema
    razon_social VARCHAR(150) NOT NULL,
    nit VARCHAR(30) NOT NULL UNIQUE,
    subdominio VARCHAR(50) NOT NULL UNIQUE,      -- ej: 'elegance'
    email_corporativo VARCHAR(150) NOT NULL,
    telefono VARCHAR(30),
    direccion_fiscal TEXT,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suscripcion (
    id SERIAL PRIMARY KEY,
    empresa_id INT NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    plan_id INT NOT NULL REFERENCES plan_suscripcion(id),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVA' CHECK (
        estado IN ('PRUEBA', 'ACTIVA', 'VENCIDA', 'CANCELADA', 'SUSPENDIDA')
    ),
    monto_pago NUMERIC(10, 2) NOT NULL CHECK (monto_pago >= 0),
    renovacion_automatica BOOLEAN DEFAULT TRUE,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_fechas_suscripcion CHECK (fecha_fin >= fecha_inicio)
);

-- ------------------------------------------------------------------------------
-- MÓDULO 8: GUÍA ANATÓMICA DE MEDIDAS, GARANTÍAS Y DEVOLUCIONES
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS guia_medida (
    id SERIAL PRIMARY KEY,
    producto_id INT NOT NULL,                    -- Referencia a prendas/producto
    talla_id INT NOT NULL,                       -- Referencia a tallas/talla
    pecho_cm NUMERIC(6, 2) NOT NULL CHECK (pecho_cm > 0),
    cintura_cm NUMERIC(6, 2) NOT NULL CHECK (cintura_cm > 0),
    cadera_cm NUMERIC(6, 2) NOT NULL CHECK (cadera_cm > 0),
    largo_cm NUMERIC(6, 2) NOT NULL CHECK (largo_cm > 0),
    manga_cm NUMERIC(6, 2) CHECK (manga_cm IS NULL OR manga_cm > 0),
    observacion_calce VARCHAR(150),              -- 'Corte entallado', 'Calce holgado', 'Tela stretch'
    UNIQUE (producto_id, talla_id)
);

CREATE TABLE IF NOT EXISTS politica_garantia (
    id SERIAL PRIMARY KEY,
    empresa_id INT NOT NULL UNIQUE REFERENCES empresa(id) ON DELETE CASCADE,
    plazo_dias_cambio INT NOT NULL DEFAULT 7 CHECK (plazo_dias_cambio > 0), -- 7 días / 48 hrs / 24 hrs
    permite_cambio_talla BOOLEAN DEFAULT TRUE,
    admite_reembolso_dinero BOOLEAN DEFAULT FALSE, -- Regla RN07: Prohibido reintegro monetario
    requiere_etiqueta_original BOOLEAN DEFAULT TRUE,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS nota_devolucion (
    id SERIAL PRIMARY KEY,
    codigo_devolucion VARCHAR(30) NOT NULL UNIQUE,
    empresa_id INT NOT NULL REFERENCES empresa(id),
    venta_id INT NOT NULL,
    sucursal_id INT NOT NULL,
    usuario_id INT NOT NULL,                     -- Empleado/cajero responsable
    cliente_id INT NOT NULL,
    motivo VARCHAR(50) NOT NULL CHECK (
        motivo IN ('TALLA_CHICA', 'TALLA_GRANDE', 'DESAJUSTE_MEDIDA', 'DEFECTO_FABRICA', 'DISCONFORMIDAD_COLOR')
    ),
    estado VARCHAR(20) NOT NULL DEFAULT 'COMPLETADA' CHECK (
        estado IN ('SOLICITADA', 'COMPLETADA', 'RECHAZADA')
    ),
    observaciones TEXT,
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS detalle_nota_devolucion (
    id SERIAL PRIMARY KEY,
    nota_devolucion_id INT NOT NULL REFERENCES nota_devolucion(id) ON DELETE CASCADE,
    variante_devuelta_id INT NOT NULL,           -- Reingresa al stock
    cantidad_devuelta INT NOT NULL CHECK (cantidad_devuelta > 0),
    variante_entregada_id INT NOT NULL,          -- Sale del stock
    cantidad_entregada INT NOT NULL CHECK (cantidad_entregada > 0),
    diferencia_monetaria NUMERIC(10, 2) DEFAULT 0.00 -- Sin reembolso en efectivo
);

-- ------------------------------------------------------------------------------
-- MÓDULO 9: TRASPASOS MULTI-SUCURSAL EN DOS FASES
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS traspaso_inventario (
    id SERIAL PRIMARY KEY,
    codigo_traspaso VARCHAR(30) NOT NULL UNIQUE,
    empresa_id INT NOT NULL REFERENCES empresa(id),
    sucursal_origen_id INT NOT NULL,
    sucursal_destino_id INT NOT NULL,
    usuario_despacha_id INT NOT NULL,
    usuario_recibe_id INT,
    estado VARCHAR(30) NOT NULL DEFAULT 'SOLICITADO' CHECK (
        estado IN ('SOLICITADO', 'EN_TRANSITO', 'RECEPCIONADO', 'CANCELADO', 'OBSERVADO')
    ),
    motivo TEXT,
    fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_despacho TIMESTAMP WITH TIME ZONE,
    fecha_recepcion TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_sucursales_distintas CHECK (sucursal_origen_id <> sucursal_destino_id)
);

CREATE TABLE IF NOT EXISTS detalle_traspaso (
    id SERIAL PRIMARY KEY,
    traspaso_id INT NOT NULL REFERENCES traspaso_inventario(id) ON DELETE CASCADE,
    producto_variante_id INT NOT NULL,
    cantidad_enviada INT NOT NULL CHECK (cantidad_enviada > 0),
    cantidad_recibida INT DEFAULT 0 CHECK (cantidad_recibida >= 0)
);

-- ------------------------------------------------------------------------------
-- MÓDULO 10: PERSISTENCIA OFFLINE Y SINCRONIZACIÓN IDEMPOTENTE
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sincronizacion_offline (
    id BIGSERIAL PRIMARY KEY,
    empresa_id INT NOT NULL REFERENCES empresa(id),
    sucursal_id INT NOT NULL,
    usuario_id INT NOT NULL,
    uuid_operacion VARCHAR(64) NOT NULL UNIQUE,  -- UUIDv4 generado en el cliente
    tipo_operacion VARCHAR(30) NOT NULL CHECK (
        tipo_operacion IN ('VENTA_LOCAL', 'RESERVA_LOCAL', 'CAMBIO_PRENDA_LOCAL')
    ),
    payload_json JSONB NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (
        estado IN ('PENDIENTE', 'SINCRONIZADO', 'CONFLICTO_STOCK', 'ERROR_VALIDACION')
    ),
    fecha_registro_local TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_sincronizacion TIMESTAMP WITH TIME ZONE,
    error_detalle TEXT
);

CREATE TABLE IF NOT EXISTS conflicto_inventario (
    id SERIAL PRIMARY KEY,
    sincronizacion_id BIGINT NOT NULL REFERENCES sincronizacion_offline(id) ON DELETE CASCADE,
    producto_variante_id INT NOT NULL,
    sucursal_id INT NOT NULL,
    cantidad_solicitada INT NOT NULL,
    stock_disponible_servidor INT NOT NULL,
    estado_resolucion VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE' CHECK (
        estado_resolucion IN ('PENDIENTE', 'VENTA_MANTENIDA_STOCK_NEGATIVO', 'CANCELADA_CLIENTE', 'TRASPASO_AUTOMATICO')
    ),
    resuelto_por_usuario_id INT,
    fecha_deteccion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMP WITH TIME ZONE
);

-- ------------------------------------------------------------------------------
-- MÓDULO 11: ANALÍTICA AVANZADA E IA GENERATIVA
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reporte_generativo_ia (
    id BIGSERIAL PRIMARY KEY,
    empresa_id INT NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    usuario_id INT NOT NULL,
    prompt_consulta TEXT NOT NULL,
    tipo_entrada VARCHAR(20) NOT NULL DEFAULT 'TEXTO' CHECK (tipo_entrada IN ('TEXTO', 'VOZ')),
    sql_generado TEXT,
    respuesta_resumen TEXT,
    formato_exportacion VARCHAR(20) DEFAULT 'PANTALLA' CHECK (
        formato_exportacion IN ('PANTALLA', 'PDF', 'EXCEL')
    ),
    fecha_consulta TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modelo_analitico_ml (
    id SERIAL PRIMARY KEY,
    empresa_id INT NOT NULL REFERENCES empresa(id) ON DELETE CASCADE,
    nombre_modelo VARCHAR(100) NOT NULL,
    tipo_aprendizaje VARCHAR(50) NOT NULL,       -- 'SUPERVISADO_REGRESION', 'NO_SUPERVISADO_CLUSTERING'
    variable_objetivo VARCHAR(50),
    precision_metrica NUMERIC(5, 4),
    parametros_json JSONB,
    fecha_entrenamiento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- ------------------------------------------------------------------------------
-- INYECCIÓN DE COLUMNA empresa_id EN TABLAS OPERATIVAS (COMPATIBLE PLURAL/SINGULAR)
-- ------------------------------------------------------------------------------

DO $$
BEGIN
    -- Tabla Usuarios
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'empresa_id') THEN
            ALTER TABLE usuarios ADD COLUMN empresa_id INT REFERENCES empresa(id);
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuario') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuario' AND column_name = 'empresa_id') THEN
            ALTER TABLE usuario ADD COLUMN empresa_id INT REFERENCES empresa(id);
        END IF;
    END IF;

    -- Tabla Sucursales
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sucursales') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sucursales' AND column_name = 'empresa_id') THEN
            ALTER TABLE sucursales ADD COLUMN empresa_id INT REFERENCES empresa(id);
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sucursal') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sucursal' AND column_name = 'empresa_id') THEN
            ALTER TABLE sucursal ADD COLUMN empresa_id INT REFERENCES empresa(id);
        END IF;
    END IF;

    -- Tabla Prendas / Productos
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prendas') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prendas' AND column_name = 'empresa_id') THEN
            ALTER TABLE prendas ADD COLUMN empresa_id INT REFERENCES empresa(id);
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'producto') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'producto' AND column_name = 'empresa_id') THEN
            ALTER TABLE producto ADD COLUMN empresa_id INT REFERENCES empresa(id);
        END IF;
    END IF;

    -- Tabla Proveedores
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proveedores') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proveedores' AND column_name = 'empresa_id') THEN
            ALTER TABLE proveedores ADD COLUMN empresa_id INT REFERENCES empresa(id);
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proveedor') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proveedor' AND column_name = 'empresa_id') THEN
            ALTER TABLE proveedor ADD COLUMN empresa_id INT REFERENCES empresa(id);
        END IF;
    END IF;

    -- Tabla Ventas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ventas') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ventas' AND column_name = 'empresa_id') THEN
            ALTER TABLE ventas ADD COLUMN empresa_id INT REFERENCES empresa(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ventas' AND column_name = 'uuid_operacion') THEN
            ALTER TABLE ventas ADD COLUMN uuid_operacion VARCHAR(64) UNIQUE;
            ALTER TABLE ventas ADD COLUMN es_offline BOOLEAN DEFAULT FALSE;
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venta') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venta' AND column_name = 'empresa_id') THEN
            ALTER TABLE venta ADD COLUMN empresa_id INT REFERENCES empresa(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venta' AND column_name = 'uuid_operacion') THEN
            ALTER TABLE venta ADD COLUMN uuid_operacion VARCHAR(64) UNIQUE;
            ALTER TABLE venta ADD COLUMN es_offline BOOLEAN DEFAULT FALSE;
        END IF;
    END IF;

    -- Tabla Reservas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reservas') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservas' AND column_name = 'empresa_id') THEN
            ALTER TABLE reservas ADD COLUMN empresa_id INT REFERENCES empresa(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservas' AND column_name = 'uuid_operacion') THEN
            ALTER TABLE reservas ADD COLUMN uuid_operacion VARCHAR(64) UNIQUE;
            ALTER TABLE reservas ADD COLUMN es_offline BOOLEAN DEFAULT FALSE;
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reserva') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reserva' AND column_name = 'empresa_id') THEN
            ALTER TABLE reserva ADD COLUMN empresa_id INT REFERENCES empresa(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reserva' AND column_name = 'uuid_operacion') THEN
            ALTER TABLE reserva ADD COLUMN uuid_operacion VARCHAR(64) UNIQUE;
            ALTER TABLE reserva ADD COLUMN es_offline BOOLEAN DEFAULT FALSE;
        END IF;
    END IF;

    -- Tabla Bitácora de Auditoría
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bitacora_auditoria') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bitacora_auditoria' AND column_name = 'empresa_id') THEN
            ALTER TABLE bitacora_auditoria ADD COLUMN empresa_id INT REFERENCES empresa(id);
        END IF;
    END IF;

    -- Tabla Inventario Stock (stock en tránsito)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventario_stock') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventario_stock' AND column_name = 'stock_en_transito') THEN
            ALTER TABLE inventario_stock ADD COLUMN stock_en_transito INT NOT NULL DEFAULT 0 CHECK (stock_en_transito >= 0);
        END IF;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- VISTAS DE COMPATIBILIDAD UNIFICADAS (SI APLICA)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prendas') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'producto') THEN
        CREATE OR REPLACE VIEW producto AS SELECT * FROM prendas;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tallas') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'talla') THEN
        CREATE OR REPLACE VIEW talla AS SELECT * FROM tallas;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sucursales') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sucursal') THEN
        CREATE OR REPLACE VIEW sucursal AS SELECT * FROM sucursales;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuario') THEN
        CREATE OR REPLACE VIEW usuario AS SELECT * FROM usuarios;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- DATOS SEMILLA (SEEDING DE PLANES Y TENANTS DE PRUEBA OBLIGATORIOS)
-- ------------------------------------------------------------------------------

INSERT INTO plan_suscripcion (codigo, nombre, descripcion, precio_mensual, limite_sucursales, permite_ia, permite_offline, activo)
VALUES
('BASICO', 'Plan Básico Emprendedor', 'Ideal para tiendas emergentes. Hasta 2 sucursales, catálogo y ventas estándar.', 29.99, 2, FALSE, FALSE, TRUE),
('INTERMEDIO', 'Plan Profesional Multitienda', 'Hasta 10 sucursales, operaciones offline (PWA/Móvil), reportes avanzados y soporte técnico.', 79.99, 10, TRUE, TRUE, TRUE),
('VIP', 'Plan Corporativo VIP Enterprise', 'Sucursales ilimitadas, analítica avanzada con IA Generativa, ML y prioridad operativa.', 199.99, 999, TRUE, TRUE, TRUE)
ON CONFLICT (codigo) DO UPDATE SET
limite_sucursales = EXCLUDED.limite_sucursales,
permite_ia = EXCLUDED.permite_ia,
permite_offline = EXCLUDED.permite_offline;

-- Tenant 1: Elegance Boutique (Plan Profesional / Intermedio)
INSERT INTO empresa (razon_social, nit, subdominio, email_corporativo, telefono, direccion_fiscal, activo)
VALUES
('Elegance Boutique S.R.L.', '1029384756', 'elegance', 'contacto@eleganceboutique.com', '+591-70012345', 'Av. San Martín #450, Equipetrol, Santa Cruz', TRUE)
ON CONFLICT (nit) DO NOTHING;

-- Tenant 2: Urban Style Trend (Plan Básico)
INSERT INTO empresa (razon_social, nit, subdominio, email_corporativo, telefono, direccion_fiscal, activo)
VALUES
('Urban Style Trend Bolivia', '9876543210', 'urbanstyle', 'gerencia@urbanstyle.bo', '+591-71098765', 'Calle 21 de Calacoto #102, La Paz', TRUE)
ON CONFLICT (nit) DO NOTHING;

-- Suscripciones asignadas
INSERT INTO suscripcion (empresa_id, plan_id, fecha_inicio, fecha_fin, estado, monto_pago, renovacion_automatica)
SELECT e.id, p.id, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'ACTIVA', p.precio_mensual * 12, TRUE
FROM empresa e
JOIN plan_suscripcion p ON (
    (e.subdominio = 'elegance' AND p.codigo = 'INTERMEDIO') OR
    (e.subdominio = 'urbanstyle' AND p.codigo = 'BASICO')
)
ON CONFLICT DO NOTHING;

-- Políticas de Garantía por omisión para cada empresa (Regla RN07: Sin devolución de dinero)
INSERT INTO politica_garantia (empresa_id, plazo_dias_cambio, permite_cambio_talla, admite_reembolso_dinero, requiere_etiqueta_original, activo)
SELECT e.id, 7, TRUE, FALSE, TRUE, TRUE
FROM empresa e
ON CONFLICT (empresa_id) DO NOTHING;
