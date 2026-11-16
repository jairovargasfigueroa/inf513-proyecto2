<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Control de tiempos del noticiero (R18, R25, R26) sobre las vistas del
 * Proyecto 1: v_plantilla_bloque, v_plantilla_control, v_escaleta_grilla y
 * v_bloque_balance. Los ítems flotados y dados de baja no suman tiempo.
 */
class CalculadoraTiempos
{
    /** Bloques de la plantilla con su tiempo disponible, el control y el tiempo neto. */
    public function plantilla(int $plantillaId): array
    {
        $p = DB::selectOne('SELECT duracion_total FROM plantilla WHERE id = ?', [$plantillaId]);
        $comercial = (int) DB::table('plantilla_corte')->where('plantilla_id', $plantillaId)->sum('duracion');

        return [
            'bloques' => DB::select('SELECT bloque, inicio_bloque, fin_bloque, tiempo_disponible FROM v_plantilla_bloque WHERE plantilla_id = ? ORDER BY numero_bloque', [$plantillaId]),
            'control' => DB::table('v_plantilla_control')->where('plantilla_id', $plantillaId)->value('observacion'),
            'tiempo_comercial' => $comercial,
            'tiempo_neto' => $p->duracion_total - $comercial,
        ];
    }

    /** R26: tiempo usado contra disponible por bloque, con alerta de exceso o déficit (±15 s). */
    public function balance(int $escaletaId, ?string $bloque = null): array
    {
        return DB::table('v_bloque_balance')
            ->where('escaleta_id', $escaletaId)
            ->when($bloque, fn ($q) => $q->where('bloque', $bloque))
            ->orderBy('bloque')
            ->get(['bloque', 'tiempo_disponible', 'tiempo_usado', 'diferencia', 'alerta'])
            ->all();
    }

    /**
     * Ítems de la escaleta: los programados y emitidos con página, duración,
     * acumulado y hora de salida (v_escaleta_grilla); los flotados y las bajas
     * al final de su bloque, sin tiempo. Cada uno con sus alertas.
     */
    public function items(int $escaletaId): array
    {
        return DB::select(
            "SELECT i.id, i.bloque, i.orden, i.tipo, i.estado, i.nota_id, i.presentador_id, i.ultima_hora, i.duracion_estimada, i.duracion_real,
                    COALESCE(n.titulo, i.titulo) AS titulo, n.slug, n.estado AS estado_nota, n.guion,
                    pu.nombre || ' ' || pu.apellido AS presentador,
                    g.pagina, g.duracion, g.inicio_seg, g.acumulado_seg, to_char(g.hora_salida, 'HH24:MI:SS') AS hora_salida,
                    EXISTS (SELECT 1 FROM material_audiovisual m WHERE m.nota_id = i.nota_id AND m.estado <> 'listo') AS material_pendiente
             FROM item_escaleta i
             LEFT JOIN v_escaleta_grilla g ON g.item_id = i.id
             LEFT JOIN nota n ON n.id = i.nota_id
             LEFT JOIN personal pr ON pr.id = i.presentador_id
             LEFT JOIN usuario pu ON pu.id = pr.usuario_id
             WHERE i.escaleta_id = ?
             ORDER BY i.bloque, (i.estado IN ('flotado','baja')), i.orden",
            [$escaletaId],
        );
    }

    /** Lista de control antes de cerrar la escaleta (nuevo en la web): pendientes que lo impiden. */
    public function listaDeControl(int $escaletaId): array
    {
        $pendientes = [];

        foreach ($this->items($escaletaId) as $i) {
            if ($i->estado !== 'programado' || $i->tipo === 'corte') {
                continue;
            }
            if ($i->nota_id && $i->estado_nota !== 'aprobada') {
                $pendientes[] = "La nota {$i->slug} ({$i->pagina}) está ".str_replace('_', ' ', $i->estado_nota).': debe estar aprobada.';
            }
            if ($i->material_pendiente) {
                $pendientes[] = "La nota {$i->slug} ({$i->pagina}) tiene material que no está listo para emitir.";
            }
        }
        foreach ($this->balance($escaletaId) as $b) {
            if ($b->alerta === 'exceso') {
                $pendientes[] = "El bloque {$b->bloque} se pasa {$b->diferencia} s de su tiempo disponible.";
            }
        }
        if (! DB::table('item_escaleta')->where('escaleta_id', $escaletaId)->where('estado', 'programado')->where('tipo', '<>', 'corte')->exists()) {
            $pendientes[] = 'La escaleta no tiene ítems programados.';
        }

        return $pendientes;
    }
}
