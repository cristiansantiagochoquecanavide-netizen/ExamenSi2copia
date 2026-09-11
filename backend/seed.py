import asyncio
from datetime import datetime, date, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory, engine
from app.core.security import hash_password

# Modelos
from app.domains.usuarios.models import Rol, Permiso, Usuario, BitacoraAuditoria
from app.domains.inventario.models import Ciudad, Sucursal, Proveedor, RecepcionMercaderia, DetalleRecepcionMercaderia
from app.domains.catalogo.models import (
    Categoria, Talla, Color, Temporada, Prenda, PrendaMultimedia, PrendaVariante,
    InventarioStock, MovimientoInventario
)

async def run_seed():
    print("=========================================================")
    print("  INICIANDO SEED DE BASE DE DATOS - FASHIONSTORE (CICLO 1)")
    print("=========================================================")

    async with async_session_factory() as session:
        # 1. PERMISOS RBAC
        print("--> 1. Creando catalogo de Permisos...")
        permisos_data = [
            ("usuarios:read", "usuarios", "Lectura y consulta de usuarios"),
            ("usuarios:write", "usuarios", "Creacion y edicion de usuarios y personal"),
            ("roles:read", "usuarios", "Consulta de roles y matriz RBAC"),
            ("roles:write", "usuarios", "Administracion de roles y permisos"),
            ("auditoria:read", "usuarios", "Consulta y exportacion de bitacora"),
            ("sucursales:read", "inventario", "Consulta de ciudades y sucursales"),
            ("sucursales:write", "inventario", "Administracion de sucursales y encargados"),
            ("inventario:read", "inventario", "Consulta de stock y movimientos"),
            ("inventario:write", "inventario", "Ajustes de existencias e ingresos"),
            ("catalogo:read", "catalogo", "Consulta del catalogo de moda"),
            ("catalogo:write", "catalogo", "Administracion de prendas, parametros y AR"),
            ("reservas:read", "reservas", "Consulta de reservas fisicas en tienda"),
            ("reservas:write", "reservas", "Agendamiento y confirmacion de reservas"),
            ("ventas:read", "ventas", "Consulta de ventas y comprobantes"),
            ("ventas:write", "ventas", "Registro de ventas POS y cobros digitales")
        ]
        permisos_map = {}
        for cod, mod, desc in permisos_data:
            res = await session.execute(select(Permiso).where(Permiso.codigo == cod))
            perm = res.scalar_one_or_none()
            if not perm:
                perm = Permiso(codigo=cod, modulo=mod, descripcion=desc)
                session.add(perm)
                await session.flush()
            permisos_map[cod] = perm

        # 2. ROLES
        print("--> 2. Creando Roles base...")
        roles_config = {
            "ADMINISTRADOR": {
                "desc": "Administrador global con acceso total al sistema",
                "es_sistema": True,
                "permisos": list(permisos_map.values())
            },
            "ENCARGADO_SUCURSAL": {
                "desc": "Gestion operativa de sucursal, inventario y reservas",
                "es_sistema": True,
                "permisos": [
                    permisos_map["sucursales:read"],
                    permisos_map["catalogo:read"],
                    permisos_map["catalogo:write"],
                    permisos_map["inventario:read"],
                    permisos_map["inventario:write"],
                    permisos_map["reservas:read"],
                    permisos_map["reservas:write"],
                    permisos_map["ventas:read"]
                ]
            },
            "CAJERO": {
                "desc": "Operador de punto de venta (POS) y caja fisica",
                "es_sistema": True,
                "permisos": [
                    permisos_map["catalogo:read"],
                    permisos_map["inventario:read"],
                    permisos_map["ventas:read"],
                    permisos_map["ventas:write"]
                ]
            },
            "CLIENTE": {
                "desc": "Cliente de comercio electronico y reservas de vestidor",
                "es_sistema": True,
                "permisos": [
                    permisos_map["catalogo:read"],
                    permisos_map["reservas:write"],
                    permisos_map["ventas:write"]
                ]
            }
        }
        roles_map = {}
        for r_name, r_cfg in roles_config.items():
            res = await session.execute(select(Rol).where(Rol.nombre == r_name))
            rol = res.scalar_one_or_none()
            if not rol:
                rol = Rol(nombre=r_name, descripcion=r_cfg["desc"], es_sistema=r_cfg["es_sistema"])
                rol.permisos = r_cfg["permisos"]
                session.add(rol)
                await session.flush()
            roles_map[r_name] = rol

        # 3. USUARIOS (Admin + Encargados)
        print("--> 3. Creando Usuarios por defecto...")
        default_pwd_hash = hash_password("admin123")

        # Admin
        admin_res = await session.execute(select(Usuario).where(Usuario.email == "admin@fashionstore.com"))
        admin_user = admin_res.scalar_one_or_none()
        if not admin_user:
            admin_user = Usuario(
                email="admin@fashionstore.com",
                password_hash=default_pwd_hash,
                nombre="Administrador",
                apellido="Principal",
                ci_nit="1000001",
                telefono="+591 70000001",
                direccion="Oficina Central, Equipetrol",
                tipo_usuario="PERSONAL",
                estado="ACTIVO",
                rol_id=roles_map["ADMINISTRADOR"].id
            )
            session.add(admin_user)
            await session.flush()

        # Encargado SCZ
        enc1_res = await session.execute(select(Usuario).where(Usuario.email == "encargado.scz@fashionstore.com"))
        enc1_user = enc1_res.scalar_one_or_none()
        if not enc1_user:
            enc1_user = Usuario(
                email="encargado.scz@fashionstore.com",
                password_hash=default_pwd_hash,
                nombre="Carlos",
                apellido="Mendoza",
                ci_nit="2000002",
                telefono="+591 70000002",
                direccion="Av. San Martin #450",
                tipo_usuario="PERSONAL",
                estado="ACTIVO",
                rol_id=roles_map["ENCARGADO_SUCURSAL"].id
            )
            session.add(enc1_user)
            await session.flush()

        # Encargada LPZ
        enc2_res = await session.execute(select(Usuario).where(Usuario.email == "encargada.lpz@fashionstore.com"))
        enc2_user = enc2_res.scalar_one_or_none()
        if not enc2_user:
            enc2_user = Usuario(
                email="encargada.lpz@fashionstore.com",
                password_hash=default_pwd_hash,
                nombre="Valeria",
                apellido="Rios",
                ci_nit="3000003",
                telefono="+591 70000003",
                direccion="Calle 21 de Calacoto",
                tipo_usuario="PERSONAL",
                estado="ACTIVO",
                rol_id=roles_map["ENCARGADO_SUCURSAL"].id
            )
            session.add(enc2_user)
            await session.flush()

        # 4. CIUDADES Y SUCURSALES (CU4)
        print("--> 4. Creando Ciudades y Sucursales...")
        # Ciudad SCZ
        c_scz = (await session.execute(select(Ciudad).where(Ciudad.codigo == "SCZ"))).scalar_one_or_none()
        if not c_scz:
            c_scz = Ciudad(nombre="Santa Cruz de la Sierra", codigo="SCZ", activo=True)
            session.add(c_scz)
            await session.flush()

        # Ciudad LPZ
        c_lpz = (await session.execute(select(Ciudad).where(Ciudad.codigo == "LPZ"))).scalar_one_or_none()
        if not c_lpz:
            c_lpz = Ciudad(nombre="La Paz", codigo="LPZ", activo=True)
            session.add(c_lpz)
            await session.flush()

        # Sucursal Equipetrol (SCZ)
        s_scz = (await session.execute(select(Sucursal).where(Sucursal.nombre == "Sucursal Equipetrol"))).scalar_one_or_none()
        if not s_scz:
            s_scz = Sucursal(
                nombre="Sucursal Equipetrol",
                direccion="Av. San Martin #450, Barrio Equipetrol",
                telefono="+591 3 3456789",
                horario_atencion="Lun - Sab: 10:00 - 21:00",
                capacidad_probadores=4,
                ciudad_id=c_scz.id,
                encargado_id=enc1_user.id,
                activo=True
            )
            session.add(s_scz)
            await session.flush()
            enc1_user.sucursal_id = s_scz.id

        # Sucursal Calacoto (LPZ)
        s_lpz = (await session.execute(select(Sucursal).where(Sucursal.nombre == "Sucursal Calacoto"))).scalar_one_or_none()
        if not s_lpz:
            s_lpz = Sucursal(
                nombre="Sucursal Calacoto",
                direccion="Calle 21 de Calacoto #800, Zona Sur",
                telefono="+591 2 2789123",
                horario_atencion="Lun - Sab: 10:00 - 20:30",
                capacidad_probadores=3,
                ciudad_id=c_lpz.id,
                encargado_id=enc2_user.id,
                activo=True
            )
            session.add(s_lpz)
            await session.flush()
            enc2_user.sucursal_id = s_lpz.id

        # 4.1 USUARIOS DE PRUEBA POR ROL PARA DEMO / EVALUACIÓN
        print("--> 4.1 Creando Credenciales de Prueba por Rol...")
        demo_users_data = [
            {
                "email": "AdminFashion@gmail.com",
                "password": "Admin123",
                "nombre": "Admin",
                "apellido": "Fashion",
                "ci_nit": "1001001",
                "telefono": "+591 70000010",
                "direccion": "Oficina Central, Equipetrol",
                "tipo_usuario": "PERSONAL",
                "rol": "ADMINISTRADOR",
                "sucursal_id": None
            },
            {
                "email": "EncargadoSucursal@gmail.com",
                "password": "Encargado123",
                "nombre": "Encargado",
                "apellido": "Sucursal",
                "ci_nit": "2002002",
                "telefono": "+591 70000020",
                "direccion": "Av. San Martin #450",
                "tipo_usuario": "PERSONAL",
                "rol": "ENCARGADO_SUCURSAL",
                "sucursal_id": s_scz.id
            },
            {
                "email": "CajeroFashion@gmail.com",
                "password": "Cajero123",
                "nombre": "Cajero",
                "apellido": "Fashion",
                "ci_nit": "3003003",
                "telefono": "+591 70000030",
                "direccion": "Av. San Martin #450, Modulo Caja",
                "tipo_usuario": "PERSONAL",
                "rol": "CAJERO",
                "sucursal_id": s_scz.id
            },
            {
                "email": "ClienteFashion@gmail.com",
                "password": "Cliente123",
                "nombre": "Cliente",
                "apellido": "Fashion",
                "ci_nit": "4004004",
                "telefono": "+591 70000040",
                "direccion": "Condominio La Riviera #12B",
                "tipo_usuario": "CLIENTE",
                "rol": "CLIENTE",
                "sucursal_id": None
            }
        ]

        for u_data in demo_users_data:
            u_exists = (await session.execute(
                select(Usuario).where(func.lower(Usuario.email) == u_data["email"].lower())
            )).scalar_one_or_none()
            if not u_exists:
                u_obj = Usuario(
                    email=u_data["email"],
                    password_hash=hash_password(u_data["password"]),
                    nombre=u_data["nombre"],
                    apellido=u_data["apellido"],
                    ci_nit=u_data["ci_nit"],
                    telefono=u_data["telefono"],
                    direccion=u_data["direccion"],
                    tipo_usuario=u_data["tipo_usuario"],
                    estado="ACTIVO",
                    rol_id=roles_map[u_data["rol"]].id,
                    sucursal_id=u_data["sucursal_id"]
                )
                session.add(u_obj)
            else:
                u_exists.password_hash = hash_password(u_data["password"])
                u_exists.rol_id = roles_map[u_data["rol"]].id
                u_exists.estado = "ACTIVO"
                if u_data["sucursal_id"]:
                    u_exists.sucursal_id = u_data["sucursal_id"]
        await session.flush()

        # 4.2 PROVEEDORES TEXTILES (CU8)
        print("--> 4.2 Creando Proveedores Textiles Base (CU8)...")
        proveedores_base = [
            {
                "razon_social": "Textiles Andinos S.A.",
                "nit": "1023948021",
                "contacto_nombre": "Roberto Gutiérrez",
                "telefono": "+591 3 3221144",
                "email": "ventas@textilesandinos.bo",
                "direccion": "Parque Industrial Manzana 12, Santa Cruz",
                "activo": True
            },
            {
                "razon_social": "Hilandería Santa Cruz S.R.L.",
                "nit": "3049281019",
                "contacto_nombre": "Mariana Barba",
                "telefono": "+591 3 3556677",
                "email": "pedidos@hilanderiascz.com",
                "direccion": "Av. Doble Vía a La Guardia Km 6",
                "activo": True
            },
            {
                "razon_social": "Loro Piana Fabrics Bolivia",
                "nit": "5019283011",
                "contacto_nombre": "Alessandro Rossi",
                "telefono": "+591 2 2794400",
                "email": "importaciones@loropiana.bo",
                "direccion": "Calle 18 de Achumani #400, La Paz",
                "activo": True
            }
        ]
        for p_data in proveedores_base:
            p_exist = (await session.execute(select(Proveedor).where(Proveedor.nit == p_data["nit"]))).scalar_one_or_none()
            if not p_exist:
                session.add(Proveedor(**p_data))
        await session.flush()

        # 5. PARAMETROS DE MODA (CU5)
        print("--> 5. Creando Parametros de Moda (Categorias, Tallas, Colores, Temporada)...")
        # Categorias
        cat_trench = (await session.execute(select(Categoria).where(Categoria.nombre == "Abrigos & Trench"))).scalar_one_or_none()
        if not cat_trench:
            cat_trench = Categoria(nombre="Abrigos & Trench", descripcion="Prendas exteriores y abrigos de alta costura", sector="UNISEX")
            session.add(cat_trench)
            await session.flush()

        cat_pant = (await session.execute(select(Categoria).where(Categoria.nombre == "Pantalones & Sastreria"))).scalar_one_or_none()
        if not cat_pant:
            cat_pant = Categoria(nombre="Pantalones & Sastreria", descripcion="Pantalones sastreros y siluetas modernas", sector="UNISEX")
            session.add(cat_pant)
            await session.flush()

        # Tallas
        tallas_dict = {}
        for cod, desc, orden in [("S", "Small", 1), ("M", "Medium", 2), ("L", "Large", 3), ("XL", "Extra Large", 4)]:
            t = (await session.execute(select(Talla).where(Talla.codigo == cod))).scalar_one_or_none()
            if not t:
                t = Talla(codigo=cod, descripcion=desc, orden=orden)
                session.add(t)
                await session.flush()
            tallas_dict[cod] = t

        # Colores
        colores_dict = {}
        for c_nom, hex_c, rgb_c in [
            ("Midnight Black", "#131313", "rgb(19, 19, 19)"),
            ("Editorial Gold", "#D4AF37", "rgb(212, 175, 55)"),
            ("Silk White", "#FFFFFF", "rgb(255, 255, 255)")
        ]:
            c = (await session.execute(select(Color).where(Color.nombre == c_nom))).scalar_one_or_none()
            if not c:
                c = Color(nombre=c_nom, codigo_hex=hex_c, codigo_rgb=rgb_c)
                session.add(c)
                await session.flush()
            colores_dict[c_nom] = c

        # Temporada
        temp_ss = (await session.execute(select(Temporada).where(Temporada.codigo == "SS-2026"))).scalar_one_or_none()
        if not temp_ss:
            temp_ss = Temporada(
                nombre="Primavera-Verano 2026",
                codigo="SS-2026",
                fecha_inicio=date(2026, 9, 1),
                fecha_fin=date(2027, 2, 28),
                activo=True
            )
            session.add(temp_ss)
            await session.flush()

        # 6. PRENDAS, MULTIMEDIA AR Y VARIANTES (CU6)
        print("--> 6. Creando Prendas con Modelos 3D AR y Variantes...")
        # Prenda 1: Trench
        p1 = (await session.execute(select(Prenda).where(Prenda.sku == "NOIR-TRN-001"))).scalar_one_or_none()
        if not p1:
            p1 = Prenda(
                sku="NOIR-TRN-001",
                nombre="The Midnight Silk Trench",
                descripcion="Trench coat confeccionado en seda italiana pesada con corte arquitectonico y acabado negro mate.",
                precio_base=890.00,
                categoria_id=cat_trench.id,
                temporada_id=temp_ss.id,
                activo=True
            )
            session.add(p1)
            await session.flush()

            # Multimedia
            session.add(PrendaMultimedia(
                prenda_id=p1.id, tipo="IMAGEN",
                url="https://images.unsplash.com/photo-1539533018447-63fcce667883?auto=format&fit=crop&w=800&q=80",
                formato=".jpg", es_portada=True
            ))
            session.add(PrendaMultimedia(
                prenda_id=p1.id, tipo="MODELO_3D_GLB",
                url="https://storage.fashionstore.com/ar/models/midnight_silk_trench.glb",
                formato=".glb", es_portada=False
            ))
            session.add(PrendaMultimedia(
                prenda_id=p1.id, tipo="MODELO_3D_USDZ",
                url="https://storage.fashionstore.com/ar/models/midnight_silk_trench.usdz",
                formato=".usdz", es_portada=False
            ))

            # Variantes
            for t_cod in ["S", "M", "L"]:
                session.add(PrendaVariante(
                    prenda_id=p1.id,
                    talla_id=tallas_dict[t_cod].id,
                    color_id=colores_dict["Midnight Black"].id,
                    sku_variante=f"NOIR-TRN-001-{t_cod}-BLK"
                ))
            session.add(PrendaVariante(
                prenda_id=p1.id,
                talla_id=tallas_dict["M"].id,
                color_id=colores_dict["Silk White"].id,
                sku_variante="NOIR-TRN-001-M-WHT"
            ))
            await session.flush()

        # Prenda 2: Pantalon
        p2 = (await session.execute(select(Prenda).where(Prenda.sku == "NOIR-PNT-002"))).scalar_one_or_none()
        if not p2:
            p2 = Prenda(
                sku="NOIR-PNT-002",
                nombre="Atelier Tailored Pant",
                descripcion="Pantalon sastrero de lana fria con tiro alto, pinzas frontales pronunciadas y caida recta minimalista.",
                precio_base=450.00,
                categoria_id=cat_pant.id,
                temporada_id=temp_ss.id,
                activo=True
            )
            session.add(p2)
            await session.flush()

            # Multimedia
            session.add(PrendaMultimedia(
                prenda_id=p2.id, tipo="IMAGEN",
                url="https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80",
                formato=".jpg", es_portada=True
            ))
            session.add(PrendaMultimedia(
                prenda_id=p2.id, tipo="MODELO_3D_GLB",
                url="https://storage.fashionstore.com/ar/models/atelier_tailored_pant.glb",
                formato=".glb", es_portada=False
            ))
            session.add(PrendaMultimedia(
                prenda_id=p2.id, tipo="MODELO_3D_USDZ",
                url="https://storage.fashionstore.com/ar/models/atelier_tailored_pant.usdz",
                formato=".usdz", es_portada=False
            ))

            # Variantes
            for t_cod in ["S", "M", "L"]:
                session.add(PrendaVariante(
                    prenda_id=p2.id,
                    talla_id=tallas_dict[t_cod].id,
                    color_id=colores_dict["Midnight Black"].id,
                    sku_variante=f"NOIR-PNT-002-{t_cod}-BLK"
                ))
            session.add(PrendaVariante(
                prenda_id=p2.id,
                talla_id=tallas_dict["M"].id,
                color_id=colores_dict["Editorial Gold"].id,
                sku_variante="NOIR-PNT-002-M-GLD"
            ))
            await session.flush()

        # 7. INVENTARIO INICIAL (50 unidades por variante en cada sucursal)
        print("--> 7. Asignando Inventario Inicial (50 unidades por sucursal)...")
        variantes_res = await session.execute(select(PrendaVariante))
        todas_variantes = list(variantes_res.scalars().all())

        for suc in [s_scz, s_lpz]:
            for var in todas_variantes:
                stk_res = await session.execute(
                    select(InventarioStock).where(
                        InventarioStock.variante_id == var.id,
                        InventarioStock.sucursal_id == suc.id
                    )
                )
                stk = stk_res.scalar_one_or_none()
                if not stk:
                    stk = InventarioStock(
                        variante_id=var.id,
                        sucursal_id=suc.id,
                        cantidad_disponible=50,
                        cantidad_reservada=0,
                        stock_minimo=5
                    )
                    session.add(stk)
                    await session.flush()

                    mov = MovimientoInventario(
                        stock_id=stk.id,
                        tipo_movimiento="INGRESO_INICIAL",
                        cantidad=50,
                        cantidad_anterior=0,
                        cantidad_nueva=50,
                        motivo=f"Carga inicial de apertura para {suc.nombre}",
                        usuario_id=admin_user.id
                    )
                    session.add(mov)

        # 8. AUDITORIA
        session.add(BitacoraAuditoria(
            accion="SEED_INICIAL_COMPLETADO",
            modulo="sistema",
            detalle="Poblado inicial exitoso de datos para Ciclo 1 (Roles, Admin, Ciudades, Sucursales, Catalogo, AR, Stock)",
            usuario_id=admin_user.id,
            usuario_email=admin_user.email,
            ip_address="127.0.0.1"
        ))

        await session.commit()
        print("=========================================================")
        print("  SEED EJECUTADO EXITOSAMENTE!")
        print("  Credenciales de acceso:")
        print("    Admin:     admin@fashionstore.com          / admin123")
        print("    Encargado: encargado.scz@fashionstore.com  / admin123")
        print("    Encargada: encargada.lpz@fashionstore.com  / admin123")
        print("=========================================================")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_seed())

