# PACKAGE_CU_MAP.md — Mapa Canónico de Subsistemas, Módulos y Casos de Uso (CU01 - CU25)

> **FashionStore SaaS Multitenant**  
> Arquitectura Limpia por Dominios de Negocio (Domain-Driven Design + MVC Modular)  
> Alineado 100% con el Documento Oficial Docente (MSc. Ing. Angélica Garzón Cuéllar - SI2)

---

## 1. Estructura General de Subsistemas en `backend/app/domains/`

```text
backend/app/
├── core/                           # Configuración, Base de Datos, Seguridad, Tenant Middleware
│   ├── config.py
│   ├── database.py
│   ├── dependencies.py
│   ├── security.py
│   └── tenant.py
│
└── domains/                        # Subsistemas de Negocio Modular (DDD / MVC)
    ├── saas/                       # Subsistema SaaS Multitenant y Planes Comerciales
    │   ├── models.py               # CU01 (Planes), CU02 (Empresas), CU03 (Suscripciones)
    │   ├── routers.py              # Endpoints /planes, /empresas, /suscripciones
    │   ├── schemas.py              # Contratos Pydantic de Validación
    │   └── services.py             # Lógica transaccional multitenant
    │
    ├── inventario/                 # Subsistema de Stock, Sucursales y Logística
    │   ├── models.py               # CU04 (Sucursales), CU10 & CU11 (Stock), CU12 & CU13 (Traspasos), CU17 (Conflictos)
    │   ├── routers.py              # Endpoints /sucursales, /stock, /transferencias, /conflictos
    │   ├── schemas.py              # DTOs de inventario, stock multi-sucursal y traspasos
    │   └── services.py             # Kardex físico-valorado, resolución de discrepancias
    │
    ├── catalogo/                   # Subsistema de Moda, Productos y Difusión
    │   ├── models.py               # CU06 (Prendas/Medidas), CU07 (V-TON), CU08 (Sync), CU09 (Difusión)
    │   ├── routers.py              # Endpoints /prendas, /vton, /sincronizar-local, /difundir
    │   ├── schemas.py              # Filtros multidimensionales, guía de medidas, difusión
    │   └── services.py             # Procesamiento VTON, difusión omnicanal
    │
    ├── reservas/                   # Subsistema de Apartados y Atención en Boutiques
    │   ├── models.py               # CU14 (Reserva en Probador), CU25 (Trazabilidad y QR)
    │   ├── routers.py              # Endpoints /reservas, /trazabilidad
    │   ├── schemas.py              # Estados de reserva, hitos de trazabilidad
    │   └── services.py             # Ciclo de vida: preparada, lista para retiro, vencida
    │
    ├── ventas/                     # Subsistema Comercial, Facturación y Garantías
    │   ├── models.py               # CU15 (Venta POS), CU18, CU19, CU20 (Políticas, Cambios, Devoluciones)
    │   ├── routers.py              # Endpoints /ventas, /politicas, /cambios, /devoluciones
    │   ├── schemas.py              # DTOs de venta de contado, cálculo de garantías
    │   └── services.py             # Emisión de notas de devolución y reingreso a stock
    │
    ├── sincronizacion/             # Subsistema de Resiliencia Offline
    │   ├── models.py               # CU16 (Operaciones Comerciales Offline)
    │   ├── routers.py              # Endpoints /sincronizacion
    │   ├── schemas.py              # Lotes de sincronización offline
    │   └── services.py             # Motor de replay offline y detección de conflictos
    │
    ├── reportes/                   # Subsistema de Analítica y Reportería Dinámica
    │   ├── models.py               # CU22 (Exportación de Reportes)
    │   ├── routers.py              # Endpoints /reportes, /exportar/pdf, /exportar/excel
    │   ├── schemas.py              # Esquemas de agregación y filtros
    │   └── services.py             # Motores de renderizado PDF Platypus y OpenPyXL
    │
    ├── ia_asistente/               # Subsistema de IA Generativa
    │   ├── models.py               # CU21 (Consultas en Lenguaje Natural)
    │   ├── routers.py              # Endpoints /ia/consultar
    │   ├── schemas.py              # Prompts, transcripciones de voz
    │   └── services.py             # Integración Gemini con Function Calling
    │
    ├── analitica_ia/               # Subsistema de Machine Learning Predictivo
    │   ├── routers.py              # CU23 (Entrenamiento ML) y CU24 (Dashboard Predictivo)
    │   ├── schemas.py              # Métricas MAPE, R2, proyecciones de stock
    │   └── services.py             # Modelos RandomForest y Regresión Lineal
    │
    └── usuarios/                   # Subsistema de Autenticación, RBAC y Auditoría
        ├── models.py               # CU05 (Login/Tenant), Roles, Bitácora
        ├── routers.py              # Endpoints /auth/login, /usuarios, /roles, /bitacora
        ├── schemas.py              # Tokens JWT, permisos, perfiles
        └── services.py             # Seguridad PBKDF2 y log inmutable de auditoría
```

---

## 2. Matriz de Trazabilidad Código <-> Caso de Uso (CU01 - CU25)

| CU | Caso de Uso Oficial | Dominio Backend (`backend/app/domains/`) | Componente Frontend (`frontend/src/app/features/`) |
|---|---|---|---|
| **CU01** | Administrar Planes de Suscripción | `saas/models.py`, `saas/routers.py` | `saas/pages/saas-page.component.ts` |
| **CU02** | Registrar Empresa Contratante (Tenant) | `saas/models.py`, `saas/routers.py` | `saas/pages/saas-page.component.ts` |
| **CU03** | Gestionar Suscripción y Estado de Cuenta | `saas/models.py`, `saas/routers.py` | `saas/pages/saas-page.component.ts` |
| **CU04** | Administrar Sucursales con Control de Límites | `inventario/models.py`, `inventario/routers.py` | `inventario/pages/inventario-page.component.ts` |
| **CU05** | Autenticar Usuario y Establecer Contexto Tenant | `usuarios/models.py`, `usuarios/routers.py` | `usuarios/pages/login-page.component.ts` |
| **CU06** | Administrar Catálogo de Prendas y Guía Medidas | `catalogo/models.py`, `catalogo/routers.py` | `catalogo/pages/gestion-prendas-page.component.ts` |
| **CU07** | Consultar y Filtrar Catálogo Multidimensional / V-TON | `catalogo/models.py`, `catalogo/routers.py` | `catalogo/pages/catalogo-page.component.ts` |
| **CU08** | Descargar y Almacenar Catálogo Memoria Local | `catalogo/models.py`, `catalogo/routers.py` | `catalogo/pages/catalogo-page.component.ts` |
| **CU09** | Difundir Novedades de Catálogo a Clientes | `catalogo/models.py`, `catalogo/routers.py` | `catalogo/pages/catalogo-difusion-page.component.ts` |
| **CU10** | Administrar Existencias Inventario Sucursal | `inventario/models.py`, `inventario/routers.py` | `inventario/pages/inventario-page.component.ts` |
| **CU11** | Consultar Disponibilidad Multi-sucursal | `inventario/models.py`, `inventario/routers.py` | `inventario/pages/inventario-page.component.ts` |
| **CU12** | Solicitar y Despachar Traspaso de Inventario | `inventario/models.py`, `inventario/routers.py` | `inventario/pages/inventario-page.component.ts` |
| **CU13** | Confirmar Recepción de Traspaso en Destino | `inventario/models.py`, `inventario/routers.py` | `inventario/pages/inventario-page.component.ts` |
| **CU14** | Registrar Reserva Offline para Ensayo Tienda | `reservas/models.py`, `reservas/routers.py` | `reservas/pages/reservas-page.component.ts` |
| **CU15** | Registrar Venta de Contado Offline (POS) | `ventas/models.py`, `ventas/routers.py` | `ventas/pages/ventas-pos-page.component.ts` |
| **CU16** | Sincronizar Operaciones Comerciales Offline | `sincronizacion/models.py`, `sincronizacion/routers.py` | `ventas/pages/ventas-pos-page.component.ts` |
| **CU17** | Resolver Conflictos Consistencia Inventario | `inventario/models.py`, `inventario/routers.py` | `inventario/pages/inventario-page.component.ts` |
| **CU18** | Configurar Políticas y Plazos Cambio Prenda | `ventas/models.py`, `ventas/routers.py` | `ventas/pages/devoluciones-page.component.ts` |
| **CU19** | Registrar Solicitud Cambio Prenda por Medida | `ventas/models.py`, `ventas/routers.py` | `ventas/pages/devoluciones-page.component.ts` |
| **CU20** | Emitir Nota Devolución y Reingreso Inventario | `ventas/models.py`, `ventas/routers.py` | `ventas/pages/devoluciones-page.component.ts` |
| **CU21** | Consultar Reportes por Lenguaje Natural (IA) | `ia_asistente/models.py`, `ia_asistente/routers.py` | `reportes/pages/ai-report-assistant-page.component.ts`|
| **CU22** | Exportar Reportes Dinámicos IA (Excel / PDF) | `reportes/models.py`, `reportes/routers.py` | `reportes/pages/ai-report-assistant-page.component.ts`|
| **CU23** | Entrenar y Evaluar Modelos Machine Learning | `analitica_ia/services.py`, `analitica_ia/routers.py`| `reportes/pages/ml-dashboard-page.component.ts` |
| **CU24** | Visualizar Dashboard Analítico y Predicciones | `analitica_ia/services.py`, `analitica_ia/routers.py`| `reportes/pages/ml-dashboard-page.component.ts` |
| **CU25** | Consultar Trazabilidad y Estado de Reservas | `reservas/models.py`, `reservas/routers.py` | `reservas/pages/reserva-trazabilidad-page.component.ts`|

---

## 3. Banners Explícitos en el Código Fuente
Cada capa del proyecto incluye los comentarios oficiales para localización inmediata:
- **Modelos**: `# CUxx: [MODELO] NombreEntidad`
- **Controladores / Routers**: `# CUxx: [CONTROLADOR] NombreEndpoint`
- **Servicios / Reglas de Negocio**: `# CUxx: [SERVICIO] NombreLogica`
- **Vistas / Componentes**: `<!-- CUxx: [VISTA] Componente -->` y `// CUxx: [CONTROLADOR DE VISTA]`
