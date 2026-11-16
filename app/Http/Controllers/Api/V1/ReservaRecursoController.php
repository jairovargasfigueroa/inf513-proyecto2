<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ReglaNegocioException;
use App\Http\Controllers\Controller;
use App\Models\Cobertura;
use App\Services\ValidadorConflictos;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ReservaRecursoController «server page» (CU-04): FormularioReserva envía
 * POST /coberturas/{id}/recursos (201 / 409 conflicto) y el Detalle libera con DELETE.
 */
class ReservaRecursoController extends Controller
{
    /** POST /api/v1/coberturas/{id}/recursos (coberturas.reservar). */
    public function store(Request $request, Cobertura $cobertura, ValidadorConflictos $conflictos): JsonResponse
    {
        $d = $request->validate(['recurso_id' => ['required', 'integer', 'exists:recurso,id']], [], ['recurso_id' => 'recurso']);

        $this->exigirActiva($cobertura);
        $codigo = DB::table('recurso')->where('id', $d['recurso_id'])->value('codigo');

        if (DB::table('cobertura_recurso')->where(['cobertura_id' => $cobertura->id, 'recurso_id' => $d['recurso_id']])->exists()) {
            throw new ReglaNegocioException("$codigo ya está reservado para esta cobertura.");
        }

        // R7: el recurso debe estar operativo y sin otra reserva que se cruce.
        if ($m = $conflictos->recurso($d['recurso_id'], $cobertura->inicio(), $cobertura->fin(), $cobertura->id)) {
            throw new ReglaNegocioException("$m.");
        }

        DB::table('cobertura_recurso')->insert(['cobertura_id' => $cobertura->id, 'recurso_id' => $d['recurso_id']]);

        return response()->json(['message' => "$codigo reservado para la cobertura."], 201);
    }

    /** DELETE /api/v1/coberturas/{id}/recursos/{recursoId} (coberturas.reservar). */
    public function destroy(Cobertura $cobertura, int $recurso): JsonResponse
    {
        $this->exigirActiva($cobertura);

        if (! DB::table('cobertura_recurso')->where(['cobertura_id' => $cobertura->id, 'recurso_id' => $recurso])->delete()) {
            throw new ReglaNegocioException('Ese recurso no está reservado para la cobertura.');
        }

        return response()->json(['message' => 'Recurso liberado.']);
    }

    private function exigirActiva(Cobertura $cobertura): void
    {
        if (! $cobertura->estaActiva()) {
            throw new ReglaNegocioException("La cobertura ya terminó ({$cobertura->estado}): no se modifican sus recursos.");
        }
    }
}
