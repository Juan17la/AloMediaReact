# Diagrama de clases lógico — Sistema de gestión de estudio de grabación

## 1. Clases de dominio

### 1.1 Usuario
**Descripción:** Representa a cualquier persona registrada en el sistema.

**Atributos:**
- id: UUID
- email: String
- nombres: String
- apellidos: String
- fechaNacimiento: Date
- contraseñaHash: String
- fotoPerfil: String
- estadoCuenta: EstadoCuenta
- fechaRegistro: DateTime
- ultimoAcceso: DateTime

**Métodos:**
- registrar(email: String, nombres: String, apellidos: String, fechaNacimiento: Date, contraseña: String): Usuario
- autenticar(email: String, contraseña: String): TokenSesion
- actualizarPerfil(nombres: String, apellidos: String, fotoPerfil: String): void
- cambiarContraseña(contraseñaActual: String, nuevaContraseña: String): void
- activarCuenta(): void
- desactivarCuenta(): void

---

### 1.2 Cliente
**Descripción:** Usuario que reserva salas, paga y califica sesiones.

**Herencia:** Cliente hereda de Usuario.

**Atributos:**
- historialPreferencias: String

**Métodos:**
- crearReserva(sala: Sala, fecha: Date, horaInicio: Time, horaFin: Time): Reserva
- cancelarReserva(reserva: Reserva, motivo: String): void
- calificarSesion(sesion: SesionGrabacion, estrellas: int, comentario: String): Calificacion
- verHistorialReservas(filtroEstado: EstadoReserva, desde: Date, hasta: Date): List<Reserva>

---

### 1.3 Productor
**Descripción:** Usuario que administra sesiones, responde reseñas y define su tarifa.

**Herencia:** Productor hereda de Usuario.

**Atributos:**
- especialidad: String
- tarifaPorHora: Decimal
- calificacionPromedio: Decimal
- descripcionPerfil: String

**Métodos:**
- asignarSesion(reserva: Reserva): SesionGrabacion
- responderCalificacion(calificacion: Calificacion, texto: String): RespuestaCalificacion
- actualizarTarifa(nuevaTarifa: Decimal): void
- actualizarEspecialidad(especialidad: String): void
- obtenerDisponibilidad(fecha: Date): List<FranjaHoraria>

---

### 1.4 Administrador
**Descripción:** Usuario con permisos de gestión y administración.

**Herencia:** Administrador hereda de Usuario.

**Atributos:**
- nivelAcceso: NivelAcceso

**Métodos:**
- crearSala(sala: Sala): void
- editarSala(sala: Sala): void
- gestionarUsuario(usuario: Usuario, accion: AccionUsuario): void
- generarReporte(tipo: TipoReporte, desde: Date, hasta: Date): Reporte
- consultarMetricas(desde: Date, hasta: Date): ListaMetricas

---

### 1.5 Sala
**Descripción:** Espacio físico que puede ser reservado para grabación o postproducción.

**Atributos:**
- id: UUID
- nombre: String
- tipo: TipoSala
- capacidad: int
- descripcion: String
- estado: EstadoSala
- tarifaBaseHora: Decimal

**Métodos:**
- actualizarDatos(nombre: String, tipo: TipoSala, capacidad: int, descripcion: String): void
- cambiarEstado(estado: EstadoSala): void
- verificarDisponibilidad(fecha: Date, horaInicio: Time, horaFin: Time): boolean
- obtenerReservas(fecha: Date): List<Reserva>

---

### 1.6 HorarioDisponibilidadSala
**Descripción:** Define las franjas horarias en las que una sala puede reservarse.

**Atributos:**
- id: UUID
- diaSemana: DiaSemana
- horaInicio: Time
- horaFin: Time
- activa: boolean

**Métodos:**
- activar(): void
- desactivar(): void
- validarFranja(horaInicio: Time, horaFin: Time): boolean

---

### 1.7 Reserva
**Descripción:** Compromiso de uso de una sala por un cliente en un rango horario.

**Atributos:**
- id: UUID
- fecha: Date
- horaInicio: Time
- horaFin: Time
- estado: EstadoReserva
- montoTotal: Decimal
- fechaCreacion: DateTime
- fechaCancelacion: DateTime
- motivoCancelacion: String

**Métodos:**
- confirmar(): void
- cancelar(motivo: String): void
- calcularMonto(tarifaHora: Decimal, horas: Decimal): Decimal
- validarSolapamiento(): boolean
- cambiarEstado(estado: EstadoReserva): void

---

### 1.8 SesionGrabacion
**Descripción:** Evento formal de grabación derivado de una reserva confirmada.

**Atributos:**
- id: UUID
- nombreSesion: String
- fechaInicio: DateTime
- fechaFin: DateTime
- estado: EstadoSesion
- notasTecnicas: String
- montoEstimado: Decimal
- timestampEstado: DateTime

**Métodos:**
- iniciar(): void
- finalizar(): void
- cancelar(): void
- actualizarNotasTecnicas(notas: String): void
- actualizarMontoEstimado(monto: Decimal): void
- reasignarSala(sala: Sala): void

---

### 1.9 Calificacion
**Descripción:** Valoración pública que un cliente hace sobre una sesión completada.

**Atributos:**
- id: UUID
- estrellas: int
- comentario: String
- fechaCreacion: DateTime
- esPublica: boolean

**Métodos:**
- validarEstrellas(): boolean
- editarComentario(comentario: String): void

---

### 1.10 RespuestaCalificacion
**Descripción:** Respuesta pública del productor a una calificación.

**Atributos:**
- id: UUID
- texto: String
- fechaRespuesta: DateTime

**Métodos:**
- editarRespuesta(texto: String): void

---

### 1.11 Pago
**Descripción:** Registro del estado financiero de una reserva.

**Atributos:**
- id: UUID
- estadoPago: EstadoPago
- montoTotal: Decimal
- fechaPago: DateTime
- metodoPago: MetodoPago

**Métodos:**
- marcarPagado(metodoPago: MetodoPago): void
- marcarPendiente(): void
- calcularTotal(horas: Decimal, tarifaHora: Decimal): Decimal

---

### 1.12 Notificacion
**Descripción:** Mensaje enviado al usuario por eventos del sistema.

**Atributos:**
- id: UUID
- tipo: TipoNotificacion
- mensaje: String
- leida: boolean
- fechaCreacion: DateTime

**Métodos:**
- enviar(destinatario: Usuario): void
- marcarComoLeida(): void

---

### 1.13 RestablecimientoContrasena
**Descripción:** Token temporal para recuperar acceso a una cuenta.

**Atributos:**
- id: UUID
- token: String
- fechaExpiracion: DateTime
- usado: boolean

**Métodos:**
- validarToken(): boolean
- marcarComoUsado(): void

---

### 1.14 TokenSesion
**Descripción:** Credencial temporal de autenticación.

**Atributos:**
- valor: String
- fechaExpiracion: DateTime
- recuerdaSesion: boolean

**Métodos:**
- esValido(): boolean

---

### 1.15 LogSistema
**Descripción:** Registro de acciones administrativas y eventos relevantes.

**Atributos:**
- id: UUID
- accion: String
- detalle: String
- fecha: DateTime
- usuarioResponsableId: UUID

**Métodos:**
- registrar(accion: String, detalle: String, usuarioResponsableId: UUID): void

---

## 2. Tipos enumerados

### 2.1 TipoSala
- GRABACION
- GRABACION_ACUSTICA
- POSTPRODUCCION

### 2.2 EstadoSala
- DISPONIBLE
- OCUPADA
- EN_MANTENIMIENTO
- FUERA_DE_SERVICIO

### 2.3 EstadoReserva
- PENDIENTE
- CONFIRMADA
- EN_CURSO
- COMPLETADA
- CANCELADA

### 2.4 EstadoSesion
- PROGRAMADA
- EN_PROGRESO
- COMPLETADA
- CANCELADA

### 2.5 EstadoCuenta
- ACTIVA
- INACTIVA
- BLOQUEADA
- PENDIENTE_CONFIRMACION

### 2.6 EstadoPago
- PAGADO
- PENDIENTE

### 2.7 NivelAcceso
- BASICO
- INTERMEDIO
- ALTO

### 2.8 TipoNotificacion
- CONFIRMACION_RESERVA
- CANCELACION_RESERVA
- RECORDATORIO_SESION
- NUEVA_CALIFICACION
- RESPUESTA_CALIFICACION
- RESTABLECIMIENTO_CONTRASENA

### 2.9 DiaSemana
- LUNES
- MARTES
- MIERCOLES
- JUEVES
- VIERNES
- SABADO
- DOMINGO

### 2.10 MetodoPago
- TARJETA
- TRANSFERENCIA
- EFECTIVO
- OTRO

### 2.11 TipoReporte
- OCUPACION_POR_SALA
- INGRESOS_POR_PERIODO
- ACTIVIDAD_DE_PRODUCTORES

### 2.12 AccionUsuario
- CREAR
- EDITAR
- ACTIVAR
- DESACTIVAR
- ELIMINAR
- CAMBIAR_ROL

---

## 3. Relaciones entre clases

### 3.1 Herencia
- **Usuario** es la superclase de **Cliente**, **Productor** y **Administrador**.
- Esto representa especialización por rol, no por interfaz de usuario.

### 3.2 Composición
- **Cliente** 1 --- 0..* **Reserva**.
- La **Reserva** pertenece al cliente; si el cliente se elimina, sus reservas quedan como historial o se anonimizan según política.
- **Reserva** 1 --- 1 **Pago**.
- El pago no existe sin la reserva.
- **Reserva** 1 --- 0..1 **SesionGrabacion**.
- La sesión nace a partir de una reserva confirmada.
- **SesionGrabacion** 1 --- 0..* **Calificacion**.
- En el modelo lógico se permite una calificación por cliente, pero la sesión como entidad puede almacenar el conjunto de calificaciones si el sistema creciera.
- **Calificacion** 1 --- 0..1 **RespuestaCalificacion**.
- Una calificación puede tener una sola respuesta.
- **Usuario** 1 --- 0..* **Notificacion**.
- Las notificaciones dependen del usuario receptor.
- **Usuario** 1 --- 0..* **RestablecimientoContrasena**.
- Los tokens de recuperación existen solo mientras son válidos.

### 3.3 Asociación
- **Productor** 1 --- 0..* **SesionGrabacion**.
- Un productor puede atender muchas sesiones.
- **Sala** 1 --- 0..* **Reserva**.
- Una sala puede tener muchas reservas en distintos horarios.
- **Sala** 1 --- 0..* **SesionGrabacion**.
- Una sesión ocurre en una sala asignada.
- **Reserva** 1 --- 1 **Sala**.
- Cada reserva selecciona una sola sala.
- **Reserva** 1 --- 1 **Productor**.
- La reserva se asocia al productor que presta el servicio.
- **Calificacion** 1 --- 1 **Productor**.
- Cada calificación impacta el perfil del productor.
- **Calificacion** 1 --- 1 **Cliente**.
- La reseña la emite un cliente.
- **LogSistema** se asocia a **Usuario** por el campo usuarioResponsableId.
- Es una asociación lógica de auditoría, no de propiedad.

### 3.4 Agrupación
- **Sala** 1 o--- 0..* **HorarioDisponibilidadSala**.
- El rombo **no relleno** apunta desde **Sala** hacia **HorarioDisponibilidadSala**.
- Significa que la sala agrupa franjas de disponibilidad, pero esas franjas pueden modelarse y administrarse de forma relativamente independiente.
- **Administrador** 1 o--- 0..* **LogSistema**.
- El rombo **no relleno** apunta desde **Administrador** hacia **LogSistema** cuando el administrador genera o provoca eventos auditables.
- **Productor** 1 o--- 0..* **Calificacion**.
- El rombo **no relleno** apunta desde **Productor** hacia **Calificacion**, porque el productor agrupa las reseñas que recibe, pero las reseñas tienen identidad propia.

### 3.5 Implementación
- No se propone una interfaz de “Dashboard”, porque no es un objeto del dominio.
- Si quieres representar comportamiento técnico, puedes usar una interfaz opcional:
  - **ITarificable** con método `calcularMonto(horas: Decimal): Decimal`
  - implementada por **Reserva** y **SesionGrabacion**.
  - **INotificable** con método `enviar(destinatario: Usuario): void`
  - implementada por **Notificacion**.

---

## 4. Observaciones de abstracción

- Se evitó usar clases ambiguas como **Dashboard**, **Panel** o **Catálogo**, porque no representan entidades del problema sino vistas o agregaciones de consulta.
- Las entidades centrales del dominio son: **Usuario, Cliente, Productor, Administrador, Sala, Reserva, SesionGrabacion, Calificacion, Pago y Notificacion**.
- Las funciones se modelaron como operaciones de las entidades para mantener el nivel lógico medio-bajo que pediste.
- Los estados se aislaron en enumeraciones para que el modelo sea claro y fácil de implementar.


# Ajuste del modelo lógico de clases

## 1. Usuario
**Métodos:**
- registrar(email: String, nombres: String, apellidos: String, fechaNacimiento: Date, contraseña: String): Usuario
- autenticar(email: String, contraseña: String): TokenSesion
- actualizarPerfil(nombres: String, apellidos: String, fotoPerfil: String): Usuario
- cambiarContraseña(contraseñaActual: String, nuevaContraseña: String): boolean
- activarCuenta(): Usuario
- desactivarCuenta(): Usuario

## 2. Cliente
**Métodos:**
- crearReserva(sala: Sala, fecha: Date, horaInicio: Time, horaFin: Time): Reserva
- cancelarReserva(reserva: Reserva, motivo: String?): Reserva
- calificarSesion(sesion: SesionGrabacion, estrellas: int, comentario: String?): Calificacion
- verHistorialReservas(filtroEstado: EstadoReserva?, desde: Date?, hasta: Date?): List<Reserva>

## 3. Productor
**Métodos:**
- asignarSesion(reserva: Reserva): SesionGrabacion
- responderCalificacion(calificacion: Calificacion, texto: String): RespuestaCalificacion
- actualizarTarifa(nuevaTarifa: Decimal): Productor
- actualizarEspecialidad(especialidad: String): Productor
- obtenerDisponibilidad(fecha: Date): List<FranjaHoraria>

## 4. Administrador
**Métodos:**
- crearSala(sala: Sala): Sala
- editarSala(sala: Sala): Sala
- gestionarUsuario(usuario: Usuario, accion: AccionUsuario): Usuario
- generarReporte(tipo: TipoReporte, desde: Date, hasta: Date): Reporte
- consultarMetricas(desde: Date, hasta: Date): ListaMetricas

## 5. Sala
**Métodos:**
- actualizarDatos(nombre: String, tipo: TipoSala, capacidad: int, descripcion: String): Sala
- cambiarEstado(estado: EstadoSala): EstadoSala
- verificarDisponibilidad(fecha: Date, horaInicio: Time, horaFin: Time): boolean
- obtenerReservas(fecha: Date): List<Reserva>

## 6. HorarioDisponibilidadSala
**Métodos:**
- activar(): HorarioDisponibilidadSala
- desactivar(): HorarioDisponibilidadSala
- validarFranja(horaInicio: Time, horaFin: Time): boolean

## 7. Reserva
**Métodos:**
- confirmar(): Reserva
- cancelar(motivo: String?): Reserva
- calcularMonto(tarifaHora: Decimal, horas: Decimal): Decimal
- validarSolapamiento(): boolean
- cambiarEstado(estado: EstadoReserva): EstadoReserva

## 8. SesionGrabacion
**Métodos:**
- iniciar(): SesionGrabacion
- finalizar(): SesionGrabacion
- cancelar(): SesionGrabacion
- actualizarNotasTecnicas(notas: String): SesionGrabacion
- actualizarMontoEstimado(monto: Decimal): Decimal
- reasignarSala(sala: Sala): Sala

## 9. Calificacion
**Métodos:**
- validarEstrellas(): boolean
- editarComentario(comentario: String): Calificacion
- calcularImpactoPromedio(promedioActual: Decimal, nuevaCalificacion: int): Decimal

## 10. RespuestaCalificacion
**Métodos:**
- editarRespuesta(texto: String): RespuestaCalificacion

## 11. Pago
**Métodos:**
- marcarPagado(metodoPago: MetodoPago): Pago
- marcarPendiente(): Pago
- calcularTotal(horas: Decimal, tarifaHora: Decimal): Decimal

## 12. Notificacion
**Métodos:**
- enviar(destinatario: Usuario): boolean
- marcarComoLeida(): Notificacion

## 13. RestablecimientoContrasena
**Métodos:**
- validarToken(): boolean
- marcarComoUsado(): RestablecimientoContrasena

## 14. TokenSesion
**Métodos:**
- esValido(): boolean