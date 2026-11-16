<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Rol;
use Illuminate\Http\JsonResponse;

/** RolController «server page» (CU-01): FormularioUsuario pide GET /roles. */
class RolController extends Controller
{
    /** GET /api/v1/roles (roles.listar). */
    public function index(): JsonResponse
    {
        $roles = Rol::withCount(['usuarios as usuarios_activos' => fn ($q) => $q->where('estado', 'activo')])
            ->orderBy('id')
            ->get(['id', 'nombre', 'descripcion']);

        return response()->json(['data' => $roles]);
    }
}
