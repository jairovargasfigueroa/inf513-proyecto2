<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ReglaNegocioException;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * GrillaController «server page» (CU-06). GET /api/v1/grilla es público: la
 * página de Inicio muestra la grilla del día y Programas y Grilla la semanal.
 * POST /grilla agrega un horario (201 / 409 choque de grilla).
 */
class GrillaController extends Controller
{
    /** GET /api/v1/grilla?fecha= (del día) o ?vista=semana (todos los horarios vigentes). */
    public function index(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'fecha' => ['nullable', 'date_format:Y-m-d'],
            'vista' => ['nullable', 'in:dia,semana'],
        ]);

        if (($datos['vista'] ?? 'dia') === 'semana') {
            return response()->json(['data' => DB::select(
                "SELECT grilla_id AS id, dia_semana, dia, to_char(hora_inicio, 'HH24:MI') AS hora_inicio, to_char(hora_fin, 'HH24:MI') AS hora_fin,
                        programa_id, programa, tipo, vigente_desde, vigente_hasta
                 FROM v_grilla_semanal
                 WHERE vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE
                 ORDER BY dia_semana, hora_inicio",
            )]);
        }

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
                'grilla.id', 'grilla.hora_inicio', 'grilla.hora_fin', 'grilla.programa_id',
                'programa.nombre as programa', 'programa.tipo', 'programa.descripcion',
            ]);

        return response()->json(['fecha' => $fecha->toDateString(), 'data' => $programas]);
    }

    /** POST /api/v1/grilla (grilla.crear) → 201 / 409 choque de grilla (R16, R17). */
    public function store(Request $request): JsonResponse
    {
        $d = $request->validate([
            'programa_id' => ['required', 'integer', 'exists:programa,id'],
            'dia_semana' => ['required', 'integer', 'between:1,7'],
            'hora_inicio' => ['required', 'date_format:H:i', 'not_in:24:00'],
            'hora_fin' => ['required', 'regex:/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/', 'after:hora_inicio'],
            'vigente_desde' => ['required', 'date_format:Y-m-d'],
            'vigente_hasta' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:vigente_desde'],
        ], [
            'hora_fin.after' => 'La hora de fin debe ser posterior a la de inicio: un horario no cruza la medianoche (como máximo hasta 24:00).',
            'hora_fin.regex' => 'Escriba la hora de fin como HH:MM (hasta 24:00).',
            'vigente_hasta.after_or_equal' => 'La vigencia termina antes de empezar.',
        ], ['programa_id' => 'programa', 'dia_semana' => 'día', 'hora_inicio' => 'hora de inicio', 'hora_fin' => 'hora de fin', 'vigente_desde' => 'vigente desde', 'vigente_hasta' => 'vigente hasta']);

        if (DB::table('programa')->where('id', $d['programa_id'])->value('estado') !== 'activo') {
            throw new ReglaNegocioException('El programa está inactivo.');
        }

        // R17: no choca con otro horario del mismo día cuyas vigencias se cruzan.
        $choque = DB::selectOne(
            "SELECT programa, to_char(hora_inicio, 'HH24:MI') AS ini, to_char(hora_fin, 'HH24:MI') AS fin FROM v_grilla_semanal
             WHERE dia_semana = ? AND ?::time < hora_fin AND hora_inicio < ?::time
               AND vigente_desde <= COALESCE(?::date, 'infinity') AND COALESCE(vigente_hasta, 'infinity') >= ?::date
             LIMIT 1",
            [$d['dia_semana'], $d['hora_inicio'], $d['hora_fin'], $d['vigente_hasta'] ?? null, $d['vigente_desde']],
        );
        if ($choque) {
            throw new ReglaNegocioException("El horario choca con «{$choque->programa}» ({$choque->ini}–{$choque->fin}) ese mismo día.");
        }

        $id = DB::table('grilla')->insertGetId($d);

        return response()->json(['message' => 'Horario agregado a la grilla.', 'data' => ['id' => $id]], 201);
    }
}
