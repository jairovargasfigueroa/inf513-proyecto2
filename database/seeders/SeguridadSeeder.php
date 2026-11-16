<?php

namespace Database\Seeders;

use App\Models\Menu;
use App\Models\PermisoWeb;
use App\Models\Rol;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Datos iniciales de seguridad del sistema web (documento, Anexos A, B y C):
 * rol Administrador, permisos (recurso.accion), matriz de accesos por rol y
 * menú dinámico. Se puede volver a correr: actualiza sin duplicar.
 */
class SeguridadSeeder extends Seeder
{
    /** Siglas de la Tabla B1 → nombre del rol en la tabla rol. */
    private const ROLES = [
        'ADM' => Rol::ADMINISTRADOR,
        'DIR' => 'Director',
        'JPR' => 'Jefe de Prensa',
        'JAT' => 'Jefe de Area Tecnica',
        'PER' => 'Periodista',
        'CAM' => 'Camarografo',
        'EDI' => 'Editor de video',
        'PRE' => 'Presentador',
    ];

    /** Tabla B1 Matriz de Accesos por Rol: permiso => [caso de uso, descripción, roles]. */
    private const MATRIZ = [
        'usuarios.listar' => ['CU-01', 'Consultar usuarios', 'ADM DIR JPR'],
        'usuarios.crear' => ['CU-01', 'Registrar usuario', 'ADM DIR'],
        'usuarios.editar' => ['CU-01', 'Modificar usuario', 'ADM DIR'],
        'usuarios.desactivar' => ['CU-01', 'Desactivar usuario', 'ADM DIR'],
        'roles.listar' => ['CU-01', 'Consultar roles', 'ADM DIR'],
        'seguridad.matriz.ver' => ['CU-01', 'Consultar la matriz de accesos', 'ADM DIR'],
        'seguridad.matriz.editar' => ['CU-01', 'Otorgar o retirar permisos a un rol', 'ADM'],
        'seguridad.menu' => ['CU-01', 'Configurar el menú dinámico', 'ADM'],
        'personal.listar' => ['CU-02', 'Consultar personal', 'DIR JPR JAT'],
        'personal.crear' => ['CU-02', 'Registrar ficha de personal', 'JPR'],
        'personal.editar' => ['CU-02', 'Modificar ficha de personal', 'JPR'],
        'personal.desactivar' => ['CU-02', 'Desactivar personal', 'JPR'],
        'turnos.listar' => ['CU-02', 'Consultar turnos', 'DIR JPR JAT PER CAM EDI PRE'],
        'turnos.crear' => ['CU-02', 'Registrar turno', 'JPR'],
        'ausencias.listar' => ['CU-02', 'Consultar ausencias', 'DIR JPR'],
        'ausencias.crear' => ['CU-02', 'Registrar ausencia', 'JPR'],
        'personal.disponibilidad' => ['CU-02', 'Consultar disponibilidad del personal', 'DIR JPR JAT'],
        'recursos.listar' => ['CU-03', 'Consultar recursos', 'DIR JPR JAT CAM'],
        'recursos.crear' => ['CU-03', 'Registrar recurso', 'JAT'],
        'recursos.editar' => ['CU-03', 'Modificar recurso', 'JAT'],
        'recursos.baja' => ['CU-03', 'Dar de baja un recurso', 'JAT'],
        'recursos.incidencia' => ['CU-03', 'Reportar incidencia de un recurso', 'JAT CAM'],
        'recursos.alta' => ['CU-03', 'Dar de alta un recurso reparado', 'JAT'],
        'prestamos.listar' => ['CU-03', 'Consultar préstamos', 'JPR JAT'],
        'prestamos.crear' => ['CU-03', 'Entregar recurso en préstamo', 'JAT'],
        'prestamos.devolver' => ['CU-03', 'Registrar devolución de recurso', 'JAT'],
        'coberturas.listar' => ['CU-04', 'Consultar agenda de coberturas', 'DIR JPR JAT PER CAM EDI PRE'],
        'coberturas.crear' => ['CU-04', 'Planificar cobertura', 'JPR'],
        'coberturas.editar' => ['CU-04', 'Reprogramar cobertura', 'JPR'],
        'coberturas.cancelar' => ['CU-04', 'Cancelar cobertura', 'JPR'],
        'coberturas.duplicar' => ['CU-04', 'Duplicar cobertura recurrente', 'JPR'],
        'coberturas.asignar' => ['CU-04', 'Asignar o quitar personal de una cobertura', 'JPR'],
        'coberturas.reservar' => ['CU-04', 'Reservar o liberar recursos de una cobertura', 'JPR'],
        'coberturas.hoja' => ['CU-04', 'Generar hoja de asignación', 'JPR JAT PER CAM PRE'],
        'coberturas.retorno' => ['CU-04', 'Registrar retorno de cobertura', 'JPR PER'],
        'notas.listar' => ['CU-05', 'Consultar notas', 'DIR JPR PER EDI PRE'],
        'notas.crear' => ['CU-05', 'Redactar nota', 'JPR PER'],
        'notas.editar' => ['CU-05', 'Modificar nota', 'JPR PER'],
        'notas.baja' => ['CU-05', 'Dar de baja una nota', 'JPR PER'],
        'notas.guion' => ['CU-05', 'Reemplazar guion de nota', 'JPR PER'],
        'notas.rotulos' => ['CU-05', 'Registrar rótulos de la nota', 'JPR PER'],
        'notas.enviar' => ['CU-05', 'Enviar nota a revisión', 'JPR PER'],
        'notas.aprobar' => ['CU-05', 'Aprobar nota', 'JPR'],
        'notas.observar' => ['CU-05', 'Observar nota', 'JPR'],
        'material.listar' => ['CU-05', 'Consultar material audiovisual', 'JPR PER CAM EDI'],
        'material.crear' => ['CU-05', 'Registrar material audiovisual', 'PER CAM EDI'],
        'material.editar' => ['CU-05', 'Actualizar estado del material', 'EDI'],
        'plantillas.listar' => ['CU-06', 'Consultar plantillas', 'DIR JPR PRE'],
        'plantillas.crear' => ['CU-06', 'Crear plantilla', 'JPR'],
        'plantillas.editar' => ['CU-06', 'Configurar plantilla y cortes comerciales', 'JPR'],
        'programas.listar' => ['CU-06', 'Consultar programas', 'DIR JPR JAT PER CAM EDI PRE'],
        'programas.crear' => ['CU-06', 'Registrar programa', 'JPR'],
        'grilla.crear' => ['CU-06', 'Agregar horario a la grilla', 'JPR'],
        'escaletas.listar' => ['CU-06', 'Consultar escaletas', 'DIR JPR PER EDI PRE'],
        'escaletas.crear' => ['CU-06', 'Generar escaleta', 'JPR'],
        'escaletas.estado' => ['CU-06', 'Cambiar estado de la escaleta', 'JPR'],
        'escaletas.items' => ['CU-06', 'Agregar, reordenar, flotar o dar de baja ítems', 'JPR'],
        'escaletas.lectura' => ['CU-06', 'Leer escaleta en modo presentador', 'JPR PRE'],
        'escaletas.exportar' => ['CU-06', 'Exportar escaleta', 'JPR EDI PRE'],
        'dashboard.ver' => ['CU-07', 'Consultar panel analítico', 'ADM DIR JPR'],
        'analitica.ver' => ['CU-07', 'Consultar analítica periodística', 'DIR JPR'],
        'reportes.ver' => ['CU-08', 'Generar reportes', 'DIR JPR'],
        'reportes.mantenimiento' => ['CU-08', 'Generar reporte de equipos en mantenimiento', 'DIR JPR JAT'],
        'bitacora.ver' => ['CU-08', 'Consultar bitácoras y contador de visitas', 'ADM DIR'],
        'bitacora.fallidos' => ['CU-08', 'Consultar intentos fallidos por IP', 'ADM'],
    ];

    /**
     * Tabla C1 Opciones del Menú Dinámico: [grupo, nombre, ruta, icono, permiso].
     * Permiso null = todos los roles; una lista = los roles que tengan alguno
     * (la opción queda sin permiso propio y la asignación la da rol_menu).
     */
    private const MENU = [
        ['Gerencia', 'Panel Analítico', '/panel', 'panel', 'dashboard.ver'],
        ['Gerencia', 'Analítica Periodística', '/analitica', 'analitica', 'analitica.ver'],
        // Se habilita con cualquiera de los dos: el Jefe de Área Técnica solo tiene el de mantenimiento.
        ['Gerencia', 'Reportes y Estadísticas', '/reportes', 'reportes', ['reportes.ver', 'reportes.mantenimiento']],
        ['Prensa', 'Agenda de Coberturas', '/coberturas', 'agenda', 'coberturas.listar'],
        ['Prensa', 'Gestión de Notas', '/notas', 'notas', 'notas.listar'],
        ['Emisión', 'Programas y Grilla', '/programas', 'programas', 'programas.listar'],
        ['Emisión', 'Plantillas de Emisión', '/plantillas', 'plantillas', 'plantillas.listar'],
        ['Emisión', 'Escaletas', '/escaletas', 'escaletas', 'escaletas.listar'],
        ['Personal', 'Gestión de Personal', '/personal', 'personal', 'personal.listar'],
        ['Personal', 'Gestión de Turnos', '/turnos', 'turnos', 'turnos.listar'],
        ['Recursos', 'Inventario de Recursos', '/recursos', 'recursos', 'recursos.listar'],
        ['Recursos', 'Préstamos de Recursos', '/prestamos', 'prestamos', 'prestamos.listar'],
        ['Administración', 'Gestión de Usuarios', '/usuarios', 'usuarios', 'usuarios.listar'],
        ['Seguridad', 'Matriz de Accesos', '/seguridad/matriz', 'matriz', 'seguridad.matriz.ver'],
        ['Seguridad', 'Menú Dinámico', '/seguridad/menu', 'menu', 'seguridad.menu'],
        ['Seguridad', 'Bitácora de Accesos', '/seguridad/bitacora', 'bitacora', 'bitacora.ver'],
        ['Cuenta', 'Mi Perfil', '/perfil', 'perfil', null],
    ];

    public function run(): void
    {
        DB::transaction(function () {
            Rol::firstOrCreate(
                ['nombre' => Rol::ADMINISTRADOR],
                ['descripcion' => 'Administrador del sistema web: usuarios, matriz de accesos, menú y bitácora'],
            );

            $roles = Rol::whereIn('nombre', self::ROLES)->pluck('id', 'nombre');
            $permisosPorRol = [];

            foreach (self::MATRIZ as $codigo => [$casoUso, $descripcion, $siglas]) {
                $corte = strrpos($codigo, '.');
                $permiso = PermisoWeb::updateOrCreate(['codigo' => $codigo], [
                    'recurso' => substr($codigo, 0, $corte),
                    'accion' => substr($codigo, $corte + 1),
                    'caso_uso' => $casoUso,
                    'descripcion' => $descripcion,
                ]);

                foreach (explode(' ', $siglas) as $sigla) {
                    $permisosPorRol[self::ROLES[$sigla]][$codigo] = $permiso->id;
                }
            }

            $menus = [];
            $alternativos = [];
            foreach (self::MENU as $orden => [$grupo, $nombre, $ruta, $icono, $permiso]) {
                $menus[] = Menu::updateOrCreate(['ruta' => $ruta], [
                    'grupo' => $grupo,
                    'nombre' => $nombre,
                    'icono' => $icono,
                    'orden' => ($orden + 1) * 10,
                    'activo' => true,
                    'permiso_web_id' => is_string($permiso) ? PermisoWeb::where('codigo', $permiso)->value('id') : null,
                ]);
                $alternativos[end($menus)->id] = is_array($permiso) ? $permiso : null;
            }

            foreach ($roles as $nombre => $rolId) {
                $rol = Rol::find($rolId);
                $permisos = $permisosPorRol[$nombre] ?? [];
                $rol->permisosWeb()->sync(array_values($permisos));

                // Cada rol recibe las opciones del menú cuyo permiso tiene (y Mi Perfil).
                $rol->menus()->sync(collect($menus)
                    ->filter(fn (Menu $m) => $alternativos[$m->id]
                        ? array_intersect($alternativos[$m->id], array_keys($permisos)) !== []
                        : $m->permiso_web_id === null || in_array($m->permiso_web_id, $permisos, true))
                    ->pluck('id')
                    ->all());

                Rol::olvidarCache($rolId);
            }
        });
    }
}
