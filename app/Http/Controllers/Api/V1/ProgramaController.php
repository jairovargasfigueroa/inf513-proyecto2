<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** ProgramaController «server page» (CU-06): GET /programas y POST /programas → 201. */
class ProgramaController extends Controller
{
    /** GET /api/v1/programas (programas.listar). */
    public function index(): JsonResponse
    {
        return response()->json(['data' => DB::select(
            "SELECT p.id, p.nombre, p.tipo, p.descripcion, p.estado,
                    (SELECT COUNT(*) FROM grilla g WHERE g.programa_id = p.id AND g.estado = 'vigente') AS horarios,
                    (SELECT COUNT(*) FROM plantilla pl WHERE pl.programa_id = p.id) AS plantillas
             FROM programa p ORDER BY p.estado, p.nombre",
        )]);
    }

    /** POST /api/v1/programas (programas.crear) → 201. */
    public function store(Request $request): JsonResponse
    {
        $d = $request->validate([
            'nombre' => ['required', 'string', 'max:100', 'unique:programa,nombre'],
            'tipo' => ['required', 'in:noticiero,especial,otro'],
            'descripcion' => ['nullable', 'string', 'max:255'],
        ], [], ['descripcion' => 'descripción']);

        $id = DB::table('programa')->insertGetId($d);

        return response()->json(['message' => "Programa «{$d['nombre']}» registrado.", 'data' => ['id' => $id]], 201);
    }
}
