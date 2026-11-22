# Correcciones al prompt de EA: diagramas de navegación W39–W47

Este archivo corrige la **sección 7** de `docs-web/Architech Prompt/prompt_diagramas_uml_web.md` para los diagramas de navegación (Fig. 43 a 51 del documento), de modo que queden **1:1 con el sistema implementado** (`inf513-proyecto2`, revisado el 22/11/2026).

El contraste se hizo de tres formas: con el recorrido visual de esta carpeta, con el código (rutas de `App.jsx`, botones, enlaces y llamadas de cada pantalla, `routes/api.php`, controladores y FormRequests) y con las figuras del PDF del 15/11. Las Fig. 44 a 51 tienen los mismos elementos y relaciones que el prompt; solo cambia la distribución (la Fig. 49 está partida en dos mitades). En la Fig. 43, las pantallas de la franja de módulos **muestran sus operaciones** aunque el prompt dice ocultarlas: hay que ocultarlas en EA.

## Cómo usarlo con el agente de EA

1. Pegar como contexto el prompt completo y, después, este archivo.
2. Pedir un diagrama por vez: «Aplica las correcciones de W41 de `correccionesPrompt.md` sobre el diagrama existente W41; no lo recrees».
3. Respetar el orden **W39 → W47**, porque hay elementos que pasan a crearse antes (ver «Cambios en cadena»).
4. Exportar cada PNG a `docs-web/imagenes/Wxx.png` y volver a generar el documento.

Formato: el mismo de la sección 7. «**se crea aquí**» indica que el elemento nace en ese diagrama; «creado en Wyy: solo agregarlo» que se reutiliza. Las posiciones son x, y, ancho, alto. Lo marcado **(revisar)** es una decisión de diseño, no un error del código.

## Decisiones generales

- **Códigos de respuesta.** Toda regla de negocio responde **409** (`ReglaNegocioException`), un dato inválido **422** (FormRequest) y la falta de permiso **403**, que muestra `w.pg.AccesoDenegado`. Los «redirect» que hoy dicen 422 para una regla de negocio pasan a 409.
- **Tras el login** la SPA va a `/inicio` (Bienvenida), no al Panel Analítico.
- `GET /api/v1/estado` (chequeo de salud) **no va** en navegación, porque ninguna pantalla lo llama.
- «Página no encontrada» y «Acceso denegado» **sí van** en W39: el usuario llega a ellas navegando.
- **Los ajustes aceptados del 16/11** (`docs/ajustes-al-modelo.md`) quedan incluidos: `estado` en FormularioUsuario y FormularioPersonal, contraseñas en FormularioPerfil y menú de Reportes con dos permisos.

## Cambios en cadena (orden de creación)

| Elemento | Hoy se crea en | Pasa a crearse en | Cambiar después en |
|---|---|---|---|
| `w.srv.GrillaController` | W45 | **W39** | W45 → «creado en W39: solo agregarlo» |
| `w.pg.Bienvenida` (nuevo) | — | **W39** | W40 lo agrega |
| `w.pg.NoEncontrada`, `w.pg.AccesoDenegado` (nuevos) | — | **W39** | — |
| `w.pg.BitacoraComandos` | W47 | **W39** (opción de menú nueva) | W47 → «creado en W39: solo agregarlo» |
| `w.frm.Emision` (nuevo) | — | **W45** | — |

## Resumen

| Diagrama | Figura | Estado | Cambios principales |
|---|---|---|---|
| W39 General | 43 | Corregir (19) | Bienvenida, 404, Acceso denegado, GrillaController, enlaces de los resultados de búsqueda, guarda de Reportes |
| W40 CU-01 | 44 | Corregir (9) | `estado` en Usuario, contraseñas en Perfil, icono como select, 409 en las reglas |
| W41 CU-02 | 45 | Corregir (12) | `estado` en Personal, `descripcion` en Turno, botón «Ausencias», selects que llaman a la API |
| W42 CU-03 | 46 | Corregir (7) | `responsableId`, el origen de los tipos de recurso, 409 |
| W43 CU-04 | 47 | Corregir (12) | Retorno con fecha y hora, selects de personal y recursos, botones de volver, 409 |
| W44 CU-05 | 48 | Corregir (13) | Campos reales de Nota, Guion y Material; la nota nueva va al detalle; botones de volver; guarda del material |
| W45 CU-06 | 49 | Corregir (23) | **FormularioEmision**, Editor → Presentador, reabrir, reordenar con PUT, campos reales (minutos y segundos) |
| W46 CU-07 | 50 | Corregir (5) | Atajos de período, últimos 30 días, guarda de «Ver detalle» |
| W47 CU-08 | 51 | Corregir (14) | El filtro **navega** a la Vista del Reporte, que hace el GET; guardas de las bitácoras |

---

### W39 · Diagrama de Navegación General (Fig. 43)
**Estado:** Corregir (19 cambios)

**Elementos a agregar:**
- `w.srv.GrillaController` · Class · GrillaController · 850, 40, 240, 72 · «server page» · **se crea aquí**
  - operaciones: +index(): JSON; +store(): JSON
- `w.pg.Bienvenida` · Class · Bienvenida (inicio con sesión) · 1120, 428, 240, 72 · «client page» · valores etiquetados ruta = /inicio, permiso = — (con sesión) · **se crea aquí**
  - operaciones: +mostrarAccesos(menu): void; +render(): void
- `w.pg.NoEncontrada` · Class · Página no encontrada · 580, 540, 240, 56 · «client page» · valores etiquetados ruta = * · **se crea aquí**
  - operaciones: +volverAlInicio(): void; +render(): void
- `w.pg.AccesoDenegado` · Class · Acceso denegado · 850, 540, 240, 56 · «client page» · valores etiquetados ruta = cualquier ruta sin el permiso (la pinta RutaPrivada) · **se crea aquí**
  - operaciones: +render(): void
  - Las dos van en una segunda fila (y = 540) sobre la franja de módulos (y = 670); el lienzo alcanza.

**Elementos a modificar:**
- `w.pg.Reportes` → valores etiquetados permiso = reportes.ver | reportes.mantenimiento, grupo_menu = Gerencia.
- **`w.pg.BitacoraComandos` pasa a crearse aquí** (en la franja de módulos, 580, 1000, 240, 60, ocultar operaciones) · valores etiquetados permiso = bitacora.ver, grupo_menu = Seguridad. En W47 pasa a «creado en W39: solo agregarlo». Es la opción de menú agregada el 22/11 (C7).
- Franja de módulos (`w.pg.Dashboard` … `w.pg.Bitacora`): ocultar las operaciones en EA, como ya dice el prompt (la Fig. 43 las muestra).

**Relaciones a modificar:**
- «redirect» · `w.srv.AuthController` → `w.pg.Panel` «200 + token» → **destino `w.pg.Bienvenida`**, nombre «200 + token → /inicio (o la pantalla que pidió el login)».
- «redirect» · `w.srv.AuthController` → `w.frm.Login` «422 credenciales inválidas» → nombre «422 credenciales inválidas o cuenta desactivada».
- «submit» · `w.frm.Busqueda` → `w.srv.BusquedaController` → nombre «GET /api/v1/busqueda?q=&limite=4 (sugerir)».
- «link» · `w.pg.Panel` → `w.pg.Reportes` → guarda [reportes.ver | reportes.mantenimiento].

**Relaciones a agregar:**
- Association «link» · `w.pg.Inicio` → `w.srv.GrillaController` · dirigida · nombre «GET /api/v1/grilla»
- Association «redirect» · `w.srv.GrillaController` → `w.pg.Inicio` · dirigida · nombre «200 grilla del día»
- Association «link» · `w.frm.Busqueda` → `w.pg.Resultados` · dirigida · nombre «Enter: /buscar?q=»
- Association «link» · `w.pg.Resultados` → `w.srv.BusquedaController` · dirigida · nombre «GET /api/v1/busqueda?q=&limite=20»
- Association «link» · `w.pg.Resultados` → `w.pg.Recursos` · dirigida · nombre «Abrir: /recursos?buscar=» · guarda [recursos.listar]
- Association «link» · `w.pg.Resultados` → `w.pg.Personal` · dirigida · nombre «Abrir: /personal?buscar=» · guarda [personal.listar]
- Association «link» · `w.pg.Resultados` → `w.pg.Programas` · dirigida · nombre «Abrir: /programas» · guarda [programas.listar]
- Association «link» · `w.pg.Panel` → `w.pg.Bienvenida` · dirigida · nombre «Logotipo Canal 11 (/inicio)»
- Association «link» · `w.pg.NoEncontrada` → `w.pg.Inicio` · dirigida · nombre «Volver al inicio»
- Association «link» · `w.pg.Panel` → `w.pg.BitacoraComandos` · dirigida · nombre «Menú: Seguridad › Bitácora de Comandos» · guarda [bitacora.ver]
- Association «link» · `w.pg.Panel` → `w.pg.AccesoDenegado` · dirigida · nombre «Ruta sin permiso (403)» · guarda [¬permiso de la pantalla]
- (opcional) Association «redirect» · `w.srv.VisitaController` → `w.pg.Footer` · dirigida · nombre «200 total de visitas»
- **(revisar)** Los resultados de coberturas y notas abren `/coberturas/{id}` y `/notas/{id}`, que son `w.pg.DetalleCobertura` (W43) y `w.pg.DetalleNota` (W44). Hay dos opciones: crearlos en W39 y cambiar W43 y W44 a «creado en W39», o mencionarlo en «Cuidar».

**Agregar a «Cuidar»:** Bienvenida muestra accesos directos a las mismas opciones del menú del rol. Sin sesión, RutaPrivada lleva a /login y, tras el login, vuelve a la pantalla pedida. Un 401 (token vencido o cuenta desactivada) borra la sesión y lleva al login con aviso.

**Evidencia:** App.jsx:61, 87-92, 109 · Login.jsx:45 · AuthController.php:47-57 · Bienvenida.jsx:11-23 · Layout.jsx:48 · Inicio.jsx:20 · routes/api.php:48 · GrillaController.php:20, 56 · BuscadorGlobal.jsx:28, 59 · ResultadosBusqueda.jsx:24, 50 · Buscador.php:33, 48, 66, 82, 96 · NoEncontrada.jsx:8 · RutaPrivada.jsx:15-23 · api.js:29-35 · SeguridadSeeder.php:109. Capturas: `W39-navegacion-general/`.

---

### W40 · Diagrama de Navegación del CU-01 Gestión de Usuarios (Fig. 44)
**Estado:** Corregir (9 cambios)

**Elementos a agregar:**
- `w.pg.Bienvenida` · Class · Bienvenida (inicio con sesión) · 40, 660, 240, 72 · «client page» · creado en W39: solo agregarlo
  - operaciones: +mostrarAccesos(menu): void; +render(): void

**Elementos a modificar:**
- `w.frm.Usuario` · Class · FormularioUsuario · 310, 234, 240, **200** · «form»
  - campos y operaciones: -nombre: string; -apellido: string; -ci: string; -correo: email; -telefono: string; -password: password; -rolId: int; **-estado: select (solo al editar)**; +validar(): boolean; +enviar(): void
- `w.frm.Perfil` · Class · FormularioPerfil · 580, 234, 240, **168** · «form»
  - campos y operaciones: -nombre: string; -apellido: string; -telefono: string; **-passwordActual: password**; -password: password; **-passwordConfirmacion: password**; +validar(): boolean; +enviar(): void (las dos nuevas son obligatorias solo al cambiar la contraseña)
- `w.frm.Menu` → `-icono: string` pasa a `-icono: select`.

**Relaciones a modificar:**
- «redirect» · `w.srv.AuthController` → `w.pg.Panel` «200 + token» → igual que en W39: destino `w.pg.Bienvenida`.
- «redirect» · `w.srv.UsuarioController` → `w.pg.Usuarios` → nombre «201 / 200 / 409 regla de negocio / 422».
- «redirect» · `w.srv.PermisoController` → `w.pg.Matriz` → nombre «200 / 409 el Administrador no pierde los permisos de seguridad».
- «redirect» · `w.srv.MenuController` → `w.pg.Menus` → nombre «201 / 200 / 422».

**Relaciones a agregar:**
- Association «link» · `w.pg.Usuarios` → `w.srv.RolController` · dirigida · nombre «GET /api/v1/roles (filtro por rol)» · guarda [roles.listar]
- Association «submit» · `w.pg.Panel` → `w.srv.PerfilController` · dirigida · nombre «PUT /api/v1/perfil/preferencias (tema, modo, letra y contraste del encabezado)»

**Evidencia:** ajustes-al-modelo.md:10, 15 · FormularioUsuario.jsx:10, 96-106 · MiPerfil.jsx:83, 129-131 · PerfilRequest.php:30-31 · AdministrarMenu.jsx:218 · GestionUsuarios.jsx:30 · ThemeContext.jsx:65 · ReglasUsuarios.php:25, 36 · PermisoController.php:53. Capturas: `W40-cu01-usuarios/`.

---

### W41 · Diagrama de Navegación del CU-02 Personal, Turnos y Disponibilidad (Fig. 45)
**Estado:** Corregir (12 cambios)

**Elementos a agregar:**
- `w.srv.UsuarioController` · Class · UsuarioController · 850, 40, 240, 104 · «server page» · creado en W40: solo agregarlo
  - operaciones: +index(): JSON; +store(): JSON; +update(): JSON; +destroy(): JSON

**Elementos a modificar:**
- `w.frm.Personal` · alto **184** · campos y operaciones: -usuarioId: int (solo al crear); -cargo: select; -condicionLaboral: select; -unidadAcademica: string (solo practicantes); -turnoId: int; -fechaIngreso: date; **-estado: select (solo al editar)**; +validar(): boolean; +enviar(): void
- `w.frm.Turno` · alto **152** · campos y operaciones: -nombre: string; -horaInicio: time; -horaFin: time; -dias: checkbox (lunes a domingo, se envían como «1,2,…»); **-descripcion: string**; +validar(): boolean; +enviar(): void
- `w.frm.Ausencia` → `-motivo: text`.
- `w.pg.Personal` · alto **152** · operaciones: +listar(filtros): void; +onNuevo(): void; +onEditar(id): void; +onDesactivar(id): void; +verAusencias(id): void; **+verTodasLasAusencias(): void; +verDisponibilidad(): void**; +render(): void
- `w.pg.Ausencias` · operaciones: +listar(personalId, vigentes): void; +onNueva(): void; +render(): void

**Relaciones a modificar:**
- «link» · `w.pg.Personal` → `w.pg.Ausencias` → nombre «Ausencias (encabezado) / Ver ausencias (fila: ?personal_id=)» · guarda [ausencias.listar]
- «link» · `w.pg.Personal` → `w.pg.Disponibilidad` → guarda [personal.disponibilidad]
- «link» · `w.pg.Disponibilidad` → `w.srv.PersonalController` → nombre «GET /api/v1/personal/disponibilidad?fecha=&hora=&cargo=» · **(revisar)** cambiar a «submit», porque es un formulario de búsqueda
- «redirect» · `w.srv.PersonalController` → `w.pg.Personal` → nombre «201 / 200 / 409 usuario o ficha inactiva / 422»
- «redirect» · `w.srv.TurnoController` → `w.pg.Turnos` → nombre «201 / 422»

**Relaciones a agregar:**
- Association «link» · `w.frm.Personal` → `w.srv.UsuarioController` · dirigida · nombre «GET /api/v1/usuarios?sin_ficha=1&estado=activo»
- Association «link» · `w.pg.Ausencias` → `w.srv.PersonalController` · dirigida · nombre «GET /api/v1/personal?todos=1&estado=activo»
- Association «link» · `w.pg.Ausencias` → `w.pg.Personal` · dirigida · nombre «Personal (volver)»
- Association «link» · `w.pg.Disponibilidad` → `w.pg.Personal` · dirigida · nombre «Personal (volver)»

**Evidencia:** ajustes-al-modelo.md:11 · GestionPersonal.jsx:57, 82, 85, 123, 152, 181-195 · GestionTurnos.jsx:50, 86-99 · GestionAusencias.jsx:28, 32, 51, 60, 113 · DisponibilidadPersonal.jsx:27, 41, 47-50 · PersonalController.php:62, 83. Capturas: `W41-cu02-personal-turnos/`.

---

### W42 · Diagrama de Navegación del CU-03 Inventario y Préstamos (Fig. 46)
**Estado:** Corregir (7 cambios)

**Elementos a agregar:**
- `w.srv.PersonalController` · Class · PersonalController · 850, 40, 240, 120 · «server page» · creado en W41: solo agregarlo
  - operaciones: +index(): JSON; +store(): JSON; +update(): JSON; +destroy(): JSON; +disponibilidad(): JSON
- **(revisar)** `w.srv.CoberturaController` en 1120, 40, 240, 168. Agregarlo obliga a ampliar el lienzo a 1430 × 806 y a crearlo en W42, de modo que W43 pase a «creado en W42». La otra opción es no dibujarlo y mencionarlo en «Cuidar».

**Elementos a modificar:**
- `w.frm.Prestamo` (FormularioEntrega) · campos y operaciones: -recursoId: int; **-responsableId: int**; -coberturaId: int; -observaciones: text; +validar(): boolean; +enviar(): void

**Relaciones a modificar:**
- «link» · `w.frm.Recurso` → `w.srv.TipoRecursoController` → **origen `w.pg.Recursos`** (la pantalla pide los tipos y se los pasa al formulario), nombre «GET /api/v1/tipos-recurso».
- «redirect» · `w.srv.RecursoController` → `w.pg.Recursos` → nombre «201 / 200 / 409 dado de baja, entregado o no en mantenimiento / 422».
- «redirect» · `w.srv.PrestamoController` → `w.pg.Prestamos` → nombre «201 / 200 / 409 recurso no disponible / 422».

**Relaciones a agregar:**
- Association «link» · `w.frm.Prestamo` → `w.srv.RecursoController` · dirigida · nombre «GET /api/v1/recursos?todos=1&estado=operativo»
- Association «link» · `w.frm.Prestamo` → `w.srv.PersonalController` · dirigida · nombre «GET /api/v1/personal?todos=1&estado=activo»
- (solo si se agrega el elemento) Association «link» · `w.frm.Prestamo` → `w.srv.CoberturaController` · dirigida · nombre «GET /api/v1/coberturas?fecha=&vista=semana»

**Evidencia:** PrestamosRecursos.jsx:80, 92-94, 117 · PrestamoController.php:57-58, 65, 68, 71, 88 · InventarioRecursos.jsx:39, 108, 116 · RecursoController.php:69, 80, 96, 109, 129. Capturas: `W42-cu03-inventario-prestamos/`.

---

### W43 · Diagrama de Navegación del CU-04 Planificar Coberturas (Fig. 47)
**Estado:** Corregir (12 cambios)

**Elementos a agregar:**
- `w.srv.PersonalController` · Class · PersonalController · 850, 40, 240, 120 · «server page» · creado en W41: solo agregarlo
- `w.srv.RecursoController` · Class · RecursoController · 1120, 40, 240, 136 · «server page» · creado en W42: solo agregarlo
  - operaciones: +index(): JSON; +store(): JSON; +update(): JSON; +destroy(): JSON; +incidencia(): JSON; +alta(): JSON

**Elementos a modificar:**
- `w.frm.Retorno` · campos y operaciones: -estado: select (cumplida / cancelada / reprogramada); **-fechaRetorno: datetime**; -parte: text (obligatoria si se cumplió); -incidencias: text; +validar(): boolean; +enviar(): void
- `w.pg.Agenda` · operaciones: +listar(fecha, vista, estado, tipo): void; +onNueva(): void; +onEditar(id): void; +onCancelar(id): void; +onDuplicar(id): void; +verDetalle(id): void; +render(): void

**Relaciones a modificar:**
- «link» · `w.pg.Agenda` → `w.srv.CoberturaController` → nombre «GET /api/v1/coberturas?fecha=&vista= · GET /api/v1/coberturas/{id} (al reprogramar)».
- «redirect» · `w.srv.CoberturaController` → `w.pg.Agenda` → nombre «201 / 200 / 409 conflicto / 422».
- «redirect» · `w.srv.AsignacionPersonalController` → `w.pg.DetalleCobertura` → nombre «201 / 200 / 409 conflicto».
- «redirect» · `w.srv.ReservaRecursoController` → `w.pg.DetalleCobertura` → nombre «201 / 200 / 409 conflicto».
- «redirect» · `w.srv.CoberturaController` → `w.pg.DetalleCobertura` (retorno) → nombre «200 retorno registrado y recursos liberados / 409 ya registrado, no autorizado o no empezó / 422».

**Relaciones a agregar:**
- Association «link» · `w.frm.Asignacion` → `w.srv.PersonalController` · dirigida · nombre «GET /api/v1/personal?todos=1 · GET /api/v1/personal/disponibilidad?fecha=&hora=»
- Association «link» · `w.frm.Reserva` → `w.srv.RecursoController` · dirigida · nombre «GET /api/v1/recursos?todos=1&estado=operativo»
- Association «link» · `w.pg.DetalleCobertura` → `w.pg.Agenda` · dirigida · nombre «Agenda (volver)»
- Association «link» · `w.pg.Hoja` → `w.pg.DetalleCobertura` · dirigida · nombre «Detalle (volver)»

**Evidencia:** DetalleCobertura.jsx:73, 159, 162, 209, 238-263 · HojaAsignacion.jsx:33 · AgendaCoberturas.jsx:48, 60, 145-146 · CoberturaController.php:95, 167, 174, 177-185, 188 · AsignacionPersonalController.php:75, 84 · ReservaRecursoController.php:47, 56. Capturas: `W43-cu04-coberturas/`.

---

### W44 · Diagrama de Navegación del CU-05 Notas, Material y Aprobación (Fig. 48)
**Estado:** Corregir (13 cambios)

**Elementos a agregar:**
- `w.srv.CoberturaController` · Class · CoberturaController · 850, 40, 240, 60 · «server page» · en este diagrama ocultar sus operaciones · creado en W43: solo agregarlo

**Elementos a modificar:**
- `w.frm.Nota` · Class · FormularioNota · 40, 330, 240, 184 · «form» · campos y operaciones: -slug: string; -titulo: string; -tipo_pieza: select; -fecha: date; -cobertura_id: select; -guion: textarea (solo al crear); +contarPalabras(): int; +validar(): boolean; +enviar(): void
- `w.frm.Guion` · Class · FormularioGuion · 310, 330, 240, 104 · «form» · campos y operaciones: -guion: textarea; +contarPalabras(): int; +validar(): boolean; +enviar(): void
- `w.frm.Material` · Class · FormularioMaterial · 1120, 330, 240, 152 · «form» · campos y operaciones: -descripcion: string; -tipo: select; -duracion: text (mm:ss; la API recibe segundos); -ubicacion: string; -estado: select; +validar(): boolean; +enviar(): void

**Relaciones a modificar:**
- «link» · `w.pg.Notas` → `w.srv.NotaController` → nombre «GET /api/v1/notas?buscar&estado&fecha&mias · GET /api/v1/notas/{id} (al editar)».
- «redirect» · `w.srv.NotaController` → `w.pg.Notas` → nombre «200 modificada o dada de baja · 409 nota en escaleta o no editable».
- «redirect» · `w.srv.NotaController` → `w.pg.DetalleNota` → nombre «201 nota nueva → detalle · 200 · 409 no editable · 422 transición inválida».
- «redirect» · `w.srv.RotuloController` → `w.pg.DetalleNota` → nombre «200 / 409 no editable / 422».
- «link» · `w.pg.DetalleNota` → `w.pg.Material` → guarda [material.listar].

**Relaciones a agregar:**
- Association «link» · `w.frm.Nota` → `w.srv.CoberturaController` · dirigida · nombre «GET /api/v1/coberturas?fecha&vista=semana (select de cobertura)»
- Association «link» · `w.pg.DetalleNota` → `w.pg.Notas` · dirigida · nombre «Notas»
- Association «link» · `w.pg.HistorialGuion` → `w.pg.DetalleNota` · dirigida · nombre «Nota»
- Association «link» · `w.pg.Material` → `w.pg.DetalleNota` · dirigida · nombre «Nota»
- (opcional) Association «redirect» · `w.srv.MaterialController` → `w.frm.Material` · dirigida · nombre «422 datos inválidos»

**Matriz (cambio del 22/11, C1):** el Camarógrafo ahora tiene `notas.listar`, así que llega al Material por Gestión de Notas → Detalle de Nota. El diagrama no cambia; solo el Anexo B, que ya está actualizado.

**Evidencia:** GestionNotas.jsx:33, 49-56, 107, 126, 134-135, 139, 153 · NotaRequest.php:28-34 · DetalleNota.jsx:67, 69, 146, 157 · HistorialGuion.jsx:86 · MaterialAudiovisual.jsx:51, 63-71, 88 · MaterialController.php:21 · NotaController.php:90, 96, 109, 159, 162, 200, 208-211 · RotuloController.php:32, 36. Capturas: `W44-cu05-notas-material/`.

---

### W45 · Diagrama de Navegación del CU-06 Plantillas y Escaleta (Fig. 49)
**Estado:** Corregir (23 cambios) · **Lienzo:** de 1700 × 854 a **1940 × 854** (una columna nueva en x = 1660).

**Elementos a agregar:**
- `w.srv.NotaController` · Class · NotaController · 1660, 40, 240, 60 · «server page» · en este diagrama ocultar sus operaciones · creado en W44: solo agregarlo
- `w.srv.PersonalController` · Class · PersonalController · 1660, 130, 240, 60 · «server page» · en este diagrama ocultar sus operaciones · creado en W41: solo agregarlo
- `w.frm.Emision` · Class · FormularioEmision · 1660, 266, 240, 104 · «form» · **se crea aquí**
  - campos y operaciones: -hora_inicio_real: time; -minutos: int (duración real; la API recibe duracion_real en segundos); +validar(): boolean; +enviar(): void

**Elementos a modificar:**
- `w.srv.GrillaController` → «creado en W39: solo agregarlo» (cambio en cadena).
- `w.srv.EscaletaController` · alto 136 · operaciones: +index(): JSON; +show(): JSON; +store(): JSON; +estado(): JSON; +lectura(): JSON; +exportar(): CSV
- `w.frm.Programa` · campos y operaciones: -nombre: string; -tipo: select; -descripcion: textarea; +validar(): boolean; +enviar(): void
- `w.frm.Horario` · alto 168 · campos y operaciones: -programa_id: select; -dia_semana: select; -hora_inicio: time; -hora_fin: text (HH:MM, hasta 24:00); -vigente_desde: date; -vigente_hasta: date; +validar(): boolean; +enviar(): void
- `w.frm.Plantilla` · alto 152 · campos y operaciones: -programa_id: select; -nombre: string; -minutos: int (la API recibe duracion_total en segundos); -cantidad_bloques: int; -palabras_por_minuto: int; +validar(): boolean; +enviar(): void
- `w.frm.Corte` · campos y operaciones: -numero: int; -minuto_inicio: int; -duracion: int (segundos); +validar(): boolean; +enviar(): void
- `w.frm.GenerarEscaleta` · alto 136 · campos y operaciones: -fecha: date; -grilla_id: select; -plantilla_id: select; +cargarOpciones(fecha): void; +validar(): boolean; +enviar(): void
- `w.frm.Item` · alto 184 · campos y operaciones: -bloque: select; -orden: int (vacío = al final); -tipo: select; -nota_id: select; -titulo: string; -presentador_id: select; -duracion_estimada: int (segundos); +validar(): boolean; +enviar(): void
- `w.pg.EditorEscaleta` · alto 264 · operaciones: +cargar(id): void; +verTiemposPorBloque(): void; +verListaDeControl(): void; +onAgregarItem(bloque): void; +onAjustarItem(id): void; +onReordenar(arrastrar | subir/bajar): void; +onFlotar(id): void; +onDarDeBaja(id): void; +onCerrar(): void; **+onReabrir(): void; +onRegistrarEmision(): void**; +exportar(): void; **+abrirPresentador(): void**; +render(): void
- `w.pg.Teleprompter` · alto 152 · operaciones: +cargar(escaletaId): void; +iniciarAvance(): void; +pausar(): void; +volverAlInicio(): void; +ajustarVelocidad(v): void; +ajustarFuente(p): void; +render(): void

**Relaciones a agregar:**
- Association «link» · `w.pg.Plantillas` → `w.srv.ProgramaController` · dirigida · nombre «GET /api/v1/programas (select de programa)»
- Association «link» · `w.frm.GenerarEscaleta` → `w.srv.EscaletaController` · dirigida · nombre «GET /api/v1/escaletas?fecha (horarios y plantillas listas)»
- Association «link» · `w.frm.Item` → `w.srv.NotaController` · dirigida · nombre «GET /api/v1/notas?estado=aprobada&todos=1»
- Association «link» · `w.frm.Item` → `w.srv.PersonalController` · dirigida · nombre «GET /api/v1/personal?todos=1&estado=activo (presentadores)»
- Association «link» · `w.pg.EditorEscaleta` → `w.frm.Emision` · dirigida · nombre «Registrar emisión»
- Association «submit» · `w.frm.Emision` → `w.srv.EscaletaController` · dirigida · nombre «PUT /api/v1/escaletas/{id}/estado {estado: emitida}»
- Association «link» · `w.pg.EditorEscaleta` → `w.pg.Teleprompter` · dirigida · nombre «Modo presentador» · guarda [escaletas.lectura]
- Association «link» · `w.pg.Teleprompter` → `w.pg.EditorEscaleta` · dirigida · nombre «Escaleta»
- Association «link» · `w.pg.EditorEscaleta` → `w.pg.Escaletas` · dirigida · nombre «Escaletas»

**Relaciones a modificar:**
- «link» · `w.pg.Programas` → `w.srv.GrillaController` → nombre «GET /api/v1/grilla?vista=semana».
- «redirect» · `w.srv.PlantillaController` → `w.pg.Plantillas` → nombre «201 / 200 + tiempo neto · 409 R19 o cortes de sobra».
- «redirect» · `w.srv.CorteController` → `w.pg.Plantillas` → nombre «201 / 200 + tiempo neto · 409 R19 o corte fuera de la duración».
- «redirect» · `w.srv.EscaletaController` → `w.pg.EditorEscaleta` «201 → editor» → nombre «201 → editor (409 R20 queda en el formulario)».
- «link» · `w.pg.Escaletas` → `w.srv.EscaletaController` → nombre «GET /api/v1/escaletas?fecha (±7 días)».
- «link» · `w.pg.Escaletas` → `w.pg.Teleprompter` → guarda [escaletas.lectura].
- «link» · `w.pg.EditorEscaleta` → `w.srv.EscaletaController` → nombre «GET /api/v1/escaletas/{id} · GET /api/v1/escaletas/{id}/exportar (CSV)».
- «submit» · `w.pg.EditorEscaleta` → `w.srv.EscaletaController` «PUT …/estado» → nombre «PUT /api/v1/escaletas/{id}/estado (cerrar · reabrir)».
- «redirect» · `w.srv.EscaletaController` → `w.pg.EditorEscaleta` → nombre «200 cerrada, reabierta o emitida · 422 lista de control incompleta (al cerrar) · 409 transición inválida».
- «submit» · `w.pg.EditorEscaleta` → `w.srv.ItemEscaletaController` → nombre «PUT /api/v1/items/{id} (reordenar) · POST /api/v1/items/{id}/flotar · DELETE /api/v1/items/{id}».
- «redirect» · `w.srv.ItemEscaletaController` → `w.pg.EditorEscaleta` → nombre «201 / 200 + balance del bloque · 409 regla (R22 a R24, solo en borrador)».

**Corregir también en W06, la nota del CU-06 y el texto:** el include se llama «Verificar lista de control **antes de cerrar**», no «antes de emitir» (`EscaletaController.php:143`).

**Evidencia:** EditorEscaleta.jsx:23-34, 82-99, 116, 118, 127, 130, 131, 138-143, 187-193, 204, 227, 235-247, 269, 283-301 · EscaletaController.php:72-84, 136, 138, 143-144, 179-200 · VistaPresentador.jsx:65, 70 · ItemEscaletaController.php:45, 54-57, 77, 97-100, 117, 146, 151, 195 · Escaletas.jsx:76, 83, 98, 101 · PlantillasEmision.jsx:34, 93, 118, 151, 175 · PlantillaController.php:58, 68-73 · CorteController.php:62 · ProgramasGrilla.jsx:31, 125, 140, 152. Capturas: `W45-cu06-plantillas-escaleta/`. FormularioEmision no tiene captura (ver el README).

---

### W46 · Diagrama de Navegación del CU-07 Analítica Periodística (Fig. 50)
**Estado:** Corregir (5 cambios)

**Elementos a modificar:**
- `w.frm.Periodo` · Class · FormularioPeriodo · 40, 202, 240, 120 · «form» · campos y operaciones: -desde: date; -hasta: date; **+elegirAtajo(dias): void (últimos 7 / 30 / 90 días)**; +validar(): boolean; +enviar(): void

**Relaciones a agregar:**
- Association «link» · `w.pg.Analitica` → `w.srv.AnaliticaController` · dirigida · nombre «GET /api/v1/analitica/produccion · GET /api/v1/analitica/coberturas (al abrir: últimos 30 días)»

**Relaciones a modificar:**
- «link» · `w.pg.Dashboard` → `w.srv.DashboardController` → nombre «GET /api/v1/dashboard?desde&hasta (al abrir: últimos 30 días)».
- «link» · `w.pg.Dashboard` → `w.pg.Analitica` → nombre «Ver detalle por periodista» · guarda [analitica.ver].
- «submit» · `w.frm.Periodo` → `w.srv.AnaliticaController` → nombre «GET /api/v1/analitica/produccion?desde&hasta · GET /api/v1/analitica/coberturas?desde&hasta».

**Evidencia:** PanelAnalitico.jsx:21, 36, 44 · AnaliticaPeriodistica.jsx:18, 25-28, 36 · FormularioPeriodo.jsx:14, 32-36, 47 · PeriodoRequest.php:20-25, 33-45. Capturas: `W46-cu07-analitica/`.

---

### W47 · Diagrama de Navegación del CU-08 Reportes y Estadísticas (Fig. 51)
**Estado:** Corregir (14 cambios)

**Elementos a modificar:**
- `w.frm.FiltroReporte` · alto 136 · formulario dentro de la pantalla (no es un modal) · campos y operaciones: -tipo: radio (coberturas | recursos | mantenimiento | notas, según el permiso); -desde: date; -hasta: date; -formato: select (pantalla | csv); +validar(): boolean; +enviar(): void
- `w.pg.Reportes` · operaciones: +elegirReporte(tipo): void; +generar(): void; +render(): void
- `w.pg.VistaReporte` · alto 120 · operaciones: +cargar(tipo, desde, hasta): void; +mostrar(tabla): void; +exportar(): void (CSV en el navegador; automático si formato = csv); +imprimir(): void (o guardar en PDF); +render(): void
- `w.pg.BitacoraComandos` · operaciones: +listar(desde, hasta, remitente, comando, resultado): void; +render(): void
- `w.pg.Bitacora` · operaciones: +listar(tipo, desde, hasta, ip, buscar): void; +verIntentosFallidos(): void; +verRecursosMasAccedidos(): void; +verVisitas(): void; +render(): void

**Relaciones a quitar:**
- «submit» · `w.frm.FiltroReporte` → `w.srv.ReporteController`. El filtro **no llama a la API**: navega a `/reportes/ver` y el GET lo hace la Vista del Reporte.

**Relaciones a agregar:**
- Association «link» · `w.frm.FiltroReporte` → `w.pg.VistaReporte` · dirigida · nombre «Generar reporte → /reportes/ver?tipo&desde&hasta&formato»
- Association «link» · `w.pg.VistaReporte` → `w.srv.ReporteController` · dirigida · nombre «GET /api/v1/reportes/{tipo}?desde&hasta»
- Association «link» · `w.pg.VistaReporte` → `w.pg.Reportes` · dirigida · nombre «Reportes»
- Association «link» · `w.pg.BitacoraComandos` → `w.pg.Reportes` · dirigida · nombre «Reportes»

**Relaciones a modificar:**
- «redirect» · `w.srv.ReporteController` → `w.pg.VistaReporte` → nombre «200 / 422 período inválido».
- «link» · `w.pg.Reportes` → `w.pg.BitacoraComandos` → guarda [bitacora.ver].
- «link» · `w.pg.Reportes` → `w.pg.Bitacora` → guarda [bitacora.ver].
- «link» · `w.pg.BitacoraComandos` → `w.srv.BitacoraComandoController` → nombre «GET /api/v1/bitacora-comandos?desde&hasta&remitente&comando&resultado».
- «link» · `w.pg.Bitacora` → `w.srv.BitacoraController` → nombre «GET /api/v1/bitacora · GET /api/v1/bitacora/intentos-fallidos [bitacora.fallidos] · GET /api/v1/bitacora/recursos-top».

**Menú (cambio del 22/11, C7):** «Seguridad › Bitácora de Comandos» es ahora una opción del menú, así que `w.pg.BitacoraComandos` se crea en W39 (ver W39) y aquí pasa a «creado en W39: solo agregarlo». El enlace «Reportes» de la Bitácora de Comandos solo aparece con `reportes.ver` o `reportes.mantenimiento`: la relación `w.pg.BitacoraComandos` → `w.pg.Reportes` lleva guarda [reportes.ver | reportes.mantenimiento].

**Evidencia:** ReportesEstadisticas.jsx:12-17, 27, 35-36, 40-43, 54-65, 70-80 · VistaReporte.jsx:22, 24-34, 28-31, 44-46 · BitacoraComandos.jsx:17-32 · BitacoraAccesos.jsx:29, 47, 56 · ReporteController.php:19, 43, 69, 89 · App.jsx:61, 78-79. Capturas: `W47-cu08-reportes-bitacoras/`.

---

## Ruta de la SPA → elemento del diagrama

| Ruta | Elemento | Diagrama |
|---|---|---|
| `/` | `w.pg.Inicio` | W39 |
| `/login` | `w.frm.Login` | W39 |
| `/inicio` | `w.pg.Bienvenida` (nuevo) | W39 |
| `/buscar?q=` | `w.pg.Resultados` | W39 |
| `*` | `w.pg.NoEncontrada` (nuevo) | W39 |
| ruta sin permiso | `w.pg.AccesoDenegado` (nuevo) | W39 |
| layout de todas las pantallas | `w.pg.Panel` + `w.frm.Busqueda` + `w.pg.Footer` | W39 |
| `/usuarios` · `/perfil` · `/seguridad/matriz` · `/seguridad/menu` | `w.pg.Usuarios` · `w.pg.Perfil` · `w.pg.Matriz` · `w.pg.Menus` | W40 |
| `/personal` · `/personal/ausencias` · `/personal/disponibilidad` · `/turnos` | `w.pg.Personal` · `w.pg.Ausencias` · `w.pg.Disponibilidad` · `w.pg.Turnos` | W41 |
| `/recursos` · `/prestamos` | `w.pg.Recursos` · `w.pg.Prestamos` | W42 |
| `/coberturas` · `/coberturas/{id}` · `/coberturas/{id}/hoja` | `w.pg.Agenda` · `w.pg.DetalleCobertura` · `w.pg.Hoja` | W43 |
| `/notas` · `/notas/{id}` · `/notas/{id}/historial` · `/notas/{id}/material` | `w.pg.Notas` · `w.pg.DetalleNota` · `w.pg.HistorialGuion` · `w.pg.Material` | W44 |
| `/programas` · `/plantillas` · `/escaletas` · `/escaletas/{id}` · `/escaletas/{id}/presentador` | `w.pg.Programas` · `w.pg.Plantillas` · `w.pg.Escaletas` · `w.pg.EditorEscaleta` · `w.pg.Teleprompter` | W45 |
| `/panel` · `/analitica` | `w.pg.Dashboard` · `w.pg.Analitica` | W46 |
| `/reportes` · `/reportes/ver` · `/reportes/bitacora-comandos` · `/seguridad/bitacora` | `w.pg.Reportes` · `w.pg.VistaReporte` · `w.pg.BitacoraComandos` · `w.pg.Bitacora` | W47 |

## Pendientes de decidir (marcados «revisar»)

1. W39: ¿los detalles de cobertura y nota se crean en W39 (para los enlaces de los resultados) o se mencionan en «Cuidar»?
2. W42: ¿se dibuja `CoberturaController` (lienzo más ancho) o se menciona en «Cuidar»?
3. W41: ¿la consulta de Disponibilidad es «submit» o «link»?
4. Agregar las llamadas que llenan los select (CoberturaController, NotaController, PersonalController) deja los diagramas 1:1 con el código, pero suma conectores. Si se prefieren diagramas más limpios, se pueden omitir y mencionar en «Cuidar».

Las posiciones nuevas siguen la grilla del prompt, pero **no se probaron en EA**. Las etiquetas de los conectores de las Fig. 44 a 47 se compararon con el prompt a baja resolución.
