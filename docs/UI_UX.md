# UI and UX

## Objetivo de experiencia

Lograr una experiencia de edicion fluida, predecible y de baja friccion para tareas iterativas de montaje.

## Estructura visual del editor

1. Barra superior para acciones globales.
2. Biblioteca de medios a la izquierda.
3. Preview centrado con controles de transporte.
4. Inspector contextual en lateral derecho.
5. Timeline en la parte inferior.

Esta distribucion prioriza foco en preview y timeline, que son el nucleo del flujo.

## Patrones de interaccion

## Arrastre y suelta

- Importar archivos al panel de media.
- Insertar media a timeline por drag and drop.
- Reubicar clips entre posiciones y pistas.

## Seleccion contextual

- Al seleccionar clip, se habilita inspector segun tipo.
- Al deseleccionar, se reduce ruido visual.

## Feedback inmediato

- Estados pending, ready y error para proxies.
- Mensajeria de guardado y fallos por toast.
- Indicacion de carga de proyecto y errores de recuperacion.

## Atajos de productividad

El editor acelera operaciones repetitivas con teclado:

1. Reproduccion y pausa.
2. Undo y redo.
3. Copy, paste, cut y delete.
4. Split en playhead.
5. Zoom continuo.
6. Paso por frame.

Principio de seguridad UX:

- Los atajos se desactivan cuando el foco esta en un campo de texto editable.

## Diseño visual

1. Tema oscuro para sesiones largas.
2. Tokens de color centralizados para coherencia.
3. Jerarquia de contraste para distinguir informacion primaria y secundaria.
4. Transiciones breves para no interrumpir tareas de precision.

## Usabilidad del timeline

1. Grid temporal con escala variable.
2. Playhead persistente y visible.
3. Snapping para alineaciones frecuentes.
4. Prevencion de colisiones no intencionales.

## Usabilidad del preview

1. Controles de transporte directos.
2. Scrubber para salto rapido.
3. Timecode legible.
4. Overlay de transform para manipulacion directa.

## Modelo de calidad UX

La calidad percibida depende de:

1. Latencia baja al editar.
2. Coherencia entre accion y resultado.
3. Recuperacion clara ante error.
4. Visibilidad de estado del sistema.
