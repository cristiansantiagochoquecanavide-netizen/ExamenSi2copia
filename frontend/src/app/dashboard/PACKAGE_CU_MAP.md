# PACKAGE_CU_MAP.md — Mapa Oficial de Arquitectura Modular por Subsistemas y Casos de Uso (CU01 - CU25)

> **FashionStore SaaS Multitenant**  
> Arquitectura Modular MVC por Subsistemas (`backend/apps/` y `frontend/src/app/dashboard/`)  
> Documento Oficial para Defensa Académica (MSc. Ing. Angélica Garzón Cuéllar - SI2)

---

## 1. Estructura Canónica de Backend (`backend/apps/`)

```text
backend/
├── apps/
│   ├── core/                           # Núcleo: Config, Base de Datos PostgreSQL, Seguridad PBKDF2 y Tenant
│   ├── asistente/                      # IA Generativa y Chatbot Multimodal (CU21)
│   ├── bitacora/                       # Auditoría Inmutable del Sistema (CU05)
│   │
│   ├── GestionSaas/                    # Subsistema SaaS Multitenant y Planes Comerciales
│   │   ├── planes/                     # CU01: Administrar Planes de Suscripción
│   │   ├── empresas/                   # CU02: Registrar Empresa Contratante (Tenant)
│   │   ├── suscripciones/              # CU03: Gestionar Suscripción y Estado de Cuenta
│   │   ├── models.py                   # Entidades SQLAlchemy con aislamiento tenant_id
│   │   ├── schemas.py / serializers.py # Contratos de validación de entrada/salida
│   │   ├── services.py                 # Reglas de negocio transaccionales
│   │   └── routers.py / views.py       # Endpoints REST expuestos
│   │
│   ├── GestionInventario/              # Subsistema de Stock, Sucursales y Logística
│   │   ├── sucursales/                 # CU04: Sucursales con Control de Límites
│   │   ├── stock/                      # CU10 & CU11: Existencias y Consulta Multi-sucursal
│   │   ├── transferencias/             # CU12 & CU13: Traspasos y Recepción en Destino
│   │   ├── kardex/                     # Kardex físico-valorado de movimientos
│   │   ├── conflictos/                 # CU17: Arbitraje de Discrepancias de Inventario
│   │   ├── models.py                   # Sucursal, InventarioStock, TransferenciaStock, Conflicto
│   │   ├── schemas.py / serializers.py # DTOs de inventario y traspasos
│   │   ├── services.py                 # Reglas de inventario, stock multi-sucursal y kardex
│   │   └── routers.py / views.py       # Endpoints /sucursales, /stock, /transferencias
│   │
│   ├── GestionCatalogo/                # Subsistema de Moda, Productos y Difusión
│   │   ├── prendas/                    # CU06: Catálogo de Prendas y Guía de Medidas
│   │   ├── vton/                       # CU07: Catálogo Multidimensional & Probador Virtual AR
│   │   ├── offline_sync/               # CU08: Descarga y Almacenamiento Local de Catálogo
│   │   ├── difusion/                   # CU09: Difusión de Novedades por WhatsApp / Email
│   │   ├── parametros/                 # Categorías, Tallas, Colores y Temporadas
│   │   ├── models.py                   # Prenda, PrendaVariante, GuiaMedida, DifusionCatalogo
│   │   ├── schemas.py / serializers.py # Filtros multidimensionales y contratos de difusión
│   │   ├── services.py                 # Procesamiento VTON, difusión omnicanal
│   │   └── routers.py / views.py       # Endpoints /prendas, /vton, /difundir
│   │
│   ├── GestionReservas/                # Subsistema de Apartados y Atención en Boutiques
│   │   ├── probadores/                 # CU14: Reserva Offline para Ensayo en Tienda
│   │   ├── trazabilidad/               # CU25: Trazabilidad, Estados (preparada, lista, vencida) y QR
│   │   ├── models.py                   # Reserva, DetalleReserva, HitoTrazabilidad
│   │   ├── schemas.py / serializers.py # Esquemas de reserva y trazabilidad
│   │   ├── services.py                 # Máquina de estados de reservas y timeouts de apartado
│   │   └── routers.py / views.py       # Endpoints /reservas, /trazabilidad
│   │
│   ├── GestionVentas/                  # Subsistema Comercial, POS, Sincronización y Devoluciones
│   │   ├── pos/                        # CU15: Registro de Venta de Contado Offline / POS
│   │   ├── sincronizacion/             # CU16: Sincronización de Operaciones Comerciales Offline
│   │   ├── checkout/                   # Carrito Digital E-Commerce y Despachos
│   │   ├── devoluciones/               # CU18, CU19, CU20: Políticas, Solicitud Cambio, Nota Devolución
│   │   ├── pagos/                      # Monitoreo de Transacciones y Medios de Pago
│   │   ├── models.py                   # Venta, DetalleVenta, PoliticaGarantia, SolicitudCambio, NotaDevolucion
│   │   ├── schemas.py / serializers.py # DTOs de venta de contado y garantías
│   │   ├── services.py                 # Emisión de notas de devolución y reingreso a stock
│   │   └── routers.py / views.py       # Endpoints /ventas, /devoluciones, /politicas
│   │
│   ├── ReportesIA/                     # Subsistema Analítico, IA Generativa y Machine Learning
│   │   ├── asistente_ia/               # CU21: Consultas por Lenguaje Natural Texto/Voz (Groq)
│   │   ├── exportacion/                # CU22: Exportación Dinámica a PDF (Platypus) y Excel (OpenPyXL)
│   │   ├── predicciones_ml/            # CU23 & CU24: Modelos ML y Dashboard Predictivo de Quiebres
│   │   ├── models.py                   # Modelos analíticos, checkpoints de entrenamiento
│   │   ├── schemas.py / serializers.py # Métricas MAPE, R2, proyecciones de stock
│   │   ├── services.py                 # Motores RandomForest, exportación y LLM
│   │   └── routers.py / views.py       # Endpoints /ia/consultar, /ml/dashboard, /exportar
│   │
│   └── UsuariosSeguridad/              # Subsistema de Autenticación, RBAC y Auditoría
│       ├── autenticacion/              # CU05: Autenticar Usuario y Establecer Contexto de Tenant
│       ├── usuarios/                   # Gestión de Personal y Clientes
│       ├── roles/                      # Control de Acceso Basado en Roles (RBAC)
│       ├── bitacora/                   # Auditoría Inmutable de Eventos
│       ├── models.py                   # Usuario, Rol, Permiso, BitacoraAuditoria, TokenBlacklist
│       ├── schemas.py / serializers.py # Contratos de token JWT, roles y perfiles
│       ├── services.py                 # Hashing de contraseñas y registro de bitácora
│       └── routers.py / views.py       # Endpoints /auth/login, /usuarios, /roles, /bitacora
│
├── static/                             # Archivos estáticos de catálogo y V-TON
└── main.py                             # Punto de entrada FastAPI con registro modular de apps/
```

---

## 2. Estructura Canónica de Frontend (`frontend/src/app/dashboard/`)

```text
frontend/src/app/
├── core/                               # Servicios compartidos (AuthService, ToastService, HttpInterceptor)
├── landing-page/                       # Landing promocional institucional
├── catalog-page/                       # Catálogo público e-commerce para visitantes
├── environments/                       # Variables de entorno (API URL, Tenant Context)
│
└── dashboard/                          # MÓDULOS DE APLICACIÓN Y CASOS DE USO
    ├── planes-saas/                    # CU01, CU02, CU03: Administración SaaS y Planes
    ├── sucursales/                     # CU04: Sucursales y Límite de Cuota
    ├── seguridad-login/                # CU05: Login Multitenant y Control de Sesión
    ├── catalogo-prendas/               # CU06: Catálogo de Prendas y Medidas
    ├── probador-vton/                  # CU07: Catálogo Multidimensional y Probador Virtual
    ├── catalogo-offline/               # CU08: Almacenamiento Local de Catálogo
    ├── difusion-campanas/              # CU09: Difusión de Novedades Omnicanal
    ├── inventario-stock/               # CU10 & CU11: Existencias Multi-sucursal
    ├── traspasos-tiendas/              # CU12 & CU13: Traspasos y Recepción en Destino
    ├── probadores-reservas/            # CU14: Reservas Offline para Probadores
    ├── punto-venta-pos/                # CU15: Terminal POS Presencial Offline
    ├── sincronizacion-offline/         # CU16: Sincronización de Ventas Offline
    ├── devoluciones-garantias/         # CU18, CU19, CU20: Políticas, Cambios y Notas de Devolución
    ├── checkout-ecommerce/             # Carrito y Checkout de Compras
    ├── reportes-ia/                    # CU21: Consultas por Lenguaje Natural & CU22: Exportación
    ├── predicciones-ml/                # CU23 & CU24: Modelos ML y Dashboard Predictivo
    ├── trazabilidad-reservas/          # CU25: Trazabilidad y Estado de Reservas
    ├── usuarios/                       # Gestión de Usuarios
    ├── roles/                          # Control de Permisos y Roles
    └── bitacora/                       # Auditoría Inmutable de Acciones
```

---

## 3. Matriz de Trazabilidad Código <-> Caso de Uso (CU01 - CU25)

| CU | Caso de Uso Oficial | Backend (`backend/apps/`) | Frontend (`src/app/dashboard/`) |
|---|---|---|---|
| **CU01** | Administrar Planes de Suscripción | `GestionSaas/planes` | `planes-saas` |
| **CU02** | Registrar Empresa Contratante (Tenant) | `GestionSaas/empresas` | `planes-saas` |
| **CU03** | Gestionar Suscripción y Estado de Cuenta | `GestionSaas/suscripciones` | `planes-saas` |
| **CU04** | Administrar Sucursales con Control de Límites | `GestionInventario/sucursales` | `sucursales` |
| **CU05** | Autenticar Usuario y Establecer Contexto Tenant | `UsuariosSeguridad/autenticacion` | `seguridad-login` |
| **CU06** | Administrar Catálogo de Prendas y Guía Medidas | `GestionCatalogo/prendas` | `catalogo-prendas` |
| **CU07** | Consultar y Filtrar Catálogo Multidimensional / V-TON | `GestionCatalogo/vton` | `probador-vton` |
| **CU08** | Descargar y Almacenar Catálogo Memoria Local | `GestionCatalogo/offline_sync` | `catalogo-offline` |
| **CU09** | Difundir Novedades de Catálogo a Clientes | `GestionCatalogo/difusion` | `difusion-campanas` |
| **CU10** | Administrar Existencias Inventario Sucursal | `GestionInventario/stock` | `inventario-stock` |
| **CU11** | Consultar Disponibilidad Multi-sucursal | `GestionInventario/stock` | `inventario-stock` |
| **CU12** | Solicitar y Despachar Traspaso de Inventario | `GestionInventario/transferencias` | `traspasos-tiendas` |
| **CU13** | Confirmar Recepción de Traspaso en Destino | `GestionInventario/transferencias` | `traspasos-tiendas` |
| **CU14** | Registrar Reserva Offline para Ensayo Tienda | `GestionReservas/probadores` | `probadores-reservas` |
| **CU15** | Registrar Venta de Contado Offline (POS) | `GestionVentas/pos` | `punto-venta-pos` |
| **CU16** | Sincronizar Operaciones Comerciales Offline | `GestionVentas/sincronizacion` | `sincronizacion-offline` |
| **CU17** | Resolver Conflictos Consistencia Inventario | `GestionInventario/conflictos` | `inventario-stock` |
| **CU18** | Configurar Políticas y Plazos Cambio Prenda | `GestionVentas/devoluciones` | `devoluciones-garantias` |
| **CU19** | Registrar Solicitud Cambio Prenda por Medida | `GestionVentas/devoluciones` | `devoluciones-garantias` |
| **CU20** | Emitir Nota Devolución y Reingreso Inventario | `GestionVentas/devoluciones` | `devoluciones-garantias` |
| **CU21** | Consultar Reportes por Lenguaje Natural (IA) | `ReportesIA/asistente_ia` & `asistente` | `reportes-ia` |
| **CU22** | Exportar Reportes Dinámicos IA (Excel / PDF) | `ReportesIA/exportacion` | `reportes-ia` |
| **CU23** | Entrenar y Evaluar Modelos Machine Learning | `ReportesIA/predicciones_ml` | `predicciones-ml` |
| **CU24** | Visualizar Dashboard Analítico y Predicciones | `ReportesIA/predicciones_ml` | `predicciones-ml` |
| **CU25** | Consultar Trazabilidad y Estado de Reservas | `GestionReservas/trazabilidad` | `trazabilidad-reservas` |

---

## 4. Banners de Código Presentes en Todo el Repositorio
- `# CUxx: [MODELO] NombreEntidad`
- `# CUxx: [CONTROLADOR] NombreEndpoint`
- `# CUxx: [SERVICIO] NombreLogica`
- `<!-- CUxx: [VISTA] Componente -->`
- `// CUxx: [CONTROLADOR DE VISTA]`
