<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ReglaNegocioException;
use App\Http\Controllers\Controller;
use App\Models\Cobertura;
use App\Models\Personal;
use App\Services\ValidadorConflictos;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * AsignacionPersonalController «server page» (CU-04): FormularioAsignacion envía
 * POST /coberturas/{id}/personal (201 / 409 conflicto) y el Detalle quita con DELETE.
 */
class AsignacionPersonalController extends Controller
{
    /** L6: cargos que pueden cumplir cada función en la cobertura. */
    private const CARGOS_POR_FUNCION = [
        'periodista' => ['periodista', 'jefe_prensa'],
        'camarografo' => ['camarografo'],
        'conductor' => ['conductor', 'presentador'],
    ];

    /** POST /api/v1/coberturas/{id}/personal (coberturas.asignar). */
    public function store(Request $request, Cobertura $cobertura, ValidadorConflictos $conflictos): JsonResponse
    {
        $d = $request->validate([
            'personal_id' => ['required', 'integer', 'exists:personal,id'],
            'funcion' => ['required', 'in:periodista,camarografo,conductor'],
        ], [], ['personal_id' => 'persona', 'funcion' => 'función']);

        $this->exigirActiva($cobertura);
        $persona = Personal::with('usuario')->find($d['personal_id']);
        $nombre = $persona->usuario->nombre_completo;

        if ($persona->estado !== 'activo') {
            throw new ReglaNegocioException("La ficha de $nombre está inactiva.");
        }
        if (! in_array($persona->cargo, self::CARGOS_POR_FUNCION[$d['funcion']], true)) {
            throw new ReglaNegocioException("$nombre es ".str_replace('_', ' ', $persona->cargo).": no puede ir como {$d['funcion']}.");
        }
        if (DB::table('cobertura_personal')->where(['cobertura_id' => $cobertura->id, 'personal_id' => $persona->id])->exists()) {
            throw new ReglaNegocioException("$nombre ya está asignado a esta cobertura.");
        }

        // R6: una ausencia u otra cobertura que se cruza impide la asignación.
        if ($m = $conflictos->ausencia($persona->id, $cobertura->inicio(), $cobertura->fin())
            ?? $conflictos->otraCoberturaDePersona($persona->id, $cobertura->inicio(), $cobertura->fin(), $cobertura->id)) {
            throw new ReglaNegocioException("$nombre $m.");
        }

        DB::table('cobertura_personal')->insert([
            'cobertura_id' => $cobertura->id, 'personal_id' => $persona->id, 'funcion' => $d['funcion'],
        ]);

        // Quedar fuera del turno es solo una advertencia.
        $fuera = $conflictos->fueraDeTurno($persona->id, $cobertura->inicio(), $cobertura->fin());

        return response()->json([
            'message' => "$nombre asignado como {$d['funcion']}.",
            'avisos' => $fuera ? ["$nombre $fuera."] : [],
        ], 201);
    }

    /** DELETE /api/v1/coberturas/{id}/personal/{personalId} (coberturas.asignar). */
    public function destroy(Cobertura $cobertura, int $personal): JsonResponse
    {
        $this->exigirActiva($cobertura);

        $borradas = DB::table('cobertura_personal')->where(['cobertura_id' => $cobertura->id, 'personal_id' => $personal])->delete();
        if (! $borradas) {
            throw new ReglaNegocioException('Esa persona no está asignada a la cobertura.');
        }

        return response()->json(['message' => 'Persona quitada de la cobertura.']);
    }

    private function exigirActiva(Cobertura $cobertura): void
    {
        if (! $cobertura->estaActiva()) {
            throw new ReglaNegocioException("La cobertura ya terminó ({$cobertura->estado}): no se modifica su equipo.");
        }
    }
}
