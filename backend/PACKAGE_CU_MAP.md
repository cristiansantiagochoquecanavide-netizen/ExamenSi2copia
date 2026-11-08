# PACKAGE_CU_MAP.md — Mapa de Subsistemas, Paquetes y Casos de Uso (CU01 - CU25)

> **FashionStore SaaS Multitenant**  
> Arquitectura por Subsistemas Modulares (MVC Modular Screaming Architecture)  
> Alineado 100% con el Documento Oficial Docente (MSc. Ing. Angélica Garzón Cuéllar - SI2)

---

## 1. Estructura General de Subsistemas en `backend/apps/`

```text
backend/apps/
├── GestionSaas/                 # Subsistema SaaS Multitenant y Planes Comerciales
│   ├── planes/                  # CU01: Planes de Suscripción
│   ├── empresas/                # CU02: Empresas Contratantes (Tenants)
│   └── suscripciones/           # CU03: Suscripción y Estado de Cuenta
│
├── GestionInventario/           # Subsistema de Stock, Sucursales y Logística
│   ├── sucursales/              # CU04: Sucursales y Ciudades con Límite de Cuota
│   ├── stock/                   # CU10 & CU11: Existencias y Consulta Multi-sucursal
│   ├── transferencias/          # CU12 & CU13: Traspasos y Confirmación en Destino
│   ├── kardex/                  # Kardex físico-valorado de movimientos
│   └── conflictos/              # CU17: Arbitraje de Discrepancias de Inventario
│
├── GestionCatalogo/             # Subsistema de Moda, Productos y Difusión
│   ├── prendas/                 # CU06: Catálogo de Prendas y Guía de Medidas
│   ├── vton/                    # CU07: Catálogo Multidimensional & Probador Virtual AR
│   ├── offline_sync/            # CU08: Volcado de Catálogo para Memoria Local
│   ├── difusion/                # CU09: Difusión de Novedades y Campañas Omnicanal
│   └── parametros/              # Tallas, Colores, Categorías, Temporadas
│
├── GestionReservas/             # Subsistema de Apartados y Atención en Boutiques
│   ├── probadores/              # CU14: Reserva de Prendas para Probador Físico
│   └── trazabilidad/            # CU25: Trazabilidad, Ciclo de Vida y Pase QR
│
├── GestionVentas/               # Subsistema Comercial, Facturación y Garantías
│   ├── pos/                     # CU15: Terminal Punto de Venta POS Presencial / Offline
│   ├── sincronizacion/          # CU16: Sincronización de Ventas Offline por Lotes
│   ├── checkout/                # CU17: Carrito Digital E-Commerce y Despachos
│   ├── devoluciones/            # CU18, CU19, CU20: Políticas, Solicitud y Nota Devolución
│   └── pagos/                   # Pasarelas de Pago y Monitoreo de Transacciones
│
├── ReportesIA/                  # Subsistema Analítico, IA Generativa y Machine Learning
│   ├── asistente_ia/            # CU21: Consultas por Lenguaje Natural (Texto/Voz Gemini)
│   ├── exportacion/             # CU22: Exportación Formal a PDF (Platypus) y Excel
│   └── predicciones_ml/         # CU23 & CU24: Entrenamiento Scikit-Learn y Dashboard Predictivo
│
├── UsuariosSeguridad/           # Subsistema de Autenticación, RBAC y Auditoría
│   ├── autenticacion/           # CU05: Login Multitenant, JWT y Contexto de Tenant
│   ├── usuarios/                # Gestión de Personal y Clientes
│   ├── roles/                   # Control de Acceso Basado en Roles (RBAC)
│   └── bitacora/                # Auditoría Inmutable de Eventos del Sistema
│
└── core/                        # Núcleo de Base de Datos, Configuración y Middleware
```

---

## 2. Matriz Detallada de Trazabilidad Código <-> Caso de Uso

| CU | Caso de Uso Oficial | Subsistema / Paquete | Modelo (M) | Controlador / Router (C) | Servicio / Lógica |
|---|---|---|---|---|---|
| **CU01** | Administrar Planes de Suscripción | `apps/GestionSaas/planes` | `PlanSuscripcion` | `routers.py` (`/planes`) | `PlanService` |
| **CU02** | Registrar Empresa Contratante (Tenant) | `apps/GestionSaas/empresas` | `Empresa` | `routers.py` (`/empresas`) | `EmpresaService` |
| **CU03** | Gestionar Suscripción y Estado de Cuenta | `apps/GestionSaas/suscripciones` | `Suscripcion` | `routers.py` (`/suscripciones/*`) | `SuscripcionService` |
| **CU04** | Administrar Sucursales con Control de Límites | `apps/GestionInventario/sucursales` | `Sucursal`, `Ciudad` | `routers.py` (`/sucursales`) | `SucursalService` |
| **CU05** | Autenticar Usuario y Establecer Contexto Tenant | `apps/UsuariosSeguridad/autenticacion` | `Usuario`, `TokenBlacklist`| `routers.py` (`/auth/login`) | `AuthService` |
| **CU06** | Administrar Catálogo de Prendas y Guía Medidas | `apps/GestionCatalogo/prendas` | `Prenda`, `GuiaMedida` | `routers.py` (`/prendas`) | `PrendaService` |
| **CU07** | Consultar y Filtrar Catálogo Multidimensional | `apps/GestionCatalogo/vton` | `PrendaVariante`, `Color` | `routers.py` (`/vton`) | `VtonService` |
| **CU08** | Descargar y Almacenar Catálogo Memoria Local | `apps/GestionCatalogo/offline_sync` | `PrendaSyncItem` | `routers.py` (`/sincronizar-local`) | `CatalogoSyncService` |
| **CU09** | Difundir Novedades de Catálogo a Clientes | `apps/GestionCatalogo/difusion` | `DifusionCatalogo` | `routers.py` (`/difundir`) | `DifusionCatalogoService`|
| **CU10** | Administrar Existencias Inventario Sucursal | `apps/GestionInventario/stock` | `InventarioStock` | `routers.py` (`/stock`) | `StockService` |
| **CU11** | Consultar Disponibilidad Multi-sucursal | `apps/GestionInventario/stock` | `InventarioStock` | `routers.py` (`/sucursales-stock`)| `StockService` |
| **CU12** | Solicitar y Despachar Traspaso de Inventario | `apps/GestionInventario/transferencias`| `TransferenciaStock` | `routers.py` (`/transferencias`) | `TransferenciaService` |
| **CU13** | Confirmar Recepción de Traspaso en Destino | `apps/GestionInventario/transferencias`| `TransferenciaStock` | `routers.py` (`/recepcionar`) | `TransferenciaService` |
| **CU14** | Registrar Reserva Offline para Ensayo Tienda | `apps/GestionReservas/probadores` | `Reserva`, `DetalleReserva`| `routers.py` (`/reservas`) | `ReservasService` |
| **CU15** | Registrar Venta de Contado Offline (POS) | `apps/GestionVentas/pos` | `Venta`, `DetalleVenta` | `routers.py` (`/ventas/pos`) | `VentasService` |
| **CU16** | Sincronizar Operaciones Comerciales Offline | `apps/GestionVentas/sincronizacion` | `OperacionOfflineSync` | `routers.py` (`/sincronizacion`) | `SincronizacionService`|
| **CU17** | Resolver Conflictos Consistencia Inventario | `apps/GestionInventario/conflictos` | `ConflictoInventario` | `routers.py` (`/conflictos`) | `StockService` |
| **CU18** | Configurar Políticas y Plazos Cambio Prenda | `apps/GestionVentas/devoluciones` | `PoliticaGarantia` | `routers.py` (`/politicas`) | `PoliticaGarantiaService`|
| **CU19** | Registrar Solicitud Cambio Prenda por Medida | `apps/GestionVentas/devoluciones` | `SolicitudCambio` | `routers.py` (`/cambios`) | `DevolucionesService` |
| **CU20** | Emitir Nota Devolución y Reingreso Inventario| `apps/GestionVentas/devoluciones` | `NotaDevolucion` | `routers.py` (`/devoluciones`) | `DevolucionesService` |
| **CU21** | Consultar Reportes por Lenguaje Natural (IA) | `apps/ReportesIA/asistente_ia` | `ReporteGenerativoIA` | `routers.py` (`/ia/consultar`) | `GeminiReportService` |
| **CU22** | Exportar Reportes Dinámicos IA (Excel / PDF)| `apps/ReportesIA/exportacion` | `ExportacionReporte` | `routers.py` (`/exportar/*`) | `ReportExportService` |
| **CU23** | Entrenar y Evaluar Modelos Machine Learning | `apps/ReportesIA/predicciones_ml` | `ModeloAnaliticoML` | `routers.py` (`/ml/entrenar/*`) | `MachineLearningService`|
| **CU24** | Visualizar Dashboard Analítico y Predicciones| `apps/ReportesIA/predicciones_ml` | `ProyeccionStockDetallada`| `routers.py` (`/ml/dashboard`) | `MachineLearningService`|
| **CU25** | Consultar Trazabilidad y Estado de Reservas | `apps/GestionReservas/trazabilidad` | `HitoTrazabilidad` | `routers.py` (`/trazabilidad`) | `ReservasService` |

---

## 3. Guía de Archivos por Paquete Modular
Cada subpaquete contiene su conjunto estricto de responsabilidades:
- `models.py`: Entidades mapeadas en PostgreSQL con SQLAlchemy.
- `schemas.py` / `serializers.py`: Contratos Pydantic de entrada, salida y validación de tipos.
- `services.py`: Reglas de negocio puras, transacciones atómicas y llamadas de auditoría.
- `routers.py` / `views.py` / `urls.py`: Endpoints REST expuestos con inyección de dependencias.
