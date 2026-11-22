# WN04 · USN del Jefe de Prensa

Capturas para armar y revisar el diagrama **WN04** de `docs-web/Architech Prompt/prompt_navegacion_por_actor.md`. Solo aparece lo que este rol puede usar (matriz de `SeguridadSeeder.php`).

| Pantalla («client page») | Ruta | Captura | Formularios y acciones que este rol abre desde ella |
|---|---|---|---|
| `w.pg.Bienvenida` Bienvenida (menú del rol) | `/inicio` | [ver](pantallas/w.pg.Bienvenida.png) | — (solo consulta) |
| `w.pg.Usuarios` Gestión de Usuarios | `/usuarios` | [ver](pantallas/w.pg.Usuarios.png) | — (solo consulta) |
| `w.pg.Perfil` Mi Perfil | `/perfil` | [ver](pantallas/w.pg.Perfil.png) | [FormularioPerfil](../formularios/w.frm.Perfil.png); [FormularioPreferencias](../formularios/w.frm.Preferencias.png) |
| `w.pg.Personal` Gestión de Personal | `/personal` | [ver](pantallas/w.pg.Personal.png) | [FormularioPersonal (nuevo)](../formularios/w.frm.Personal_nuevo.png); [FormularioPersonal (editar, con estado)](../formularios/w.frm.Personal_editar.png); [Confirmar desactivar ficha (submit DELETE)](../formularios/confirmar_desactivar_ficha.png) |
| `w.pg.Ausencias` Gestión de Ausencias | `/personal/ausencias` | [ver](pantallas/w.pg.Ausencias.png) | [FormularioAusencia](../formularios/w.frm.Ausencia.png) |
| `w.pg.Disponibilidad` Disponibilidad del Personal | `/personal/disponibilidad` | [ver](pantallas/w.pg.Disponibilidad.png) | — (solo consulta) |
| `w.pg.Turnos` Gestión de Turnos | `/turnos` | [ver](pantallas/w.pg.Turnos.png) | [FormularioTurno](../formularios/w.frm.Turno.png) |
| `w.pg.Recursos` Inventario de Recursos | `/recursos` | [ver](pantallas/w.pg.Recursos.png) | — (solo consulta) |
| `w.pg.Prestamos` Préstamos de Recursos | `/prestamos` | [ver](pantallas/w.pg.Prestamos.png) | — (solo consulta) |
| `w.pg.Agenda` Agenda de Coberturas | `/coberturas` | [ver](pantallas/w.pg.Agenda.png) | [FormularioCobertura (nueva)](../formularios/w.frm.Cobertura_nueva.png); [FormularioCobertura (reprogramar)](../formularios/w.frm.Cobertura_reprogramar.png); [Confirmar cancelar cobertura (submit DELETE)](../formularios/confirmar_cancelar_cobertura.png); [FormularioDuplicar](../formularios/w.frm.Duplicar.png) |
| `w.pg.DetalleCobertura` Detalle de Cobertura | `/coberturas/{id}` | [ver](pantallas/w.pg.DetalleCobertura.png) | [FormularioAsignacion](../formularios/w.frm.Asignacion.png); [FormularioReserva](../formularios/w.frm.Reserva.png); [FormularioRetorno](../formularios/w.frm.Retorno.png) |
| `w.pg.Hoja` Hoja de Asignación | `/coberturas/{id}/hoja` | [ver](pantallas/w.pg.Hoja.png) | — (solo consulta) |
| `w.pg.Notas` Gestión de Notas | `/notas` | [ver](pantallas/w.pg.Notas.png) | [FormularioNota (nueva)](../formularios/w.frm.Nota_nueva.png); [FormularioNota (editar)](../formularios/w.frm.Nota_editar.png) |
| `w.pg.DetalleNota` Detalle de Nota | `/notas/{id}` | [ver](pantallas/w.pg.DetalleNota.png) | [FormularioGuion](../formularios/w.frm.Guion.png); [FormularioRotulos](../formularios/w.frm.Rotulos.png); [FormularioObservacion](../formularios/w.frm.Observacion.png) |
| `w.pg.HistorialGuion` Historial del Guion | `/notas/{id}/historial` | [ver](pantallas/w.pg.HistorialGuion.png) | — (solo consulta) |
| `w.pg.Material` Material Audiovisual | `/notas/{id}/material` | [ver](pantallas/w.pg.Material.png) | — (solo consulta) |
| `w.pg.Programas` Programas y Grilla | `/programas` | [ver](pantallas/w.pg.Programas.png) | [FormularioPrograma](../formularios/w.frm.Programa.png); [FormularioHorario](../formularios/w.frm.Horario.png) |
| `w.pg.Plantillas` Plantillas de Emisión | `/plantillas` | [ver](pantallas/w.pg.Plantillas.png) | [FormularioPlantilla (nueva)](../formularios/w.frm.Plantilla_nueva.png); [FormularioPlantilla (configurar)](../formularios/w.frm.Plantilla_configurar.png); [FormularioCorte](../formularios/w.frm.Corte.png) |
| `w.pg.Escaletas` Escaletas | `/escaletas` | [ver](pantallas/w.pg.Escaletas.png) | [FormularioGenerarEscaleta](../formularios/w.frm.GenerarEscaleta.png) |
| `w.pg.EditorEscaleta` Editor de Escaleta | `/escaletas/{id}` | [ver](pantallas/w.pg.EditorEscaleta.png) | [FormularioItem (agregar)](../formularios/w.frm.Item_agregar.png); [FormularioItem (ajustar)](../formularios/w.frm.Item_ajustar.png); [Lista de control R31 al cerrar (422)](../formularios/lista_de_control_al_cerrar.png) |
| `w.pg.Teleprompter` Vista del Presentador | `/escaletas/{id}/presentador` | [ver](pantallas/w.pg.Teleprompter.png) | — (solo consulta) |
| `w.pg.Dashboard` Panel Analítico | `/panel` | [ver](pantallas/w.pg.Dashboard.png) | — (solo consulta) |
| `w.pg.Analitica` Analítica Periodística | `/analitica` | [ver](pantallas/w.pg.Analitica.png) | — (solo consulta) |
| `w.pg.Reportes` Reportes y Estadísticas | `/reportes` | [ver](pantallas/w.pg.Reportes.png) | — (solo consulta) |
| `w.pg.AccesoDenegado` Acceso denegado (ejemplo) | `ruta sin permiso` | [ver](pantallas/w.pg.AccesoDenegado.png) | — (solo consulta) |

Los formularios están en `../formularios/` (una sola copia para todos los actores: el modal es el mismo; cambia quién puede abrirlo). Cada captura de pantalla se tomó con la cuenta de prueba de este rol.
