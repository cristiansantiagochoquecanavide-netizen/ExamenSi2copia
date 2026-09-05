import asyncio
from app.core.database import Base, engine
# Importar todos los modelos para registrar las tablas en Base.metadata
import app.domains.usuarios.models
import app.domains.inventario.models
import app.domains.catalogo.models

async def init_tables():
    print("==> Conectando a PostgreSQL...")
    async with engine.begin() as conn:
        print("==> Creando todas las tablas del sistema FashionStore...")
        await conn.run_sync(Base.metadata.create_all)
    print("==> Todas las tablas creadas exitosamente en PostgreSQL!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_tables())
