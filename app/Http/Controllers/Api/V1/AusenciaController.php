<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AusenciaRequest;
use App\Models\Ausencia;
use App\Services\ValidadorConflictos;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * AusenciaController «server page» (CU-02): Gestión de Ausencias lista con
 * GET /ausencias y FormularioAusencia envía POST /ausencias (201 / 422 rango inválido).
 */
class AusenciaController extends Controller
{
    /** GET /api/v1/ausencias?personal_id=&vigentes=1 (ausencias.listar). */
    public function index(Request $request): JsonResponse
    {
        $f = $request->validate([
            'personal_id' => ['nullable', 'integer'],
            'vigentes' => ['nullable', 'boolean'],
        ]);

        $pagina = DB::table('ausencia as a')
            ->join('personal as p', 'p.id', '=', 'a.personal_id')
            ->join('usuario as u', 'u.id', '=', 'p.usuario_id')
            ->when($f['personal_id'] ?? null, fn ($q, $id) => $q->where('a.personal_id', $id))
            ->when($request->boolean('vigentes'), fn ($q) => $q->where('a.fecha_hora_fin', '>', now()))
            ->orderByDesc('a.fecha_hora_inicio')
            ->select('a.id', 'a.personal_id', 'a.tipo', 'a.motivo', 'p.cargo',
                DB::raw("u.nombre || ' ' || u.apellido AS persona"),
                DB::raw("to_char(a.fecha_hora_inicio, 'YYYY-MM-DD HH24:MI') AS inicio"),
                DB::raw("to_char(a.fecha_hora_fin, 'YYYY-MM-DD HH24:MI') AS fin"))
            ->paginate(15);

        return response()->json([
            'data' => $pagina->items(),
            'meta' => ['current_page' => $pagina->currentPage(), 'last_page' => $pagina->lastPage(), 'total' => $pagina->total()],
        ]);
    }

    /** POST /api/v1/ausencias (ausencias.crear) → 201; avisa qué coberturas de ese tiempo hay que reasignar. */
    public function store(AusenciaRequest $request, ValidadorConflictos $conflictos): JsonResponse
    {
        $inicio = str_replace('T', ' ', $request->inicio);
        $fin = str_replace('T', ' ', $request->fin);

        $ausencia = Ausencia::create([
            'personal_id' => $request->personal_id,
            'tipo' => $request->tipo,
            'fecha_hora_inicio' => $inicio,
            'fecha_hora_fin' => $fin,
            'motivo' => $request->motivo,
        ]);

        $avisos = array_map(
            fn ($c) => "Esta persona tiene asignada la cobertura «{$c->titulo}» ({$c->inicio}) durante la ausencia: reasígnela.",
            $conflictos->coberturasDePersona($request->personal_id, $inicio, $fin),
        );

        return response()->json(['message' => 'Ausencia registrada.', 'avisos' => $avisos, 'data' => $ausencia], 201);
    }
}
