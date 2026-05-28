# AloMedia - Primer Paso

**Lee este readme antes de ir al codigo!**

---

## Que Es

AloMedia es un editor de video web con implementaciones de IA para:

- **Transcripcion de audio** — Conversion automatica de habla a texto
- **Limpieza de audio** — Reduccion de ruido y mejora de calidad

El nucleo del editor manipula timelines, clips y transformaciones de tiempo/espacio, renderizando todo a traves de **FFmpeg** (WASM o servidor dedicado).

---

## Por Que No Usamos POO En Todos Lados?

La mayoria del proyecto parece Programacion Funcional — funciones puras, immutabilidad, composicion — pero el motor de edicion y la logica del player requieren POO en partes significativas. Esto se debe a la naturaleza de FFmpeg/WASM, los pipelines de procesamiento de video, y los recursos del navegador con ciclos de vida propios.

No es un proyecto 100% funcional ni 100% OOP. Es un hbrido donde cada enfoque se usa donde tiene sentido.

### Paquetes donde Predomina POO

| Paquete | Clases | Proposito |
|---------|--------|-----------|
| `src/engine/` | `ProxyEngine`, `RenderPipeline`, `WasmEncoder`, `ServerEncoder` | Encapsulan FFmpeg WASM, cycles de carga de codecs, comunicacion HTTP con servidor de export, y coordinacion de pipeline |
| `src/player/video/` | `VideoBufferManager`, `TransitionStateMachine`, `BufferSwapManager`, `PlaybackSynchronizer` | Gestionan doble buffer de video para reproduccion sin gaps, maquinas de estado de transicion, swaps atomicos, y sincronizacion de playback |
| `src/player/audio/` | `MediaBuffer` | Maneja AudioContext, nodos de audio, y crossfades |
| `src/player/hooks/` | `SyncManager`, `PlaybackController` | Coordina sincronizacion global audio/video y gestiona el RAF loop del playback |
| `src/player/utils/` | `ObjectUrlRegistry` | Gestiona ciclo de vida de URLs de objetos del navegador |
| `src/services/` | `AuthService`, `ProjectService`, `MediaSyncService`, `FileCacheService` | Servicios singleton para auth, CRUD de proyectos, y caching de archivos |
| `src/api/` | `HttpClient`, `ApiError` | Cliente HTTP con interceptors y estructura estandarizada de errores |
| `src/components/` | `EditorErrorBoundary` | React Error Boundary — requiere clase por diseno de React |

**Total: 19 clases** organizadas en 8 paquetes.

### Por que no FP en estas partes?

Estas clases encapsulan estado mutable del navegador o de FFmpeg que no puede modelarse como funciones puras:
- Los elementos `<video>` y `AudioContext` tienen APIs de playback mutable
- Las URLs de objetos requieren seguimiento de creacion y revocacion
- FFmpeg WASM tiene ciclos de vida de carga y log de procesos
- Los servicios HTTP necesitan estado de sesi

Para todo lo demas — utilidad de timeline, historial de ediciones, sistema de transiciones, constructores de filtros, utilidades de render — **funciones puras son la eleccion correcta**.

Ver [docs/NO_POO_EN_TODO.md](docs/NO_POO_EN_TODO.md) para el analisis completo.

---

## Estructuras de Datos

Por orden de importancia:

### 1. Arrays (ordenados)

**Por que:** Son la estructura primaria para todas las colecciones ordenadas en el editor. Se acceden por indice, se serializan a JSON limpiamente, y concuerdan con el patron de actualizacion inmutable de Zustand.

**Usados en:** `Project.tracks`, `Track.clips`, `RenderJob.segments`, `selectedClipIds`, `Project.media`

### 2. Dos-Stacks Undo/Redo

**Por que:** El sistema de historial usa dos stacks (`past` y `future`) para implementar undo/redo. Cada operacion es una funcion pura que retorna nuevo estado — mas testable y sin riesgo de desincronizacion entre cursor y array.

**Usado en:** `editHistory.ts` — `recordState()`, `undoHistory()`, `redoHistory()`.

### 3. Sets

**Por que:** Membresia O(1) y deduplicacion automatica para validacion de seleccion y detection de tipos de archivo.

**Usados en:** `sanitizeSelection()`, `listExistingClipIds()`, extensiones constantes (`AUDIO_EXTENSIONS`, `VIDEO_EXTENSIONS`)

### 4. ClipIndex con Busqueda Binaria

**Por que:** El indice de clips es la estructura mas interesante algoritmicamente. Prove busqueda O(log n) de clips activos en cualquier posicion de playhead. La posicion se consulta cada frame durante reproduccion — iterar todos los clips por frame seria O(clips) por frame.

**Usado en:** `clipIndex.ts` — construido cuando el proyecto cambia, consultado via busqueda binaria en `boundaries[]` durante reproduccion.

### 5. Maps y Diccionarios

**Por que:** Proveen busqueda O(1) por ID cuando el codigo necesita encontrar algo por clave en lugar de por posicion.

**Usados en:** `fileMap` (registro de archivos por mediaId), `proxyMap`, `ClipIndex.segments`

### Ver tambn

[docs/DATA_STRUCTURES.md](docs/DATA_STRUCTURES.md) para la documentacion completo de cada estructura y porque la escojimos.

---

## Indice de Documentacion

Documentacion completa del proyecto en [./docs/](docs/):

| # | Documento | Proposito |
|---|-----------|-----------|
| 1 | [GETTING_STARTED.md](docs/GETTING_STARTED.md) | Entender el proyecto en 15 minutos |
| 2 | [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitectura y limites del sistema |
| 3 | [VIDEO_EDITOR_WORKFLOW.md](docs/VIDEO_EDITOR_WORKFLOW.md) | Flujo real de edicion |
| 4 | [FFMPEG_EXPORT.md](docs/FFMPEG_EXPORT.md) | Exportacion y FFmpeg |
| 5 | [DATA_STRUCTURES.md](docs/DATA_STRUCTURES.md) | Modelos y estructuras de datos |
| 6 | [NO_POO_EN_TODO.md](docs/NO_POO_EN_TODO.md) | Analisis detallado de POO vs funcional |
| 7 | [API_SERVICES.md](docs/API_SERVICES.md) | Servicios de API |
| 8 | [AUTHENTICATION.md](docs/AUTHENTICATION.md) | Autenticacion |
| 9 | [UI_UX.md](docs/UI_UX.md) | Diseno de UI/UX |
| 10 | [CONFIGURATION_RUNTIME.md](docs/CONFIGURATION_RUNTIME.md) | Configuracion en tiempo de ejecucion |
| 11 | [QUALITY_RISKS.md](docs/QUALITY_RISKS.md) | Riesgos de calidad |

