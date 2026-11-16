<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ReglaNegocioException;
use App\Http\Controllers\Controller;
use App\Models\PermisoWeb;
use App\Models\Rol;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * PermisoController «server page» (CU-01): la Matriz de Accesos carga con
 * GET /permisos/matriz y guarda los permisos de un rol con
 * PUT /roles/{id}/permisos; la respuesta 200 vuelve a la Matriz.
 */
class PermisoController extends Controller
{
    /** Sin estos permisos nadie podría volver a administrar la matriz ni el menú. */
    private const INDISPENSABLES_ADMINISTRADOR = ['seguridad.matriz.editar', 'seguridad.menu'];

    /** GET /api/v1/permisos/matriz (seguridad.matriz.ver). */
    public function matriz(): JsonResponse
    {
        $permisos = PermisoWeb::orderBy('caso_uso')->orderBy('id')->get(['id', 'codigo', 'descripcion', 'caso_uso']);

        return response()->json([
            'roles' => Rol::orderBy('id')->get(['id', 'nombre']),
            'casos_uso' => $permisos->groupBy('caso_uso')
                ->map(fn ($lista, $cu) => ['caso_uso' => $cu, 'permisos' => $lista->map->only(['id', 'codigo', 'descripcion'])->values()])
                ->values(),
            'asignaciones' => DB::table('rol_permiso_web')->get(['rol_id', 'permiso_web_id'])
                ->groupBy('rol_id')
                ->map(fn ($filas) => $filas->pluck('permiso_web_id')->values()),
        ]);
    }

    /** PUT /api/v1/roles/{id}/permisos (seguridad.matriz.editar): reemplaza los permisos del rol. */
    public function actualizar(Request $request, Rol $rol): JsonResponse
    {
        $datos = $request->validate([
            'permisos' => ['present', 'array'],
            'permisos.*' => ['integer', 'distinct', 'exists:permiso_web,id'],
        ]);

        if ($rol->nombre === Rol::ADMINISTRADOR) {
            $faltan = PermisoWeb::whereIn('codigo', self::INDISPENSABLES_ADMINISTRADOR)
                ->whereNotIn('id', $datos['permisos'])
                ->pluck('codigo');

            if ($faltan->isNotEmpty()) {
                throw new ReglaNegocioException('El rol Administrador no puede perder estos permisos: '.$faltan->join(', ').'.');
            }
        }

        $rol->permisosWeb()->sync($datos['permisos']);
        Rol::olvidarCache($rol->id);

        return response()->json([
            'message' => "Permisos del rol {$rol->nombre} guardados.",
            'data' => ['rol_id' => $rol->id, 'permisos' => $rol->permisosWeb()->pluck('permiso_web.id')],
        ]);
    }
}
