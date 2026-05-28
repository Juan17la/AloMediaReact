# Estructuras de Datos en AloMedia

Este documento describe cada patron de estructura de datos usado en la base de codigo de AloMedia,
como funciona internamente cada uno y por que se eligio sobre alternativas.

La base de codigo usa **arrays**, **maps**, **sets**, **arrays ordenados con busqueda binaria**,
y un **patron de undo/redo de dos stacks**. Estas son las unicas estructuras presentes porque
concuerdan naturalmente con el dominio. Introducir listas enlazadas, colas o arboles agregaria
complejidad sin resolver problemas reales: los datos de timeline son planos y ordenados, los clips se
acceden por ID o por posicion, y el modelo de actualizacion inmutable de Zustand requiere arrays
plain y objetos que pueden ser spread y serializados a JSON.

---

## 1. Arrays

Los arrays son la estructura primaria. Almacenan cada coleccion ordenada en el editor.

### Como funcionan aqui

Cada array en el proyecto sigue un **patron de actualizacion inmutable** requerido por
Zustand/React: en lugar de mutate in place, el codigo crea una copia superficial via
`.slice()`, spread (`[...arr]`), o `.map()`, modifica la copia, y la asigna de vuelta
al store. Esto dispara re-renders de React solo para componentes que se suscriben a
la porcion cambiada del estado.

### Donde se usan

| Array | Archivo | Proposito |
|-------|---------|-----------|
| `Project.tracks` | [projectTypes.ts](../src/project/projectTypes.ts) | Lista ordenada de tracks. `track.order` determina el apilamiento visual en el timeline. Ordenado via `.slice().sort()` antes de inserccion o reordenamiento. |
| `Track.clips` | [projectTypes.ts](../src/project/projectTypes.ts) | Clips en un track dado, ordenados por `timelineStart`. Filtrados, mapeados, y spread inmutablemente en cada operacion de edicion. |
| `Project.media` | [projectTypes.ts](../src/project/projectTypes.ts) | Assets de media importados. Solo se appende durante una sesion (nuevo media se hace spread al final). Removido por filtrado en `mediaId`. |
| `ClipGroup.memberClipIds` | [projectTypes.ts](../src/project/projectTypes.ts) | Lista plana de IDs de clips que pertenecen a un grupo. Validado contra clips existentes en cada acceso via `sanitizeSelection()`. |
| `selectedClipIds` | [uiSlice.ts](../src/store/slices/uiSlice.ts) | Lista de multi-seleccion. Alternada via conversion a Set (add/delete), luego spread de vuelta a un array para estado Zustand. |
| `RenderJob.segments` | [projectTypes.ts](../src/project/projectTypes.ts), [renderPipeline.ts](../src/engine/renderPipeline.ts) | Construido una vez por `buildRenderJob()` de todos los tracks/clips. Consumido como un todo por el sistema de exportacion — iterado, no drenado. No hay patron de cola o produtor-consumidor aqui; array secuencial es la estructura correcta. |

### Por que no listas enlazadas?

Los clips son arrays ordenados accedidos por indice. Las funciones `findNextAdjacentOnSameTrack()` y
`findPrevAdjacentOnSameTrack()` en [transitions.ts](../src/utils/transitions.ts)
navegan hacia adelante/atras a traves de arrays ordenados — esto parece navegacion de lista enlazada,
pero array + indice es optimo aqui porque:
- Zustand requiere actualizciones inmutables (spread/map), que necesitan arrays, no punteros de nodo.
- Los clips se serializan a JSON para guardar/cargar proyecto y snapshots de undo.
- Busqueda de clip adyacente es infrecuente (resolucion de transicion), no por frame.
- Inserccion en medio de array via `[...before, newItem, ...after]`, que es limpio y rapido para la escala de datos involucrados (.decenas a cientos de clips, no miles).

---

## 2. Dos-Stacks Undo/Redo (EditHistory)

El sistema de historial usa un **clasico patron de dos stacks** para soportar undo y redo.

### Como funciona

```
past  = [S0, S1, S2]     present = S3     future = []

Usuario presiona Undo:
past  = [S0, S1]          present = S2     future = [S3]

Usuario presiona Undo de nuevo:
past  = [S0]              present = S1     future = [S2, S3]

Usuario presiona Redo:
past  = [S0, S1]          present = S2     future = [S3]

Usuario realiza nueva accion (registra S4):
past  = [S0, S1, S2]      present = S4     future = []
                                            ↑ despejado — camino de redo perdido
```

Tres campos, tres operaciones:

| Campo | Rol |
|-------|-----|
| `past: HistoryEntry[]` | Stack de estados antes del actual. Crece en record/redo, decrece en undo. Cima del stack = estado pasado mas reciente. |
| `present: HistoryEntry \| null` | El snapshot mas reciente. Esta entre los dos stacks. Movido a `future` en undo, movido a `past` en redo. |
| `future: HistoryEntry[]` | Stack de estados que fueron deshechos. Crece en undo, decrece en redo. Despejado enteramente cuando una nueva accion es grabada (historial ramificado no se mantiene). |

### Operaciones

- **`recordState(state, project, description)`** — Push del `present` actual a `past`,
  establece el nuevo snapshot clonado profundo como `present`, limpia `future`. Esta es la operacion "push" del stack.

- **`undoHistory(state)`** — Pop de `past` a `present`, push del `present` antiguo a
  `future`. Retorna `null` si `past` esta vacio (nada que deshacer).

- **`redoHistory(state)`** — Pop de `future` a `present`, push del `present` antiguo a
  `past`. Retorna `null` si `future` esta vacio (nada que rehacer).

### Por que esto sobre un solo array + cursor

La implementacion anterior usaba `history: HistoryEntry[]` con un cursor `historyIndex`.
Undo decrementaba el cursor; redo incrementaba; grabar un nuevo estado requeria
`slice(0, historyIndex + 1)` para descartar historial hacia adelante. Esto funcionaba pero tinha desventajas:

- `slice(0, historyIndex + 1)` no es obvio — necesitas razonar sobre lo que "descartar hacia adelante" significa.
- Riesgo de off-by-one: `historyIndex <= 0` vs `historyIndex >= history.length - 1` sonfaceis de confundir.
- Cursor y array son estado separado que puede desviarse si cualquier ruta de codigo olvida actualizar ambos.
- Reset requeria recordar establecer tanto `history: []` como `historyIndex: -1`.

Con dos stacks: "¿se puede deshacer?" es `past.length > 0`, "¿se puede rehacer?" es `future.length > 0`,
y reset es una unica llamada a `createEditHistory()`. Las operaciones son funciones puras que
retornan nuevo estado, haciendolas faceis de probar fuera de Zustand.

### Archivos

| Archivo | Rol |
|---------|-----|
| [editHistory.ts](../src/utils/editHistory.ts) | Funciones puras: `createEditHistory`, `recordState`, `undoHistory`, `redoHistory`. Sin dependencia de Zustand. |
| [historySlice.ts](../src/store/slices/historySlice.ts) | Slice de Zustand que envuelve `EditHistory` y expone `pushHistory()`, `undo()`, `redo()` al store. |

---

## 3. Diccionarios y Maps

Los Maps proveen busqueda O(1) por ID, usados cuando el codigo necesita encontrar algo por clave
en lugar de por posicion.

### Donde se usan

| Map | Archivo | Como funciona |
|-----|---------|--------------|
| `fileMap: Map<string, File>` | [projectSlice.ts](../src/store/slices/projectSlice.ts) | Registro a nivel de modulo mapeando ID de media al objeto `File` del navegador. No es parte del estado reactivo de Zustand (mutaciones de Map no disparan re-renders). Poblado en import, ledo durante preview y export, despejado en carga/reset de proyecto. Este es un registro simple, no un cache — no hay politica de eviction, no hay seguimiento de orden de acceso, no hay limite de tamano. |
| `proxyMap: Record<string, ProxyState>` | [proxySlice.ts](../src/store/slices/proxySlice.ts) | Mapea ID de media a estado de generacion de proxy (`pending`, `ready`, `error`). Objeto plain (no Map) porque Zustand puede hacer diff de claves de objeto para reactividad. |
| `ClipIndex.segments: Map<number, Clip[]>` | [clipIndex.ts](../src/utils/clipIndex.ts) | Mapea indice de segmento de boundary a los clips activos en ese rango de tiempo. Construido una vez por `buildClipIndex()`, consultado via busqueda binaria en el array companion `boundaries`. |
| Batch operation maps | [projectSlice.ts](../src/store/slices/projectSlice.ts) | Instancias temporales de `Map` y `Set` creadas dentro de `moveClipsBatch()` para busqueda O(1) durante operaciones bulk. Construidas desde el array de entrada, consumidas dentro de la misma funcion, luego descartadas. |

### Como funciona `fileMap`

```
addMedia(file) → fileMap.set(media.id, file)     // registrar
buildRenderJob() → fileMap.has(seg.mediaId)        // verificar existencia
loadProject() → fileMap.clear()                    // reset completo
```

Esta intencionalmente fuera de Zustand porque los objetos `File` no son serializables
y no deberian participar en diff de estado o snapshots de undo.

---

## 4. Sets

Los Sets se usan para pruebas de membresia O(1) y deduplicacion automatica.

### Donde se usan

| Set | Archivo | Como funciona |
|-----|---------|--------------|
| `listExistingClipIds()` → `Set<string>` | [uiSlice.ts](../src/store/slices/uiSlice.ts) | Recolecta todos los IDs de clips a traves de todos los tracks en un Set. Usado por `sanitizeSelection()` para filtrar IDs stale (clips que fueron eliminados pero todava referenciados en la seleccion). El Set provee chequeos O(1) `.has()` en lugar de loops anidados de `Array.find()`. |
| `new Set(clipIds)` en `sanitizeSelection()` | [uiSlice.ts](../src/store/slices/uiSlice.ts) | Deduplica el array de seleccion antes de filtrar. Hace spread de vuelta a array para estado Zustand: `[...new Set(clipIds)].filter(...)`. |
| `existingClipIds` en `loadProject()` | [projectSlice.ts](../src/store/slices/projectSlice.ts) | Valida miembros de grupo de clips contra clips realmente existentes durante carga de proyecto. Remueve referencias a clips que ya no existen. |
| `missingMediaIds`, `idbResolvedMediaIds` | [projectSlice.ts](../src/store/slices/projectSlice.ts) | Rastrear cuales assets de media pudieron/no pudieron ser restaurados de IndexedDB durante carga de proyecto. Impulsan advertencias de UI para archivos faltantes. |
| Extension sets (`AUDIO_EXTENSIONS`, `VIDEO_EXTENSIONS`, etc.) | [projectSlice.ts](../src/store/slices/projectSlice.ts) | Sets constantes para deteccion O(1) de tipo de archivo por extension. |

### Patron: Set como estructura intermedia

La base de codigo frecuentemente convierte entre arrays y sets dentro de una sola operacion:
```typescript
// Array → Set (para ops O(1)) → Array (para estado Zustand)
const selected = new Set(state.selectedClipIds)
selected.has(clipId) ? selected.delete(clipId) : selected.add(clipId)
const nextSelected = sanitizeSelection(state.project, [...selected])
```
Esto es idiomatico para React/Zustand: Sets se usan para la computacion, pero el
resultado se almacena como un array porque Zustand necesita chequearos de igualdad referencial y
los arrays se serializan limpiamente a JSON.

---

## 5. Arrays Ordenados con Busqueda Binaria (ClipIndex)

El indice de clips es la estructura mas interesante algoritmicamente en la base de codigo.
Prove busqueda O(log n) de que clips estan activos en cualquier posicion de playhead dada.

### Como funciona

[clipIndex.ts](../src/utils/clipIndex.ts) construye un indice de segmentos desde todos los clips
a traves de todos los tracks:

**Paso 1 — Recolectar boundaries:**
Cada clip contribute dos puntos de tiempo: su `timelineStart` y `timelineEnd`.
Estos se recolectan en un `Set<number>` (para deduplicacion), luego se ordenan en
un array `boundaries: number[]`.

```
Clip A:  |-------|          (start=0, end=3)
Clip B:      |---------|    (start=2, end=5)

boundaries = [0, 2, 3, 5]   (ordenado, unico)
segments:     [0] [1] [2]   (entre cada par de boundaries)
```

**Paso 2 — Mapear segmentos a clips activos:**
Para cada segmento (el gap entre dos boundaries consecutivos), el codigo verifica
cuales clips sobrelapan ese rango de tiempo. El punto medio del segmento es probado contra
el start/end de cada clip (con tolerancia epsilon para precision de flotante).
 Resultados se almacenan en `segments: Map<number, Clip[]>` keyed por indice de segmento.

**Paso 3 — Busqueda binaria en tiempo de consulta:**
`lookupActiveClips(index, playhead)` corre busqueda binaria en `boundaries` para encontrar
que segmento cae el playhead, luego retorna la lista pre-computada de clips
del mapa `segments` en O(1).

```typescript
// Busqueda binaria: O(log n) donde n = numero de puntos de boundary
let lo = 0, hi = boundaries.length - 2
while (lo <= hi) {
  const mid = (lo + hi) >>> 1              // shift derecho sin signo = floor(div 2) rapido
  if (boundaries[mid + 1] <= playhead - CLIP_EPSILON) lo = mid + 1
  else if (boundaries[mid] > playhead + CLIP_EPSILON) hi = mid - 1
  else return segments.get(mid) ?? []      // segmento encontrado
}
```

### Por que esta estructura

La posicion de playhead se consulta en cada frame de animacion durante reproduccion. Un enfoque naive
(iterar todos los clips, verificar si playhead cae dentro de cada uno) seria
O(clips) por frame. El indice de clips lo hace O(log boundaries) por frame, lo que
importa cuando el timeline tiene muchos clips.

El indice se reconstruye cuando el proyecto cambia (clips se agregan, mueven, eliminan).
Esto es aceptable porque ediciones de proyecto son infrecuentes comparadas con consultas de playhead.

---

## 6. Edge de Transiciones (Array Ordenado de Registros)

El sistema de transiciones en [transitionEdges.ts](../src/project/transitionEdges.ts) usa un
array ordenado de registros `TransitionEdge` para representar todas las transiciones en el proyecto.

### Como funciona

`compileTransitionEdges(project)` itera todos los tracks de video y sus clips en orden de timeline.
Para cada par de clips adyacentes (o un clip al inicio/final de un track), verifica
si existen propiedades `transitionIn` / `transitionOut` y construye un
registro `TransitionEdge` con tiempos de boundary normalized.

El array resultante se ordena por `(trackId, boundaryTimeS, edgeId)` para que los edges
puedan escanearse en orden de timeline. Este orden ordenado se mantiene a traves de
`sortEdges()` despues de cada modificacion via `applyCanonicalTransitionEdit()`.

Navegacion de clips adyacentes usa aritmetica simple de indice (`clips[idx - 1]`, `clips[idx + 1]`)
sobre el array de clips ordenado — no se necesitan punteros de lista enlazada porque el array ya esta
en orden de timeline y los clips son planos (sin anidamiento jerarquico).

### Resolucion de conflictos

Cuando dos clips comparten un boundary y ambos declaran transiciones, `transitionIn` del
clip entrante toma prioridad sobre `transitionOut` del clip saliente. Esta es una
regla de dominio, no una preocupacion de estructura de datos — pero la estructura de edge ordenado hace
facil implementarlo procesando clips de izquierda a derecha y saltando la transicion de menor prioridad.

---

## 7. Objetos y Registros

Interfaces plain de TypeScript sirven como registros (structs) a traves de la base de codigo.

| Objeto | Archivo | Proposito |
|--------|---------|-----------|
| `Project` | [projectTypes.ts](../src/project/projectTypes.ts) | Contenedor de nivel superior con `id`, `name`, `media[]`, `tracks[]`, `clipGroups[]`, `transitionEdges[]`. |
| `Clip` (tipo union) | [projectTypes.ts](../src/project/projectTypes.ts) | Union discriminada: `VideoClip \| ImageClip \| TextClip \| AudioClip`. El campo `type` impulsa switches exhaustivos en pipeline de render y componentes de UI. |
| `HistoryEntry` | [projectTypes.ts](../src/project/projectTypes.ts) | `{ project: Project, description: string }` — un snapshot pairado con una etiqueta legible por humanos. Clonado profundo en record y en restore para prevenir aliasing. |
| `RenderSegment` | [projectTypes.ts](../src/project/projectTypes.ts) | Representacion aplanada de un clip para el pipeline de export. Construida desde `Clip` por `clipToSegment()`, enriquecida con transiciones resueltas. |
| `TransitionEdge` | [projectTypes.ts](../src/project/projectTypes.ts) | Representacion canonica de una transicion entre dos clips. Contiene tiempos de boundary, duracion, tipo, y metadata de resolucion de conflictos. |

### Patron de actualizacion inmutable

Todos los objetos en estado Zustand se actualizan inmutablemente via spread:

```typescript
set(state => ({
  project: {
    ...state.project,
    tracks: state.project.tracks.map(track =>
      track.id === targetId
        ? { ...track, clips: [...track.clips, newClip] }
        : track
    ),
  },
}))
```

Esto crea una nueva referencia de objeto en cada nivel del path que cambio,
mientras comparte subarboles sin cambios. React detecta la nueva referencia y re-renderiza
solo los componentes afectados.

---

## 8. Reglas Importantes

Estas reglas gobiernan como se comportan las estructuras en la practica.

### Normalizacion de tiempo

Todos los valores de timeline se almacenan en segundos pero redondeados a precision de milisegundo entero.
Las funciones `toMs()` / `toSeconds()` en [time.ts](../src/utils/time.ts) enforce this.
La constante `CLIP_EPSILON` se usa para comparaciones de punto flotante (deteccion de sobrelape,
chequeos de adyacencia). Esto asegura que dos clips placing "al mismo tiempo" se traten
como iguales incluso si la aritmetica de punto flotante produce pequenas diferencias.

### Identidad de clip

Los IDs de clip son la identidad real, no IDs de media. Dos clips pueden referenciar el mismo archivo de media
(eg. el mismo video usado dos veces en different tracks). El campo `id` en `BaseClip`
es generado por `generateId()` y es unico a traves de todo el proyecto.

### Snapshots de undo

El sistema de historial almacena snapshots completos de proyecto (clonados profundos via `JSON.parse(JSON.stringify(...))`).
Esto es simple y correcto pero significa que el uso de memoria crece linealmente con la profundidad del historial.
Para una sesion de edicion tipica con decenas a basseales de estados de undo, esto esta bien.

### Serializacion

Todo el estado del proyecto (tracks, clips, metadata de media, transiciones, grupos) es JSON-serializable.
Los objetos `File` viven en el `fileMap` a nivel de modulo fuera de Zustand y no se incluyen
en snapshots de undo o guardados de proyecto. Se vuelven a resolver desde IndexedDB en carga de proyecto.
