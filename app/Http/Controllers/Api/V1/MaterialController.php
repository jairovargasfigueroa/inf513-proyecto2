<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Nota;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * MaterialController «server page» (CU-05): Material Audiovisual lista con
 * GET /notas/{id}/material; FormularioMaterial envía POST /notas/{id}/material
 * o PUT /material/{id} (RF-10).
 */
class MaterialController extends Controller
{
    private const REGLAS = [
        'descripcion' => ['required', 'string', 'max:200'],
        'tipo' => ['required', 'in:video,sot,grafico,foto,audio'],
        'duracion' => ['required', 'integer', 'between:0,36000'],
        'ubicacion' => ['nullable', 'string', 'max:255'],
        'estado' => ['required', 'in:pendiente,ingestado,en_edicion,listo'],
    ];

    private const NOMBRES = ['descripcion' => 'descripción', 'duracion' => 'duración (segundos)', 'ubicacion' => 'ubicación'];

    /** GET /api/v1/notas/{id}/material (material.listar). */
    public function index(Nota $nota): JsonResponse
    {
        return response()->json([
            'nota' => $nota->only(['id', 'slug', 'titulo', 'estado']),
            'data' => DB::select(
                "SELECT m.id, m.descripcion, m.tipo, m.duracion, m.ubicacion, m.estado,
                        u.nombre || ' ' || u.apellido AS editor, to_char(m.actualizado_en, 'YYYY-MM-DD HH24:MI') AS actualizado
                 FROM material_audiovisual m LEFT JOIN personal p ON p.id = m.editor_id LEFT JOIN usuario u ON u.id = p.usuario_id
                 WHERE m.nota_id = ? ORDER BY m.id",
                [$nota->id],
            ),
        ]);
    }

    /** POST /api/v1/notas/{id}/material (material.crear) → 201. */
    public function store(Request $request, Nota $nota): JsonResponse
    {
        $d = $request->validate(self::REGLAS, [], self::NOMBRES);
        $id = DB::table('material_audiovisual')->insertGetId([...$d, 'nota_id' => $nota->id]);

        return response()->json(['message' => 'Material registrado.', 'data' => ['id' => $id]], 201);
    }

    /** PUT /api/v1/material/{id} (material.editar): el editor actualiza el estado; queda como responsable. */
    public function update(Request $request, int $material): JsonResponse
    {
        $fila = DB::table('material_audiovisual')->where('id', $material)->first() ?? abort(404);
        $d = $request->validate(self::REGLAS, [], self::NOMBRES);

        DB::table('material_audiovisual')->where('id', $fila->id)->update([
            ...$d,
            'editor_id' => $request->user()->personal?->id ?? $fila->editor_id,
            'actualizado_en' => now(),
        ]);

        return response()->json(['message' => 'Material actualizado.']);
    }
}
