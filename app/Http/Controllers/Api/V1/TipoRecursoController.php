<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TipoRecurso;
use Illuminate\Http\JsonResponse;

/** TipoRecursoController «server page» (CU-03): FormularioRecurso pide GET /tipos-recurso. */
class TipoRecursoController extends Controller
{
    /** GET /api/v1/tipos-recurso (recursos.listar). */
    public function index(): JsonResponse
    {
        return response()->json(['data' => TipoRecurso::orderBy('nombre')->get(['id', 'nombre', 'es_unidad_movil'])]);
    }
}
