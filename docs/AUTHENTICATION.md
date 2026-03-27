# Authentication and Route Protection

## Objetivo

Garantizar que solo usuarios autenticados accedan a dashboard y editor, manteniendo experiencia fluida durante verificaciones de sesion.

## Componentes de autenticacion

1. Context provider de autenticacion.
2. Servicio de autenticacion para backend.
3. Rutas privadas y publicas con politica de redireccion.

## Ciclo de vida de sesion

1. Al montar la aplicacion, se verifica sesion actual con endpoint de perfil.
2. Si la sesion es valida, se hidrata usuario en contexto.
3. Si no es valida, la app queda en estado anonimo.
4. Login y registro actualizan estado de usuario.
5. Logout limpia estado local y termina sesion remota.

## Estados funcionales

1. isLoading: evita decisiones de navegacion antes de terminar verificacion.
2. isAuthenticated: determina acceso final.
3. user: perfil disponible para UI y permisos.

## Politica de rutas

Ruta privada:

- Si hay sesion activa, permite acceso.
- Si aun se verifica estado, espera.
- Si no hay sesion, redirige a login.

Ruta publica:

- Si hay sesion activa, evita login/register y redirige a dashboard.
- Si no hay sesion, muestra pantalla publica.

## Recuperacion de password

Flujo:

1. Solicitud de recuperacion con email.
2. Validacion de token de recuperacion.
3. Reset de password.

Este flujo desacopla identidad del estado de sesion actual.

## Decisiones de UX de autenticacion

1. Evitar parpadeos de rutas en arranque.
2. Responder con errores de campo cuando backend los reporta.
3. Mantener feedback de carga en operaciones de auth.

## Riesgos conocidos

1. Si el backend invalida sesion silenciosamente, se requiere reconcilio inmediato en la siguiente verificacion.
2. Si se confia solo en estado local y no en verificacion remota, puede haber falso positivo de autenticacion.
