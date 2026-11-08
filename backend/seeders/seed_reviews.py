import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import select
from apps.core.database import async_session_factory
from apps.core.security import hash_password
import app.domains.inventario.models
from apps.UsuariosSeguridad.models import Usuario, Rol
from apps.GestionCatalogo.models import Prenda, PrendaVariante, CalificacionPrenda
from apps.GestionVentas.models import Venta, DetalleVenta, Pago

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

        # 3. Mapear prendas reales existentes en la base de datos
        res_prendas = await session.execute(select(Prenda).order_by(Prenda.id.asc()))
        prendas_list = list(res_prendas.scalars().all())
        if not prendas_list:
            print("  ! No hay prendas para calificar.")
            return

        reviews_data = [
            {
                "email": "sofia.castillo@gmail.com",
                "puntuacion": 5,
                "ajuste_talla": "FIEL",
                "calidad": 5,
                "titulo": "Una pieza de alta costura impecable",
                "comentario": "El tejido tiene una caída pesada y elegante que estiliza muchísimo. Los acabados y proporciones son exactos. La prenda superó todas mis expectativas.",
                "compra_verificada": True
            },
            {
                "email": "valentina.vargas@gmail.com",
                "puntuacion": 5,
                "ajuste_talla": "FIEL",
                "calidad": 5,
                "titulo": "Excelente confección y acabados de lujo",
                "comentario": "El forro interno es ultra suave al tacto. La talla corresponde perfectamente a la tabla de medidas. Llegó en óptimas condiciones.",
                "compra_verificada": True
            },
            {
                "email": "lucia.mendez@gmail.com",
                "puntuacion": 4,
                "ajuste_talla": "PEQUENO",
                "calidad": 5,
                "titulo": "Hermoso diseño, sugeriría pedir una talla más si tienes espalda ancha",
                "comentario": "La tela y la textura son extraordinarias. En mi caso, el ajuste en la parte superior fue un poquito ceñido, por lo que recomiendo revisar bien las medidas.",
                "compra_verificada": False
            },
            {
                "email": "mateo.morales@gmail.com",
                "puntuacion": 5,
                "ajuste_talla": "FIEL",
                "calidad": 5,
                "titulo": "Corte estructurado y botones de alta calidad",
                "comentario": "El material es sumamente transpirable y no se arruga fácilmente. Brinda una presencia sobria y moderna. 100% recomendado.",
                "compra_verificada": True
            },
            {
                "email": "diego.navarro@gmail.com",
                "puntuacion": 5,
                "ajuste_talla": "FIEL",
                "calidad": 5,
                "titulo": "La mejor prenda formal que he adquirido",
                "comentario": "Ajuste milimétrico en hombros y mangas. Es versátil para reuniones o cenas. La entrega fue rápida y puntual.",
                "compra_verificada": True
            },
            {
                "email": "lucia.mendez@gmail.com",
                "puntuacion": 5,
                "ajuste_talla": "FIEL",
                "calidad": 5,
                "titulo": "Elegancia pura y máxima comodidad",
                "comentario": "El tejido es resistente y los acabados de primera. Es de esas prendas atemporales que duran mucho en el armario.",
                "compra_verificada": True
            },
            {
                "email": "mateo.morales@gmail.com",
                "puntuacion": 4,
                "ajuste_talla": "GRANDE",
                "calidad": 5,
                "titulo": "Silueta oversize elegante",
                "comentario": "El corte es intencionalmente holgado para mayor confort. Si prefieres un look ceñido sugiero pedir una talla menor, pero la calidad es de nivel internacional.",
                "compra_verificada": True
            },
            {
                "email": "valentina.vargas@gmail.com",
                "puntuacion": 5,
                "ajuste_talla": "FIEL",
                "calidad": 5,
                "titulo": "Corte impecable con caída estilizada",
                "comentario": "Favorece mucho la silueta. La tela es fresca y el largo queda perfecto. Muy satisfecha.",
                "compra_verificada": True
            },
            {
                "email": "diego.navarro@gmail.com",
                "puntuacion": 5,
                "ajuste_talla": "FIEL",
                "calidad": 5,
                "titulo": "Comodidad y elegancia para ocasiones especiales",
                "comentario": "El forro elástico permite moverse con total libertad sin sentirse rígido. Excelente para eventos familiares y celebraciones.",
                "compra_verificada": True
            },
            {
                "email": "sofia.castillo@gmail.com",
                "puntuacion": 5,
                "ajuste_talla": "FIEL",
                "calidad": 5,
                "titulo": "Resistente y muy bien rematado en costuras",
                "comentario": "Los materiales resisten sin desgastarse. Se nota el cuidado en los detalles y terminaciones. Llegó impecable.",
                "compra_verificada": True
            }
        ]

        for i, r in enumerate(reviews_data):
            usr = usuarios.get(r["email"])
            prenda = prendas_list[i % len(prendas_list)]
            if not usr or not prenda:
                continue

            res_var = await session.execute(
                select(PrendaVariante).where(PrendaVariante.prenda_id == prenda.id)
            )
            variante = res_var.scalars().first()
            if not variante:
                continue

            if r["compra_verificada"]:
                res_compra = await session.execute(
                    select(DetalleVenta.id)
                    .join(Venta, DetalleVenta.venta_id == Venta.id)
                    .where(Venta.cliente_id == usr.id, DetalleVenta.variante_id == variante.id, Venta.estado == "PAGADA")
                )
                if not res_compra.scalar_one_or_none():
                    precio = prenda.precio_base
                    cod_vta = f"VTA-SEED-{usr.id}-{prenda.id}-{int(datetime.now().timestamp())}"
                    vta = Venta(
                        codigo_venta=cod_vta,
                        sucursal_id=1,
                        usuario_id=1,
                        cliente_id=usr.id,
                        canal_venta="ONLINE_WEB",
                        cliente_nombre=f"{usr.nombre} {usr.apellido}",
                        cliente_nit=usr.ci_nit or "0",
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
