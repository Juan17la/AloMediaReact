# Getting Started

## Que es AloMedia

AloMedia es un editor de video en navegador orientado a flujo no lineal con timeline multipista, preview en tiempo real y exportacion local con FFmpeg en WebAssembly.

## Stack principal

- Frontend: React + TypeScript + Vite.
- Estado: Zustand para estado de editor, React Query para consultas remotas.
- Video y audio: reproductor sincronizado por requestAnimationFrame.
- Export: FFmpeg.wasm cargado dinamicamente.

## Pasos de setup

1. Instalar dependencias del proyecto.
2. Configurar variables de entorno requeridas por API.
3. Levantar entorno de desarrollo.
4. Verificar autenticacion y acceso a rutas protegidas.

## Primer recorrido recomendado

1. Abrir dashboard.
2. Crear o cargar proyecto.
3. Importar un video y un audio.
4. Arrastrar medios a timeline.
5. Reproducir preview.
6. Exportar a mp4.

## Modelo mental para nuevos contribuidores

- El editor no dibuja todo por React en cada frame.
- El store representa estado de negocio y UI.
- La capa player sincroniza elementos HTML de media por frame.
- La capa engine transforma proyecto a job de render para FFmpeg.

## Reglas de oro para cambios

1. Si cambias tipos de clip, revisa store, preview, export y serializacion.
2. Mantener normalizacion temporal en precision de milisegundo.
3. Evitar agregar estados reactivos para objetos binarios grandes.
4. Documentar comportamiento nuevo en los archivos de esta carpeta.

## Errores comunes de onboarding

1. Probar export sin headers de aislamiento de origen en desarrollo.
2. Asumir que preview y export son identicos a nivel de color.
3. Olvidar que fileMap no vive en el arbol serializable del proyecto.
4. Modificar timeline sin considerar colisiones y snapping.

## Que leer despues

1. [ARCHITECTURE.md](ARCHITECTURE.md)
2. [VIDEO_EDITOR_WORKFLOW.md](VIDEO_EDITOR_WORKFLOW.md)
3. [FFMPEG_EXPORT.md](FFMPEG_EXPORT.md)
4. [DATA_STRUCTURES.md](DATA_STRUCTURES.md)
