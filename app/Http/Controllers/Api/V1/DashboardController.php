<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PeriodoRequest;
use App\Services\Estadisticas;
use Illuminate\Http\JsonResponse;

/**
 * DashboardController «server page» (CU-07): el Panel Analítico pide
 * GET /dashboard?desde&hasta (200 / 422 período inválido). Consigna, punto 8.
 */
class DashboardController extends Controller
{
    /** GET /api/v1/dashboard (dashboard.ver). */
    public function index(PeriodoRequest $request, Estadisticas $estadisticas): JsonResponse
    {
        return response()->json($estadisticas->panel(...$request->rango()));
    }
}
