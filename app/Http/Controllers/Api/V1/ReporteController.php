<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PeriodoRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * ReporteController «server page» (CU-08): FiltroReporte pide
 * GET /reportes/{coberturas|recursos|mantenimiento|notas}?desde&hasta y la
 * respuesta 200 lleva a la Vista del Reporte (RF-14). Todos responden con la
 * misma forma: título, columnas, filas, totales y una nota.
 */
class ReporteController extends Controller
{
    /** Coberturas por periodista (reportes.ver). */
    public function coberturas(PeriodoRequest $request): JsonResponse
    {
        [$desde, $hasta] = $request->rango();

        return $this->reporte('Coberturas por periodista', $desde, $hasta, [
            ['periodista', 'Periodista', 'texto'], ['cumplidas', 'Cumplidas', 'numero'], ['canceladas', 'Canceladas', 'numero'],
            ['reprogramadas', 'Reprogramadas', 'numero'], ['pendientes', 'Pendientes', 'numero'], ['total', 'Total', 'numero'],
        ], DB::select(
            "SELECT u.nombre || ' ' || u.apellido AS periodista,
                    COUNT(*) FILTER (WHERE c.estado = 'cumplida')::int AS cumplidas,
                    COUNT(*) FILTER (WHERE c.estado = 'cancelada')::int AS canceladas,
                    COUNT(*) FILTER (WHERE c.estado = 'reprogramada')::int AS reprogramadas,
                    COUNT(*) FILTER (WHERE c.estado IN ('planificada','en_curso'))::int AS pendientes,
                    COUNT(*)::int AS total
             FROM cobertura c
             JOIN cobertura_personal cp ON cp.cobertura_id = c.id AND cp.funcion = 'periodista'
             JOIN personal p ON p.id = cp.personal_id JOIN usuario u ON u.id = p.usuario_id
             WHERE c.fecha_hora_inicio::date BETWEEN ? AND ?
             GROUP BY u.nombre, u.apellido ORDER BY total DESC, u.apellido",
            [$desde, $hasta],
        ));
    }

    /** Uso de equipos y unidades móviles (reportes.ver): solo los usados, y cuántos no se usaron (D30). */
    public function recursos(PeriodoRequest $request): JsonResponse
    {
        [$desde, $hasta] = $request->rango();
        $sinUso = DB::selectOne(
            "SELECT COUNT(*) AS n FROM recurso r WHERE r.estado <> 'baja'
               AND NOT EXISTS (SELECT 1 FROM cobertura_recurso cr JOIN cobertura c ON c.id = cr.cobertura_id
                               WHERE cr.recurso_id = r.id AND c.estado <> 'cancelada' AND c.fecha_hora_inicio::date BETWEEN ? AND ?)",
            [$desde, $hasta],
        )->n;

        return $this->reporte('Uso de equipos y unidades móviles', $desde, $hasta, [
            ['codigo', 'Código', 'texto'], ['tipo', 'Tipo', 'texto'], ['equipo', 'Equipo', 'texto'],
            ['coberturas', 'Coberturas', 'numero'], ['horas', 'Horas de uso', 'numero'],
        ], DB::select(
            "SELECT r.codigo, tr.nombre AS tipo, r.marca || ' ' || r.modelo AS equipo, COUNT(c.id)::int AS coberturas,
                    ROUND(SUM(EXTRACT(EPOCH FROM (c.fecha_hora_fin - c.fecha_hora_inicio)) / 3600)::numeric, 1)::float AS horas
             FROM recurso r JOIN tipo_recurso tr ON tr.id = r.tipo_recurso_id
             JOIN cobertura_recurso cr ON cr.recurso_id = r.id
             JOIN cobertura c ON c.id = cr.cobertura_id AND c.estado <> 'cancelada'
             WHERE c.fecha_hora_inicio::date BETWEEN ? AND ?
             GROUP BY r.codigo, tr.nombre, r.marca, r.modelo ORDER BY horas DESC, r.codigo",
            [$desde, $hasta],
        ), $sinUso == 0 ? 'Todos los recursos se usaron en el período.' : "$sinUso recurso(s) no se usaron en el período (no se cuentan los dados de baja).");
    }

    /** Equipos en mantenimiento (reportes.mantenimiento): incidencias, altas y bajas del período (nuevo en la web). */
    public function mantenimiento(PeriodoRequest $request): JsonResponse
    {
        [$desde, $hasta] = $request->rango();
        $ahora = DB::table('recurso')->where('estado', 'mantenimiento')->pluck('codigo')->join(', ');

        return $this->reporte('Equipos en mantenimiento', $desde, $hasta, [
            ['fecha', 'Fecha', 'texto'], ['codigo', 'Código', 'texto'], ['equipo', 'Equipo', 'texto'],
            ['tipo', 'Movimiento', 'texto'], ['descripcion', 'Descripción', 'texto'], ['usuario', 'Registró', 'texto'],
        ], DB::select(
            "SELECT to_char(m.fecha_hora, 'YYYY-MM-DD HH24:MI') AS fecha, r.codigo, tr.nombre || ' ' || r.marca || ' ' || r.modelo AS equipo,
                    CASE m.tipo WHEN 'incidencia' THEN 'Incidencia' WHEN 'alta' THEN 'Alta (reparado)' ELSE 'Baja' END AS tipo,
                    m.descripcion, COALESCE(u.nombre || ' ' || u.apellido, '—') AS usuario
             FROM mantenimiento m JOIN recurso r ON r.id = m.recurso_id JOIN tipo_recurso tr ON tr.id = r.tipo_recurso_id
             LEFT JOIN usuario u ON u.id = m.usuario_id
             WHERE m.fecha_hora::date BETWEEN ? AND ? ORDER BY m.fecha_hora DESC",
            [$desde, $hasta],
        ), $ahora ? "En mantenimiento ahora: $ahora." : 'Hoy no hay equipos en mantenimiento.', false);
    }

    /** Notas emitidas, observadas y flotadas por periodista (reportes.ver; nuevo en la web). */
    public function notas(PeriodoRequest $request): JsonResponse
    {
        [$desde, $hasta] = $request->rango();

        return $this->reporte('Notas emitidas, observadas y flotadas', $desde, $hasta, [
            ['periodista', 'Periodista', 'texto'], ['notas', 'Notas', 'numero'], ['emitidas', 'Emitidas', 'numero'],
            ['observaciones', 'Observaciones recibidas', 'numero'], ['flotadas', 'Veces flotadas', 'numero'],
        ], DB::select(
            "SELECT u.nombre || ' ' || u.apellido AS periodista, COUNT(n.id)::int AS notas,
                    COUNT(n.id) FILTER (WHERE n.estado = 'emitida')::int AS emitidas,
                    COALESCE(SUM((SELECT COUNT(*) FROM revision_nota r WHERE r.nota_id = n.id AND r.accion = 'observacion')), 0)::int AS observaciones,
                    COALESCE(SUM((SELECT COUNT(*) FROM item_escaleta i WHERE i.nota_id = n.id AND i.estado = 'flotado')), 0)::int AS flotadas
             FROM nota n JOIN personal p ON p.id = n.autor_id JOIN usuario u ON u.id = p.usuario_id
             WHERE n.fecha BETWEEN ? AND ? AND n.estado <> 'baja'
             GROUP BY u.nombre, u.apellido ORDER BY notas DESC, u.apellido",
            [$desde, $hasta],
        ), 'Observaciones: veces que el Jefe de Prensa devolvió una nota al autor. Flotadas: notas que quedaron en espera en una escaleta.');
    }

    /** Respuesta común de los reportes, con la fila de totales de las columnas numéricas. */
    private function reporte(string $titulo, string $desde, string $hasta, array $columnas, array $filas, ?string $nota = null, bool $totales = true): JsonResponse
    {
        $suma = null;
        if ($totales && $filas) {
            $suma = [];
            foreach ($columnas as [$clave, , $tipo]) {
                $suma[$clave] = $tipo === 'numero' ? round(array_sum(array_column($filas, $clave)), 1) : null;
            }
            $suma[$columnas[0][0]] = 'Total';
        }

        return response()->json([
            'titulo' => $titulo,
            'periodo' => compact('desde', 'hasta'),
            'columnas' => array_map(fn ($c) => ['clave' => $c[0], 'titulo' => $c[1], 'tipo' => $c[2]], $columnas),
            'filas' => $filas,
            'totales' => $suma,
            'nota' => $filas ? $nota : 'No hay datos para el período indicado.',
        ]);
    }
}
