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
