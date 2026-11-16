<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PeriodoRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * BitacoraComandoController «server page» (CU-08): consulta la bitácora del
 * sistema vía correo (tabla bitacora_comando del Proyecto 1). Los asuntos ya
 * vienen con las contraseñas enmascaradas.
 */
class BitacoraComandoController extends Controller
{
    /** GET /api/v1/bitacora-comandos?desde&hasta&remitente&comando&resultado (bitacora.ver). */
    public function index(PeriodoRequest $request): JsonResponse
    {
        [$desde, $hasta] = $request->rango();
        $f = $request->validate([
            'remitente' => ['nullable', 'string', 'max:150'],
            'comando' => ['nullable', 'string', 'max:10'],
            'resultado' => ['nullable', 'in:exito,error'],
        ]);

        $pagina = DB::table('bitacora_comando as b')
            ->leftJoin('usuario as u', 'u.id', '=', 'b.usuario_id')
            ->whereRaw('b.fecha_hora::date BETWEEN ? AND ?', [$desde, $hasta])
            ->when($f['remitente'] ?? null, fn ($q, $r) => $q->where('b.remitente', 'ilike', '%'.addcslashes($r, '%_\\').'%'))
            ->when($f['comando'] ?? null, fn ($q, $c) => $q->where('b.comando', mb_strtoupper($c)))
            ->when($f['resultado'] ?? null, fn ($q, $r) => $q->where('b.resultado', $r))
            ->orderByDesc('b.id')
            ->select('b.id', 'b.remitente', 'b.comando', 'b.resultado', 'b.asunto', 'b.respuesta',
                DB::raw("to_char(b.fecha_hora, 'YYYY-MM-DD HH24:MI:SS') AS fecha_hora"),
                DB::raw("u.nombre || ' ' || u.apellido AS usuario"))
            ->paginate(20);

        return response()->json([
            'data' => $pagina->items(),
            'meta' => ['current_page' => $pagina->currentPage(), 'last_page' => $pagina->lastPage(), 'total' => $pagina->total()],
        ]);
    }
}
