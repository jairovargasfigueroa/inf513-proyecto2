<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PeriodoRequest;
use App\Services\Estadisticas;
use Illuminate\Http\JsonResponse;

/**
 * AnaliticaController «server page» (CU-07): la Analítica Periodística consulta
 * la producción por periodista y el cumplimiento de coberturas (RF-16).
 */
class AnaliticaController extends Controller
{
    public function __construct(private Estadisticas $estadisticas) {}

    /** GET /api/v1/analitica/produccion?desde&hasta (analitica.ver). */
    public function produccion(PeriodoRequest $request): JsonResponse
    {
        [$desde, $hasta] = $request->rango();

        return response()->json(['periodo' => compact('desde', 'hasta'), 'data' => $this->estadisticas->produccion($desde, $hasta)]);
    }

    /** GET /api/v1/analitica/coberturas?desde&hasta (analitica.ver). */
    public function coberturas(PeriodoRequest $request): JsonResponse
    {
        [$desde, $hasta] = $request->rango();

        return response()->json(['periodo' => compact('desde', 'hasta'), 'data' => $this->estadisticas->coberturas($desde, $hasta)]);
    }
}
