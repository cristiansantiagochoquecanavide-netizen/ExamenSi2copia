# Cronograma y Alcance por Presentación - 2do Parcial

Materia: **Sistemas de Información 2 (INF-412)**  
Docente: **MSc. Ing. Angélica Garzón Cuéllar**  
Modalidad: **Evolución Arquitectónica SaaS + ICONIX**  

---

## PRESENTACIÓN 1: DOMINGO 25/10/2026
### "Fundamentos Arquitectónicos SaaS Multitenant, Aislamiento de Datos y Modelado ICONIX"

### 🎯 Objetivo Principal:
Establecer la infraestructura de Software as a Service (SaaS Multitenant) sobre PostgreSQL, garantizando el aislamiento lógico absoluto de las empresas, la administración de planes y cuotas, el catálogo enriquecido con guías anatómicas en centímetros, y el modelado formal ICONIX en Enterprise Architect.

### 📋 Entregables y Checklist de Verificación:
- [x] **Documentación Técnica ICONIX**: Capítulos I (Aspectos Generales), II (Análisis de Requisitos) y III (Análisis y Diseño Preliminar) elaborados bajo norma APA 7.
- [x] **Catálogo de Casos de Uso**: Especificación de los 25 Casos de Uso organizados en paquetes temáticos.
- [x] **Modelo de Dominio & Clases UML**: Proyecto `diagramas_2doparcial.eap` con las 40 clases base del 1er Parcial y las 9 nuevas clases del 2do Parcial (`PlanSuscripcion`, `Empresa`, `Suscripcion`, `GuiaMedida`, `PoliticaGarantia`, `SincronizacionOffline`, `ConflictoInventario`, `ReporteGenerativoIA`, `ModeloAnaliticoML`).
- [x] **Base de Datos Multitenant en PostgreSQL**: DDL ejecutado con columnas discriminadoras `empresa_id` en tablas operativas y tablas SaaS creadas.
- [x] **Tenants de Prueba**: Existencia verificable de 2 empresas independientes:
  - **Empresa A (Elegance Boutique)**: Plan Intermedio / Profesional (hasta 10 sucursales, IA habilitada, Offline habilitado).
  - **Empresa B (Urban Style Trend)**: Plan Básico (hasta 2 sucursales, IA deshabilitada, Offline deshabilitado).
- [x] **Backend FastAPI**: Middleware de aislamiento multitenant activo, control estricto de límites de sucursales por plan, y endpoints de autenticación con contexto.
- [x] **Guía Anatómica de Medidas**: Registro y consulta de medidas en centímetros (`pecho_cm`, `cintura_cm`, `cadera_cm`, etc.) por talla.
- [x] **Políticas de Garantía**: Parámetro de días de cambio configurable y bloqueo estricto de reembolso de dinero en efectivo.

---

## PRESENTACIÓN 2: DOMINGO 01/11/2026
### "Operaciones Offline (PWA / Flutter SQLite), Idempotencia, Sincronización y Logística de Inventario"

### 🎯 Objetivo Principal:
Implementar la resiliencia operativa ante pérdida de conectividad en tiendas físicas y virtuales, el protocolo de sincronización asíncrona e idempotente con UUIDv4, el circuito formal de notas de devolución por cambio de talla y los traspasos entre sucursales en dos fases.

### 📋 Entregables y Checklist de Verificación:
- [ ] **PWA Angular**: Service Worker configurado con caché de recursos estáticos y almacenamiento de catálogo en IndexedDB.
- [ ] **App Móvil Flutter**: Base de datos local SQLite (`sqflite`) para navegación desconectada y persistencia de transacciones.
- [ ] **Ventas de Contado Offline**: Registro local sin conexión generando UUID único.
- [ ] **Reservas Offline para Ensayo en Tienda**: Apartado de prendas sin pago previo para probador físico en ausencia de internet.
- [ ] **Protocolo de Sincronización Backend**: Reenvío idempotente que evita duplicar movimientos de stock al haber reconexión.
- [ ] **Resolución de Conflictos de Stock**: Tabla `conflicto_inventario` para gestionar discrepancias si el stock central se agotó durante el periodo offline.
- [ ] **Notas de Devolución por Cambio de Talla**: Reingreso inmediato de la prenda devuelta al stock vendible, entrega de la nueva variante, plazo límite respetado y balance financiero en cero (sin retorno de efectivo).
- [ ] **Traspasos entre Sucursales (2 Fases)**: Orden de traslado de sucursal emisora (stock en tránsito) y confirmación de recepción física en sucursal receptora.

---

## PRESENTACIÓN 3: DOMINGO 08/11/2026
### "Inteligencia Artificial Generativa, Analítica con Machine Learning y Pruebas del Sistema"

### 🎯 Objetivo Principal:
Dotar a la plataforma de capacidades avanzadas de toma de decisiones mediante consultas en lenguaje natural (texto y voz) impulsadas por Google Gemini con inyección forzosa de seguridad multitenant, modelos de Machine Learning predictivos y de agrupamiento, y suite completa de pruebas.

### 📋 Entregables y Checklist de Verificación:
- [ ] **Consultas en Lenguaje Natural (Texto y Voz)**: Intérprete LLM que convierte preguntas directivas a SQL seguro acotado estrictamente a `WHERE empresa_id = :tenant`.
- [ ] **Exportación Dinámica**: Generación de reportes ejecutivos descargables en PDF y Excel.
- [ ] **Modelo Supervisado de Machine Learning**: Predicción de demanda y rotación de stock por sucursal sobre datos sintéticos.
- [ ] **Modelo No Supervisado de Machine Learning**: Segmentación de clientes (algoritmo K-Means / RFM).
- [ ] **Dashboard Analítico**: Visualización interactiva con gráficos de barras, líneas y dispersión.
- [ ] **Capítulo V (Pruebas)**: Casos de prueba automatizados (unitarios y de integración multitenant).
- [ ] **Capítulo VI**: Conclusiones y recomendaciones técnicas.

---

## DEFENSA FINAL: MARTES 10/11/2026 (07:00 HRS)
### Sustentación Integral ante Docente y Tribunal

- Demostración en vivo en entorno Cloud desplegado (Render / PostgreSQL).
- Recorrido del flujo completo: Superadmin SaaS -> Alta de Tenant -> Límite de Sucursales -> Venta Offline -> Desconexión de Red -> Sincronización -> Cambio de Talla -> Consulta por Voz con IA.
- Sustentación de la trazabilidad ICONIX desde los requisitos hasta el código y las clases en Enterprise Architect.
