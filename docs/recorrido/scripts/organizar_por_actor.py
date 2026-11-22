"""Organiza el recorrido por actor (una carpeta por diagrama de navegación WN00–WN09) y escribe
el README de cada carpeta. Qué ve cada actor se calcula con la matriz de SeguridadSeeder.php.

    python3 docs/recorrido/scripts/organizar_por_actor.py      (desde la raíz del repo)

Espera las capturas ya renombradas (pantallas «<id>__<rol>.png»); se puede volver a ejecutar.
"""
import os
import re
import shutil

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # docs/recorrido
SEEDER = os.path.join(RAIZ, '..', '..', 'database', 'seeders', 'SeguridadSeeder.php')
FORMS = os.path.join(RAIZ, 'formularios')

_php = open(SEEDER, encoding='utf-8').read()
MATRIZ = {p: set(r.split()) for p, r in re.findall(r"'([a-z.]+)' => \['CU-\d+', '[^']*', '([A-Z ]+)'\]", _php)}
assert len(MATRIZ) > 60, 'no se pudo leer la matriz del seeder'

# carpeta, sigla, nombre del actor, sufijo de las capturas
ACTORES = [
    ('WN02-administrador', 'ADM', 'Administrador del Sistema', 'administrador'),
    ('WN03-director', 'DIR', 'Director', 'director'),
    ('WN04-jefe-de-prensa', 'JPR', 'Jefe de Prensa', 'jefe-prensa'),
    ('WN05-jefe-de-area-tecnica', 'JAT', 'Jefe de Área Técnica', 'jefe-area-tecnica'),
    ('WN06-periodista', 'PER', 'Periodista', 'periodista'),
    ('WN07-camarografo', 'CAM', 'Camarógrafo', 'camarografo'),
    ('WN08-editor-de-video', 'EDI', 'Editor de video', 'editora-video'),
    ('WN09-presentador', 'PRE', 'Presentador / Conductor', 'presentadora'),
]

# «client page»: id → (nombre, ruta, permiso de entrada); en el orden de las filas del diagrama
PANTALLAS = [
    ('w.pg.Bienvenida', 'Bienvenida (menú del rol)', '/inicio', None),
    ('w.pg.Usuarios', 'Gestión de Usuarios', '/usuarios', 'usuarios.listar'),
    ('w.pg.Perfil', 'Mi Perfil', '/perfil', None),
    ('w.pg.Matriz', 'Matriz de Accesos', '/seguridad/matriz', 'seguridad.matriz.ver'),
    ('w.pg.Menus', 'Menú Dinámico', '/seguridad/menu', 'seguridad.menu'),
    ('w.pg.Personal', 'Gestión de Personal', '/personal', 'personal.listar'),
    ('w.pg.Ausencias', 'Gestión de Ausencias', '/personal/ausencias', 'ausencias.listar'),
    ('w.pg.Disponibilidad', 'Disponibilidad del Personal', '/personal/disponibilidad', 'personal.disponibilidad'),
    ('w.pg.Turnos', 'Gestión de Turnos', '/turnos', 'turnos.listar'),
    ('w.pg.Recursos', 'Inventario de Recursos', '/recursos', 'recursos.listar'),
    ('w.pg.Prestamos', 'Préstamos de Recursos', '/prestamos', 'prestamos.listar'),
    ('w.pg.Agenda', 'Agenda de Coberturas', '/coberturas', 'coberturas.listar'),
    ('w.pg.DetalleCobertura', 'Detalle de Cobertura', '/coberturas/{id}', 'coberturas.listar'),
    ('w.pg.Hoja', 'Hoja de Asignación', '/coberturas/{id}/hoja', 'coberturas.hoja'),
    ('w.pg.Notas', 'Gestión de Notas', '/notas', 'notas.listar'),
    ('w.pg.DetalleNota', 'Detalle de Nota', '/notas/{id}', 'notas.listar'),
    ('w.pg.HistorialGuion', 'Historial del Guion', '/notas/{id}/historial', 'notas.listar'),
    ('w.pg.Material', 'Material Audiovisual', '/notas/{id}/material', 'material.listar'),
    ('w.pg.Programas', 'Programas y Grilla', '/programas', 'programas.listar'),
    ('w.pg.Plantillas', 'Plantillas de Emisión', '/plantillas', 'plantillas.listar'),
    ('w.pg.Escaletas', 'Escaletas', '/escaletas', 'escaletas.listar'),
    ('w.pg.EditorEscaleta', 'Editor de Escaleta', '/escaletas/{id}', 'escaletas.listar'),
    ('w.pg.Teleprompter', 'Vista del Presentador', '/escaletas/{id}/presentador', 'escaletas.lectura'),
    ('w.pg.Dashboard', 'Panel Analítico', '/panel', 'dashboard.ver'),
    ('w.pg.Analitica', 'Analítica Periodística', '/analitica', 'analitica.ver'),
    ('w.pg.Reportes', 'Reportes y Estadísticas', '/reportes', ['reportes.ver', 'reportes.mantenimiento']),
    ('w.pg.BitacoraComandos', 'Bitácora de Comandos', '/reportes/bitacora-comandos', 'bitacora.ver'),
    ('w.pg.Bitacora', 'Bitácora de Accesos', '/seguridad/bitacora', 'bitacora.ver'),
    ('w.pg.AccesoDenegado', 'Acceso denegado (ejemplo)', 'ruta sin permiso', None),
]

# captura de formulario (en formularios/) → (pantalla desde la que se abre, qué es, permiso)
FORMULARIOS = [
    ('w.frm.Usuario_nuevo', 'w.pg.Usuarios', 'FormularioUsuario (nuevo)', 'usuarios.crear'),
    ('w.frm.Usuario_editar', 'w.pg.Usuarios', 'FormularioUsuario (editar, con estado)', 'usuarios.editar'),
    ('confirmar_desactivar_usuario', 'w.pg.Usuarios', 'Confirmar desactivar usuario (submit DELETE)', 'usuarios.desactivar'),
    ('w.frm.Perfil', 'w.pg.Perfil', 'FormularioPerfil', None),
    ('w.frm.Preferencias', 'w.pg.Perfil', 'FormularioPreferencias', None),
    ('w.frm.Menu_nuevo', 'w.pg.Menus', 'FormularioMenu (nuevo)', 'seguridad.menu'),
    ('w.frm.Menu_editar', 'w.pg.Menus', 'FormularioMenu (editar)', 'seguridad.menu'),
    ('w.frm.Personal_nuevo', 'w.pg.Personal', 'FormularioPersonal (nuevo)', 'personal.crear'),
    ('w.frm.Personal_editar', 'w.pg.Personal', 'FormularioPersonal (editar, con estado)', 'personal.editar'),
    ('confirmar_desactivar_ficha', 'w.pg.Personal', 'Confirmar desactivar ficha (submit DELETE)', 'personal.desactivar'),
    ('w.frm.Ausencia', 'w.pg.Ausencias', 'FormularioAusencia', 'ausencias.crear'),
    ('w.frm.Turno', 'w.pg.Turnos', 'FormularioTurno', 'turnos.crear'),
    ('w.frm.Recurso_nuevo', 'w.pg.Recursos', 'FormularioRecurso (nuevo)', 'recursos.crear'),
    ('w.frm.Recurso_editar', 'w.pg.Recursos', 'FormularioRecurso (editar)', 'recursos.editar'),
    ('w.frm.Incidencia', 'w.pg.Recursos', 'FormularioIncidencia', 'recursos.incidencia'),
    ('confirmar_baja_recurso', 'w.pg.Recursos', 'Confirmar dar de baja (submit DELETE)', 'recursos.baja'),
    ('w.frm.Prestamo_entrega', 'w.pg.Prestamos', 'FormularioEntrega', 'prestamos.crear'),
    ('w.frm.Devolucion', 'w.pg.Prestamos', 'FormularioDevolucion', 'prestamos.devolver'),
    ('w.frm.Cobertura_nueva', 'w.pg.Agenda', 'FormularioCobertura (nueva)', 'coberturas.crear'),
    ('w.frm.Cobertura_reprogramar', 'w.pg.Agenda', 'FormularioCobertura (reprogramar)', 'coberturas.editar'),
    ('confirmar_cancelar_cobertura', 'w.pg.Agenda', 'Confirmar cancelar cobertura (submit DELETE)', 'coberturas.cancelar'),
    ('w.frm.Duplicar', 'w.pg.Agenda', 'FormularioDuplicar', 'coberturas.duplicar'),
    ('w.frm.Asignacion', 'w.pg.DetalleCobertura', 'FormularioAsignacion', 'coberturas.asignar'),
    ('w.frm.Reserva', 'w.pg.DetalleCobertura', 'FormularioReserva', 'coberturas.reservar'),
    ('w.frm.Retorno', 'w.pg.DetalleCobertura', 'FormularioRetorno', 'coberturas.retorno'),
    ('w.frm.Nota_nueva', 'w.pg.Notas', 'FormularioNota (nueva)', 'notas.crear'),
    ('w.frm.Nota_editar', 'w.pg.Notas', 'FormularioNota (editar)', 'notas.editar'),
    ('w.frm.Guion', 'w.pg.DetalleNota', 'FormularioGuion', 'notas.guion'),
    ('w.frm.Rotulos', 'w.pg.DetalleNota', 'FormularioRotulos', 'notas.rotulos'),
    ('w.frm.Observacion', 'w.pg.DetalleNota', 'FormularioObservacion', 'notas.observar'),
    ('w.frm.Material_registrar', 'w.pg.Material', 'FormularioMaterial (registrar)', 'material.crear'),
    ('w.frm.Material_estado', 'w.pg.Material', 'FormularioMaterial (cambiar estado)', 'material.editar'),
    ('w.frm.Programa', 'w.pg.Programas', 'FormularioPrograma', 'programas.crear'),
    ('w.frm.Horario', 'w.pg.Programas', 'FormularioHorario', 'grilla.crear'),
    ('w.frm.Plantilla_nueva', 'w.pg.Plantillas', 'FormularioPlantilla (nueva)', 'plantillas.crear'),
    ('w.frm.Plantilla_configurar', 'w.pg.Plantillas', 'FormularioPlantilla (configurar)', 'plantillas.editar'),
    ('w.frm.Corte', 'w.pg.Plantillas', 'FormularioCorte', 'plantillas.editar'),
    ('w.frm.GenerarEscaleta', 'w.pg.Escaletas', 'FormularioGenerarEscaleta', 'escaletas.crear'),
    ('w.frm.Item_agregar', 'w.pg.EditorEscaleta', 'FormularioItem (agregar)', 'escaletas.items'),
    ('w.frm.Item_ajustar', 'w.pg.EditorEscaleta', 'FormularioItem (ajustar)', 'escaletas.items'),
    ('lista_de_control_al_cerrar', 'w.pg.EditorEscaleta', 'Lista de control R31 al cerrar (422)', 'escaletas.estado'),
]


def tiene(sigla, permiso):
    if permiso is None:
        return True
    return any(sigla in MATRIZ.get(p, ()) for p in ([permiso] if isinstance(permiso, str) else permiso))


def mover(origen, destino):
    if os.path.exists(origen):
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        shutil.move(origen, destino)


def reorganizar():
    """De las carpetas por caso de uso (W39…W47) a una por actor. Idempotente."""
    viejas = sorted(d for d in os.listdir(RAIZ) if re.match(r'W\d\d-', d))
    for v in viejas:
        for sub in ('formularios',):
            for f in os.listdir(os.path.join(RAIZ, v, sub)) if os.path.isdir(os.path.join(RAIZ, v, sub)) else []:
                mover(os.path.join(RAIZ, v, sub, f), os.path.join(FORMS, f))
        for sub in ('apariencia', 'movil'):
            for f in os.listdir(os.path.join(RAIZ, v, sub)) if os.path.isdir(os.path.join(RAIZ, v, sub)) else []:
                mover(os.path.join(RAIZ, v, sub, f), os.path.join(RAIZ, 'WN00-general', sub, f))
        p = os.path.join(RAIZ, v, 'pantallas')
        for f in os.listdir(p) if os.path.isdir(p) else []:
            partes = f[:-4].split('__')
            id_, rol = partes[0], partes[1]
            if rol == 'visitante':
                mover(os.path.join(p, f), os.path.join(RAIZ, 'WN01-visitante', 'pantallas', id_ + '.png'))
                continue
            carpeta = next(c for c, _, _, suf in ACTORES if suf == rol)
            mover(os.path.join(p, f), os.path.join(RAIZ, carpeta, 'pantallas', id_ + '.png'))
        shutil.rmtree(os.path.join(RAIZ, v))
    # el login y la búsqueda son de la parte pública
    for f in ('w.frm.Login__visitante.png', 'w.frm.Login_422-credenciales__visitante.png', 'w.frm.Busqueda__sugerencias.png'):
        mover(os.path.join(FORMS, f), os.path.join(RAIZ, 'WN01-visitante', 'formularios', f.replace('__visitante', '')))
    # los resultados de búsqueda se capturaron con sesión: van al general
    mover(os.path.join(RAIZ, 'WN04-jefe-de-prensa', 'pantallas', 'w.pg.Resultados.png'),
          os.path.join(RAIZ, 'WN00-general', 'pantallas', 'w.pg.Resultados.png'))


def readme_actor(carpeta, sigla, nombre):
    lineas = [f'# {carpeta[:4]} · USN del {nombre}\n',
              f'Capturas para armar y revisar el diagrama **{carpeta[:4]}** de '
              '`docs-web/Architech Prompt/prompt_navegacion_por_actor.md`. Solo aparece lo que este rol puede usar '
              '(matriz de `SeguridadSeeder.php`).\n',
              '| Pantalla («client page») | Ruta | Captura | Formularios y acciones que este rol abre desde ella |',
              '|---|---|---|---|']
    for id_, nom, ruta, perm in PANTALLAS:
        archivo = os.path.join(RAIZ, carpeta, 'pantallas', id_ + '.png')
        if not tiene(sigla, perm) or not os.path.exists(archivo):
            continue
        forms = [f'[{d}](../formularios/{f}.png)' for f, pg, d, p in FORMULARIOS if pg == id_ and tiene(sigla, p)
                 and os.path.exists(os.path.join(FORMS, f + '.png'))]
        lineas.append(f'| `{id_}` {nom} | `{ruta}` | [ver](pantallas/{id_}.png) | {"; ".join(forms) or "— (solo consulta)"} |')
    lineas.append('\nLos formularios están en `../formularios/` (una sola copia para todos los actores: el modal es el mismo; '
                  'cambia quién puede abrirlo). Cada captura de pantalla se tomó con la cuenta de prueba de este rol.\n')
    open(os.path.join(RAIZ, carpeta, 'README.md'), 'w', encoding='utf-8').write('\n'.join(lineas))


def readme_fijo(carpeta, titulo, cuerpo):
    open(os.path.join(RAIZ, carpeta, 'README.md'), 'w', encoding='utf-8').write(f'# {titulo}\n\n{cuerpo}\n')


if __name__ == '__main__':
    reorganizar()
    for carpeta, sigla, nombre, _ in ACTORES:
        readme_actor(carpeta, sigla, nombre)
    readme_fijo('WN00-general', 'WN00 · Diagrama de Navegación General',
                'Lo común a todos: `pantallas/w.pg.Resultados.png` (búsqueda global con sesión), `apariencia/` (temas, modo y letra '
                'del encabezado: `w.frm.Preferencias` aplicado) y `movil/` (la SPA a 390 px). El menú de cada rol se ve en '
                '`../WNxx-*/pantallas/w.pg.Bienvenida.png` y la pantalla de acceso denegado en `../WNxx-*/pantallas/w.pg.AccesoDenegado.png`.')
    readme_fijo('WN01-visitante', 'WN01 · USN del Visitante',
                '| Elemento | Ruta | Captura |\n|---|---|---|\n'
                '| `w.pg.Inicio` «client page» (grilla del día) | `/` | [ver](pantallas/w.pg.Inicio.png) |\n'
                '| `w.pg.NoEncontrada` «client page» | `*` | [ver](pantallas/w.pg.NoEncontrada.png) |\n'
                '| `w.frm.Login` «form» | `/login` | [ver](formularios/w.frm.Login.png) · [422 credenciales](formularios/w.frm.Login_422-credenciales.png) |\n'
                '| `w.frm.Busqueda` «form» (encabezado) | — | [ver](formularios/w.frm.Busqueda.png) |')
    # autoverificación: el Camarógrafo abre Material y no la nota nueva; el Director no abre formularios de Coberturas
    t = open(os.path.join(RAIZ, 'WN07-camarografo', 'README.md'), encoding='utf-8').read()
    assert 'Material_registrar' in t and 'Nota_nueva' not in t and 'Material_estado' not in t
    assert 'Cobertura_nueva' not in open(os.path.join(RAIZ, 'WN03-director', 'README.md'), encoding='utf-8').read()
    print('Recorrido organizado por actor en', RAIZ)
