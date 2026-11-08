"""
Script utilitario para vaciar prendas y registros transaccionales dependientes
manteniendo usuarios, sucursales, roles, categorías, tallas y colores intactos.
"""
import asyncio
from sqlalchemy import text
from apps.core.database import async_session_factory, engine

async def limpiar_catalogo():
    print("--> Iniciando vaciado de prendas y registros transaccionales...")
    async with async_session_factory() as session:
        sql = """
        TRUNCATE TABLE 
            detalles_venta, ventas, pagos, devoluciones, detalles_devolucion,
            detalles_reserva, reservas,
            detalles_transferencia_stock, transferencias_stock,
            detalles_recepcion_mercaderia, recepciones_mercaderia,
            calificaciones_prenda,
            movimientos_inventario, inventario_stock,
            prenda_multimedia, prenda_variantes, prendas
        CASCADE;
        """
        await session.execute(text(sql))
        await session.commit()
        print("--> Catalogo vaciado con exito. Prendas actuales: 0.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(limpiar_catalogo())
