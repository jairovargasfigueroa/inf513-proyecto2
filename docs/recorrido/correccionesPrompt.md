# Correcciones a los diagramas de navegación: de caso de uso a actor

Este archivo dice **qué está mal en los diagramas de navegación actuales** (Fig. 43 a 51 del documento,
W39–W47 del prompt de EA) y **cómo quedan**: un diagrama general más **un diagrama por actor**
(WN00–WN09). La especificación completa de cada diagrama nuevo, elemento por elemento, está en
`docs-web/Architech Prompt/prompt_navegacion_por_actor.md`. Las capturas para comparar cada diagrama con
la aplicación real están en la carpeta de cada actor (`WNxx-*/README.md`).

## 1. Qué está mal en los diagramas actuales

| # | Problema | Dónde | Cómo se corrige |
|---|---|---|---|
| 1 | **Están organizados por caso de uso, no por actor.** Un mismo diagrama mezcla acciones de roles distintos: en W44 (CU-05) aparecen juntos «Aprobar nota» (solo el Jefe de Prensa), «Registrar material» (Periodista, Camarógrafo y Editor) y «Cambiar estado del material» (solo el Editor). Ningún usuario real recorre ese diagrama. | Fig. 44 a 51 | Un diagrama por actor (WN02–WN09): cada uno muestra solo las pantallas, formularios y acciones que ese rol puede usar, según la matriz de accesos. |
| 2 | **No hay actor iniciador.** La navegación empieza en una pantalla suelta. La conferencia del ingeniero («USN para Bibliotecario») y la guía empiezan en el **actor** unido al login. | Fig. 43 a 51 | Cada diagrama empieza en su actor (el mismo de W01) unido a `FormularioLogin`, y el Visitante a `Inicio`. |
| 3 | **El general no tiene actores** y no distingue a quién va cada opción. | Fig. 43 | WN00: actores Visitante y Usuario del Canal; cada «link» del menú lleva la guarda del permiso y una nota resume el menú de cada rol. |
| 4 | **Los «form» tienen tipos en lugar de controles** (`-correo: email`). El ingeniero y Conallen usan campos estereotipados. | Todos los «form» | `«Text» correo : email`, `«Select» rol_id : Rol`, `«Submit» Guardar : button` (sección 2 del prompt por actor, se cambia una sola vez). |
| 5 | **Las respuestas del controlador son «redirect».** En WAE la «server page» **construye** la «client page». | Todos | `«redirect»` → `«build»` (mismo nombre). |
| 6 | **Los estereotipos no se ven con su ícono.** | Todos | Rectángulo con «estereotipo» en la cabecera e ícono WAE (*Show Element Stereotype Icon*). |
| 7 | **Faltan pantallas y formularios reales:** Bienvenida (`/inicio`, a donde lleva el login), Acceso denegado, Página no encontrada, FormularioEmision (CU-06), la grilla pública. | Fig. 43, 49 | Están en WN00, WN01 y en los diagramas de los actores que los usan. |
| 8 | **El PDF es anterior a los ajustes del 16/11 y 22/11**: `estado` en Usuario y Personal, contraseñas en Perfil, Reportes con dos permisos, el Camarógrafo con Notas y la opción «Bitácora de Comandos». | Fig. 43 a 51 | Ya están en el prompt por actor (se genera desde la matriz actual). |

## 2. Qué figura reemplaza a cuál

| Hoy (por caso de uso) | Queda (por actor) |
|---|---|
| Fig. 43 · W39 Navegación General | **WN00** Navegación General (con actores) y **WN01** USN del Visitante |
| Fig. 44 a 51 · W40–W47 (CU-01 a CU-08) | **WN02 a WN09**: USN del Administrador, Director, Jefe de Prensa, Jefe de Área Técnica, Periodista, Camarógrafo, Editor de video y Presentador |

Si el grupo decide **conservar también** los diagramas por caso de uso, sus correcciones elemento por
elemento (rutas, campos, códigos 409/422 con archivo:línea) están en
[`anexo_correcciones_por_cu.md`](anexo_correcciones_por_cu.md).

## 3. Por actor: qué debe mostrar su diagrama

Cuentas incluidas: las pantallas cuentan Bienvenida y el ejemplo de Acceso denegado; «formularios» son los
modales y confirmaciones que ese rol puede abrir. El detalle con enlaces a cada captura está en el README
de su carpeta.

| Diagrama | Actor | Pantallas | Formularios | Lo que distingue a este actor (revisar en el diagrama) |
|---|---|---|---|---|
| WN00 | General | — | — | Visitante → Inicio; Usuario del Canal → Login → Bienvenida → menú con guardas. Nota con el menú de los 8 roles. |
| [WN01](WN01-visitante/README.md) | Visitante | 2 | 2 | Inicio con la grilla del día, búsqueda, login (con su 422/429) y la página no encontrada. |
| [WN02](WN02-administrador/README.md) | Administrador | 9 | 7 | Usuarios, Matriz (puede editarla), Menú Dinámico, Panel, las dos bitácoras (con intentos fallidos). **No tiene Reportes**: llega a la Bitácora de Comandos por su opción de menú (C7, 22/11). |
| [WN03](WN03-director/README.md) | Director | 24 | 5 | Ve casi todo **en modo consulta**: solo gestiona usuarios. La Matriz es de solo lectura (sin «Guardar»). Sin Préstamos, Hoja ni Presentador. Partir en partes si no entra. |
| [WN04](WN04-jefe-de-prensa/README.md) | Jefe de Prensa | 25 | 28 | El más grande: planifica, asigna, aprueba y observa notas, arma la escaleta, lee en modo presentador. **No tiene** Matriz, Menú ni bitácoras. Partir en A, B y C como la guía. |
| [WN05](WN05-jefe-de-area-tecnica/README.md) | Jefe de Área Técnica | 13 | 8 | Inventario y préstamos completos (entrega, devolución, incidencia, baja, alta). Personal solo consulta y disponibilidad. Reportes **solo el de mantenimiento**. |
| [WN06](WN06-periodista/README.md) | Periodista | 14 | 8 | Redacta, edita, reemplaza el guion, rótulos y envía a revisión; registra material y el **retorno** de sus coberturas. No aprueba. |
| [WN07](WN07-camarografo/README.md) | Camarógrafo | 13 | 4 | Reporta incidencias, registra material (sin cambiar su estado); **Notas solo consulta** (permiso agregado el 22/11, C1). |
| [WN08](WN08-editor-de-video/README.md) | Editor de video | 13 | 4 | Registra material y **cambia su estado** (el único). Exporta la escaleta. |
| [WN09](WN09-presentador/README.md) | Presentador | 15 | 2 | Consulta plantillas y escaletas, **Vista del Presentador** (teleprompter) y exportar; Hoja de asignación. |

## 4. Observaciones del recorrido que afectan a los diagramas

- **Periodista (WN06):** la lista de notas le muestra editar y dar de baja en notas ajenas, y el detalle
  de cobertura le muestra «Registrar retorno» aunque no esté asignado. La API lo rechaza (409). El diagrama
  debe mostrar la regla (solo sus notas y sus coberturas), no el botón de más: anotarlo como restricción
  `{autor = usuario}` / `{asignado}` en el «link».
- **Director (WN03):** puede desactivar la cuenta del Administrador; si el grupo lo corrige en el código,
  el «submit» de desactivar lleva la restricción `{rol ≠ Administrador}`.
- **FormularioEmision (WN04):** no tiene captura (los datos de prueba no tienen escaletas cerradas).
- Detalle de cada hallazgo en `../../../INFORME_CORRECCIONES_P2.md` (fuera del repo) y en el anexo.
