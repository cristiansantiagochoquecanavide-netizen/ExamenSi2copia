# Contratos de API REST - Presentación 1 (FashionStore SaaS)

Todos los endpoints tienen prefijo `/api/v1`. Las peticiones protegidas requieren el encabezado:
`Authorization: Bearer <token_jwt>`

---

## 1. Módulo SaaS y Planes de Suscripción

### `GET /api/v1/planes`
- **Descripción**: Lista los planes de suscripción disponibles.
- **Acceso**: Público / Autenticado.
- **Respuesta 200 OK**:
```json
[
  {
    "id": 1,
    "codigo": "BASICO",
    "nombre": "Plan Básico Emprendedor",
    "precio_mensual": 29.99,
    "limite_sucursales": 2,
    "permite_ia": false,
    "permite_offline": false
  },
  {
    "id": 2,
    "codigo": "INTERMEDIO",
    "nombre": "Plan Profesional Multitienda",
    "precio_mensual": 79.99,
    "limite_sucursales": 10,
    "permite_ia": true,
    "permite_offline": true
  }
]
```

### `POST /api/v1/empresas`
- **Descripción**: Registra una nueva empresa (Tenant) con su suscripción inicial.
- **Acceso**: Superadmin SaaS.
- **Request Body**:
```json
{
  "razon_social": "Modas Paris S.A.",
  "nit": "8472910291",
  "subdominio": "modasparis",
  "email_corporativo": "admin@modasparis.com",
  "telefono": "+591-76543210",
  "direccion_fiscal": "Calle Bolívar #230",
  "plan_id": 2,
  "admin_password": "Password123!"
}
```
- **Respuesta 201 Created**:
```json
{
  "id": 3,
  "razon_social": "Modas Paris S.A.",
  "nit": "8472910291",
  "subdominio": "modasparis",
  "activo": true,
  "suscripcion": {
    "plan": "INTERMEDIO",
    "estado": "ACTIVA",
    "fecha_inicio": "2026-10-27",
    "fecha_fin": "2027-10-27"
  }
}
```

---

## 2. Módulo de Sucursales con Control de Límites

### `GET /api/v1/sucursales`
- **Descripción**: Lista las sucursales pertenecientes exclusivamente al tenant autenticado.
- **Acceso**: Admin Tenant / Vendedor / Cajero.
- **Respuesta 200 OK**:
```json
[
  {
    "id": 1,
    "nombre": "Sucursal Central Equipetrol",
    "ciudad": "Santa Cruz",
    "direccion": "Av. San Martín #450",
    "telefono": "+591-3-3344556",
    "activo": true
  }
]
```

### `POST /api/v1/sucursales`
- **Descripción**: Crea una nueva sucursal si el tenant no ha superado la cuota de su plan.
- **Acceso**: Admin Tenant.
- **Request Body**:
```json
{
  "nombre": "Sucursal Norte Mall",
  "ciudad": "Santa Cruz",
  "direccion": "Av. Banzer Km 8",
  "telefono": "+591-3-3388990"
}
```
- **Respuesta 201 Created**: Sucursal creada con éxito.
- **Respuesta 400 Bad Request** (Límite alcanzado):
```json
{
  "detail": "Límite de sucursales alcanzado. Su plan 'BASICO' permite un máximo de 2 sucursales. Actualice a un plan superior para continuar creciendo."
}
```

---

## 3. Módulo de Catálogo y Guía Anatómica de Medidas

### `GET /api/v1/productos/{id}/guia-medidas`
- **Descripción**: Obtiene la tabla dimensional en centímetros de una prenda para cada talla.
- **Acceso**: Público / Autenticado.
- **Respuesta 200 OK**:
```json
{
  "producto_id": 15,
  "nombre": "Vestido de Gala Seda Elegance",
  "tallas": [
    {
      "talla": "S",
      "pecho_cm": 88.0,
      "cintura_cm": 66.0,
      "cadera_cm": 94.0,
      "largo_cm": 140.0,
      "manga_cm": 58.0,
      "observacion_calce": "Corte entallado al busto"
    },
    {
      "talla": "M",
      "pecho_cm": 92.0,
      "cintura_cm": 70.0,
      "cadera_cm": 98.0,
      "largo_cm": 142.0,
      "manga_cm": 59.0,
      "observacion_calce": "Corte regular ajustado"
    }
  ]
}
```

### `POST /api/v1/productos/{id}/guia-medidas`
- **Descripción**: Registra o actualiza las dimensiones anatómicas de una prenda para una talla.
- **Acceso**: Encargado de Catálogo / Admin Tenant.
- **Request Body**:
```json
{
  "talla_id": 2,
  "pecho_cm": 92.5,
  "cintura_cm": 71.0,
  "cadera_cm": 99.0,
  "largo_cm": 142.0,
  "manga_cm": 59.0,
  "observacion_calce": "Tejido semi-elástico con caída suave"
}
```

---

## 4. Módulo de Políticas de Garantía y Devolución

### `GET /api/v1/politica-garantia`
- **Descripción**: Obtiene la política de cambio vigente de la empresa autenticada.
- **Acceso**: Autenticado.
- **Respuesta 200 OK**:
```json
{
  "empresa_id": 1,
  "plazo_dias_cambio": 7,
  "permite_cambio_talla": true,
  "admite_reembolso_dinero": false,
  "requiere_etiqueta_original": true
}
```

### `PUT /api/v1/politica-garantia`
- **Descripción**: Modifica los días de tolerancia de cambio de prenda (ej. 7 días / 48 hrs / 24 hrs).
- **Acceso**: Admin Tenant.
- **Request Body**:
```json
{
  "plazo_dias_cambio": 5,
  "requiere_etiqueta_original": true
}
```
- **Nota**: El campo `admite_reembolso_dinero` permanece inmutable en `false` cumpliendo la regla de negocio RN07 fijada por la cátedra.
