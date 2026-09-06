# 🛍️ FashionStore - Plataforma Inteligente de Comercio Electrónico

Plataforma integral de comercio electrónico para cadena de tiendas de ropa que combina **comercio web y móvil**, **reservas de prendas**, **vestidores virtuales con Realidad Aumentada (AR)** e **Inteligencia Artificial (IA)** para recomendaciones personalizadas y gestión automatizada.

---

## 🚀 Stack Tecnológico

El proyecto está diseñado bajo una arquitectura modular y escalable, utilizando las siguientes tecnologías:

| Componente | Tecnología / Herramienta | Descripción |
| :--- | :--- | :--- |
| **Backend** | **Python + FastAPI** | API REST de alto rendimiento, asíncrona y documentada con Swagger/OpenAPI. |
| **Frontend Web** | **Angular** | Aplicación web SPA reactiva e intuitiva para clientes y administración. |
| **Aplicación Móvil** | **Flutter + Dart** | Aplicación móvil multiplataforma (Android/iOS) con soporte AR y catálogo. |
| **Base de Datos** | **PostgreSQL** | Sistema gestor de base de datos relacional para control transaccional e inventario. |
| **Inteligencia Artificial** | **API Service (LLM / Modelos de IA)** | Asistente virtual, recomendador inteligente de prendas y reportes generativos por voz. |
| **Realidad Aumentada** | **AR Engine (Compatible con móviles)** | Vestidor virtual para previsualizar prendas mediante la cámara del dispositivo móvil. |
| **Pasarela de Pagos** | **Integración Electrónica / Pasarela** | Procesamiento seguro de pagos digitales (tarjeta, QR, transferencia) y pagos en caja. |
| **Metodología** | **PUDS** | Proceso Unificado de Desarrollo de Software. |
| **Modelado** | **UML 2.5+** | Diagramación y modelado formal de arquitectura y casos de uso. |

---

## 🔑 Credenciales de Acceso para Evaluación (Web & Móvil)

El backend de FastAPI opera como una **API REST unificada con autenticación JWT**, por lo que **todas las credenciales funcionan indistintamente tanto en la plataforma Web como en la Aplicación Móvil (o navegadores móviles)**.

| Rol | Correo Electrónico | Contraseña | Alcance y Vistas en el Sistema |
| :--- | :--- | :--- | :--- |
| **Administrador** | `AdminFashion@gmail.com` | `Admin123` | **Control total**: Matriz de Roles y Permisos RBAC (CU2), Personal y Clientes (CU3), Tiendas/Sucursales (CU4), Parámetros de Moda (CU5), Catálogo y AR (CU6) y Bitácora de Auditoría (CU7). |
| **Encargado de Sucursal** | `EncargadoSucursal@gmail.com` | `Encargado123` | **Operativo de Sucursal**: Gestión de stock local (Sucursal Equipetrol), catálogo de prendas, capacidad de probadores y reservas físicas. |
| **Cajero** | `CajeroFashion@gmail.com` | `Cajero123` | **Punto de Venta**: Consulta de inventario, registro de ventas presenciales POS y cobros en tienda. |
| **Cliente** | `ClienteFashion@gmail.com` | `Cliente123` | **Perfil Principal Móvil / E-commerce**: Exploración de colecciones Atelier Noir, vestidor virtual en Realidad Aumentada (AR con modelos 3D `.glb`/`.usdz`), solicitud de reservas y compras. |

> 📱 **Conectividad Móvil (Red Local WiFi):**  
> Para interactuar desde un dispositivo móvil físico conectado a la misma red WiFi, reemplace `localhost` por la dirección IP local de su equipo anfitrión (ejemplo: `http://192.168.1.15:8000/api/v1`). La interfaz Web cuenta adicionalmente con botones de autocompletado rápido en `/login` para alternar entre roles con un solo clic.

---

## 📌 Características Principales

- **Gestión Multi-sucursal e Inventario Integrado**: Control unificado de existencias (disponible, reservado, vendido, agotado) en tiempo real por sucursal, ciudad, color y talla.
- **Vestidor Virtual en Realidad Aumentada**: Permite a los usuarios probar prendas de vestir virtualmente a través de la cámara de su celular antes de comprar o reservar.
- **Asistente Virtual y Recomendador con IA**: Sugerencias personalizadas de productos según preferencias del cliente, historial de navegación, temporada y disponibilidad.
- **Sistema de Reservas y Atención Presencial**: El cliente reserva prendas desde la App/Web, selecciona la sucursal y horario, y la tienda prepara las prendas para el vestidor físico.
- **Compras Omnicanal y Pagos**: Flexibilidad de compra presencial en caja o digital desde la web/móvil con pasarela de pagos integrada.

---

## 👥 Actores del Sistema

- **Cliente**: Registro, consulta de catálogo, uso de vestidor virtual AR, reserva de prendas, compras online/presenciales y recepción de recomendaciones IA.
- **Administrador**: Gestión global de usuarios, roles, sucursales, productos, categorías, proveedores, promociones e indicadores empresariales.
- **Encargado de Sucursal**: Gestión de reservas locales, preparación de prendas, recepción de clientes y control de movimientos de inventario.
- **Cajero**: Registro de ventas presenciales, cobro en punto de caja y emisión de comprobantes.
- **Proveedor**: Registro de productos, reporte de disponibilidad y asociación con temporadas o colecciones.

---

## 🏗️ Estructura del Repositorio

```text
Proyecto/
├── backend/                  # Monolito Modular en FastAPI (Python)
│   └── app/
│       ├── core/             # Base de datos, seguridad JWT, configuración base
│       └── domains/          # Dominios de Negocio Aislados
│           ├── usuarios/     # Auth, roles, usuarios, clientes, personal
│           ├── catalogo/     # Prendas, categorías, temporadas, colecciones
│           ├── inventario/   # Sucursales, stock, tallas, colores, proveedores
│           ├── reservas/     # Reservas en tienda, vestidores físicos, agendas
│           ├── ventas_pagos/ # POS, órdenes e-commerce, carrito, pasarelas
│           └── ia_asistente/ # Recomendador de prendas, chatbot, voz
├── frontend/                 # Aplicación Web en Angular (Atelier Noir UI)
├── movil/                    # Aplicación Móvil en Flutter (AR Fitting Room)
├── docs/                     # Documentación PUDS, modelos UML 2.5+
├── UI-UX-WEB/                # Stitch UI Web (Atelier Noir / Aura Storefront & Admin)
├── UI-UX-MOVIL/              # Stitch UI Móvil (Atelier Noir / AR Fitting Room)
└── README.md
```

---

## 🏛️ Regla Arquitectónica Estricta: Monolito Modular en FastAPI (RNF06)

Para garantizar la mantenibilidad y desacoplamiento, el backend debe respetar 3 reglas inquebrantables:
1. **Agrupación por Dominios de Negocio**: Prohibido el esquema plano o archivos gigantes. Módulos padre divididos por capacidades de negocio.
2. **Submódulos Aislados (`APIRouter`)**: Cada funcionalidad dentro del dominio se expone mediante su propio `APIRouter` independiente.
3. **Encapsulamiento Interno (Patrón de Capas)**: Cada submódulo implementa estrictamente 4 capas:
   - `models/`: Entidades ORM (SQLAlchemy 2.0).
   - `schemas/`: Contratos de entrada y salida (Pydantic v2).
   - `services/`: Lógica de negocio pura, reglas transaccionales e integraciones.
   - `routers/`: Controladores de endpoints y dependencias FastAPI.

---

## ⚙️ Reglas de Desarrollo & Despliegue

- ⚠️ **Frameworks restringidos**: Queda estrictamente prohibido el uso de CMS o frameworks e-commerce preconstruidos (PrestaShop, Shopify, Magento, WooCommerce).
- ☁️ **Entorno de Despliegue**: Despliegue obligatorio en servicios en la nube (Cloud Platform), no localhost.
- 🎨 **Línea Visual**: Estricta adherencia a la guía de diseño **Atelier Noir** (Dark luxury, 0px border-radius, Bodoni Moda + Inter).
