# API Services Workflow

## Objetivo de la capa API

La capa API encapsula comunicacion con backend para que la UI no dependa de detalles HTTP ni de formateo de errores.

## Cliente HTTP unificado

La aplicacion utiliza un cliente comun con estas reglas:

1. Usa base URL desde entorno.
2. Envia credenciales del navegador en cada request.
3. Establece encabezados JSON por defecto.
4. Convierte respuestas de error a un error tipado de dominio.

Beneficios:

- Menos duplicacion de logica de red.
- Manejo de error consistente entre pantallas.
- Contrato estable para servicios de dominio.

## Modelo de errores

Errores API incluyen:

- Mensaje general.
- Status HTTP.
- Errores por campo para formularios.

Este contrato permite distinguir errores de validacion de errores de infraestructura.

## Servicio de autenticacion

Operaciones:

1. Iniciar sesion.
2. Registrar usuario.
3. Consultar sesion vigente.
4. Cerrar sesion.
5. Solicitar recuperacion de password.
6. Validar token de recuperacion.
7. Restablecer password.

Flujo funcional:

1. Usuario envia credenciales.
2. Backend responde datos de sesion.
3. Cliente actualiza estado de autenticacion.
4. Rutas protegidas reaccionan al estado.

## Servicio de proyectos

Operaciones:

1. Listado paginado de proyectos propios.
2. Listado paginado de proyectos compartidos.
3. Obtener proyecto por identificador.
4. Crear proyecto.
5. Actualizar proyecto.
6. Eliminar proyecto.
7. Compartir proyecto por correo.

Contrato de datos:

- El backend persiste timeline serializada.
- El frontend deserializa timeline a modelo de editor.

## Integracion con la UI

Uso principal:

- Dashboard para listar y navegar proyectos.
- Editor para cargar y guardar timeline.
- Modales para compartir.
- Formularios de auth y recuperacion.

## Riesgos y consideraciones

1. Doble fuente de verdad de sesion si se mezcla cookie y estado local sin reconcilio.
2. Errores no parseables deben tener fallback robusto.
3. Versionado de timeline debe ser compatible con cambios futuros de esquema.
