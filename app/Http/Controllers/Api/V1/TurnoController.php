<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\TurnoRequest;
use App\Models\Turno;
use Illuminate\Http\JsonResponse;

/** TurnoController «server page» (CU-02): GET /turnos y POST /turnos → 201. */
class TurnoController extends Controller
{
    /** GET /api/v1/turnos (turnos.listar). */
    public function index(): JsonResponse
    {
        $turnos = Turno::withCount(['personal as personal_activo' => fn ($q) => $q->where('estado', 'activo')])
            ->orderBy('hora_inicio')
            ->get()
            ->map(fn (Turno $t) => [
                'id' => $t->id,
                'nombre' => $t->nombre,
                'hora_inicio' => substr($t->hora_inicio, 0, 5),
                'hora_fin' => substr($t->hora_fin, 0, 5),
                'dias' => $t->dias,
                'descripcion' => $t->descripcion,
                'personal_activo' => $t->personal_activo,
            ]);

        return response()->json(['data' => $turnos]);
    }

    /** POST /api/v1/turnos (turnos.crear) → 201. */
    public function store(TurnoRequest $request): JsonResponse
    {
        $turno = Turno::create($request->validated());

        return response()->json(['message' => 'Turno registrado.', 'data' => $turno], 201);
    }
}
