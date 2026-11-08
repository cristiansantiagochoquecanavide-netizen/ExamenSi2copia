# FRONTEND_CU_MAP.md — Mapa de Módulos Dashboard y Casos de Uso (Frontend Angular 19)

> **FashionStore SaaS Multitenant**  
> Directorio Centralizado de Módulos Visuales (`frontend/src/app/dashboard/`)  
> Estructura jerárquica por pantallas y subsistemas.

---

## 1. Directorio de Vistas en `dashboard/`

| Carpeta Dashboard | Caso de Uso Oficial | Rol / Actor | Componente Angular Principal | Ruta Activa |
|---|---|---|---|---|
| `planes-saas/` | CU01, CU02, CU03 (SaaS) | Superadmin / Admin | `SaasPageComponent` | `/saas` |
| `sucursales/` | CU04 (Sucursales y Ciudades) | Admin Tenant | `InventarioPageComponent` | `/inventario?tab=SUCURSALES` |
| `seguridad-login/` | CU05 (Autenticación Tenant) | Todos | `LoginPageComponent` | `/login` |
| `catalogo-prendas/` | CU06 (Prendas y Guía Medidas) | Admin / Vendedor | `GestionPrendasPageComponent` | `/catalogo/gestion` |
| `probador-vton/` | CU07 (Catálogo & Probador AR) | Cliente / Visitante | `CatalogoPageComponent` | `/catalogo` |
| `catalogo-offline/` | CU08 (Descarga Catálogo Offline) | Vendedor / Sistema | `CatalogoPageComponent` | `/catalogo` (Offline) |
| `difusion-campanas/` | CU09 (Difusión Omnicanal WhatsApp) | Encargado Marketing | `CatalogoDifusionPageComponent` | `/catalogo/difusion` |
| `inventario-stock/` | CU10, CU11 (Stock Multi-sucursal) | Encargado Sucursal | `InventarioPageComponent` | `/inventario?tab=STOCK` |
| `traspasos-tiendas/` | CU12, CU13 (Traspaso y Recepción) | Encargado Sucursal | `InventarioPageComponent` | `/inventario/transferencias` |
| `probadores-reservas/` | CU14 (Reserva Probador Boutique) | Cliente / Vendedor | `ReservasPageComponent` | `/reservas` |
| `punto-venta-pos/` | CU15 (Venta Presencial / Offline) | Cajero / Vendedor | `VentasPosPageComponent` | `/ventas` |
| `sincronizacion-offline/` | CU16 (Sincronización por Lotes) | Cajero / Sistema | `AppComponent` (Sync Pill) | `/api/v1/sincronizacion` |
| `checkout-ecommerce/` | CU17 (Carrito y Despachos Online) | Cliente Digital | `CheckoutEcommercePageComponent` | `/ventas/checkout` |
| `devoluciones-garantias/` | CU18, CU19, CU20 (Devoluciones) | Cliente / Cajero | `DevolucionesPageComponent` | `/ventas/devoluciones` |
| `reportes-ia/` | CU21, CU22 (Consultas IA y Export) | Admin Tenant | `AiReportAssistantComponent` | `/dashboard/ia-reportes` |
| `predicciones-ml/` | CU23, CU24 (Predicciones de Stock) | Superadmin / Admin | `MlDashboardComponent` | `/dashboard/machine-learning` |
| `trazabilidad-reservas/` | CU25 (Trazabilidad y QR Apartado) | Cliente / Cajero | `ReservaTrazabilidadPageComponent`| `/reservas/trazabilidad` |
| `usuarios/` | Gestión de Personal y Clientes | Admin Tenant | `UsuariosGestionPageComponent` | `/usuarios/gestion` |
| `roles/` | Control de Acceso RBAC | Admin Tenant | `RolesPageComponent` | `/usuarios/roles` |
| `bitacora/` | Bitácora de Auditoría del Sistema | Auditor / Admin | `AuditoriaPageComponent` | `/usuarios/auditoria` |

---

## 2. Re-exportaciones Rápidas
Cada carpeta de este directorio enlaza directamente con los componentes de `features/` permitiendo acceso inmediato y navegación instantánea.
