# Recorrido visual del sistema web por actor

Capturas de **todas las pantallas y formularios** del sistema web del Canal 11, tomadas el 22/11/2026 en local
(`php artisan serve`, base `db_grupo14sa` con `datos_prueba.sql` y `DatosPruebaWebSeeder`), con cada una de las
8 cuentas de prueba, **después** de los cambios del 22/11 (Camarógrafo con Notas, opción «Bitácora de Comandos»,
tipos de recurso con tilde).

Sirven para **armar y revisar los diagramas de navegación por actor** (USN, como en la conferencia del
ingeniero): WN00 a WN09 de `docs-web/Architech Prompt/prompt_navegacion_por_actor.md`.

- [`correccionesPrompt.md`](correccionesPrompt.md): qué está mal en los diagramas actuales (Fig. 43 a 51, por
  caso de uso y sin actor) y qué debe mostrar el diagrama de cada actor.
- [`anexo_correcciones_por_cu.md`](anexo_correcciones_por_cu.md): las correcciones anteriores por caso de uso,
  útiles por su evidencia (rutas, códigos y archivo:línea) para los elementos que comparten todos los diagramas.

## Carpetas

| Carpeta | Diagrama | Contenido |
|---|---|---|
| [`WN00-general/`](WN00-general/README.md) | Navegación General | Resultados de búsqueda, apariencia (temas, modo, letra) y la vista móvil |
| [`WN01-visitante/`](WN01-visitante/README.md) | USN del Visitante | Inicio con la grilla, página no encontrada, login (y su error 422), búsqueda |
| [`WN02-administrador/`](WN02-administrador/README.md) | USN del Administrador del Sistema | `admin@canal11.test` |
| [`WN03-director/`](WN03-director/README.md) | USN del Director | `director@canal11.test` |
| [`WN04-jefe-de-prensa/`](WN04-jefe-de-prensa/README.md) | USN del Jefe de Prensa | `jefe.prensa@canal11.test` |
| [`WN05-jefe-de-area-tecnica/`](WN05-jefe-de-area-tecnica/README.md) | USN del Jefe de Área Técnica | `area.tecnica@canal11.test` |
| [`WN06-periodista/`](WN06-periodista/README.md) | USN del Periodista | `carla.rojas@canal11.test` |
| [`WN07-camarografo/`](WN07-camarografo/README.md) | USN del Camarógrafo | `jorge.mendoza@canal11.test` |
| [`WN08-editor-de-video/`](WN08-editor-de-video/README.md) | USN del Editor de video | `patricia.saucedo@canal11.test` |
| [`WN09-presentador/`](WN09-presentador/README.md) | USN del Presentador / Conductor | `mariana.terceros@canal11.test` |
| `formularios/` | (compartida) | Los 41 formularios, confirmaciones y avisos, abiertos sin enviar. Una sola copia: el modal es igual para todos; el README de cada actor enlaza solo los que ese rol puede abrir |
| `scripts/` | — | Scripts para repetir las capturas y reorganizarlas |

En cada carpeta de actor, `pantallas/<id>.png` es la «client page» `<id>` del diagrama vista **con la cuenta de
ese rol** (sus botones son exactamente los que puede usar), y el README lista, por pantalla, los formularios que
abre. `w.pg.Bienvenida.png` muestra su menú y `w.pg.AccesoDenegado.png` qué ve si entra a una ruta sin permiso.

## Cómo rearmar el diagrama de un actor

Es el patrón de la USN del ingeniero (conferencia *Diseño de Aplicaciones Web*, diapositiva «Diagramas de
Navegación-Bibliotecario»):

1. **Actor** a la izquierda, unido a `FormularioLogin` (`«submit»` → `AuthController` → `«build»` → `Bienvenida`).
2. **Bienvenida** es el centro: una nota con su menú y un `«link»` a cada opción (ver `w.pg.Bienvenida.png`).
3. **Una fila por pantalla** de su README: la «client page», los «form» que abre (columna derecha del README),
   y la «server page» a la que envían. Cada botón que lleva a otra pantalla es un `«link»`; cada Guardar o
   Confirmar, un `«submit»`; la respuesta del controlador, un `«build»` de vuelta a la pantalla.
4. Si una pantalla dice «— (solo consulta)», en ese diagrama **no** lleva formularios aunque otro rol sí los tenga.

## Lo que no está capturado

- **`w.frm.Emision` (FormularioEmision):** solo se abre en una escaleta cerrada y los datos de prueba no tienen
  ninguna (la escaleta 1 no pasa la lista de control: ver `formularios/lista_de_control_al_cerrar.png`).
- **`w.frm.Periodo` y `w.frm.FiltroReporte`** no son modales: están dentro de Panel, Analítica y Reportes.
- **Alto contraste:** la captura automática no lo activó; se verificó a mano que funciona.

## Repetir el recorrido

Con el sistema en `http://localhost:8000` y los datos de prueba cargados:

```bash
npm i playwright@1.49.1     # en una carpeta aparte; usa el Chrome instalado (channel: 'chrome')
node scripts/capturar.mjs    # pantallas por rol, temas y móvil → img/<rol>__<ruta>.png
node scripts/formularios.mjs # formularios abiertos sin enviar → form/
node scripts/buscar.mjs      # resultados de búsqueda
python3 scripts/organizar_por_actor.py   # (desde la raíz del repo) carpetas por actor y sus README
```

Antes de `organizar_por_actor.py` hay que renombrar las capturas a `<id>__<rol>.png` (la tabla de rutas a ids
está en el script). El script lee la matriz de `database/seeders/SeguridadSeeder.php`: si cambia un permiso,
basta con volver a ejecutarlo. Ojo: `capturar.mjs` cambia las preferencias de apariencia de la cuenta del Jefe de
Prensa.
