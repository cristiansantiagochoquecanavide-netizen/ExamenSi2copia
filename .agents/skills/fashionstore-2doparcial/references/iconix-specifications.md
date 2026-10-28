# Especificaciones de Modelado ICONIX y UML 2.5+ (2do Parcial)

## 1. La Metodología ICONIX en FashionStore SaaS

ICONIX es un proceso ágil dirigido por casos de uso que cubre la brecha entre el análisis de requisitos y el código ejecutable mediante la regla del 80/20 de UML (utilizando solo el 20% de los artefactos de UML que proporcionan el 80% del valor práctico).

### Fases del Ciclo de Vida ICONIX:
1. **Análisis de Requisitos**: Identificación de actores, catálogo de casos de uso y modelo conceptual de dominio inicial.
2. **Análisis y Diseño Preliminar (Robustez)**: Construcción de diagramas de robustez aplicando el patrón BCE (**Boundary** [Vista/Interfaz], **Control** [Lógica de negocio/Casos de uso], **Entity** [Entidades de persistencia]).
3. **Diseño Crítico**: Elaboración de diagramas de secuencia detallados (asignación de métodos a clases) y diagramas de clases UML completos con atributos y relaciones.
4. **Implementación y Pruebas**: Codificación directa basada en el diseño de clases y ejecución de pruebas funcionales y de consistencia.

---

## 2. Catálogo General de Casos de Uso (2do Parcial)

| ID | Caso de Uso | Actor Principal | Canal | Paquete / Módulo ICONIX |
| :--- | :--- | :--- | :--- | :--- |
| **CU01** | Administrar Planes de Suscripción | Superadmin SaaS | Web | SaaS Multitenant (P1) |
| **CU02** | Registrar Empresa Contratante (Tenant) | Superadmin SaaS | Web | SaaS Multitenant (P1) |
| **CU03** | Gestionar Suscripción y Estado de Cuenta | Admin Tenant | Web / Móvil | SaaS Multitenant (P1) |
| **CU04** | Administrar Sucursales con Control de Límites | Admin Tenant | Web | Sucursales y Seguridad (P1) |
| **CU05** | Autenticar Usuario y Establecer Contexto de Tenant | Usuario / Admin | Web / Móvil | Seguridad y Acceso (P1) |
| **CU06** | Administrar Catálogo y Guía de Medidas | Encargado Catálogo | Web | Catálogo y Calce (P1) |
| **CU07** | Consultar y Filtrar Catálogo Multidimensional | Cliente / Vendedor | Web / Móvil | Catálogo y Calce (P1/P2) |
| **CU08** | Descargar y Almacenar Catálogo en Memoria Local | Vendedor / Sistema | Web / Móvil | Operación Offline (P2) |
| **CU09** | Difundir Novedades de Catálogo a Clientes | Marketing | Web | Catálogo Comercial (P2) |
| **CU10** | Administrar Existencias de Inventario por Sucursal | Jefe Almacén | Web | Logística e Inventario (P1/P2) |
| **CU11** | Consultar Disponibilidad de Inventario Multi-sucursal | Vendedor / Cliente | Web / Móvil | Logística e Inventario (P2) |
| **CU12** | Solicitar y Despachar Traspaso de Inventario | Encargado Origen | Web | Traspasos Multi-sucursal (P2) |
| **CU13** | Confirmar Recepción de Traspaso en Destino | Encargado Destino | Web | Traspasos Multi-sucursal (P2) |
| **CU14** | Registrar Reserva Offline para Ensayo en Tienda | Cliente / Vendedor | Web / Móvil | Operación Offline (P2) |
| **CU15** | Registrar Venta de Contado Offline | Cajero / Vendedor | Web / Móvil | Operación Offline (P2) |
| **CU16** | Sincronizar Operaciones Comerciales Offline | Sistema / Cajero | Web / Móvil | Sincronización e Idempotencia (P2) |
| **CU17** | Resolver Conflictos de Consistencia de Inventario | Admin Sucursal | Web / Móvil | Sincronización e Idempotencia (P2) |
| **CU18** | Configurar Políticas y Plazos de Cambio de Prenda | Admin Tenant | Web | Garantías y Devoluciones (P1) |
| **CU19** | Registrar Solicitud de Cambio de Prenda por Medida | Cliente / Cajero | Web / Móvil | Garantías y Devoluciones (P2) |
| **CU20** | Emitir Nota de Devolución y Reingreso a Inventario | Cajero | Web | Garantías y Devoluciones (P2) |
| **CU21** | Consultar Reportes por Lenguaje Natural (Texto/Voz) | Admin / Gerente | Web / Móvil | IA Generativa y Reportes (P3) |
| **CU22** | Exportar Reportes Dinámicos de IA (Excel/PDF) | Admin Tenant | Web | IA Generativa y Reportes (P3) |
| **CU23** | Entrenar y Evaluar Modelos de Machine Learning | Sistema / Admin | Web | Analítica Inteligente ML (P3) |
| **CU24** | Visualizar Dashboard Analítico y Predicciones de Stock | Admin Tenant | Web | Analítica Inteligente ML (P3) |
| **CU25** | Consultar Trazabilidad y Estado de Reservas | Cliente | Web / Móvil | Comercial y Fidelización (P2) |

---

## 3. Especificación Detallada de Casos de Uso Críticos (Presentación 1)

### CU01: Administrar Planes de Suscripción
- **Actor Principal**: Superadministrador SaaS.
- **Precondiciones**: Usuario autenticado con rol global de Superadmin.
- **Flujo Principal**:
  1. El actor accede al panel de configuración de planes de suscripción.
  2. El sistema recupera y muestra los planes existentes (`BASICO`, `INTERMEDIO`, `VIP`).
  3. El actor selecciona crear o modificar un plan, parametrizando: nombre, precio mensual, cuota máxima de sucursales permitidas (ej. 2 para Básico, 10 para Profesional), bandera de acceso a IA Generativa (`permite_ia`) y bandera de acceso offline (`permite_offline`).
  4. El sistema valida que el precio sea `>= 0` y que el límite de sucursales sea coherente.
  5. El sistema persiste el registro en `plan_suscripcion` y emite confirmación visual.
- **Flujo Alternativo**:
  - 4a. Datos inválidos o código de plan duplicado: El sistema notifica el error y rechaza el guardado.

### CU02: Registrar Empresa Contratante (Tenant)
- **Actor Principal**: Superadministrador SaaS.
- **Precondiciones**: Superadmin autenticado; plan de suscripción previamente creado.
- **Flujo Principal**:
  1. El actor solicita el alta de una nueva empresa en el formulario de tenants.
  2. Se capturan los datos: Razón Social, NIT único, subdominio web (ej. `elegance`), correo corporativo y teléfono.
  3. El sistema valida la unicidad del NIT y del subdominio en PostgreSQL.
  4. El actor asigna el plan contratado inicial y la vigencia (fecha de inicio y vencimiento).
  5. El sistema crea atómicamente el registro en `empresa`, genera el registro en `suscripcion` y aprovisiona las credenciales del usuario Administrador del nuevo tenant.
  6. El sistema crea las políticas de garantía iniciales por defecto (7 días, cambio de talla admitido, sin devolución monetaria).

### CU04: Administrar Sucursales con Control de Límites
- **Actor Principal**: Administrador del Tenant.
- **Precondiciones**: Tenant autenticado con suscripción en estado `ACTIVA`.
- **Flujo Principal**:
  1. El administrador ingresa al módulo de gestión de sucursales.
  2. El sistema consulta la cuota permitida en el plan contratado (`plan_suscripcion.limite_sucursales`) y el conteo de sucursales activas existentes (`COUNT(*) FROM sucursal WHERE empresa_id = :tenant AND activo = TRUE`).
  3. Si el total actual es menor al límite:
     a. El sistema habilita el formulario de creación.
     b. El usuario registra nombre, dirección, teléfono y ciudad de la nueva sucursal.
     c. El sistema almacena la sucursal asociándola a `empresa_id`.
  4. Si el total actual es igual o mayor al límite:
     a. El sistema bloquea el formulario e informa que se ha alcanzado la cuota máxima permitida (ej. 2 sucursales para Plan Básico).
     b. Ofrece un enlace para actualizar de plan (upgrade a Intermedio/VIP).

### CU05: Autenticar Usuario y Establecer Contexto de Tenant
- **Actor Principal**: Cualquier usuario corporativo (Admin, Cajero, Vendedor).
- **Precondiciones**: Usuario activo registrado en el sistema.
- **Flujo Principal**:
  1. El usuario suministra correo/nombre de usuario, contraseña y subdominio empresarial (o se infiere del encabezado HTTP).
  2. El sistema valida las credenciales y verifica que la empresa del usuario tenga una suscripción no vencida.
  3. El sistema emite un token JWT firmado conteniendo los claims: `user_id`, `empresa_id`, `sucursal_id`, `rol`, y `plan_codigo`.
  4. Todas las llamadas posteriores inyectan este contexto, asegurando aislamiento total de datos en base de datos.

### CU06: Administrar Catálogo y Guía de Medidas Anatómicas
- **Actor Principal**: Encargado de Catálogo de la Empresa.
- **Precondiciones**: Sesión iniciada con permisos de catálogo.
- **Flujo Principal**:
  1. El usuario selecciona una prenda textil del catálogo.
  2. Para cada variante de talla disponible (ej. XS, S, M, L, XL), el usuario introduce las medidas corporales en centímetros:
     - Pecho (cm), Cintura (cm), Cadera (cm), Largo total (cm), Largo de manga (cm).
     - Observación de calce (ej. "Corte ceñido", "Tejido elástico holgado").
  3. El sistema valida que los valores métricos sean numéricos positivos coherentes.
  4. El sistema guarda la tupla en `guia_medida` vinculada a la prenda y talla.
  5. En el catálogo público (Web/Móvil), los compradores visualizan la tabla de medidas para prevenir errores de selección.

### CU18: Configurar Políticas y Plazos de Cambio de Prenda
- **Actor Principal**: Administrador del Tenant.
- **Precondiciones**: Tenant autenticado.
- **Flujo Principal**:
  1. El administrador ingresa a configuración de postventa y garantías.
  2. Configura los parámetros de su negocio:
     - Plazo límite para solicitar cambio: parametrizable en días (ej. 7 días, 48 horas).
     - Prohibición estricta de reembolso de dinero en efectivo (fijado en `admite_reembolso_dinero = FALSE` según regla RN07).
     - Requisito de entrega con etiqueta original.
  3. El sistema almacena la política en `politica_garantia` ligada exclusivamente al `empresa_id`.

---

## 4. Reglas de Robustez (Análisis BCE)

Para construir los diagramas de robustez en ICONIX se aplican las 4 reglas fundamentales:
1. **Los Actores solo pueden comunicarse con objetos Boundary** (pantallas, vistas, páginas).
2. **Los objetos Boundary solo pueden comunicarse con Controllers** (controladores lógicos de caso de uso) y con Actores.
3. **Los Controllers pueden comunicarse entre sí, con Boundaries y con Entities**.
4. **Las Entities (entidades de base de datos) no pueden comunicarse con Boundaries directamente**, siempre lo hacen a través de un Controller.
