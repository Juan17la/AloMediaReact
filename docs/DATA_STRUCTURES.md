# Data Structures Catalogue

## Objetivo

Documentar estructuras de datos implementadas, su responsabilidad y su lugar dentro del sistema.

## Criterio de clasificacion

1. Estructuras de dominio.
2. Estructuras de estado.
3. Estructuras de ejecucion.
4. Estructuras de integracion.

## Estructuras de dominio

1. MediaType
- Rol: taxonomia de archivos importados.
- Dominio: multimedia.

2. TrackType
- Rol: clasificacion de pistas de timeline.
- Dominio: composicion temporal.

3. Media
- Rol: metadata de asset.
- Dominio: catalogo de medios del proyecto.

4. Transform
- Rol: geometria visual por clip.
- Dominio: composicion en canvas.

5. ColorAdjustments
- Rol: ajustes de color por clip.
- Dominio: postproceso visual.

6. AudioConfig
- Rol: parametros de mezcla y balance por clip.
- Dominio: audio por segmento.

7. BaseClip
- Rol: contrato temporal comun.
- Dominio: timeline.

8. VideoClip
- Rol: segmento audiovisual con transform y color.
- Dominio: composicion visual y sonora.

9. AudioClip
- Rol: segmento sonoro puro.
- Dominio: timeline de audio.

10. ImageClip
- Rol: segmento visual estatico con duracion en timeline.
- Dominio: composicion de imagen.

11. TextClip
- Rol: segmento de contenido textual.
- Dominio: overlays de texto.

12. Clip (union discriminada)
- Rol: unificar operaciones comunes y variantes por tipo.
- Dominio: modelo central del editor.

13. Track
- Rol: contenedor ordenado de clips.
- Dominio: timeline multipista.

14. Project
- Rol: agregado raiz serializable.
- Dominio: edicion completa.

15. SavedProject
- Rol: envelope de persistencia con versionado y timestamps.
- Dominio: import/export de proyecto.

16. HistoryEntry
- Rol: snapshot con descripcion de accion.
- Dominio: undo/redo.

17. RenderSegment
- Rol: unidad normalizada para motor de render.
- Dominio: exportacion.

18. RenderJob
- Rol: contrato total de export.
- Dominio: orquestacion FFmpeg.

## Estructuras de estado

19. EditorStore
- Rol: composicion de slices del editor.
- Dominio: estado global reactivo.

20. ProjectSlice
- Rol: mutaciones de media, clips, tracks y carga de proyecto.
- Dominio: logica de negocio de edicion.

21. PlaybackSlice
- Rol: playhead y estado de reproduccion.
- Dominio: control temporal.

22. UiSlice
- Rol: seleccion, zoom, clipboard y utilidades de interaccion.
- Dominio: estado de interfaz.

23. HistorySlice
- Rol: pila de estados para deshacer y rehacer.
- Dominio: versionado in-memory.

24. ProxySlice y ProxyState
- Rol: seguimiento de estado de proxies por media.
- Dominio: preview optimizada.

## Estructuras de ejecucion

25. fileMap
- Tipo: mapa mediaId a File.
- Rol: asociar identidad logica con archivo binario real.
- Dominio: puente editor-player-engine.

26. missingMediaIds
- Tipo: conjunto.
- Rol: registrar medios no resueltos al cargar proyecto.
- Dominio: resiliencia de carga.

27. idbResolvedMediaIds
- Tipo: conjunto.
- Rol: marcar medios recuperados desde cache local.
- Dominio: diagnositico de recuperacion.

28. ClipIndex
- Tipo: fronteras temporales + segmentos.
- Rol: acelerar busqueda de clips activos por playhead.
- Dominio: sincronizacion de reproduccion.

29. Audio pool
- Tipo: mapa trackId a elemento HTMLAudioElement.
- Rol: administrar audio por pista de forma incremental.
- Dominio: playback de audio.

30. VideoBufferManager
- Tipo: gestor de estado de doble buffer.
- Rol: controlar preload y swap de video.
- Dominio: playback de video.

31. RafLoopHandle
- Tipo: controlador start/stop de loop temporal.
- Rol: avance continuo de playhead.
- Dominio: reloj del player.

## Estructuras de integracion

32. ApiError
- Rol: error tipado con status y campos.
- Dominio: capa de transporte HTTP.

33. FieldError
- Rol: error de validacion por campo.
- Dominio: formularios y feedback de API.

34. CacheRecord
- Rol: unidad persistida en IndexedDB para archivo por hash.
- Dominio: cache local de medios.

35. ExportProgress
- Rol: estado observable de avance de export por etapas.
- Dominio: UX operativa de render.

## Reglas temporales como estructura transversal

36. Normalizacion a milisegundo
- Rol: evitar drift por flotantes.
- Dominio: timeline y playback.

37. Epsilon temporal
- Rol: tolerancia de comparacion en limites de clips.
- Dominio: resolucion de clip activo y colisiones.

## Como usar este catalogo al extender el sistema

1. Si agregas una estructura de dominio, registra consumidores en store, player y engine.
2. Si cambias contratos de export, valida impacto en filtros y progreso.
3. Si agregas estado reactivo nuevo, confirma que no rompe rendimiento de playback.
4. Si introduces nueva persistencia, define estrategia de migracion.
