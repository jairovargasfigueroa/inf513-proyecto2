<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ReglaNegocioException;
use App\Http\Controllers\Concerns\ReglasPlantilla;
use App\Http\Controllers\Controller;
use App\Services\CalculadoraTiempos;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * CorteController «server page» (CU-06): FormularioCorte agrega o ajusta los
 * cortes comerciales de una plantilla (201 / 200 + tiempo neto).
 */
class CorteController extends Controller
{
    use ReglasPlantilla;

    public function __construct(private CalculadoraTiempos $tiempos)
    {
    }

    /** POST /api/v1/plantillas/{id}/cortes (plantillas.editar) → 201 + tiempo neto. */
    public function store(Request $request, int $plantilla): JsonResponse
    {
        $p = DB::table('plantilla')->where('id', $plantilla)->first() ?? abort(404);
        $d = $this->validarCorte($request, $p);
        $this->sinEscaletasEnBorrador($plantilla);

        $id = DB::table('plantilla_corte')->insertGetId([...$d, 'plantilla_id' => $plantilla]);

        return response()->json(['message' => "Corte {$d['numero']} agregado.", 'data' => ['id' => $id, ...$this->tiempos->plantilla($plantilla)]], 201);
    }

    /** PUT /api/v1/cortes/{id} (plantillas.editar) → 200 + tiempo neto. */
    public function update(Request $request, int $corte): JsonResponse
    {
        $c = DB::table('plantilla_corte')->where('id', $corte)->first() ?? abort(404);
        $p = DB::table('plantilla')->where('id', $c->plantilla_id)->first();
        $d = $this->validarCorte($request, $p, $corte);
        $this->sinEscaletasEnBorrador($p->id);

        DB::table('plantilla_corte')->where('id', $corte)->update([...$d, 'actualizado_en' => now()]);

        return response()->json(['message' => "Corte {$d['numero']} ajustado.", 'data' => $this->tiempos->plantilla($p->id)]);
    }

    private function validarCorte(Request $request, object $p, ?int $id = null): array
    {
        $d = $request->validate([
            'numero' => ['required', 'integer', 'min:1', 'max:'.max(1, $p->cantidad_bloques - 1),
                Rule::unique('plantilla_corte', 'numero')->where('plantilla_id', $p->id)->ignore($id)],
            'minuto_inicio' => ['required', 'integer', 'min:1'],
            'duracion' => ['required', 'integer', 'between:1,1800'],
        ], [
            'numero.max' => "Con {$p->cantidad_bloques} bloques, la plantilla lleva ".($p->cantidad_bloques - 1).' cortes (del 1 al '.($p->cantidad_bloques - 1).').',
            'numero.unique' => 'Ya existe un corte con ese número en la plantilla.',
        ], ['numero' => 'número', 'minuto_inicio' => 'minuto de inicio', 'duracion' => 'duración (segundos)']);

        if ($d['minuto_inicio'] * 60 + $d['duracion'] > $p->duracion_total) {
            throw new ReglaNegocioException('El corte termina después del final del programa ('.intdiv($p->duracion_total, 60).' minutos).');
        }

        return $d;
    }
}
