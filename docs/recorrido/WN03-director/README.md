# WN03 · USN del Director

Capturas para armar y revisar el diagrama **WN03** de `docs-web/Architech Prompt/prompt_navegacion_por_actor.md`. Solo aparece lo que este rol puede usar (matriz de `SeguridadSeeder.php`).

| Pantalla («client page») | Ruta | Captura | Formularios y acciones que este rol abre desde ella |
|---|---|---|---|
| `w.pg.Bienvenida` Bienvenida (menú del rol) | `/inicio` | [ver](pantallas/w.pg.Bienvenida.png) | — (solo consulta) |
| `w.pg.Usuarios` Gestión de Usuarios | `/usuarios` | [ver](pantallas/w.pg.Usuarios.png) | [FormularioUsuario (nuevo)](../formularios/w.frm.Usuario_nuevo.png); [FormularioUsuario (editar, con estado)](../formularios/w.frm.Usuario_editar.png); [Confirmar desactivar usuario (submit DELETE)](../formularios/confirmar_desactivar_usuario.png) |
| `w.pg.Perfil` Mi Perfil | `/perfil` | [ver](pantallas/w.pg.Perfil.png) | [FormularioPerfil](../formularios/w.frm.Perfil.png); [FormularioPreferencias](../formularios/w.frm.Preferencias.png) |
| `w.pg.Matriz` Matriz de Accesos | `/seguridad/matriz` | [ver](pantallas/w.pg.Matriz.png) | — (solo consulta) |
| `w.pg.Personal` Gestión de Personal | `/personal` | [ver](pantallas/w.pg.Personal.png) | — (solo consulta) |
| `w.pg.Ausencias` Gestión de Ausencias | `/personal/ausencias` | [ver](pantallas/w.pg.Ausencias.png) | — (solo consulta) |
| `w.pg.Disponibilidad` Disponibilidad del Personal | `/personal/disponibilidad` | [ver](pantallas/w.pg.Disponibilidad.png) | — (solo consulta) |
| `w.pg.Turnos` Gestión de Turnos | `/turnos` | [ver](pantallas/w.pg.Turnos.png) | — (solo consulta) |
| `w.pg.Recursos` Inventario de Recursos | `/recursos` | [ver](pantallas/w.pg.Recursos.png) | — (solo consulta) |
| `w.pg.Agenda` Agenda de Coberturas | `/coberturas` | [ver](pantallas/w.pg.Agenda.png) | — (solo consulta) |
| `w.pg.DetalleCobertura` Detalle de Cobertura | `/coberturas/{id}` | [ver](pantallas/w.pg.DetalleCobertura.png) | — (solo consulta) |
| `w.pg.Notas` Gestión de Notas | `/notas` | [ver](pantallas/w.pg.Notas.png) | — (solo consulta) |
| `w.pg.DetalleNota` Detalle de Nota | `/notas/{id}` | [ver](pantallas/w.pg.DetalleNota.png) | — (solo consulta) |
| `w.pg.HistorialGuion` Historial del Guion | `/notas/{id}/historial` | [ver](pantallas/w.pg.HistorialGuion.png) | — (solo consulta) |
| `w.pg.Programas` Programas y Grilla | `/programas` | [ver](pantallas/w.pg.Programas.png) | — (solo consulta) |
| `w.pg.Plantillas` Plantillas de Emisión | `/plantillas` | [ver](pantallas/w.pg.Plantillas.png) | — (solo consulta) |
| `w.pg.Escaletas` Escaletas | `/escaletas` | [ver](pantallas/w.pg.Escaletas.png) | — (solo consulta) |
| `w.pg.EditorEscaleta` Editor de Escaleta | `/escaletas/{id}` | [ver](pantallas/w.pg.EditorEscaleta.png) | — (solo consulta) |
| `w.pg.Dashboard` Panel Analítico | `/panel` | [ver](pantallas/w.pg.Dashboard.png) | — (solo consulta) |
| `w.pg.Analitica` Analítica Periodística | `/analitica` | [ver](pantallas/w.pg.Analitica.png) | — (solo consulta) |
| `w.pg.Reportes` Reportes y Estadísticas | `/reportes` | [ver](pantallas/w.pg.Reportes.png) | — (solo consulta) |
| `w.pg.BitacoraComandos` Bitácora de Comandos | `/reportes/bitacora-comandos` | [ver](pantallas/w.pg.BitacoraComandos.png) | — (solo consulta) |
| `w.pg.Bitacora` Bitácora de Accesos | `/seguridad/bitacora` | [ver](pantallas/w.pg.Bitacora.png) | — (solo consulta) |
| `w.pg.AccesoDenegado` Acceso denegado (ejemplo) | `ruta sin permiso` | [ver](pantallas/w.pg.AccesoDenegado.png) | — (solo consulta) |

Los formularios están en `../formularios/` (una sola copia para todos los actores: el modal es el mismo; cambia quién puede abrirlo). Cada captura de pantalla se tomó con la cuenta de prueba de este rol.
