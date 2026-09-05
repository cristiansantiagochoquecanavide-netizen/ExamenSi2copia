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

## 🏗️ Estructura del Repositorio (Propuesta)

```text
Proyecto/
├── backend/          # API REST desarrollada en FastAPI (Python)
├── frontend/         # Plataforma Web desarrollada en Angular
├── mobile/           # Aplicación Móvil desarrollada en Flutter (Dart)
├── docs/             # Documentación UML, PUDS y especificaciones
└── README.md         # Documentación general del repositorio
```

---

## ⚙️ Reglas de Desarrollo & Despliegue

- ⚠️ **Frameworks restringidos**: Queda strictly prohibido el uso de CMS o frameworks e-commerce preconstruidos (PrestaShop, Shopify, Magento, WooCommerce).
- ☁️ **Entorno de Despliegue**: Despliegue obligatorio en servicios en la nube (Cloud Platform), no localhost.
