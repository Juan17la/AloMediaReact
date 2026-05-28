# Por Que No Usamos Clases ni POO para Todo el Proyecto

## Introduccion

Este documento explica los criterios y argumentos validos por los cuales AloMediaReact
adopta un enfoque predominantemente funcional en lugar de Programacion Orientada a Objetos (POO)
para la mayoria del codigo del proyecto.

---

## 1. Contexto del Proyecto

AloMediaReact es un editor de video web construido con:
- **React 19** con componentes funcionales y hooks
- **TypeScript** tipado estatico
- **Zustand** para manejo de estado centralizado
- **FFmpeg WASM** para exportacion de video

El nucleo del proyecto involucra:
- manipulating timeline y clips de video/audio
- transformaciones de tiempo y espacio
- parsing de formatos (SRT, metadata)
- construccion de grafos de filtros para FFmpeg

---

## 2. Criterios para Decide Cuando Usar OOP vs Funcional

### 2.1 Estado Mutable Complejo con Efectos Secundarios

**Criterio:** Si la logica involucra efectos secundarios irreductibles (APIs del navegador,
ciclos de vida de recursos, estado que cambia con el tiempo de manera no deterministica),
entonces OOP puede ser apropiada.

**Aplicado en AloMediaReact:**
- `VideoBufferManager` encapsula elementos `<video>` del DOM que tienen estado mutable
  complejo, temporizadores de sincronizacion, y ciclos de vida de recursos.
- `ObjectUrlRegistry` maneja la creacion, cacheo y revocacion de URLs de objetos,
  que son recursos nativos del navegador.

**Contraejemplo - POO seria overkill:**
- Una funcion que calcula colisiones entre clips (`clipCollision.ts`) no tiene
  efectos secundarios. Dados los mismos clips, siempre produce el mismo resultado.
  Modelar esto como una clase con estado interno seria anaconda.

### 2.2 Necesidad Real de Encapsulamiento de Estado

**Criterio:** Solo usar clases cuando hay estado interno que necesita ser protegido
de acceso externo y que no puede razonablemente representarse como datos puros.

**Aplicado en AloMediaReact:**
- Las 4 clases del proyecto (VideoBufferManager, ObjectUrlRegistry, ApiError,
  EditorErrorBoundary) tienen estado interno que no puede ser representado como
  datos puros porque:
  - Los elementos de video tienen APIs mutable del DOM
  - Las URLs de objetos tienen ciclos de vida manejados por el navegador
  - Los errores需要一个 estructura con campos especificos
  - Error Boundaries son un patron de React que requiere clases

**Contraejemplo - POO seria overkill:**
- `clipIndex.ts` building un indice de clips es una transformacion pura.
  No necesita mantener estado entre llamadas - cada vez que se llama con los
  mismos parametros, produce el mismo resultado. Una clase aqui solo agregaria
  sobrecarga sin beneficio.

### 2.3 El Dominio es Datos, No Entidades con Comportamiento

**Criterio:** Si el dominio del problema es fundamentalmente datos (transformaciones,
consultas, parsing), entonces la programacion funcional es mas directa y EXPRESSIVE.

**Analisis:**
Los elementos principales del dominio de AloMediaReact son:
- **Clip** - un registro de datos (tipo, mediaId, transform, tiempo)
- **Track** - un contenedor de clips ordenados
- **Project** - un contenedor de tracks, media, y configuracion
- **Transition** - un registro que describe como dos clips se conectan

Estos son todos **datos puros**. No tienen comportamiento inherente que requiera
metodos. Las operaciones sobre ellos son transformaciones que reciben datos
y producen nuevos datos:

```typescript
// Enfoque funcional - claro y directo
const nextProject = moveClip(project, clipId, newTimelineStart)

// Enfoque OOP - anaconda para algo simple
clip.moveTo(newTimelineStart)  // ❌ Muta estado, efectos secundarios ocultos
```

### 2.4 Immutabilidad Como Patron Primero

**Criterio:** Zustand/React requieren actualizaciones inmutables para funcionar
correctamente. La POO con herencia y mutacion chocaria con este requisito.

**Aplicado en AloMediaReact:**
Todas las mutaciones de estado en Zustand siguen el patron inmutable:

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

Este patron es natural en programacion funcional donde los datos son inmutables
por diseño. En POO tradicional, lucharias contra constante con metodos que mutan
el estado interno.

### 2.5 Testabilidad

**Criterio:** Las funciones puras son intrinsically mas faceis de testear que
metodos de clases que mantienen estado interno.

**Aplicado en AloMediaReact:**
- `transitions.ts` puede testearse con Assertiones simples sin necesidad de
  mockear estados o configurar instancias de clases.
- `clipCollision.ts` puede verificarce con casos de prueba directos.
- `editHistory.ts` puede probarse verificando que las operaciones de undo/redo
  producen los estados esperados.

```typescript
// Test de funcion pura - directo
expect(findNextAdjacentOnSameTrack(clips, clipId)).toBe(expectedClipId)

// Test de metodo de clase - requiere setup
const bufferManager = new VideoBufferManager(video1, video2)
await bufferManager.play()
await bufferManager.seek(time)
expect(bufferManager.getCurrentTime()).toBe(time)  // ❌ Dependiente de temporalidad, harder to test
```

### 2.6 Composibilidad

**Criterio:** Las funciones puras se composen naturellement para formar
transformaciones complejas. Las clases tienden a crear acoplamiento fijo.

**Analisis:**
Las funciones utilitarias de AloMediaReact se componen para transformaciones complejas:

```typescript
const exportJob = buildRenderJob(project, fileMap, proxyMap)
// -> buildRenderJob ahora internamente usa:
//    - clipToSegment() para convertir clips a segmentos
//    - compileTransitionEdges() para resolver transiciones
//    - buildFilterGraph() para construir filtros FFmpeg
```

Cada paso es una funcion pura que puede entenderse, probarse y depurarse
independientemente. En un enfoque OOP, estas transformaciones estarian
encapsuladas en metodos de una clase grandiosa que haria todo, haciendo
dificil probar partes individuales.

---

## 3. Donde POO Seria Un Error

### 3.1 Utilitarias de Timeline

Archivos como `clipCollision.ts`, `snapUtils.ts`, `transitions.ts` contienen
logica que:
- Recibe datos y produce resultados sin efectos secundarios
- No necesita mantener estado entre llamadas
- Es fundamentalmente Algoritmica

Crear clases para esto Resultaria en:
- "Clases utilitarias" que son solo espacios de nombre o metodos estatico
- Codigo boilerplate sin beneficio real
- Dificultad accrue para testear funciones individuales

### 3.2 Sistema de Historial

`editHistory.ts` implementa un classic two-stack undo/redo. La logica es:
- Un estado que se transforma via operaciones (record, undo, redo)
- Sin efectos secundarios
- Completable como maquina de estados funcional

Traducir esto a clases con mutacion interna crearia:
-复杂性 adicional sin necesidad
- Posibilidad de estado inconsistente
- Dificultad para hacer snapshots para debug

### 3.3 Pipeline de Export

`exportPipeline/` contiene transformaciones que:
- Reciben un proyecto y archivos
- Producen un archivo de video descargable
- No necesitan mantener estado interno

El pipeline podría modelarse como una clase con metodos para cada fase, pero:
- El estado del pipeline es simplemente los datos que fluyen a traves de el
- Dividir en clases no mejora la claridad
- La composicion funcional es mas flexible para modificar etapas

### 3.4 Constructores de Filtros

`audioFilters.ts`, `colorAdjustmentFilters.ts`, `speedFilters.ts` son
funciones que toman configuracion y producen strings de filtro FFmpeg. Son
transformaciones puras de datos a datos.

---

## 4. Donde SI Usamos Clases (y Por Que)

### 4.1 VideoBufferManager (~425 lineas)

**Justificacion:**
1. Necesita mantener referencias a elementos `<video>` del DOM que tienen
   APIs de playback con estado mutable
2. Tiene temporizadores (setInterval/requestAnimationFrame) que deben
   cancelarse en orden correcto
3. Gestiona el ciclo de vida de recursos (cargar videos, descargar memorias)
4. El estado de buffer swap depende de secuencias temporal de eventos

**Alternativa funcional no viable:**
- No podriamos modelar esto como funciones puras porque los elementos de video
  tienen estado que existe fuera del espacio de JavaScript
- Requiririamos pasar referencias a elementos DOM a travers de todo el codigo
- El ciclo de vida de recursos se volveria un desastre de callbacks y cleanup

### 4.2 ObjectUrlRegistry

**Justificacion:**
1. Maneja recursos de URLs de objetos del navegador
2. Necesita track que URLs foram created para poder revokearlas
3. El ciclo de vida de estos recursos es manejado por el navegador,
   no por JavaScript

**Alternativa funcional no viable:**
- Si cada funcion creara y revocara URLs, tendriamos que pasar el Registry
  a travers de todo el codigo
- El cacheo requiere estado mutable (que URLs foram criadas)
- Sin una entidad que maneje el ciclo de vida, las URLs se filtrarian

### 4.3 ApiError

**Justificacion:**
1. Estandariza la estructura de errores en la aplicacion
2. Debe tener campos especificos (status, message, field)
3. Es usada para throw/catch en todo el codigo de servicios

**Este es el caso donde OOP es apropiado:**
- Los errores son inherentemente un tipo de datos con estructura
- La clase simplemente formaliza la estructura
- Pero podriamos discutir que una interface seria suficiente...

### 4.4 EditorErrorBoundary

**Justificacion:**
1. React Error Boundaries son un patron que requiere componentes de clase
2. No hay alternativa funcional por diseno de React

**Este es un caso donde no hay eleccion:**
- React强制这种感觉 para este patron especifico
- No es una decision de diseno sino una limitacion de la biblioteca

---

## Referencias

- "Functional-Light Programming" por Kyle Simpson
- "JavaScript Allonge" por Reginald Braithwaite
- Documentacion de Zustand sobre patrones inmutables
- Clean Code por Robert Martin (secciones sobre SRP y YAGNI)

---

*Este documento refleja las decisiones de arquitectura tomadas para AloMediaReact.
El proposito es documentar el rationale detras de estas decisiones y proporcionar
guia para futuros contribuidores.*