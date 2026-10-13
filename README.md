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

## 🐳 Puesta en Marcha con Docker (Quickstart)

### 1. Variables de Entorno (Opcional)
Para personalizar credenciales, puertos o claves de API, copia la plantilla de entorno:

- **PowerShell (Windows):**
  ```powershell
  Copy-Item .env.example .env
  ```
- **Bash (Linux / macOS):**
  ```bash
  cp .env.example .env
  ```

*(Si omites este paso, `docker-compose.yml` usará automáticamente los valores predeterminados de desarrollo).*

### 2. Construir y Levantar Contenedores
Con Docker en ejecución, corre el siguiente comando en la raíz del proyecto:

```bash
docker compose up --build
```

> 💡 **Ejecución en segundo plano:** Si deseas liberar la terminal:
> ```bash
> docker compose up -d --build
> ```

### 3. Servicios Disponibles

| Servicio | URL / Puerto | Descripción |
| :--- | :--- | :--- |
| **Frontend Web** (Angular) | [http://localhost:4200](http://localhost:4200) | Plataforma de comercio electrónico y panel de administración |
| **Backend REST API** (FastAPI) | [http://localhost:8000](http://localhost:8000) | API principal |
| **Swagger / OpenAPI** | [http://localhost:8000/docs](http://localhost:8000/docs) | Documentación interactiva y prueba de endpoints |
| **Base de Datos** (PostgreSQL 16) | `localhost:5432` | Base de datos relacional (`fashionstore_db`) |

> ℹ️ **Inicialización Automática:**  
> El contenedor de backend ejecuta de forma automática la creación de esquemas (`init_db.py`) y la carga de datos de prueba (`seed.py`), dejando el sistema listo para operar con las credenciales indicadas arriba.

### 4. Comandos Útiles de Gestión

- **Ver logs en tiempo real:**
  ```bash
  docker compose logs -f
  ```
- **Detener los servicios:**
  ```bash
  docker compose down
  ```
- **Detener y reiniciar la base de datos limpia (elimina volúmenes):**
  ```bash
  docker compose down -v
  ```

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

## 🏛️ Arquitectura Modular con MVC (Backend, Web & Móvil)

El sistema implementa una **Arquitectura Modular orientada al dominio (Vertical Slice / Feature-Driven)** combinada con el patrón **MVC (Modelo - Vista - Controlador)** de forma homogénea en el Backend, la Plataforma Web y la Aplicación Móvil, complementado con capas de servicios y repositorios para garantizar alta cohesión, bajo acoplamiento y componentes delgados (*Thin Controllers*).

---

### 1. Backend (FastAPI + SQLAlchemy)

El backend está estructurado en **módulos de negocio independientes** bajo `backend/app/domains/`:

```text
backend/app/
├── core/                  # Configuración global, BD PostgreSQL, JWT y seguridad
└── domains/               # ARQUITECTURA MODULAR (VERTICAL SLICES)
    ├── usuarios/          # Auth, roles RBAC, clientes y personal
    ├── catalogo/          # Prendas, categorías, temporadas, colecciones y modelos 3D AR
    ├── inventario/        # Sucursales, stock multitienda, tallas, colores y proveedores
    ├── reservas/          # Reservas presenciales, probadores físicos y vouchers QR
    ├── ventas/            # POS presencial, checkout online, pasarelas y cupones
    └── ia_asistente/      # Recomendador inteligente, reportes generativos y chatbot
```

Dentro de cada módulo o dominio se implementa estrictamente la siguiente separación de responsabilidades:

```text
domains/<modulo>/
├── models.py      # [M] MODELO: Entidades ORM / Tablas PostgreSQL (SQLAlchemy 2.0)
├── schemas.py     # [M/V] MODELO DTO: Validación y serialización (Pydantic v2)
├── routers.py     # [C] CONTROLADOR: Endpoints HTTP, validación y autenticación (APIRouter)
└── services.py    # [LÓGICA]: Service Layer transaccional (Reglas de negocio y Kardex)
```

#### ¿Cómo responde al patrón MVC?

- **Modelo (M)**: 
  - **`models.py`**: Define las entidades de datos mapeadas a PostgreSQL con SQLAlchemy ORM, relaciones y restricciones de integridad.
  - **`schemas.py`**: Define los modelos de transferencia de datos (DTOs) y validación de esquemas con Pydantic.
- **Controlador (C)**: 
  - **`routers.py`**: Controladores de endpoints (`APIRouter`). Reciben los requests HTTP, validan los parámetros y payloads, verifican permisos de usuario (`Depends`) y delegan la ejecución a la capa de servicios.
- **Vista (V)**: 
  - Al ser una arquitectura desacoplada basada en API REST, la "Vista" en el backend corresponde a las representaciones JSON generadas a partir de los `schemas.py` de respuesta que consume el cliente web o móvil.
- **Service Layer (Lógica de Negocio)**: 
  - **`services.py`**: Contiene la lógica empresarial, transacciones de inventario (Kardex), cálculos financieros y validaciones comerciales, evitando el antipatrón de *Fat Controllers*.

---

### 2. Frontend (Angular 19)

El frontend web replica de manera simétrica la misma **modularidad funcional** en `frontend/src/app/features/`:

```text
frontend/src/app/
├── core/                  # Servicios transversales (AuthService, interceptores JWT, guards)
├── shared/                # Componentes y utilidades compartidas
└── features/              # MÓDULOS DE NEGOCIO (FEATURE-BASED)
    ├── usuarios/          # Login, gestión de usuarios, roles y auditoría
    ├── catalogo/          # Catálogo interactivo, modelos 3D y visor AR
    ├── inventario/        # Control de stock, sucursales y alertas
    ├── reservas/          # Agendamiento de probadores y gestión en tienda
    ├── ventas/            # POS, checkout e-commerce, promociones y pasarela de pagos
    └── ia-asistente/      # Chatbot y estilista virtual con IA
```

Cada módulo de negocio frontend contiene su propia estructura interna:

```text
features/<modulo>/
├── models/        # [M] MODELO: Interfaces y tipos TypeScript
├── services/      # [API Client]: Comunicación HTTP y manejo de estado reactivo
├── pages/         # [V + C] VISTA Y CONTROLADOR: Componentes visuales y lógica UI
└── <modulo>.routes.ts # Enrutamiento perezoso (Lazy Loading) del módulo
```

#### Conceptos y Mapeo MVC en Frontend:

- **Modelo (M)**: 
  - Archivos dentro de `models/` (ej: `ventas.models.ts`), donde se definen las interfaces y contratos de datos tipados en TypeScript.
- **Vista (V)**: 
  - Plantillas declarativas (HTML) estilizadas con **Tailwind CSS** y diseño de alta costura **Atelier Noir**, responsables del renderizado y experiencia de usuario.
- **Controlador (C)**: 
  - Clases TypeScript de cada componente (`*PageComponent`), encargadas de la gestión del estado reactivo (Signals / RxJS), recepción de eventos del DOM y orquestación con los servicios.
- **Capa de Servicios**: 
  - Archivos en `services/` (ej: `ventas.service.ts`, `cart.service.ts`), que actúan como clientes HTTP desacoplados para interactuar con la API REST del backend.

---

### 3. Aplicación Móvil (Flutter + Dart)

La aplicación móvil multiplataforma implementa una **Arquitectura Modular por Features (Feature-Driven)** siguiendo los principios del patrón **MVC / Clean Architecture** en `movil/lib/`:

```text
movil/lib/
├── core/                         # Infraestructura transversal
│   ├── network/api_client.dart   # Conexión HTTP al Backend FastAPI
│   ├── routes/app_router.dart    # Enrutador central de pantallas
│   └── theme/app_theme.dart      # Paleta visual de alta costura Atelier Noir
├── shared/                       # Widgets reutilizables (AtelierScaffold)
└── features/                     # MÓDULOS DE NEGOCIO (FEATURE-DRIVEN)
    ├── usuarios/                 # Login móvil y perfil de cliente
    ├── catalogo/                 # Catálogo interactivo y vestidor virtual AR
    ├── inventario/               # Consulta de existencias y tallas
    ├── reservas/                 # Reservas para probador físico en tienda
    ├── ventas/                   # Carrito móvil, checkout digital y pasarelas
    └── ia_asistente/             # Recomendador de moda y estilista IA
```

Cada módulo o feature en Flutter encapsula internamente sus 3 capas:

```text
features/<modulo>/
├── domain/models/        # [M] MODELO: Clases de datos y entidades de negocio
├── presentation/screens/ # [V] VISTA: Widgets Flutter y pantallas de usuario
└── data/repositories/    # [C] CONTROLADOR / DATOS: Repositorios y consumo de API
```

#### Conceptos y Mapeo MVC en la App Móvil:

- **Modelo (M)**:
  - Archivos dentro de `domain/models/` (ej: `ventas_model.dart`, `catalogo_model.dart`), que representan los objetos y contratos de datos del negocio en Dart.
- **Vista (V)**:
  - Widgets y pantallas dentro de `presentation/screens/` (ej: `ventas_screen.dart`, `vestidor_ar_screen.dart`), encargadas del renderizado visual en Flutter, animaciones y vistas de cámara para Realidad Aumentada (AR).
- **Controlador / Repositorio (C)**:
  - Clases dentro de `data/repositories/` (ej: `ventas_repository.dart`, `catalogo_repository.dart`), que actúan como controladores de datos intermediarios: orquestan peticiones HTTP a través de `api_client.dart`, gestionan el estado y abastecen a las vistas.
- **Enrutamiento y Conexión Global**:
  - `core/routes/app_router.dart`: Gestiona el mapa de navegación entre pantallas.
  - `core/network/api_client.dart`: Cliente HTTP centralizado que conecta directamente con la API REST de FastAPI (`/api/v1`).

---

## ⚙️ Reglas de Desarrollo & Despliegue

- ⚠️ **Frameworks restringidos**: Queda estrictamente prohibido el uso de CMS o frameworks e-commerce preconstruidos (PrestaShop, Shopify, Magento, WooCommerce).
- ☁️ **Entorno de Despliegue**: Despliegue obligatorio en servicios en la nube (Cloud Platform), no localhost.
- 🎨 **Línea Visual**: Estricta adherencia a la guía de diseño **Atelier Noir** (Dark luxury, 0px border-radius, Bodoni Moda + Inter).
