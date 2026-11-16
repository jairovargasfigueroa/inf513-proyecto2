<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * GrillaController «server page» (CU-06). GET /api/v1/grilla es público: la
 * página de Inicio muestra con él la grilla del día (verGrillaDelDia).
 */
class GrillaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $datos = $request->validate(['fecha' => ['nullable', 'date_format:Y-m-d']]);
        $fecha = isset($datos['fecha']) ? Carbon::parse($datos['fecha']) : today();

        $programas = DB::table('grilla')
            ->join('programa', 'programa.id', '=', 'grilla.programa_id')
            ->where('grilla.estado', 'vigente')
            ->where('programa.estado', 'activo')
            ->where('grilla.dia_semana', $fecha->isoWeekday())
            ->whereDate('grilla.vigente_desde', '<=', $fecha)
            ->where(fn ($q) => $q->whereNull('grilla.vigente_hasta')->orWhereDate('grilla.vigente_hasta', '>=', $fecha))
            ->orderBy('grilla.hora_inicio')
            ->get([
                'grilla.id', 'grilla.hora_inicio', 'grilla.hora_fin',
                'programa.nombre as programa', 'programa.tipo', 'programa.descripcion',
            ]);

        return response()->json(['fecha' => $fecha->toDateString(), 'data' => $programas]);
    }
}
