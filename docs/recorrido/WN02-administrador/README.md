# WN02 · USN del Administrador del Sistema

Capturas para armar y revisar el diagrama **WN02** de `docs-web/Architech Prompt/prompt_navegacion_por_actor.md`. Solo aparece lo que este rol puede usar (matriz de `SeguridadSeeder.php`).

| Pantalla («client page») | Ruta | Captura | Formularios y acciones que este rol abre desde ella |
|---|---|---|---|
| `w.pg.Bienvenida` Bienvenida (menú del rol) | `/inicio` | [ver](pantallas/w.pg.Bienvenida.png) | — (solo consulta) |
| `w.pg.Usuarios` Gestión de Usuarios | `/usuarios` | [ver](pantallas/w.pg.Usuarios.png) | [FormularioUsuario (nuevo)](../formularios/w.frm.Usuario_nuevo.png); [FormularioUsuario (editar, con estado)](../formularios/w.frm.Usuario_editar.png); [Confirmar desactivar usuario (submit DELETE)](../formularios/confirmar_desactivar_usuario.png) |
| `w.pg.Perfil` Mi Perfil | `/perfil` | [ver](pantallas/w.pg.Perfil.png) | [FormularioPerfil](../formularios/w.frm.Perfil.png); [FormularioPreferencias](../formularios/w.frm.Preferencias.png) |
| `w.pg.Matriz` Matriz de Accesos | `/seguridad/matriz` | [ver](pantallas/w.pg.Matriz.png) | — (solo consulta) |
| `w.pg.Menus` Menú Dinámico | `/seguridad/menu` | [ver](pantallas/w.pg.Menus.png) | [FormularioMenu (nuevo)](../formularios/w.frm.Menu_nuevo.png); [FormularioMenu (editar)](../formularios/w.frm.Menu_editar.png) |
| `w.pg.Dashboard` Panel Analítico | `/panel` | [ver](pantallas/w.pg.Dashboard.png) | — (solo consulta) |
| `w.pg.BitacoraComandos` Bitácora de Comandos | `/reportes/bitacora-comandos` | [ver](pantallas/w.pg.BitacoraComandos.png) | — (solo consulta) |
| `w.pg.Bitacora` Bitácora de Accesos | `/seguridad/bitacora` | [ver](pantallas/w.pg.Bitacora.png) | — (solo consulta) |
| `w.pg.AccesoDenegado` Acceso denegado (ejemplo) | `ruta sin permiso` | [ver](pantallas/w.pg.AccesoDenegado.png) | — (solo consulta) |

Los formularios están en `../formularios/` (una sola copia para todos los actores: el modal es el mismo; cambia quién puede abrirlo). Cada captura de pantalla se tomó con la cuenta de prueba de este rol.
