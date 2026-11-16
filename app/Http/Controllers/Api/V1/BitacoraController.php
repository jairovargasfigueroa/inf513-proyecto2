<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PeriodoRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * BitacoraController «server page» (CU-08): la Bitácora de Accesos lista los
 * registros, los intentos fallidos por IP y los recursos con mayor índice de
 * acceso (consigna, punto 4; RF-18).
 */
class BitacoraController extends Controller
{
    /** GET /api/v1/bitacora?tipo=&desde=&hasta=&ip=&buscar= (bitacora.ver). */
    public function index(PeriodoRequest $request): JsonResponse
    {
        [$desde, $hasta] = $request->rango();
        $f = $request->validate([
            'tipo' => ['nullable', 'in:login_exitoso,login_fallido,logout,acceso,acceso_denegado,error'],
            'ip' => ['nullable', 'string', 'max:45'],
            'buscar' => ['nullable', 'string', 'max:100'],
        ]);

        $pagina = DB::table('bitacora_acceso as b')
            ->leftJoin('usuario as u', 'u.id', '=', 'b.usuario_id')
            ->whereRaw('b.fecha_hora::date BETWEEN ? AND ?', [$desde, $hasta])
            ->when($f['tipo'] ?? null, fn ($q, $t) => $q->where('b.tipo_evento', $t))
            ->when($f['ip'] ?? null, fn ($q, $ip) => $q->where('b.ip', $ip))
            ->when($f['buscar'] ?? null, function ($q, $t) {
                $p = '%'.addcslashes($t, '%_\\').'%';
                $q->where(fn ($w) => $w->where('b.recurso', 'ilike', $p)->orWhere('b.correo_intentado', 'ilike', $p)
                    ->orWhereRaw("u.nombre || ' ' || u.apellido ilike ?", [$p]));
            })
            ->orderByDesc('b.id')
            ->select('b.id', 'b.tipo_evento', 'b.metodo_http', 'b.recurso', 'b.codigo_estado', 'b.ip', 'b.user_agent', 'b.correo_intentado',
                DB::raw("to_char(b.fecha_hora, 'YYYY-MM-DD HH24:MI:SS') AS fecha_hora"),
                DB::raw("u.nombre || ' ' || u.apellido AS usuario"))
            ->paginate(25);

        return response()->json([
            'data' => $pagina->items(),
            'meta' => ['current_page' => $pagina->currentPage(), 'last_page' => $pagina->lastPage(), 'total' => $pagina->total()],
        ]);
    }

    /** GET /api/v1/bitacora/intentos-fallidos?desde&hasta (bitacora.fallidos): agrupados por IP. */
    public function intentosFallidos(PeriodoRequest $request): JsonResponse
    {
        return response()->json(['data' => DB::select(
            "SELECT ip, COUNT(*)::int AS intentos, COUNT(DISTINCT correo_intentado)::int AS correos,
                    string_agg(DISTINCT correo_intentado, ', ') AS correos_intentados,
                    to_char(MAX(fecha_hora), 'YYYY-MM-DD HH24:MI') AS ultimo
             FROM bitacora_acceso WHERE tipo_evento = 'login_fallido' AND fecha_hora::date BETWEEN ? AND ?
             GROUP BY ip ORDER BY intentos DESC, ultimo DESC",
            $request->rango(),
        )]);
    }

    /** GET /api/v1/bitacora/recursos-top?desde&hasta (bitacora.ver): recursos con mayor índice de acceso. */
    public function recursosTop(PeriodoRequest $request): JsonResponse
    {
        return response()->json(['data' => DB::select(
            "SELECT metodo_http || ' ' || recurso AS recurso, COUNT(*)::int AS accesos,
                    COUNT(DISTINCT usuario_id)::int AS usuarios,
                    COUNT(*) FILTER (WHERE codigo_estado >= 400)::int AS rechazos
             FROM bitacora_acceso WHERE fecha_hora::date BETWEEN ? AND ?
             GROUP BY metodo_http, recurso ORDER BY accesos DESC LIMIT 10",
            $request->rango(),
        )]);
    }
}
