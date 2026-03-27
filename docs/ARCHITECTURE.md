# Architecture

## Vista general

La arquitectura esta dividida en cinco capas:

1. Interfaz de usuario.
2. Estado de aplicacion.
3. Motor de reproduccion.
4. Motor de render/export.
5. Servicios de integracion.

## Capa de interfaz

Responsabilidades:

- Capturar intenciones del usuario.
- Reflejar estado actual del proyecto.
- Orquestar paneles, timeline, preview y modales.

Artefactos clave:

- Componentes editoriales en src/components/editor.
- Pantalla de orquestacion en src/pages/editor.

## Capa de estado

Responsabilidades:

- Centralizar reglas de mutacion del proyecto.
- Mantener seleccion, zoom y reproduccion.
- Persistir historial de acciones para undo/redo.

Implementacion:

- Store unico compuesto por slices especializados.

## Capa player

Responsabilidades:

- Avanzar playhead en tiempo real.
- Sincronizar video y audio activos.
- Minimizar jank durante transiciones entre clips.

Principios de diseno:

- Evitar rerender por frame.
- Usar referencias compartidas para lectura/escritura hot-path.
- Sincronizar store con frecuencia controlada.

## Capa engine

Responsabilidades:

- Convertir estado de editor a descripcion de render.
- Construir grafo de filtros para FFmpeg.
- Orquestar ciclo completo de exportacion.

Subflujos:

- Generacion de proxies de video para preview.
- Export final de proyecto a archivo descargable.

## Capa de servicios

Responsabilidades:

- Cliente HTTP unificado.
- Servicios de autenticacion y proyectos.
- Cache local de archivos por hash en IndexedDB.

## Flujo de datos principal

1. UI dispara accion de store.
2. Store muta estado de proyecto.
3. Player consume estado derivado para preview.
4. Engine consume estado para export.
5. Servicios persisten o cargan timeline y sesion.

## Decisiones de arquitectura importantes

1. Separacion entre metadata serializable y archivos binarios.
2. Uso de snapshots completos para historial.
3. Proxy de video para mejorar navegacion en timeline.
4. Fallback de export cuando hay errores de stream de audio.

## Trade-offs

1. Historial por snapshot simplifica consistencia, pero crece con el tamano del proyecto.
2. Resolucion de colisiones por track es clara, pero puede degradar en timelines muy densas.
3. Player basado en HTML media elements acelera entrega, pero exige sincronizacion fina manual.
