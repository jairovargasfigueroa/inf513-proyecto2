# Ajustes al modelo durante la implementación

Cambios hechos en los modelos de Enterprise Architect (`Tecnoweb Diagramas.eap`, paquete
*Canal 11 - Sistema Web*) al implementar cada caso de uso. Sirven para actualizar el documento
al final: cada fila dice qué elemento cambió, qué se cambió y por qué.

| Fecha | CU | Elemento (diagrama de navegación) | Cambio | Motivo |
|---|---|---|---|---|
| 16/11/2026 | CU-01 | `FormularioUsuario` «form» | Se agrega el atributo `estado: select` (activo / inactivo), solo al editar. | Sin él, un usuario desactivado con `DELETE /usuarios/{id}` no se podía volver a activar. |
| 16/11/2026 | CU-02 | `FormularioPersonal` «form» | Se agrega `estado: select`, solo al editar. | Igual que en el CU-01: una ficha desactivada con `DELETE /personal/{id}` no se podía reactivar. |
| 16/11/2026 | CU-01 | `FormularioPerfil` «form» | Se agregan `passwordActual` y `passwordConfirmacion` (obligatorias solo al cambiar la contraseña). | Cambiar la contraseña sin pedir la actual permitiría que otra persona la cambie desde una sesión abierta. |

## Reglas de negocio que la implementación agrega al CU-01

Vienen del sistema vía correo (Proyecto 1) o protegen el acceso al sistema web:

- Nadie se desactiva ni se cambia el rol a sí mismo.
- Siempre queda al menos un Director activo y un Administrador activo.
- Solo un Administrador puede crear, modificar o desactivar cuentas con el rol Administrador.
- El rol Administrador no puede perder los permisos `seguridad.matriz.editar` ni `seguridad.menu`
  (si los perdiera, nadie podría volver a administrar la matriz ni el menú).
- Al desactivar un usuario se revocan sus sesiones abiertas.

## Reglas de negocio del CU-02 (vienen del sistema vía correo)

- Solo un usuario activo y sin ficha puede recibir una ficha de personal.
- La unidad académica es obligatoria para los practicantes y no se registra para los demás.
- Al desactivar una ficha o registrar una ausencia se avisa de las coberturas que la persona tiene
  en ese tiempo, para reasignarlas.
- Disponibilidad: personal activo, dentro de su turno (los nocturnos cruzan la medianoche), sin
  ausencia y sin otra cobertura planificada o en curso en ese momento.

## Reglas de negocio del CU-03 (vienen del sistema vía correo)

- R8: un recurso solo se entrega si está operativo y no tiene otra entrega abierta (409 «recurso no disponible»).
- R9: una incidencia lo pasa a mantenimiento, el alta lo devuelve a operativo y la baja es definitiva;
  cada paso queda en la tabla `mantenimiento`, que nunca se borra.
- R12: solo las unidades móviles llevan placa, y la placa no se repite.
- Un recurso entregado no se da de baja hasta registrar su devolución.
- Al reportar una incidencia o dar de baja se avisa de las coberturas que lo tenían reservado.

## Ajustes técnicos de la implementación

- La conexión a PostgreSQL usa la zona horaria `America/La_Paz` (`DB_TIMEZONE`): el servidor local
  estaba en GMT y las columnas `TIMESTAMP` con `CURRENT_TIMESTAMP` (bitácora, préstamos) quedaban 4 horas adelantadas.

## Reglas de negocio del CU-04 (vienen del sistema vía correo)

- R3: solo las coberturas planificadas o en curso ocupan al personal y los recursos.
- R6: una ausencia u otra cobertura que se cruza impide asignar a una persona (409); quedar fuera de su turno es solo una advertencia.
- R7: solo se reserva un recurso operativo y sin otra reserva que se cruce (409).
- L6: la función corresponde al cargo (conductor: también un presentador; periodista: también el Jefe de Prensa).
- Reprogramar vuelve a validar al equipo asignado; si algo choca, no se guarda.
- R4: el retorno, con cualquier resultado, libera al personal y los recursos y cierra las entregas de la cobertura.
  Solo lo registran el Jefe de Prensa o el personal asignado; «cumplida» exige que la cobertura haya empezado.
- Duplicar (nuevo en la web): copias diarias o semanales hasta una fecha (máximo 60), sin personal ni recursos.

## Reglas de negocio del CU-05 (vienen del sistema vía correo)

- R13: el slug (mayúsculas, números y guiones) no se repite en la misma fecha.
- R14: el sistema cuenta las palabras del guion y guarda cada versión; si cambia el guion de una
  nota aprobada, vuelve a revisión.
- R15: enviar a revisión desde borrador u observada (con guion); aprobar u observar solo una nota en
  revisión, y observar exige el motivo. Cada paso queda en `revision_nota`. Las transiciones
  inválidas responden 422, como dice el diagrama de navegación.
- A5: solo el autor o el Jefe de Prensa modifican la nota, su guion y sus rótulos.
- R25: la duración estimada es la lectura (palabras ÷ ritmo) más el video y el SOT del material.
- Para redactar se necesita una ficha de personal activa; una nota que está en una escaleta no se da de baja.

## Reglas de negocio del CU-06 (vienen del sistema vía correo)

- R16: un horario de grilla no cruza la medianoche (como máximo hasta 24:00).
- R17: un horario no choca con otro del mismo día si sus vigencias se cruzan (409).
- R18: una plantilla está lista con `cantidad_bloques − 1` cortes, numerados sin huecos, sin solaparse y dentro de la duración.
- R19: los cortes y la estructura de una plantilla no cambian mientras tenga escaletas en borrador.
- R20: una escaleta por horario y fecha; grilla y plantilla del mismo programa, fecha dentro del día y la vigencia, plantilla lista.
- R21: al generar la escaleta se crean sus cortes; no se agregan, mueven ni dan de baja a mano.
- R22: el orden es único dentro del bloque; reordenar renumera el bloque.
- R23 y R24: solo entran notas aprobadas y una nota no se repite en la misma emisión.
- R25 y R26: duración, acumulado, hora de salida y balance por bloque salen de las vistas; flotados y bajas no suman.
- Estados: borrador → cerrada (con la lista de control completa: 422 si no) → emitida (con hora y duración reales;
  sus notas pasan a emitidas). Una cerrada se puede reabrir.

## Diferencias con el documento que conviene revisar

- `onReordenar(arrastrar)` del Editor de Escaleta se implementa por ahora con botones de subir y bajar
  (accesibles con teclado); arrastrar y soltar queda en la etapa de extras.
- `exportar()` genera un archivo CSV (separado por punto y coma, con tildes para Excel).
