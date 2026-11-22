# Recorrido visual del sistema web por rol

Capturas de **todas las pantallas y formularios** del sistema web del Canal 11, tomadas el 22/11/2026 en local (`php artisan serve`, base `db_grupo14sa` con `datos_prueba.sql` y `DatosPruebaWebSeeder`), con las 8 cuentas de prueba. Sirven para **rearmar y verificar los diagramas de navegación** (W39 a W47 del prompt de Enterprise Architect; Fig. 43 a 51 del documento) contra lo que la aplicación hace realmente.

Las correcciones que resultan de comparar este recorrido con los diagramas actuales están en [`correccionesPrompt.md`](correccionesPrompt.md).

## Cómo está organizado

Hay una carpeta por diagrama de navegación. Cada archivo lleva el **id del elemento del diagrama** (`w.pg.*` para una «client page» y `w.frm.*` para un «form»), así que una captura se ubica directamente en el diagrama.

```
recorrido/
├── README.md                  este archivo
├── correccionesPrompt.md      cambios a W39–W47 del prompt de EA
├── scripts/                   scripts de Playwright para repetir las capturas
├── W39-navegacion-general/    pública, login, Bienvenida, búsqueda, 404, acceso denegado, apariencia y móvil
├── W40-cu01-usuarios/         usuarios, perfil, matriz de accesos y menú dinámico
├── W41-cu02-personal-turnos/  personal, ausencias, disponibilidad y turnos
├── W42-cu03-inventario-prestamos/
├── W43-cu04-coberturas/       agenda, detalle de cobertura y hoja de asignación
├── W44-cu05-notas-material/   notas, detalle, historial del guion y material
├── W45-cu06-plantillas-escaleta/  programas y grilla, plantillas, escaletas, editor y presentador
├── W46-cu07-analitica/        panel analítico y analítica periodística
└── W47-cu08-reportes-bitacoras/   reportes, bitácora de comandos y bitácora de accesos
```

Dentro de cada carpeta:

| Subcarpeta | Contenido | Nombre del archivo |
|---|---|---|
| `pantallas/` | Cada «client page» vista con **cada rol que tiene acceso**. Al comparar los roles se ve qué botones (enlaces y submits del diagrama) aparecen según el permiso | `<id>__<rol>.png`, página completa a 1366 px |
| `formularios/` | Cada «form» abierto **sin enviar**, y las confirmaciones (desactivar, dar de baja, cancelar) y avisos (lista de control) que el diagrama modela como «submit» o «redirect» | `<id>_<variante>.png` |
| `apariencia/`, `movil/` | Solo en W39: temas Niños, Jóvenes y Adultos en día y noche, letra grande, y la vista a 390 px | — |

Roles: `visitante` (sin sesión), `administrador`, `director`, `jefe-prensa`, `jefe-area-tecnica`, `periodista` (Carla Rojas), `camarografo` (Jorge Mendoza), `editora-video` (Patricia Saucedo) y `presentadora` (Mariana Terceros). Ids de ejemplo: cobertura 2, nota 6 (nota 3 para observar) y escaleta 1.

## Cómo rearmar un diagrama de navegación con esto

1. Abrir la carpeta del diagrama. Cada id de `pantallas/` es una «client page» y cada `w.frm.*` de `formularios/` es un «form». Las Fig. 43 a 51 deberían tener exactamente esos elementos, más los «server page» (controladores) que llaman.
2. **Enlaces («link»):** cada botón o enlace visible en la captura que lleva a otra pantalla o abre un formulario es una relación «link». Los botones de volver («← Notas», «← Agenda», etc.) también cuentan.
3. **Envíos («submit»):** cada botón Guardar o Confirmar de un formulario es un «submit» hacia su controlador. La ruta exacta de la API está en `correccionesPrompt.md`.
4. **Respuestas («redirect»):** 201/200 vuelven a la pantalla, 409 (regla de negocio) y 422 (dato inválido) se quedan en el formulario con el mensaje, y 403 muestra `w.pg.AccesoDenegado`.
5. **Guardas:** si una captura de un rol muestra un botón que otra no muestra, ese enlace lleva guarda `[permiso]`. Los permisos están en el Anexo B y en `database/seeders/SeguridadSeeder.php`.

## Índice de capturas por diagrama

### `W39-navegacion-general/`

| Elemento del diagrama | Ruta | Capturas |
|---|---|---|
| `w.pg.AccesoDenegado` «client page» | `cualquier ruta sin permiso` | `pantallas/w.pg.AccesoDenegado__*.png`: administrador__analitica, camarografo__panel, director__coberturas_2_hoja, editora-video__panel, jefe-area-tecnica__panel, jefe-prensa__reportes_bitacora-comandos, periodista__panel, presentadora__panel |
| `w.pg.Bienvenida` «client page» | `/inicio` | `pantallas/w.pg.Bienvenida__*.png`: administrador, camarografo, director, editora-video, jefe-area-tecnica, jefe-prensa, periodista, presentadora |
| `w.pg.Inicio` «client page» | `/` | `pantallas/w.pg.Inicio__*.png`: visitante |
| `w.pg.NoEncontrada` «client page» | `* (ruta inexistente)` | `pantallas/w.pg.NoEncontrada__*.png`: visitante |
| `w.pg.Resultados` «client page» | `/buscar?q=` | `pantallas/w.pg.Resultados__*.png`: jefe-prensa |
| `w.frm.Busqueda` «form» | encabezado | `formularios/w.frm.Busqueda__sugerencias.png` |
| `w.frm.Login` «form» | `/login` | `formularios/w.frm.Login_422-credenciales__visitante.png` |
| `w.frm.Login` «form» | `/login` | `formularios/w.frm.Login__visitante.png` |
| (apariencia) | — | `apariencia/apariencia__adultos_oscuro.png`, `apariencia/apariencia__jovenes_claro.png`, `apariencia/apariencia__jovenes_oscuro.png`, `apariencia/apariencia__letra_grande.png`, `apariencia/apariencia__ninos_claro.png`, `apariencia/apariencia__ninos_oscuro.png` |
| (movil) | — | `movil/movil__coberturas-2-hoja.png`, `movil/movil__coberturas.png`, `movil/movil__escaletas-1.png`, `movil/movil__inicio.png`, `movil/movil__notas.png`, `movil/movil__panel.png` |

### `W40-cu01-usuarios/`

| Elemento del diagrama | Ruta | Capturas |
|---|---|---|
| `w.pg.Matriz` «client page» | `/seguridad/matriz` | `pantallas/w.pg.Matriz__*.png`: administrador, director |
| `w.pg.Menus` «client page» | `/seguridad/menu` | `pantallas/w.pg.Menus__*.png`: administrador |
| `w.pg.Perfil` «client page» | `/perfil` | `pantallas/w.pg.Perfil__*.png`: administrador, camarografo, director, editora-video, jefe-area-tecnica, jefe-prensa, periodista, presentadora |
| `w.pg.Usuarios` «client page» | `/usuarios` | `pantallas/w.pg.Usuarios__*.png`: administrador, director, jefe-prensa |
| `confirmar_desactivar_usuario` confirmación / aviso | modal | `formularios/confirmar_desactivar_usuario.png` |
| `w.frm.Menu` «form» | modal | `formularios/w.frm.Menu_editar.png` |
| `w.frm.Menu` «form» | modal | `formularios/w.frm.Menu_nuevo.png` |
| `w.frm.Perfil` «form» | modal | `formularios/w.frm.Perfil.png` |
| `w.frm.Preferencias` «form» | modal | `formularios/w.frm.Preferencias.png` |
| `w.frm.Usuario` «form» | modal | `formularios/w.frm.Usuario_editar.png` |
| `w.frm.Usuario` «form» | modal | `formularios/w.frm.Usuario_nuevo.png` |

### `W41-cu02-personal-turnos/`

| Elemento del diagrama | Ruta | Capturas |
|---|---|---|
| `w.pg.Ausencias` «client page» | `/personal/ausencias` | `pantallas/w.pg.Ausencias__*.png`: director, jefe-prensa |
| `w.pg.Disponibilidad` «client page» | `/personal/disponibilidad` | `pantallas/w.pg.Disponibilidad__*.png`: director, jefe-area-tecnica, jefe-prensa |
| `w.pg.Personal` «client page» | `/personal` | `pantallas/w.pg.Personal__*.png`: director, jefe-area-tecnica, jefe-prensa |
| `w.pg.Turnos` «client page» | `/turnos` | `pantallas/w.pg.Turnos__*.png`: camarografo, director, editora-video, jefe-area-tecnica, jefe-prensa, periodista, presentadora |
| `confirmar_desactivar_ficha` confirmación / aviso | modal | `formularios/confirmar_desactivar_ficha.png` |
| `w.frm.Ausencia` «form» | modal | `formularios/w.frm.Ausencia.png` |
| `w.frm.Personal` «form» | modal | `formularios/w.frm.Personal_editar.png` |
| `w.frm.Personal` «form» | modal | `formularios/w.frm.Personal_nuevo.png` |
| `w.frm.Turno` «form» | modal | `formularios/w.frm.Turno.png` |

### `W42-cu03-inventario-prestamos/`

| Elemento del diagrama | Ruta | Capturas |
|---|---|---|
| `w.pg.Prestamos` «client page» | `/prestamos` | `pantallas/w.pg.Prestamos__*.png`: jefe-area-tecnica, jefe-prensa |
| `w.pg.Recursos` «client page» | `/recursos` | `pantallas/w.pg.Recursos__*.png`: camarografo, director, jefe-area-tecnica, jefe-prensa |
| `confirmar_baja_recurso` confirmación / aviso | modal | `formularios/confirmar_baja_recurso.png` |
| `w.frm.Devolucion` «form» | modal | `formularios/w.frm.Devolucion.png` |
| `w.frm.Incidencia` «form» | modal | `formularios/w.frm.Incidencia.png` |
| `w.frm.Prestamo` «form» | modal | `formularios/w.frm.Prestamo_entrega.png` |
| `w.frm.Recurso` «form» | modal | `formularios/w.frm.Recurso_editar.png` |
| `w.frm.Recurso` «form» | modal | `formularios/w.frm.Recurso_nuevo.png` |

### `W43-cu04-coberturas/`

| Elemento del diagrama | Ruta | Capturas |
|---|---|---|
| `w.pg.Agenda` «client page» | `/coberturas` | `pantallas/w.pg.Agenda__*.png`: camarografo, director, editora-video, jefe-area-tecnica, jefe-prensa, periodista, presentadora |
| `w.pg.DetalleCobertura` «client page» | `/coberturas/{id}` | `pantallas/w.pg.DetalleCobertura__*.png`: camarografo, director, editora-video, jefe-area-tecnica, jefe-prensa, periodista, presentadora |
| `w.pg.Hoja` «client page» | `/coberturas/{id}/hoja` | `pantallas/w.pg.Hoja__*.png`: camarografo, jefe-area-tecnica, jefe-prensa, periodista, presentadora |
| `confirmar_cancelar_cobertura` confirmación / aviso | modal | `formularios/confirmar_cancelar_cobertura.png` |
| `w.frm.Asignacion` «form» | modal | `formularios/w.frm.Asignacion.png` |
| `w.frm.Cobertura` «form» | modal | `formularios/w.frm.Cobertura_nueva.png` |
| `w.frm.Cobertura` «form» | modal | `formularios/w.frm.Cobertura_reprogramar.png` |
| `w.frm.Duplicar` «form» | modal | `formularios/w.frm.Duplicar.png` |
| `w.frm.Reserva` «form» | modal | `formularios/w.frm.Reserva.png` |
| `w.frm.Retorno` «form» | modal | `formularios/w.frm.Retorno.png` |

### `W44-cu05-notas-material/`

| Elemento del diagrama | Ruta | Capturas |
|---|---|---|
| `w.pg.DetalleNota` «client page» | `/notas/{id}` | `pantallas/w.pg.DetalleNota__*.png`: director, editora-video, jefe-prensa, periodista, presentadora |
| `w.pg.HistorialGuion` «client page» | `/notas/{id}/historial` | `pantallas/w.pg.HistorialGuion__*.png`: director, editora-video, jefe-prensa, periodista, presentadora |
| `w.pg.Material` «client page» | `/notas/{id}/material` | `pantallas/w.pg.Material__*.png`: camarografo, editora-video, jefe-prensa, periodista |
| `w.pg.Notas` «client page» | `/notas` | `pantallas/w.pg.Notas__*.png`: director, editora-video, jefe-prensa, periodista, presentadora |
| `w.frm.Guion` «form» | modal | `formularios/w.frm.Guion.png` |
| `w.frm.Material` «form» | modal | `formularios/w.frm.Material_estado.png` |
| `w.frm.Material` «form» | modal | `formularios/w.frm.Material_registrar.png` |
| `w.frm.Nota` «form» | modal | `formularios/w.frm.Nota_editar.png` |
| `w.frm.Nota` «form» | modal | `formularios/w.frm.Nota_nueva.png` |
| `w.frm.Observacion` «form» | modal | `formularios/w.frm.Observacion.png` |
| `w.frm.Rotulos` «form» | modal | `formularios/w.frm.Rotulos.png` |

### `W45-cu06-plantillas-escaleta/`

| Elemento del diagrama | Ruta | Capturas |
|---|---|---|
| `w.pg.EditorEscaleta` «client page» | `/escaletas/{id}` | `pantallas/w.pg.EditorEscaleta__*.png`: director, editora-video, jefe-prensa, periodista, presentadora |
| `w.pg.Escaletas` «client page» | `/escaletas` | `pantallas/w.pg.Escaletas__*.png`: director, editora-video, jefe-prensa, periodista, presentadora |
| `w.pg.Plantillas` «client page» | `/plantillas` | `pantallas/w.pg.Plantillas__*.png`: director, jefe-prensa, presentadora |
| `w.pg.Programas` «client page» | `/programas` | `pantallas/w.pg.Programas__*.png`: camarografo, director, editora-video, jefe-area-tecnica, jefe-prensa, periodista, presentadora |
| `w.pg.Teleprompter` «client page» | `/escaletas/{id}/presentador` | `pantallas/w.pg.Teleprompter__*.png`: jefe-prensa, presentadora |
| `lista_de_control_al_cerrar` confirmación / aviso | modal | `formularios/lista_de_control_al_cerrar.png` |
| `w.frm.Corte` «form» | modal | `formularios/w.frm.Corte.png` |
| `w.frm.GenerarEscaleta` «form» | modal | `formularios/w.frm.GenerarEscaleta.png` |
| `w.frm.Horario` «form» | modal | `formularios/w.frm.Horario.png` |
| `w.frm.Item` «form» | modal | `formularios/w.frm.Item_agregar.png` |
| `w.frm.Item` «form» | modal | `formularios/w.frm.Item_ajustar.png` |
| `w.frm.Plantilla` «form» | modal | `formularios/w.frm.Plantilla_configurar.png` |
| `w.frm.Plantilla` «form» | modal | `formularios/w.frm.Plantilla_nueva.png` |
| `w.frm.Programa` «form» | modal | `formularios/w.frm.Programa.png` |

### `W46-cu07-analitica/`

| Elemento del diagrama | Ruta | Capturas |
|---|---|---|
| `w.pg.Analitica` «client page» | `/analitica` | `pantallas/w.pg.Analitica__*.png`: director, jefe-prensa |
| `w.pg.Dashboard` «client page» | `/panel` | `pantallas/w.pg.Dashboard__*.png`: administrador, director, jefe-prensa |

### `W47-cu08-reportes-bitacoras/`

| Elemento del diagrama | Ruta | Capturas |
|---|---|---|
| `w.pg.BitacoraComandos` «client page» | `/reportes/bitacora-comandos` | `pantallas/w.pg.BitacoraComandos__*.png`: administrador, director |
| `w.pg.Bitacora` «client page» | `/seguridad/bitacora` | `pantallas/w.pg.Bitacora__*.png`: administrador, director |
| `w.pg.Reportes` «client page» | `/reportes` | `pantallas/w.pg.Reportes__*.png`: director, jefe-area-tecnica, jefe-prensa |

## Lo que no está capturado

- **`w.frm.Emision` (FormularioEmision, CU-06):** solo se abre en una escaleta **cerrada**, y los datos de prueba no tienen ninguna; la escaleta 1 no pasa la lista de control (ver `W45…/formularios/lista_de_control_al_cerrar.png`). Para capturarlo: corregir los pendientes, cerrar la escaleta y pulsar «Registrar emisión».
- **`w.frm.Periodo` (CU-07) y `w.frm.FiltroReporte` (CU-08)** no son modales: están dentro de sus pantallas (`w.pg.Dashboard`, `w.pg.Analitica` y `w.pg.Reportes`).
- **Alto contraste:** la captura automática no lo activó y se borró. Se verificó a mano que funciona y que se conserva al recargar.
- **`w.pg.Material` del Camarógrafo:** se capturó entrando por la URL, porque ese rol no tiene una ruta desde el menú (no tiene `notas.listar`).

## Repetir el recorrido

Con el sistema corriendo en `http://localhost:8000` y los datos de prueba cargados:

```bash
npm i playwright@1.49.1     # en una carpeta aparte; usa el Chrome instalado (channel: 'chrome')
node scripts/capturar.mjs    # pantallas por rol, temas y móvil → img/
node scripts/formularios.mjs # formularios abiertos sin enviar → form/
node scripts/buscar.mjs      # resultados de búsqueda
```

Los scripts escriben en `img/` y `form/` junto a ellos. Después hay que renombrar los archivos con la convención de arriba. Ojo: `capturar.mjs` cambia las preferencias de apariencia de la cuenta del Jefe de Prensa.
