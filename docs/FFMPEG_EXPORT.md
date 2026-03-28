# FFmpeg Export Pipeline

## Objetivo

Convertir un proyecto editable de timeline en un archivo de video final descargable dentro del navegador.

## Principio operativo

El proceso de export no consume componentes de UI. Consume un contrato de datos de render derivado del proyecto.

## Fases del pipeline

## 1. Construccion del render job

1. Recorrer tracks y clips.
2. Convertir cada clip compatible a segmento de render.
3. Excluir segmentos no exportables.
4. Calcular duracion total del proyecto.
5. Adjuntar parametros de salida.

## 2. Escritura de entradas a filesystem virtual

1. Resolver mediaIds a archivos reales.
2. Escribir cada archivo unico en FS virtual de FFmpeg.
3. Reportar progreso parcial por cantidad de medios.

## 3. Construccion del filter graph

Conceptos clave:

1. Canvas base sintetico para componer video.
2. Segmentos visuales con trim, setpts, escala y filtros.
3. Segmentos de audio con atrim, velocidad, fades y delay.
4. Overlay de capas visuales por orden de pista.
5. Mezcla final de audio.

## 4. Encoding

1. Ejecutar FFmpeg con argumentos construidos.
2. Escuchar progreso de encoding.
3. Estimar tiempo restante segun avance.

## 5. Lectura de salida y limpieza

1. Leer archivo final generado.
2. Exponer blob para descarga local.
3. Eliminar temporales del FS virtual.

## Cancelacion

La exportacion soporta abort:

1. Señal externa de cancelacion.
2. Terminacion de proceso FFmpeg.
3. Limpieza para evitar residuos.

## Resiliencia

Si falla el primer intento de export por inconsistencias de stream de audio:

1. Se reconstruye grafo en modo de compatibilidad.
2. Se reintenta una sola vez.
3. Si vuelve a fallar, se reporta error estructurado.

## Proxies de video

Objetivo:

- Mejorar preview sin costo de decodificar fuente completa continuamente.

Caracteristicas:

1. Resolucion reducida.
2. Sin audio.
3. Cola serial para proteger instancia FFmpeg de proxy.

## Perfiles de salida

Cada formato define:

1. Codec de video.
2. Argumentos de calidad/velocidad.
3. Codec de audio.
4. MIME para descarga.

## Diferencia preview vs export

La preview usa capacidades de navegador y filtros CSS para velocidad de interaccion. La exportacion aplica filtros FFmpeg. Los resultados son cercanos, pero no estrictamente identicos en todos los casos.

## Requisitos de entorno

Para ejecucion estable de FFmpeg en navegador:

1. Encabezados de aislamiento de origen habilitados en servidor de desarrollo.
2. Soporte WebAssembly del navegador.
3. Recursos de memoria suficientes para proyectos grandes.
