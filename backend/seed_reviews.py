import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import select
from app.core.database import async_session_factory
from app.core.security import hash_password
import app.domains.inventario.models
from app.domains.usuarios.models import Usuario, Rol
from app.domains.catalogo.models import Prenda, PrendaVariante, CalificacionPrenda
from app.domains.ventas.models import Venta, DetalleVenta, Pago

async def seed_reviews():
    print("--- INICIANDO SEED DE RESENAS Y CALIFICACIONES (CU18) ---")
    async with async_session_factory() as session:
        # 1. Obtener rol CLIENTE
        res_rol = await session.execute(select(Rol).where(Rol.nombre == "CLIENTE"))
        rol_cliente = res_rol.scalar_one_or_none()
        if not rol_cliente:
            res_rol = await session.execute(select(Rol).order_by(Rol.id.desc()))
            rol_cliente = res_rol.scalar_one_or_none()

        # 2. Clientes de prueba para resenas
        clientes_info = [
            {"email": "sofia.castillo@gmail.com", "nombre": "Sofia", "apellido": "Castillo", "ci_nit": "7489211", "telefono": "+591 70011223"},
            {"email": "mateo.morales@gmail.com", "nombre": "Mateo", "apellido": "Morales", "ci_nit": "8392014", "telefono": "+591 71122334"},
            {"email": "valentina.vargas@gmail.com", "nombre": "Valentina", "apellido": "Vargas", "ci_nit": "6920183", "telefono": "+591 72233445"},
            {"email": "diego.navarro@gmail.com", "nombre": "Diego", "apellido": "Navarro", "ci_nit": "5829104", "telefono": "+591 73344556"},
            {"email": "lucia.mendez@gmail.com", "nombre": "Lucia", "apellido": "Mendez", "ci_nit": "9201834", "telefono": "+591 74455667"}
        ]

        usuarios = {}
        for c in clientes_info:
            res = await session.execute(select(Usuario).where(Usuario.email == c["email"]))
            usr = res.scalar_one_or_none()
            if not usr:
                usr = Usuario(
                    email=c["email"],
                    password_hash=hash_password("Cliente123!"),
                    nombre=c["nombre"],
                    apellido=c["apellido"],
                    ci_nit=c["ci_nit"],
                    telefono=c["telefono"],
                    tipo_usuario="CLIENTE",
                    rol_id=rol_cliente.id if rol_cliente else 1,
                    estado="ACTIVO"
                )
                session.add(usr)
                await session.flush()
                print(f"  + Cliente creado: {usr.nombre} {usr.apellido} ({usr.email})")
            usuarios[c["email"]] = usr

        res7 = await session.execute(select(Usuario).where(Usuario.id == 7))
        usr7 = res7.scalar_one_or_none()
        if usr7:
            usuarios[usr7.email] = usr7

        res_prendas = await session.execute(select(Prenda))
        prendas = {p.sku: p for p in res_prendas.scalars().all()}

        ventas_seed = [
            ("sofia.castillo@gmail.com", "NOIR-DRS-003", 450.0),
            ("valentina.vargas@gmail.com", "NOIR-DRS-003", 450.0),
            ("mateo.morales@gmail.com", "NOIR-BLZ-004", 520.0),
            ("diego.navarro@gmail.com", "NOIR-BLZ-004", 520.0),
            ("lucia.mendez@gmail.com", "NOIR-TRN-001", 680.0),
            ("mateo.morales@gmail.com", "NOIR-TRN-001", 680.0),
            ("valentina.vargas@gmail.com", "NOIR-PNT-002", 340.0),
            ("diego.navarro@gmail.com", "NOIR-KID-005", 280.0),
            ("sofia.castillo@gmail.com", "NOIR-KID-005", 280.0),
        ]

        for email, sku, precio in ventas_seed:
            usr = usuarios.get(email)
            prenda = prendas.get(sku)
            if not usr or not prenda:
                continue

            res_var = await session.execute(select(PrendaVariante).where(PrendaVariante.prenda_id == prenda.id))
            variante = res_var.scalars().first()
            if not variante:
                continue

            res_compra = await session.execute(
                select(DetalleVenta.id)
                .join(Venta, DetalleVenta.venta_id == Venta.id)
                .where(Venta.cliente_id == usr.id, DetalleVenta.variante_id == variante.id, Venta.estado == "PAGADA")
            )
            if not res_compra.scalar_one_or_none():
                cod_vta = f"VTA-SEED-{usr.id}-{prenda.id}-{int(datetime.now().timestamp())}"
                vta = Venta(
                    codigo_venta=cod_vta,
                    sucursal_id=1,
                    usuario_id=1,
                    cliente_id=usr.id,
                    canal_venta="ONLINE_WEB",
                    cliente_nombre=f"{usr.nombre} {usr.apellido}",
                    cliente_nit=usr.ci_nit,
                    subtotal=Decimal(str(precio)),
                    descuento=Decimal("0.00"),
                    costo_envio=Decimal("0.00"),
                    total=Decimal(str(precio)),
                    estado="PAGADA",
                    observaciones="Venta online verificada (Seed CU18)"
                )
                session.add(vta)
                await session.flush()

                det = DetalleVenta(
                    venta_id=vta.id,
                    variante_id=variante.id,
                    cantidad=1,
                    precio_unitario=Decimal(str(precio)),
                    subtotal=Decimal(str(precio))
                )
                session.add(det)

                pago = Pago(
                    venta_id=vta.id,
                    metodo_pago="TARJETA",
                    pasarela="STRIPE_INTL",
                    monto=Decimal(str(precio)),
                    moneda="USD",
                    estado_pago="CONFIRMADO",
                    transaccion_externa_id=f"TX-{vta.id}-VERIFIED",
                    cliente_email=usr.email
                )
                session.add(pago)
                await session.flush()
                print(f"  + Compra verificada registrada: {usr.nombre} compro {prenda.nombre}")

        reviews_data = [
            {
                "email": "sofia.castillo@gmail.com",
                "sku": "NOIR-DRS-003",
                "puntuacion": 5,
                "ajuste_talla": "FIEL",
                "calidad": 5,
                "titulo": "Una pieza de alta costura impecable",
                "comentario": "El satén de seda tiene una caída pesada y elegante que estiliza muchísimo. La abertura lateral y el escote en V tienen las proporciones exactas. Lo usé en una gala y recibí incontables elogios.",
                "compra_verificada": True
            },
            {
                "email": "valentina.vargas@gmail.com",
                "sku": "NOIR-DRS-003",
                "puntuacion": 5,
                "ajuste_talla": "FIEL",
                "calidad": 5,
                "titulo": "Excelente confección y acabados de lujo",
                "comentario": "El forro interno de modal es ultra suave al tacto. La talla corresponde perfectamente a la tabla de medidas. Llegó en su funda protectora en óptimas condiciones.",
                "compra_verificada": True
            },
            {
                "email": "lucia.mendez@gmail.com",
                "sku": "NOIR-DRS-003",
                "puntuacion": 4,
                "ajuste_talla": "PEQUENO",
                "calidad": 5,
                "titulo": "Hermoso diseño, sugeriría pedir una talla más si tienes espalda ancha",
                "comentario": "La tela y el brillo sutil son extraordinarios. En mi caso, el ajuste en la parte superior fue un poquito ceñido, por lo que recomiendo revisar bien las dimensiones de busto.",
                "compra_verificada": False
            },
            {
                "email": "mateo.morales@gmail.com",
                "sku": "NOIR-BLZ-004",
                "puntuacion": 5,
                "ajuste_talla": "FIEL",
                "calidad": 5,
                "titulo": "Corte estructurado y botones de cuerno auténtico",
                "comentario": "La lana fría de 120s es sumamente transpirable y no se arruga fácilmente. La solapa en punta y la entretela brindan una presencia sobria y moderna. 100% recomendado.",
                "compra_verificada": True
            },
            {
                "email": "diego.navarro@gmail.com",
                "sku": "NOIR-BLZ-004",
                "puntuacion": 5,
                "ajuste_talla": "FIEL",
                "calidad": 5,
                "titulo": "El mejor blazer formal que he adquirido",
                "comentario": "Ajuste milimétrico en hombros y mangas. Es versátil para reuniones de negocios de día o cenas de noche. La entrega fue rápida y puntual.",
                "compra_verificada": True
            },
            {
                "email": "lucia.mendez@gmail.com",
                "sku": "NOIR-TRN-001",
                "puntuacion": 5,
                "ajuste_talla": "FIEL",
                "calidad": 5,
                "titulo": "Una gabardina icónica, elegancia pura",
                "comentario": "El tejido repele ligeras lloviznas y el cinturón acentúa la cintura a la perfección. Es de esas prendas atemporales que duran toda la vida en el armario.",
                "compra_verificada": True
            },
            {
                "email": "mateo.morales@gmail.com",
                "sku": "NOIR-TRN-001",
                "puntuacion": 4,
                "ajuste_talla": "GRANDE",
                "calidad": 5,
                "titulo": "Silueta oversize elegante",
                "comentario": "El corte es intencionalmente holgado para llevar suéteres debajo. Si prefieres un look ceñido sugiero pedir una talla menor, pero la calidad del material es de nivel internacional.",
                "compra_verificada": True
            },
            {
                "email": "valentina.vargas@gmail.com",
                "sku": "NOIR-PNT-002",
                "puntuacion": 5,
                "ajuste_talla": "FIEL",
                "calidad": 5,
                "titulo": "Tiro alto y pinzas con caída estilizada",
                "comentario": "Favorece mucho la silueta. La tela es fresca y el largo con tacones queda perfecto sin necesidad de hacer dobladillo adicional. Muy satisfecha.",
                "compra_verificada": True
            },
            {
                "email": "diego.navarro@gmail.com",
                "sku": "NOIR-KID-005",
                "puntuacion": 5,
                "ajuste_talla": "FIEL",
                "calidad": 5,
                "titulo": "Comodidad y elegancia para los más pequeños",
                "comentario": "A mi hijo le encantó, el forro elástico le permite moverse con total libertad sin sentirse rígido. Excelente para graduaciones y celebraciones familiares.",
                "compra_verificada": True
            },
            {
                "email": "sofia.castillo@gmail.com",
                "sku": "NOIR-KID-005",
                "puntuacion": 5,
                "ajuste_talla": "FIEL",
                "calidad": 5,
                "titulo": "Resistente y muy bien rematado en costuras",
                "comentario": "Los materiales resisten sin desgastarse. Se nota el cuidado en los detalles de las solapas y bolsillos. Llegó impecable.",
                "compra_verificada": True
            }
        ]

        for r in reviews_data:
            usr = usuarios.get(r["email"])
            prenda = prendas.get(r["sku"])
            if not usr or not prenda:
                continue

            res_calif = await session.execute(
                select(CalificacionPrenda).where(
                    CalificacionPrenda.prenda_id == prenda.id,
                    CalificacionPrenda.usuario_id == usr.id
                )
            )
            calif = res_calif.scalar_one_or_none()
            if not calif:
                calif = CalificacionPrenda(
                    prenda_id=prenda.id,
                    usuario_id=usr.id,
                    puntuacion=r["puntuacion"],
                    ajuste_talla=r["ajuste_talla"],
                    calidad=r["calidad"],
                    titulo=r["titulo"],
                    comentario=r["comentario"],
                    compra_verificada=r["compra_verificada"],
                    activo=True
                )
                session.add(calif)
                print(f"  + Resena anadida: {usr.nombre} -> {prenda.nombre} ({r['puntuacion']}*)")

        await session.commit()
        print("=== SEED DE RESENAS Y CALIFICACIONES COMPLETADO CON EXITO ===")

if __name__ == "__main__":
    asyncio.run(seed_reviews())
