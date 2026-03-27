# Quality, Risks and Technical Limits

## Objetivo

Registrar riesgos actuales, impacto potencial y lineas de mitigacion para evolucion segura del producto.

## Riesgos de rendimiento

1. Historial por snapshot completo de proyecto.
- Impacto: costo creciente de CPU y memoria en proyectos grandes.
- Mitigacion: evaluar estrategia incremental o compresion de snapshots.

2. Resolucion de colisiones por recorrido lineal.
- Impacto: degradacion en timelines con alta densidad de clips.
- Mitigacion: indice por pista con busqueda mas eficiente.

3. Memoria viva de archivos en sesion.
- Impacto: presion de memoria con medios pesados.
- Mitigacion: politica de descarga selectiva y observabilidad de uso.

## Riesgos de consistencia temporal

1. Deriva numerica por flotantes en operaciones repetidas.
- Impacto: micro huecos o solapes no deseados.
- Mitigacion: mantener normalizacion a milisegundo y epsilon coherente.

2. Diferencia preview versus export.
- Impacto: discrepancia visual percibida en ajustes de color.
- Mitigacion: documentar tolerancia y calibrar presets.

## Riesgos de export

1. Cancelaciones en momentos criticos.
- Impacto: estado intermedio y necesidad de reinicializacion.
- Mitigacion: limpieza estricta y pruebas de cancelacion en carga alta.

2. Variabilidad de compatibilidad de codecs por navegador.
- Impacto: comportamiento no uniforme en edge cases.
- Mitigacion: matriz de pruebas por navegador y formato.

## Riesgos de producto y operacion

1. Falla de recuperacion de medios por cache local vacia.
- Impacto: relink manual frecuente.
- Mitigacion: mejor UX de relink y señales claras de faltantes.

2. Dependencia de recursos remotos de FFmpeg.
- Impacto: fallos en redes restringidas.
- Mitigacion: servir core desde infraestructura propia.

## Deuda tecnica documentada

1. Ausencia de estrategia formal de migracion de version de proyecto.
2. Cobertura parcial de casos limites en pistas muy complejas.
3. Necesidad de pruebas automatizadas especificas para export y player.

## Prioridades recomendadas

1. Definir versionado y migraciones de timeline.
2. Introducir pruebas automatizadas para sincronizacion temporal.
3. Mejorar observabilidad de tiempos de export y memoria en cliente.
4. Evaluar indices de clip por pista para escalar timelines grandes.
