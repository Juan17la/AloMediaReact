# Video Editor Workflow

## Alcance

Este documento describe el flujo completo del editor: importacion, identificacion de medios, timeline, herramientas, preview, guardado y comparticion.

## Flujo de alto nivel

1. Inicializacion del editor.
2. Carga de proyecto remoto o nuevo proyecto.
3. Resolucion de medios locales por cache.
4. Edicion en timeline.
5. Preview y ajuste iterativo.
6. Guardado o export.

## Inicializacion y carga

Cuando la pantalla del editor abre:

1. Si existe identificador de proyecto, se consulta al backend.
2. Se deserializa timeline a modelo interno.
3. Se limpia estado previo de reproduccion e historial.
4. Se intenta recuperar archivos reales desde cache local por hash.
5. Se registran medios faltantes para relink.

## Importacion e identificacion de media

Entrada de media:

- Selector de archivos y drag and drop.

Pipeline de importacion:

1. Validar tipo aceptado.
2. Detectar categoria de media por MIME.
3. Calcular hash de contenido para deduplicacion.
4. Obtener duracion en recursos temporales cuando aplica.
5. Crear metadata de media en proyecto.
6. Guardar File en registro binario de sesion.

Para videos:

- Se dispara generacion de proxy asincrona.
- Se publica estado pending, ready o error para feedback en UI.

## Timeline

## Tracks

- Existen pistas de tipo video y audio.
- Orden de pista define prioridad visual y composicion.

## Clips

- Cada clip tiene rango temporal de timeline.
- Clips de media referencian un mediaId.
- Clips visuales incluyen transform.
- Clips audiovisuales soportan configuracion de audio y velocidad.

## Operaciones principales de timeline

1. Insertar media arrastrando o doble clic.
2. Mover clip entre posiciones y pistas.
3. Redimensionar duracion del clip.
4. Dividir clip en playhead.
5. Extraer audio de clip de video.
6. Eliminar clip.
7. Copiar y pegar con resolucion de solape.

## Colisiones y snapping

Al mover o insertar:

1. Se calcula inicio temporal propuesto.
2. Se detecta colision en la pista objetivo.
3. Si no hay colision, se aplica snapping por cercania.
4. Si hay colision, se busca posicion adyacente valida.

Objetivo UX:

- Evitar superposiciones no intencionales.
- Facilitar alineacion precisa con clips vecinos.

## Herramientas del editor

1. Undo y redo con snapshots.
2. Atajos de teclado para acciones frecuentes.
3. Zoom continuo de timeline con limites.
4. Step por frame para ajustes finos.

## Preview

## Reproduccion

- Avance de playhead por loop temporal independiente de React.
- Sincronizacion periodica de playhead al store.

## Video

- Doble buffer para transicion estable entre clips.
- Preload del siguiente clip durante playback.
- Correccion de drift temporal cuando se excede umbral.

## Audio

- Pool de elementos de audio por pista.
- Sincronizacion de velocidad, mute y volumen por clip activo.

## Composicion visual

- Resolucion de clip activo por orden de pista y tiempo.
- Aplicacion de transformaciones y ajustes de color en preview.

## Inspector

Cuando un clip esta seleccionado:

1. Panel contextual muestra controles segun tipo de clip.
2. Se permite editar transform, color, audio y velocidad.
3. Commit de transform alimenta historial.

## Guardado, compartir y estado dirty

Estado dirty:

- Se activa cuando el proyecto actual difiere del ultimo snapshot guardado.

Guardado:

1. Serializar timeline.
2. Enviar update o create al backend.
3. Actualizar referencia de proyecto guardado.
4. Persistir archivos en cache local por hash.

Comparticion:

- El proyecto se comparte por email mediante endpoint dedicado.

## Carga manual de proyecto JSON

1. Leer archivo JSON.
2. Validar estructura minima.
3. Reemplazar proyecto en store.
4. Intentar reconstruir archivos locales por hash.

## Resultado funcional del workflow

El editor mantiene separadas tres preocupaciones:

1. Edicion de datos de dominio.
2. Reproduccion en tiempo real.
3. Renderizado final para export.

Esta separacion hace que el flujo sea predecible para usuarios y mantenible para el equipo.
