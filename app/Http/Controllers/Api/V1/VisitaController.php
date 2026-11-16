<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegistrarVisitaRequest;
use App\Models\ContadorVisita;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * VisitaController «server page» (navegación general y CU-08): contador de
 * visitas persistente por página (consigna, punto 7).
 */
class VisitaController extends Controller
{
    /** POST /api/v1/visitas (público): suma una visita y devuelve el total. */
    public function registrar(RegistrarVisitaRequest $request): JsonResponse
    {
        $pagina = $request->paginaNormalizada();
        $total = DB::selectOne('SELECT fn_registrar_visita(?) AS total', [$pagina])->total;

        return response()->json(['pagina' => $pagina, 'total' => (int) $total]);
    }

    /** GET /api/v1/visitas (bitacora.ver): visitas acumuladas de cada página. */
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => ContadorVisita::orderByDesc('cantidad')->get(['pagina', 'cantidad', 'ultima_visita']),
        ]);
    }
}
