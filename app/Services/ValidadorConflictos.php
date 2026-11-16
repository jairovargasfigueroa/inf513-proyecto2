<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Validación de conflictos de operación (RF-06, RNF-29), con las mismas consultas
 * que el sistema vía correo. Los rangos son semiabiertos: dos se cruzan cuando
 * inicio1 < fin2 y inicio2 < fin1.
 *
 * - R3: solo ocupan las coberturas planificadas o en curso (vistas v_ocupacion_*).
 * - R6: una ausencia u otra cobertura que se cruza es un error; quedar fuera del
 *   turno es solo una advertencia.
 * - R7: un recurso que no está operativo o tiene otra reserva que se cruza es un error.
 */
class ValidadorConflictos
{
    /** Condición SQL: el rango [:ini, :fin) cae completo dentro del turno t (que empieza ese día o el anterior). */
    private const DENTRO_DEL_TURNO = <<<'SQL'
        EXISTS (SELECT 1
                FROM (VALUES (?::timestamp::date), (?::timestamp::date - 1)) AS d(dia)
                WHERE EXTRACT(ISODOW FROM d.dia)::int = ANY (string_to_array(t.dias, ',')::int[])
                  AND ?::timestamp >= d.dia + t.hora_inicio
                  AND ?::timestamp <= d.dia + t.hora_fin
                         + CASE WHEN t.hora_fin <= t.hora_inicio THEN INTERVAL '1 day' ELSE INTERVAL '0' END)
        SQL;

    /** R6: ausencia de la persona que se cruza con el rango (texto del problema o null). */
    public function ausencia(int $personalId, string $inicio, string $fin): ?string
    {
        $a = DB::selectOne(
            "SELECT tipo, to_char(fecha_hora_inicio, 'DD/MM HH24:MI') AS desde, to_char(fecha_hora_fin, 'DD/MM HH24:MI') AS hasta
             FROM ausencia WHERE personal_id = ? AND fecha_hora_inicio < ? AND ? < fecha_hora_fin
             ORDER BY fecha_hora_inicio LIMIT 1",
            [$personalId, $fin, $inicio],
        );

        return $a ? 'tiene '.str_replace('_', ' ', $a->tipo)." en ese horario ({$a->desde} a {$a->hasta})" : null;
    }

    /** R6: otra cobertura activa de la persona que se cruza con el rango. */
    public function otraCoberturaDePersona(int $personalId, string $inicio, string $fin, ?int $excepto = null): ?string
    {
        $o = DB::selectOne(
            "SELECT titulo, to_char(fecha_hora_inicio, 'DD/MM HH24:MI') AS desde, to_char(fecha_hora_fin, 'HH24:MI') AS hasta
             FROM v_ocupacion_personal
             WHERE personal_id = ? AND cobertura_id <> ? AND fecha_hora_inicio < ? AND ? < fecha_hora_fin
             ORDER BY fecha_hora_inicio LIMIT 1",
            [$personalId, $excepto ?? 0, $fin, $inicio],
        );

        return $o ? "ya tiene asignada la cobertura «{$o->titulo}» ({$o->desde} a {$o->hasta})" : null;
    }

    /** R6 (advertencia): el rango no cae completo dentro del turno de la persona. */
    public function fueraDeTurno(int $personalId, string $inicio, string $fin): ?string
    {
        $t = DB::selectOne(
            "SELECT t.nombre, to_char(t.hora_inicio, 'HH24:MI') || '–' || to_char(t.hora_fin, 'HH24:MI') AS horario
             FROM personal p JOIN turno t ON t.id = p.turno_id
             WHERE p.id = ? AND NOT ".self::DENTRO_DEL_TURNO,
            [$personalId, $inicio, $inicio, $inicio, $fin],
        );

        return $t ? "está fuera de su turno ({$t->nombre} {$t->horario})" : null;
    }

    /** R7: el recurso no está operativo o tiene otra reserva activa que se cruza. */
    public function recurso(int $recursoId, string $inicio, string $fin, ?int $excepto = null): ?string
    {
        $r = DB::selectOne('SELECT codigo, estado FROM recurso WHERE id = ?', [$recursoId]);
        if ($r->estado !== 'operativo') {
            return "{$r->codigo} está ".($r->estado === 'baja' ? 'dado de baja' : 'en mantenimiento');
        }

        $o = DB::selectOne(
            "SELECT titulo, to_char(fecha_hora_inicio, 'DD/MM HH24:MI') AS desde, to_char(fecha_hora_fin, 'HH24:MI') AS hasta
             FROM v_ocupacion_recurso
             WHERE recurso_id = ? AND cobertura_id <> ? AND fecha_hora_inicio < ? AND ? < fecha_hora_fin
             ORDER BY fecha_hora_inicio LIMIT 1",
            [$recursoId, $excepto ?? 0, $fin, $inicio],
        );

        return $o ? "{$r->codigo} está reservado para «{$o->titulo}» ({$o->desde} a {$o->hasta})" : null;
    }

    /** Coberturas activas de la persona dentro de un rango (para avisar que hay que reasignarlas). */
    public function coberturasDePersona(int $personalId, ?string $desde = null, ?string $hasta = null): array
    {
        return DB::select(
            "SELECT cobertura_id AS id, titulo, to_char(fecha_hora_inicio, 'DD/MM/YYYY HH24:MI') AS inicio
             FROM v_ocupacion_personal
             WHERE personal_id = ? AND fecha_hora_fin > COALESCE(?::timestamp, LOCALTIMESTAMP)
               AND (?::timestamp IS NULL OR fecha_hora_inicio < ?::timestamp)
             ORDER BY fecha_hora_inicio",
            [$personalId, $desde, $hasta, $hasta],
        );
    }

    /** RF-02: personal activo disponible en un momento (en su turno, sin ausencia ni cobertura). */
    public function disponibles(string $momento, ?string $cargo = null): array
    {
        return DB::select(
            "SELECT p.id, u.nombre || ' ' || u.apellido AS nombre, p.cargo, t.nombre AS turno, u.telefono
             FROM personal p
             JOIN usuario u ON u.id = p.usuario_id
             JOIN turno t   ON t.id = p.turno_id
             WHERE p.estado = 'activo' AND u.estado = 'activo'
               AND (?::text IS NULL OR p.cargo = ?)
               AND EXISTS (SELECT 1
                           FROM (VALUES (?::timestamp::date), (?::timestamp::date - 1)) AS d(dia)
                           WHERE EXTRACT(ISODOW FROM d.dia)::int = ANY (string_to_array(t.dias, ',')::int[])
                             AND ?::timestamp >= d.dia + t.hora_inicio
                             AND ?::timestamp <  d.dia + t.hora_fin
                                    + CASE WHEN t.hora_fin <= t.hora_inicio THEN INTERVAL '1 day' ELSE INTERVAL '0' END)
               AND NOT EXISTS (SELECT 1 FROM ausencia a
                               WHERE a.personal_id = p.id AND ?::timestamp >= a.fecha_hora_inicio AND ?::timestamp < a.fecha_hora_fin)
               AND NOT EXISTS (SELECT 1 FROM v_ocupacion_personal o
                               WHERE o.personal_id = p.id AND ?::timestamp >= o.fecha_hora_inicio AND ?::timestamp < o.fecha_hora_fin)
             ORDER BY p.cargo, nombre",
            [$cargo, $cargo, $momento, $momento, $momento, $momento, $momento, $momento, $momento, $momento],
        );
    }
}
