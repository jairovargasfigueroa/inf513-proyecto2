<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Buscador;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * BusquedaController «server page» (navegación general): el BuscadorGlobal del
 * encabezado envía GET /api/v1/busqueda?q= y la respuesta 200 lleva a
 * Resultados de Búsqueda. Es público; los resultados dependen de los permisos.
 */
class BusquedaController extends Controller
{
    public function buscar(Request $request, Buscador $buscador): JsonResponse
    {
        $datos = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:100'],
            'limite' => ['nullable', 'integer', 'between:1,20'],
        ]);

        return response()->json([
            'q' => $datos['q'],
            'data' => $buscador->buscar(trim($datos['q']), $request->user('sanctum'), $datos['limite'] ?? 5),
        ]);
    }
}
