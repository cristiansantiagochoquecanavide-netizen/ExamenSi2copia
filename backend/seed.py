import asyncio
import os
import json
from datetime import datetime, date, timezone
from sqlalchemy import select, func, text
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
        # Verificación rápida: si el catálogo real ya está cargado en PostgreSQL, omitir seed para arranque ultrarrápido (<0.1s)
        if not os.getenv("FORCE_SEED"):
            prenda_existente = (await session.execute(select(Prenda).where(Prenda.sku == "NOIR-6647"))).scalar_one_or_none()
            if prenda_existente:
                print("--> [SEED] Base de datos ya sembrada previamente (Prenda real NOIR-6647 detectada). Omitiendo seed para arranque instantáneo.")
                return

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
        categorias_base = [
            # MUJERES
            ("Blusas", "Blusas y tops para dama", "MUJERES"),
            ("Vestidos", "Vestidos de corte editorial y gala", "MUJERES"),
            ("Pantalones", "Pantalones y sastrería femenina", "MUJERES"),
            ("Poleras", "Poleras y remeras de diseño para mujer", "MUJERES"),
            # HOMBRES
            ("Poleras", "Poleras y remeras masculinas de alta costura", "HOMBRES"),
            ("Pantalones", "Pantalones y sastrería masculina", "HOMBRES"),
            ("Shores", "Shores y bermudas de verano para hombre", "HOMBRES"),
            ("Camisas", "Camisas de lino y algodón egipcio para hombre", "HOMBRES"),
            ("Trajes", "Trajes bespoke y smokings ejecutivos", "HOMBRES"),
            # UNISEX
            ("Camisas", "Camisas de corte fluido unisex", "UNISEX"),
            ("Abrigos", "Abrigos, trenchs y sobretodos unisex", "UNISEX"),
            ("Chaquetas", "Chaquetas arquitectónicas y blazers unisex", "UNISEX"),
            ("Pantalones", "Pantalones y sastrería unisex", "UNISEX"),
        ]
        cats_map = {}
        for nom, desc, sec in categorias_base:
            c = (await session.execute(
                select(Categoria).where(Categoria.nombre == nom, Categoria.sector == sec)
            )).scalar_one_or_none()
            if not c:
                c = Categoria(nombre=nom, descripcion=desc, sector=sec)
                session.add(c)
                await session.flush()
            cats_map[(nom, sec)] = c

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
            ("Azul Claro", "#64B5F6", "rgb(100, 181, 246)"),
            ("Azul", "#1976D2", "rgb(25, 118, 210)"),
            ("Azul Oscuro", "#0D47A1", "rgb(13, 71, 161)"),

            ("Rojo Claro", "#EF5350", "rgb(239, 83, 80)"),
            ("Rojo", "#D32F2F", "rgb(211, 47, 47)"),
            ("Rojo Oscuro", "#8B0000", "rgb(139, 0, 0)"),

            ("Amarillo Claro", "#FFF59D", "rgb(255, 245, 157)"),
            ("Amarillo", "#FDD835", "rgb(253, 216, 53)"),
            ("Amarillo Oscuro", "#F57F17", "rgb(245, 127, 23)"),

            ("Verde Claro", "#81C784", "rgb(129, 199, 132)"),
            ("Verde", "#2E7D32", "rgb(46, 125, 50)"),
            ("Verde Oscuro", "#1B5E20", "rgb(27, 94, 32)"),

            ("Naranja Claro", "#FFB74D", "rgb(255, 183, 77)"),
            ("Naranja", "#F57C00", "rgb(245, 124, 0)"),
            ("Naranja Oscuro", "#E65100", "rgb(230, 81, 0)"),

            ("Morado Claro", "#BA68C8", "rgb(186, 104, 200)"),
            ("Morado", "#7B1FA2", "rgb(123, 31, 162)"),
            ("Morado Oscuro", "#4A148C", "rgb(74, 20, 140)"),

            ("Celeste Claro", "#B3E5FC", "rgb(179, 229, 252)"),
            ("Celeste", "#29B6F6", "rgb(41, 182, 246)"),
            ("Celeste Oscuro", "#0288D1", "rgb(2, 136, 209)"),

            ("Rosa Claro", "#F8BBD0", "rgb(248, 187, 208)"),
            ("Rosa", "#EC407A", "rgb(236, 64, 122)"),
            ("Rosa Oscuro", "#C2185B", "rgb(194, 24, 91)"),

            ("Verde Lima Claro", "#DCE775", "rgb(220, 231, 117)"),
            ("Verde Lima", "#AFB42B", "rgb(175, 180, 43)"),
            ("Verde Lima Oscuro", "#827717", "rgb(130, 119, 23)"),

            ("Marrón Claro", "#A1887F", "rgb(161, 136, 127)"),
            ("Marrón", "#6D4C41", "rgb(109, 76, 65)"),
            ("Marrón Oscuro", "#3E2723", "rgb(62, 39, 35)"),

            ("Gris Claro", "#E0E0E0", "rgb(224, 224, 224)"),
            ("Gris", "#9E9E9E", "rgb(158, 158, 158)"),
            ("Gris Oscuro", "#424242", "rgb(66, 66, 66)"),

            ("Negro Claro", "#374151", "rgb(55, 65, 81)"),
            ("Negro", "#18181B", "rgb(24, 24, 27)"),
            ("Negro Oscuro", "#000000", "rgb(0, 0, 0)"),

            ("Blanco Claro", "#FFFFFF", "rgb(255, 255, 255)"),
            ("Blanco", "#F8FAFC", "rgb(248, 250, 252)"),
            ("Blanco Oscuro", "#E2E8F0", "rgb(226, 232, 240)")
        ]:
            c = (await session.execute(select(Color).where(Color.nombre == c_nom))).scalar_one_or_none()
            if not c:
                c = Color(nombre=c_nom, codigo_hex=hex_c, codigo_rgb=rgb_c)
                session.add(c)
                await session.flush()
            colores_dict[c_nom] = c

        # Temporadas comerciales y atemporales
        temporadas_seed = [
            {"nombre": "Primavera-Verano 2026", "codigo": "SS-2026", "fecha_inicio": date(2026, 9, 1), "fecha_fin": date(2027, 2, 28)},
            {"nombre": "Casual", "codigo": "CASUAL", "fecha_inicio": None, "fecha_fin": None},
            {"nombre": "Sin Temporada", "codigo": "SIN-TEMP", "fecha_inicio": None, "fecha_fin": None}
        ]
        for t_seed in temporadas_seed:
            t_obj = (await session.execute(select(Temporada).where(Temporada.codigo == t_seed["codigo"]))).scalar_one_or_none()
            if not t_obj:
                t_obj = Temporada(
                    nombre=t_seed["nombre"],
                    codigo=t_seed["codigo"],
                    fecha_inicio=t_seed["fecha_inicio"],
                    fecha_fin=t_seed["fecha_fin"],
                    activo=True
                )
                session.add(t_obj)
                await session.flush()

        # 6. PRENDAS (Catálogo real extraído de la base de datos de desarrollo)
        print("--> 6. Poblando catalogo de prendas reales desde catalogo_real.json...")
        json_path = os.path.join(os.path.dirname(__file__), "catalogo_real.json")
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                prendas_seed_data = json.load(f)

            # Limpiar prendas mockup anteriores y sus dependencias si la base aun no tiene el catalogo real
            prenda_real_test = (await session.execute(select(Prenda).where(Prenda.sku == "NOIR-6647"))).scalar_one_or_none()
            if not prenda_real_test:
                print("  - Sincronizando base de datos con catalogo real. Truncando prendas mockup y dependencias previas...")
                await session.execute(text("TRUNCATE TABLE prendas, ventas, reservas CASCADE;"))
                await session.flush()

            temp_default = (await session.execute(select(Temporada))).scalars().first()

            for p_data in prendas_seed_data:
                p_exist = (await session.execute(select(Prenda).where(Prenda.sku == p_data["sku"]))).scalar_one_or_none()

                # Resolver categoría
                cat_nombre = p_data.get("categoria_nombre")
                cat_sector = p_data.get("categoria_sector")
                cat_obj = None
                if cat_nombre and cat_sector:
                    cat_obj = (await session.execute(
                        select(Categoria).where(Categoria.nombre == cat_nombre, Categoria.sector == cat_sector)
                    )).scalar_one_or_none()
                if not cat_obj and cat_nombre:
                    cat_obj = (await session.execute(
                        select(Categoria).where(Categoria.nombre == cat_nombre)
                    )).scalars().first()
                if not cat_obj:
                    cat_id = p_data.get("categoria_id")
                    if cat_id:
                        cat_obj = await session.get(Categoria, cat_id)
                if not cat_obj:
                    cat_obj = (await session.execute(select(Categoria))).scalars().first()

                # Resolver temporada
                temp_obj = temp_default

                if not p_exist and cat_obj:
                    p_exist = Prenda(
                        sku=p_data["sku"],
                        nombre=p_data["nombre"],
                        descripcion=p_data.get("descripcion") or "",
                        precio_base=float(p_data["precio_base"]),
                        categoria_id=cat_obj.id,
                        temporada_id=temp_obj.id if temp_obj else 1,
                        activo=p_data.get("activo", True)
                    )
                    session.add(p_exist)
                    await session.flush()
                    print(f"  + Prenda real cargada: {p_exist.nombre} ({p_exist.sku})")

                    # Multimedia
                    for m_data in p_data.get("multimedia", []):
                        url_m = m_data.get("url", "")
                        if "localhost:8000" in url_m:
                            url_m = url_m.replace("http://localhost:8000", "")
                        if not url_m.startswith("/"):
                            url_m = "/" + url_m
                        media = PrendaMultimedia(
                            prenda_id=p_exist.id,
                            tipo=m_data.get("tipo", "IMAGEN"),
                            url=url_m,
                            formato=m_data.get("formato", ".webp"),
                            es_portada=m_data.get("es_portada", False)
                        )
                        session.add(media)
                    await session.flush()

                    # Variantes
                    for v_data in p_data.get("variantes", []):
                        t_id = v_data.get("talla_id")
                        c_id = v_data.get("color_id")
                        sku_v = v_data.get("sku_variante")
                        if not t_id or not c_id or not sku_v:
                            continue

                        # Validar que talla y color existan en la BD
                        t_obj = await session.get(Talla, t_id)
                        c_obj = await session.get(Color, c_id)
                        if not t_obj:
                            t_fallback = (await session.execute(select(Talla))).scalars().first()
                            t_id = t_fallback.id if t_fallback else 1
                        if not c_obj:
                            c_fallback = (await session.execute(select(Color))).scalars().first()
                            c_id = c_fallback.id if c_fallback else 1

                        var_obj = (await session.execute(
                            select(PrendaVariante).where(
                                PrendaVariante.prenda_id == p_exist.id,
                                PrendaVariante.talla_id == t_id,
                                PrendaVariante.color_id == c_id
                            )
                        )).scalar_one_or_none()
                        if not var_obj:
                            var_obj = PrendaVariante(
                                prenda_id=p_exist.id,
                                talla_id=t_id,
                                color_id=c_id,
                                sku_variante=sku_v,
                                activo=True
                            )
                            session.add(var_obj)
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

        # 9. RESEÑAS Y CALIFICACIONES (CU18)
        try:
            from seed_reviews import seed_reviews
            await seed_reviews()
        except Exception as e_rev:
            print(f"--> Nota en seed_reviews: {e_rev}")
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

