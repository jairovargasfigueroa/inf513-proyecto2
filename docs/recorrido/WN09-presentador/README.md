# WN09 · USN del Presentador / Conductor

Capturas para armar y revisar el diagrama **WN09** de `docs-web/Architech Prompt/prompt_navegacion_por_actor.md`. Solo aparece lo que este rol puede usar (matriz de `SeguridadSeeder.php`).

| Pantalla («client page») | Ruta | Captura | Formularios y acciones que este rol abre desde ella |
|---|---|---|---|
| `w.pg.Bienvenida` Bienvenida (menú del rol) | `/inicio` | [ver](pantallas/w.pg.Bienvenida.png) | — (solo consulta) |
| `w.pg.Perfil` Mi Perfil | `/perfil` | [ver](pantallas/w.pg.Perfil.png) | [FormularioPerfil](../formularios/w.frm.Perfil.png); [FormularioPreferencias](../formularios/w.frm.Preferencias.png) |
| `w.pg.Turnos` Gestión de Turnos | `/turnos` | [ver](pantallas/w.pg.Turnos.png) | — (solo consulta) |
| `w.pg.Agenda` Agenda de Coberturas | `/coberturas` | [ver](pantallas/w.pg.Agenda.png) | — (solo consulta) |
| `w.pg.DetalleCobertura` Detalle de Cobertura | `/coberturas/{id}` | [ver](pantallas/w.pg.DetalleCobertura.png) | — (solo consulta) |
| `w.pg.Hoja` Hoja de Asignación | `/coberturas/{id}/hoja` | [ver](pantallas/w.pg.Hoja.png) | — (solo consulta) |
| `w.pg.Notas` Gestión de Notas | `/notas` | [ver](pantallas/w.pg.Notas.png) | — (solo consulta) |
| `w.pg.DetalleNota` Detalle de Nota | `/notas/{id}` | [ver](pantallas/w.pg.DetalleNota.png) | — (solo consulta) |
| `w.pg.HistorialGuion` Historial del Guion | `/notas/{id}/historial` | [ver](pantallas/w.pg.HistorialGuion.png) | — (solo consulta) |
| `w.pg.Programas` Programas y Grilla | `/programas` | [ver](pantallas/w.pg.Programas.png) | — (solo consulta) |
| `w.pg.Plantillas` Plantillas de Emisión | `/plantillas` | [ver](pantallas/w.pg.Plantillas.png) | — (solo consulta) |
| `w.pg.Escaletas` Escaletas | `/escaletas` | [ver](pantallas/w.pg.Escaletas.png) | — (solo consulta) |
| `w.pg.EditorEscaleta` Editor de Escaleta | `/escaletas/{id}` | [ver](pantallas/w.pg.EditorEscaleta.png) | — (solo consulta) |
| `w.pg.Teleprompter` Vista del Presentador | `/escaletas/{id}/presentador` | [ver](pantallas/w.pg.Teleprompter.png) | — (solo consulta) |
| `w.pg.AccesoDenegado` Acceso denegado (ejemplo) | `ruta sin permiso` | [ver](pantallas/w.pg.AccesoDenegado.png) | — (solo consulta) |

Los formularios están en `../formularios/` (una sola copia para todos los actores: el modal es el mismo; cambia quién puede abrirlo). Cada captura de pantalla se tomó con la cuenta de prueba de este rol.
