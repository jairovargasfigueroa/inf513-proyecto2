<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\MenuRequest;
use App\Models\Menu;
use App\Models\PermisoWeb;
use App\Models\Rol;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * MenuController «server page» (CU-01): el Menú Dinámico lista con GET /menus,
 * FormularioMenu envía POST | PUT /menus y la pantalla asigna opciones a un rol
 * con PUT /roles/{id}/menus; la respuesta 201 / 200 vuelve al Menú Dinámico.
 */
class MenuController extends Controller
{
    /** GET /api/v1/menus (seguridad.menu): opciones, roles, permisos y asignaciones. */
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Menu::with('permiso:id,codigo')->orderBy('orden')->get(),
            'roles' => Rol::orderBy('id')->get(['id', 'nombre']),
            'permisos' => PermisoWeb::orderBy('codigo')->get(['id', 'codigo', 'descripcion']),
            'asignaciones' => DB::table('rol_menu')->get(['rol_id', 'menu_id'])
                ->groupBy('rol_id')
                ->map(fn ($filas) => $filas->pluck('menu_id')->values()),
        ]);
    }

    /** POST /api/v1/menus (seguridad.menu) → 201. */
    public function store(MenuRequest $request): JsonResponse
    {
        $menu = Menu::create($request->validated());
        $this->olvidarMenus();

        return response()->json(['message' => 'Opción del menú registrada.', 'data' => $menu->load('permiso:id,codigo')], 201);
    }

    /** PUT /api/v1/menus/{id} (seguridad.menu) → 200. */
    public function update(MenuRequest $request, Menu $menu): JsonResponse
    {
        $menu->update($request->validated());
        $this->olvidarMenus();

        return response()->json(['message' => 'Opción del menú modificada.', 'data' => $menu->load('permiso:id,codigo')]);
    }

    /** PUT /api/v1/roles/{id}/menus (seguridad.menu): opciones del menú que ve el rol. */
    public function asignar(Request $request, Rol $rol): JsonResponse
    {
        $datos = $request->validate([
            'menus' => ['present', 'array'],
            'menus.*' => ['integer', 'distinct', 'exists:menu,id'],
        ]);

        $rol->menus()->sync($datos['menus']);
        Rol::olvidarCache($rol->id);

        return response()->json([
            'message' => "Menú del rol {$rol->nombre} guardado.",
            'data' => ['rol_id' => $rol->id, 'menus' => $rol->menus()->pluck('menu.id')],
        ]);
    }

    /** Un cambio en una opción afecta al menú de todos los roles. */
    private function olvidarMenus(): void
    {
        Rol::pluck('id')->each(fn ($id) => Rol::olvidarCache($id));
    }
}
