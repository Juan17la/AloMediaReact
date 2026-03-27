# Configuration and Runtime

## Objetivo

Documentar decisiones de configuracion que impactan build, desarrollo local y ejecucion de export multimedia.

## Build y bundling

La aplicacion se construye con Vite y plugin React.

Implicaciones:

1. Ciclo de desarrollo rapido.
2. HMR eficiente para iteracion de UI.
3. Entorno moderno para TypeScript.

## Estilos y design tokens

Sistema de estilos:

1. Tailwind para utilidad composable.
2. Variables CSS para tokens de tema y editor.

Beneficio:

- Coherencia visual con puntos de cambio centralizados.

## React Query

Configuracion de cliente:

1. Retry de consultas desactivado para casos sensibles de auth.
2. Ventana de frescura configurada para reducir ruido de re-fetch.

## Requisitos para FFmpeg.wasm

Para compatibilidad de export robusta:

1. Encabezado Cross-Origin-Opener-Policy activo.
2. Encabezado Cross-Origin-Embedder-Policy activo.
3. Navegador compatible con WebAssembly moderno.

## Dependencias optimizadas

Dependencias FFmpeg se excluyen de pre-bundle por consideraciones de carga y entorno de ejecucion.

## Variables de entorno

Variable clave:

1. Base URL del backend para servicios API.

Recomendacion:

- Mantener separacion por ambientes de desarrollo, testing y produccion.

## Persistencia local

IndexedDB almacena cache de archivos por hash:

1. Mejora reapertura de proyectos.
2. Reduce friccion de relink.
3. Requiere politica de expiracion para evitar crecimiento no controlado.

## Consideraciones de despliegue

1. Verificar politica de headers en hosting final.
2. Garantizar disponibilidad de assets remotos de FFmpeg o mirror controlado.
3. Monitorear peso total y tiempos de inicializacion.
