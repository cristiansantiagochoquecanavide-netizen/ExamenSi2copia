import asyncio
from sqlalchemy import text
from app.core.database import Base, engine
# Importar todos los modelos para registrar las tablas en Base.metadata
import app.domains.usuarios.models
import app.domains.inventario.models
import app.domains.catalogo.models
import app.domains.ventas.models
import app.domains.reservas.models
import app.domains.ia_asistente.models
import app.domains.notificaciones.models
import app.domains.saas.models

MIGRATION_STATEMENTS = [
    # Inyectar empresa_id y columnas SaaS en tablas existentes
    "ALTER TABLE IF EXISTS usuarios ADD COLUMN IF NOT EXISTS empresa_id INT REFERENCES empresa(id);",
    "ALTER TABLE IF EXISTS sucursales ADD COLUMN IF NOT EXISTS empresa_id INT REFERENCES empresa(id);",
    "ALTER TABLE IF EXISTS prendas ADD COLUMN IF NOT EXISTS empresa_id INT REFERENCES empresa(id);",
    "ALTER TABLE IF EXISTS proveedores ADD COLUMN IF NOT EXISTS empresa_id INT REFERENCES empresa(id);",
    "ALTER TABLE IF EXISTS ventas ADD COLUMN IF NOT EXISTS empresa_id INT REFERENCES empresa(id);",
    "ALTER TABLE IF EXISTS ventas ADD COLUMN IF NOT EXISTS uuid_operacion VARCHAR(64);",
    "ALTER TABLE IF EXISTS ventas ADD COLUMN IF NOT EXISTS es_offline BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE IF EXISTS reservas ADD COLUMN IF NOT EXISTS empresa_id INT REFERENCES empresa(id);",
    "ALTER TABLE IF EXISTS reservas ADD COLUMN IF NOT EXISTS uuid_operacion VARCHAR(64);",
    "ALTER TABLE IF EXISTS reservas ADD COLUMN IF NOT EXISTS es_offline BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE IF EXISTS bitacora_auditoria ADD COLUMN IF NOT EXISTS empresa_id INT REFERENCES empresa(id);",
    "ALTER TABLE IF EXISTS inventario_stock ADD COLUMN IF NOT EXISTS stock_en_transito INT NOT NULL DEFAULT 0;",
    "ALTER TABLE IF EXISTS token_blacklist ALTER COLUMN token TYPE TEXT;",
    "ALTER TABLE IF EXISTS nota_devolucion ALTER COLUMN cliente_id DROP NOT NULL;",

    # Índices recomendados para rendimiento multitenant
    "CREATE INDEX IF NOT EXISTS ix_prendas_empresa_id ON prendas (empresa_id);",
    "CREATE INDEX IF NOT EXISTS ix_usuarios_empresa_id ON usuarios (empresa_id);",
    "CREATE INDEX IF NOT EXISTS ix_sucursales_empresa_id ON sucursales (empresa_id);",
    "CREATE INDEX IF NOT EXISTS ix_proveedores_empresa_id ON proveedores (empresa_id);",
    "CREATE INDEX IF NOT EXISTS ix_ventas_empresa_id ON ventas (empresa_id);",
    "CREATE INDEX IF NOT EXISTS ix_reservas_empresa_id ON reservas (empresa_id);",
    "CREATE INDEX IF NOT EXISTS ix_bitacora_auditoria_empresa_id ON bitacora_auditoria (empresa_id);",
    "CREATE TABLE IF NOT EXISTS difusion_catalogo (id SERIAL PRIMARY KEY, empresa_id INT REFERENCES empresa(id), titulo_campana VARCHAR(150) NOT NULL, mensaje_personalizado TEXT NOT NULL, canal_envio VARCHAR(50) NOT NULL DEFAULT 'OMNICANAL', segmento_objetivo VARCHAR(50) NOT NULL DEFAULT 'TODOS', prendas_destacadas TEXT, total_destinatarios INT NOT NULL DEFAULT 0, tasa_apertura_estimada DOUBLE PRECISION NOT NULL DEFAULT 78.5, estado VARCHAR(30) NOT NULL DEFAULT 'ENVIADA', fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW(), creado_por_id INT REFERENCES usuarios(id), created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());",
    "CREATE INDEX IF NOT EXISTS ix_difusion_catalogo_empresa_id ON difusion_catalogo (empresa_id);",

]

COMPATIBILITY_VIEWS = """
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
"""

async def init_tables():
    print("==> Conectando a PostgreSQL...")
    async with engine.begin() as conn:
        print("==> Creando todas las tablas del sistema FashionStore (incluyendo SaaS Multitenant)...")
        await conn.run_sync(Base.metadata.create_all)

        print("==> Aplicando migraciones de esquema multitenant automáticas...")
        for stmt in MIGRATION_STATEMENTS:
            await conn.execute(text(stmt))

        print("==> Verificando vistas de compatibilidad...")
        await conn.execute(text(COMPATIBILITY_VIEWS))

    print("==> Todas las tablas y migraciones completadas exitosamente en PostgreSQL!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_tables())
