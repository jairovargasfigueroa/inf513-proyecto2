<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Indicadores del negocio y del flujo de accesos para el Panel Analítico
 * (consigna, punto 8; CU-07) y la Analítica Periodística.
 */
class Estadisticas
{
    /** Indicadores y series del panel para un período [desde, hasta]. */
    public function panel(string $desde, string $hasta): array
    {
        $rango = [$desde, $hasta];

        $coberturas = DB::selectOne(
            "SELECT COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE estado = 'cumplida') AS cumplidas,
                    COUNT(*) FILTER (WHERE estado IN ('cumplida','cancelada','reprogramada')) AS con_retorno,
                    COUNT(*) FILTER (WHERE estado IN ('planificada','en_curso')) AS pendientes
             FROM cobertura WHERE fecha_hora_inicio::date BETWEEN ? AND ?", $rango);

        $notas = DB::selectOne(
            "SELECT COUNT(*) FILTER (WHERE estado <> 'baja') AS total,
                    COUNT(*) FILTER (WHERE estado IN ('aprobada','emitida')) AS aprobadas,
                    COUNT(*) FILTER (WHERE estado = 'en_revision') AS en_revision
             FROM nota WHERE fecha BETWEEN ? AND ?", $rango);

        $recursos = DB::selectOne(
            "SELECT COUNT(*) FILTER (WHERE estado = 'operativo') AS operativos,
                    COUNT(*) FILTER (WHERE estado = 'mantenimiento') AS mantenimiento,
                    (SELECT COUNT(*) FROM prestamo WHERE fecha_devolucion IS NULL) AS entregados
             FROM recurso WHERE estado <> 'baja'");

        $accesos = DB::selectOne(
            "SELECT COUNT(*) AS peticiones,
                    COUNT(*) FILTER (WHERE tipo_evento = 'login_exitoso') AS logins,
                    COUNT(*) FILTER (WHERE tipo_evento = 'login_fallido') AS fallidos,
                    COUNT(*) FILTER (WHERE tipo_evento = 'acceso_denegado') AS denegados,
                    COUNT(DISTINCT usuario_id) AS usuarios
             FROM bitacora_acceso WHERE fecha_hora::date BETWEEN ? AND ?", $rango);

        return [
            'periodo' => ['desde' => $desde, 'hasta' => $hasta],
            'indicadores' => [
                'coberturas' => (int) $coberturas->total,
                'cumplimiento' => $this->porcentaje($coberturas->cumplidas, $coberturas->con_retorno),
                'coberturas_pendientes' => (int) $coberturas->pendientes,
                'notas' => (int) $notas->total,
                'notas_aprobadas' => (int) $notas->aprobadas,
                'notas_en_revision' => (int) $notas->en_revision,
                'recursos_operativos' => (int) $recursos->operativos,
                'recursos_mantenimiento' => (int) $recursos->mantenimiento,
                'recursos_entregados' => (int) $recursos->entregados,
                'peticiones' => (int) $accesos->peticiones,
                'logins' => (int) $accesos->logins,
                'logins_fallidos' => (int) $accesos->fallidos,
                'accesos_denegados' => (int) $accesos->denegados,
                'usuarios_activos' => (int) $accesos->usuarios,
                'visitas' => (int) DB::table('contador_visita')->sum('cantidad'),
            ],
            'coberturas_por_tipo' => DB::select(
                "SELECT tipo,
                        COUNT(*) FILTER (WHERE estado = 'cumplida')::int AS cumplidas,
                        COUNT(*) FILTER (WHERE estado IN ('cancelada','reprogramada'))::int AS canceladas,
                        COUNT(*) FILTER (WHERE estado IN ('planificada','en_curso'))::int AS pendientes
                 FROM cobertura WHERE fecha_hora_inicio::date BETWEEN ? AND ?
                 GROUP BY tipo ORDER BY COUNT(*) DESC", $rango),
            'notas_por_estado' => DB::select(
                "SELECT estado, COUNT(*)::int AS cantidad FROM nota
                 WHERE fecha BETWEEN ? AND ? AND estado <> 'baja'
                 GROUP BY estado ORDER BY array_position(ARRAY['borrador','en_revision','observada','aprobada','emitida'], estado)", $rango),
            'logins_por_dia' => DB::select(
                "SELECT to_char(d.dia, 'YYYY-MM-DD') AS dia,
                        COUNT(b.id) FILTER (WHERE b.tipo_evento = 'login_exitoso')::int AS exitosos,
                        COUNT(b.id) FILTER (WHERE b.tipo_evento = 'login_fallido')::int AS fallidos,
                        COUNT(b.id)::int AS peticiones
                 FROM generate_series(?::date, ?::date, INTERVAL '1 day') AS d(dia)
                 LEFT JOIN bitacora_acceso b ON b.fecha_hora::date = d.dia
                 GROUP BY d.dia ORDER BY d.dia", $rango),
            'paginas_top' => DB::table('contador_visita')->orderByDesc('cantidad')->limit(6)->get(['pagina', 'cantidad']),
        ];
    }

    /** RF-16: producción por periodista (notas, aprobadas, a la primera y tiempo medio de aprobación). */
    public function produccion(string $desde, string $hasta): array
    {
        return array_map(fn ($f) => [
            'autor' => $f->autor,
            'notas' => (int) $f->notas,
            'aprobadas' => (int) $f->aprobadas,
            'a_la_primera' => $this->porcentaje($f->a_la_primera, $f->con_aprobacion),
            'minutos_aprobacion' => $f->minutos === null ? null : (int) round($f->minutos),
        ], DB::select(
            "WITH rev AS (
               SELECT nota_id,
                      MIN(fecha_hora) FILTER (WHERE accion = 'envio')       AS primer_envio,
                      MAX(fecha_hora) FILTER (WHERE accion = 'aprobacion')  AS aprobada_en,
                      COUNT(*)        FILTER (WHERE accion = 'observacion') AS observaciones
               FROM revision_nota GROUP BY nota_id),
             base AS (
               SELECT u.nombre || ' ' || u.apellido AS autor, n.estado, r.aprobada_en, r.observaciones,
                      EXTRACT(EPOCH FROM (r.aprobada_en - r.primer_envio)) / 60 AS minutos
               FROM nota n JOIN personal p ON p.id = n.autor_id JOIN usuario u ON u.id = p.usuario_id
               LEFT JOIN rev r ON r.nota_id = n.id
               WHERE n.fecha BETWEEN ? AND ? AND n.estado <> 'baja')
             SELECT autor, COUNT(*) AS notas,
                    COUNT(*) FILTER (WHERE estado IN ('aprobada','emitida')) AS aprobadas,
                    COUNT(*) FILTER (WHERE aprobada_en IS NOT NULL AND observaciones = 0) AS a_la_primera,
                    COUNT(*) FILTER (WHERE aprobada_en IS NOT NULL) AS con_aprobacion,
                    AVG(minutos) AS minutos
             FROM base GROUP BY autor ORDER BY notas DESC, autor",
            [$desde, $hasta],
        ));
    }

    /** RF-16: cumplimiento de coberturas por tipo (cumplidas sobre las que ya tienen retorno). */
    public function coberturas(string $desde, string $hasta): array
    {
        return array_map(fn ($f) => [
            'tipo' => $f->tipo,
            'coberturas' => (int) $f->coberturas,
            'cumplidas' => (int) $f->cumplidas,
            'canceladas' => (int) $f->canceladas,
            'reprogramadas' => (int) $f->reprogramadas,
            'sin_retorno' => (int) $f->sin_retorno,
            'cumplimiento' => $this->porcentaje($f->cumplidas, $f->cumplidas + $f->canceladas + $f->reprogramadas),
        ], DB::select(
            "SELECT tipo, COUNT(*) AS coberturas,
                    COUNT(*) FILTER (WHERE estado = 'cumplida') AS cumplidas,
                    COUNT(*) FILTER (WHERE estado = 'cancelada') AS canceladas,
                    COUNT(*) FILTER (WHERE estado = 'reprogramada') AS reprogramadas,
                    COUNT(*) FILTER (WHERE estado IN ('planificada','en_curso')) AS sin_retorno
             FROM cobertura WHERE fecha_hora_inicio::date BETWEEN ? AND ?
             GROUP BY tipo ORDER BY coberturas DESC, tipo",
            [$desde, $hasta],
        ));
    }

    private function porcentaje(int|string|null $parte, int|string|null $total): ?int
    {
        return (int) $total > 0 ? (int) round(100 * (int) $parte / (int) $total) : null;
    }
}
