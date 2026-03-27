# AloMedia React Documentation Hub

Este archivo funciona como indice maestro de la documentacion profunda del proyecto.

## Documentos principales

1. [README.md](README.md): mapa rapido para onboarding y lectura por rol.
2. [GETTING_STARTED.md](GETTING_STARTED.md): setup, flujo de trabajo y primeros pasos.
3. [ARCHITECTURE.md](ARCHITECTURE.md): arquitectura por capas, limites y flujo de datos.
4. [API_SERVICES.md](API_SERVICES.md): capa HTTP, servicios y errores.
5. [AUTHENTICATION.md](AUTHENTICATION.md): sesion, rutas privadas/publicas y recuperacion.
6. [VIDEO_EDITOR_WORKFLOW.md](VIDEO_EDITOR_WORKFLOW.md): flujo operativo del editor extremo a extremo.
7. [FFMPEG_EXPORT.md](FFMPEG_EXPORT.md): pipeline de export, filter graph, progreso y cancelacion.
8. [UI_UX.md](UI_UX.md): decisiones de interfaz, interaccion y experiencia.
9. [DATA_STRUCTURES.md](DATA_STRUCTURES.md): catalogo explicito de estructuras de datos implementadas.
10. [CONFIGURATION_RUNTIME.md](CONFIGURATION_RUNTIME.md): configuracion de build/runtime y requisitos de entorno.
11. [QUALITY_RISKS.md](QUALITY_RISKS.md): riesgos tecnicos, limites actuales y recomendaciones.

## Orden recomendado de lectura

1. GETTING_STARTED.
2. ARCHITECTURE.
3. VIDEO_EDITOR_WORKFLOW.
4. FFMPEG_EXPORT.
5. DATA_STRUCTURES.

## Audiencia

- Producto y negocio: UI_UX + VIDEO_EDITOR_WORKFLOW.
- Frontend: ARCHITECTURE + VIDEO_EDITOR_WORKFLOW + DATA_STRUCTURES.
- Integracion backend: API_SERVICES + AUTHENTICATION.
- Rendimiento/export: FFMPEG_EXPORT + QUALITY_RISKS + CONFIGURATION_RUNTIME.

## Alcance

La suite de documentos evita copiar codigo y explica comportamiento, responsabilidades, dependencias y decisiones de diseño sobre implementacion real del repositorio.
