# Agents Registry

Available custom agents under `.agents/agents/`:

- `orchestrator.md` — Enrutador central y coordinador multi-agente para FashionStore.
- `backend.md` — Python 3.12+, FastAPI, SQLAlchemy 2.0, Pydantic v2, PostgreSQL, JWT, Alembic (Monolito Modular por Dominios).
- `frontend.md` — Angular 20+, TypeScript, Standalone Components, Signals, Atelier Noir design system (`UI-UX-WEB/`).
- `mobile.md` — Flutter, Dart, vestidores virtuales con Realidad Aumentada (AR), Atelier Noir mobile UI (`UI-UX-MOVIL/`).
- `architecture.md` — Monolito modular en FastAPI (dominios, APIRouters, 4 capas), alineación con PUDS y UML 2.5+.
- `architect-planner.md` — Planificación de fases PUDS, roadmap del MVP de 4 semanas e integración vertical por dominios.
- `code-review.md` — Puertas de calidad, estándares de código, auditoría de RNF06 (monolito modular) y estilo Atelier Noir.
- `qa-testing.md` — Estrategia de pruebas (Pytest, HTTPX, Jasmine/Karma, Flutter Test) y flujo de pruebas PUDS.
- `infra.md` — Docker, Docker Compose, PostgreSQL, Nginx y despliegue obligatorio en la nube (no localhost).

## Flujo de Trabajo
1. `orchestrator` clasifica el requerimiento.
2. `orchestrator` delega al especialista correspondiente (`backend`, `frontend`, `mobile`, etc.).
3. El especialista ejecuta respetando los estándares de seguridad y modularidad.
4. Se validan las pruebas y se consolida la entrega.
