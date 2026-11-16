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
 * PlantillaController «server page» (CU-06): Plantillas de Emisión lista, crea
 * y configura plantillas; cada respuesta (201 / 200) trae el tiempo neto y el
 * control de la plantilla (R18).
 */
class PlantillaController extends Controller
{
    use ReglasPlantilla;

    public function __construct(private CalculadoraTiempos $tiempos) {}

    /** GET /api/v1/plantillas (plantillas.listar). */
    public function index(): JsonResponse
    {
        $plantillas = DB::select(
            'SELECT p.id, p.programa_id, pr.nombre AS programa, p.nombre, p.duracion_total, p.cantidad_bloques, p.palabras_por_minuto, p.estado
             FROM plantilla p JOIN programa pr ON pr.id = p.programa_id ORDER BY pr.nombre, p.nombre',
        );

        return response()->json(['data' => array_map(fn ($p) => [
            ...(array) $p,
            ...$this->tiempos->plantilla($p->id),
            'cortes' => DB::table('plantilla_corte')->where('plantilla_id', $p->id)->orderBy('numero')->get(['id', 'numero', 'minuto_inicio', 'duracion']),
        ], $plantillas)]);
    }

    /** POST /api/v1/plantillas (plantillas.crear) → 201 + tiempo neto. */
    public function store(Request $request): JsonResponse
    {
        $d = $this->validar($request);
        $id = DB::table('plantilla')->insertGetId($d);

        return response()->json(['message' => "Plantilla «{$d['nombre']}» creada. Agregue sus cortes comerciales.", 'data' => ['id' => $id, ...$this->tiempos->plantilla($id)]], 201);
    }

    /** PUT /api/v1/plantillas/{id} (plantillas.editar) → 200 + tiempo neto. */
    public function update(Request $request, int $plantilla): JsonResponse
    {
        DB::table('plantilla')->where('id', $plantilla)->exists() || abort(404);
        $d = $this->validar($request, $plantilla);
        $this->sinEscaletasEnBorrador($plantilla);

        $maxCorte = (int) DB::table('plantilla_corte')->where('plantilla_id', $plantilla)->max('numero');
        if ($maxCorte > $d['cantidad_bloques'] - 1) {
            throw new ReglaNegocioException("La plantilla tiene el corte $maxCorte: con {$d['cantidad_bloques']} bloques solo caben ".($d['cantidad_bloques'] - 1).' cortes. Ajuste los cortes primero.');
        }

        DB::table('plantilla')->where('id', $plantilla)->update([...$d, 'actualizado_en' => now()]);

        return response()->json(['message' => 'Plantilla configurada.', 'data' => ['id' => $plantilla, ...$this->tiempos->plantilla($plantilla)]]);
    }

    private function validar(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'programa_id' => ['required', 'integer', 'exists:programa,id'],
            'nombre' => ['required', 'string', 'max:100', Rule::unique('plantilla', 'nombre')->ignore($id)],
            'duracion_total' => ['required', 'integer', 'between:60,14400'],
            'cantidad_bloques' => ['required', 'integer', 'between:1,10'],
            'palabras_por_minuto' => ['required', 'integer', 'between:80,250'],
        ], [], ['programa_id' => 'programa', 'duracion_total' => 'duración total', 'cantidad_bloques' => 'cantidad de bloques', 'palabras_por_minuto' => 'ritmo estándar']);
    }
}
