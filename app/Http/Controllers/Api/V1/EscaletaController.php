<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ReglaNegocioException;
use App\Http\Controllers\Controller;
use App\Services\CalculadoraTiempos;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * EscaletaController «server page» (CU-06): Escaletas lista y genera
 * (201 → editor); el Editor de Escaleta carga, cambia el estado (200 cerrada /
 * 422 lista de control incompleta) y exporta; la Vista del Presentador lee.
 */
class EscaletaController extends Controller
{
    public function __construct(private CalculadoraTiempos $tiempos)
    {
    }

    /** GET /api/v1/escaletas?fecha= (escaletas.listar): escaletas de esa semana y horarios del día para generar. */
    public function index(Request $request): JsonResponse
    {
        $f = $request->validate(['fecha' => ['nullable', 'date_format:Y-m-d']]);
        $fecha = Carbon::parse($f['fecha'] ?? today());

        $escaletas = DB::select(
            "SELECT e.id, e.fecha, to_char(e.hora_inicio, 'HH24:MI') AS hora_inicio, e.duracion_total, e.estado,
                    pr.nombre AS programa, pl.nombre AS plantilla,
                    (SELECT COUNT(*) FROM item_escaleta i WHERE i.escaleta_id = e.id AND i.tipo <> 'corte' AND i.estado = 'programado') AS items,
                    (SELECT COUNT(*) FROM v_bloque_balance b WHERE b.escaleta_id = e.id AND b.alerta <> 'ok') AS alertas
             FROM escaleta e JOIN grilla g ON g.id = e.grilla_id JOIN programa pr ON pr.id = g.programa_id JOIN plantilla pl ON pl.id = e.plantilla_id
             WHERE e.fecha BETWEEN ? AND ?
             ORDER BY e.fecha DESC, e.hora_inicio",
            [$fecha->copy()->subDays(7)->toDateString(), $fecha->copy()->addDays(7)->toDateString()],
        );

        $horarios = DB::select(
            "SELECT g.grilla_id AS id, g.programa_id, g.programa, to_char(g.hora_inicio, 'HH24:MI') AS hora_inicio, to_char(g.hora_fin, 'HH24:MI') AS hora_fin,
                    EXISTS (SELECT 1 FROM escaleta e WHERE e.grilla_id = g.grilla_id AND e.fecha = ?::date) AS tiene_escaleta
             FROM v_grilla_semanal g
             WHERE g.dia_semana = ? AND g.vigente_desde <= ?::date AND (g.vigente_hasta IS NULL OR g.vigente_hasta >= ?::date)
             ORDER BY g.hora_inicio",
            [$fecha->toDateString(), $fecha->isoWeekday(), $fecha->toDateString(), $fecha->toDateString()],
        );

        $plantillas = DB::select(
            "SELECT p.id, p.programa_id, p.nombre FROM plantilla p JOIN v_plantilla_control c ON c.plantilla_id = p.id
             WHERE p.estado = 'vigente' AND c.observacion = 'ok' ORDER BY p.nombre",
        );

        return response()->json(['fecha' => $fecha->toDateString(), 'data' => $escaletas, 'horarios' => $horarios, 'plantillas' => $plantillas]);
    }

    /** POST /api/v1/escaletas (escaletas.crear) → 201 → editor. Genera los cortes de la plantilla (R20, R21). */
    public function store(Request $request): JsonResponse
    {
        $d = $request->validate([
            'grilla_id' => ['required', 'integer', 'exists:grilla,id'],
            'plantilla_id' => ['required', 'integer', 'exists:plantilla,id'],
            'fecha' => ['required', 'date_format:Y-m-d'],
        ], [], ['grilla_id' => 'horario de la grilla', 'plantilla_id' => 'plantilla']);

        $fecha = Carbon::parse($d['fecha']);
        $g = DB::selectOne('SELECT g.*, pr.nombre AS programa FROM grilla g JOIN programa pr ON pr.id = g.programa_id WHERE g.id = ?', [$d['grilla_id']]);
        $p = DB::selectOne('SELECT p.*, c.observacion FROM plantilla p JOIN v_plantilla_control c ON c.plantilla_id = p.id WHERE p.id = ?', [$d['plantilla_id']]);

        if ($g->estado !== 'vigente' || (int) $g->dia_semana !== $fecha->isoWeekday()
            || $fecha->lt(Carbon::parse($g->vigente_desde)) || ($g->vigente_hasta && $fecha->gt(Carbon::parse($g->vigente_hasta)))) {
            throw new ReglaNegocioException("El horario de «{$g->programa}» no está vigente el {$fecha->format('d/m/Y')}.");
        }
        if ($p->programa_id !== $g->programa_id) {
            throw new ReglaNegocioException("La plantilla es de otro programa: use una plantilla de «{$g->programa}».");
        }
        if ($p->estado !== 'vigente') {
            throw new ReglaNegocioException('La plantilla está inactiva.');
        }
        if ($p->observacion !== 'ok') {
            throw new ReglaNegocioException("La plantilla no está lista ({$p->observacion}).");
        }
        if (DB::table('escaleta')->where(['grilla_id' => $g->id, 'fecha' => $fecha->toDateString()])->exists()) {
            throw new ReglaNegocioException('Ya existe una escaleta para ese horario y esa fecha.');
        }

        $id = DB::transaction(function () use ($g, $p, $fecha, $request) {
            $id = DB::table('escaleta')->insertGetId([
                'grilla_id' => $g->id, 'plantilla_id' => $p->id, 'fecha' => $fecha->toDateString(),
                'hora_inicio' => $g->hora_inicio, 'duracion_total' => $p->duracion_total, 'responsable_id' => $request->user()->id,
            ]);
            // R21: un corte al final de cada bloque, según la plantilla.
            DB::insert(
                "INSERT INTO item_escaleta (escaleta_id, orden, bloque, tipo, titulo, duracion_estimada)
                 SELECT ?, 999, CHR(64 + c.numero), 'corte', 'Corte comercial ' || c.numero, c.duracion
                 FROM plantilla_corte c WHERE c.plantilla_id = ? ORDER BY c.numero",
                [$id, $p->id],
            );

            return $id;
        });

        return response()->json(['message' => 'Escaleta generada con sus cortes comerciales.', 'data' => ['id' => $id]], 201);
    }

    /** GET /api/v1/escaletas/{id} (escaletas.listar): ítems con tiempos, balance por bloque y lista de control. */
    public function show(int $escaleta): JsonResponse
    {
        $e = $this->escaleta($escaleta);

        return response()->json([
            'data' => $e,
            'bloques' => $this->tiempos->balance($e->id),
            'items' => array_map(fn ($i) => $this->sinGuion($i), $this->tiempos->items($e->id)),
            'pendientes' => $e->estado === 'borrador' ? $this->tiempos->listaDeControl($e->id) : [],
        ]);
    }

    /**
     * PUT /api/v1/escaletas/{id}/estado (escaletas.estado): borrador → cerrada
     * (con la lista de control completa), cerrada → borrador (reabrir) y
     * cerrada → emitida (con la hora y la duración reales).
     */
    public function estado(Request $request, int $escaleta): JsonResponse
    {
        $e = $this->escaleta($escaleta);
        $d = $request->validate([
            'estado' => ['required', 'in:borrador,cerrada,emitida'],
            'hora_inicio_real' => ['required_if:estado,emitida', 'nullable', 'date_format:H:i'],
            'duracion_real' => ['required_if:estado,emitida', 'nullable', 'integer', 'between:60,14400'],
        ], [
            'hora_inicio_real.required_if' => 'Indique la hora real en que salió al aire.',
            'duracion_real.required_if' => 'Indique la duración real (en segundos).',
        ], ['hora_inicio_real' => 'hora de inicio real', 'duracion_real' => 'duración real']);

        $permitidas = ['borrador' => ['cerrada'], 'cerrada' => ['borrador', 'emitida'], 'emitida' => []];
        if (! in_array($d['estado'], $permitidas[$e->estado], true)) {
            throw new ReglaNegocioException($e->estado === 'emitida'
                ? 'La escaleta ya fue emitida: queda como historial.'
                : "Una escaleta {$e->estado} no pasa a {$d['estado']}.".($d['estado'] === 'emitida' ? ' Ciérrela antes de registrarla como emitida.' : ''));
        }

        if ($d['estado'] === 'cerrada' && ($pendientes = $this->tiempos->listaDeControl($e->id))) {
            return response()->json(['message' => 'La lista de control está incompleta.', 'pendientes' => $pendientes], 422);
        }

        DB::transaction(function () use ($e, $d) {
            DB::table('escaleta')->where('id', $e->id)->update([
                'estado' => $d['estado'],
                'hora_inicio_real' => $d['estado'] === 'emitida' ? $d['hora_inicio_real'] : null,
                'duracion_real' => $d['estado'] === 'emitida' ? $d['duracion_real'] : null,
                'actualizado_en' => now(),
            ]);
            if ($d['estado'] === 'emitida') {
                $notas = DB::table('item_escaleta')->where('escaleta_id', $e->id)->where('estado', 'programado')->whereNotNull('nota_id')->pluck('nota_id');
                DB::table('item_escaleta')->where('escaleta_id', $e->id)->where('estado', 'programado')->update(['estado' => 'emitido', 'actualizado_en' => now()]);
                DB::table('nota')->whereIn('id', $notas)->update(['estado' => 'emitida', 'actualizado_en' => now()]);
            }
        });

        $mensajes = ['borrador' => 'Escaleta reabierta.', 'cerrada' => 'Escaleta cerrada: lista para la emisión.', 'emitida' => 'Escaleta registrada como emitida.'];

        return response()->json(['message' => $mensajes[$d['estado']], 'data' => $this->escaleta($e->id)]);
    }

    /** GET /api/v1/escaletas/{id}/lectura (escaletas.lectura): guiones en orden para el modo presentador. */
    public function lectura(int $escaleta): JsonResponse
    {
        $e = $this->escaleta($escaleta);
        $items = array_values(array_filter($this->tiempos->items($e->id), fn ($i) => in_array($i->estado, ['programado', 'emitido'], true)));

        return response()->json(['data' => $e, 'items' => array_map(fn ($i) => [
            'pagina' => $i->pagina, 'tipo' => $i->tipo, 'slug' => $i->slug, 'titulo' => $i->titulo,
            'presentador' => $i->presentador, 'duracion' => $i->duracion, 'hora_salida' => $i->hora_salida, 'guion' => $i->guion,
        ], $items)]);
    }

    /** GET /api/v1/escaletas/{id}/exportar (escaletas.exportar): archivo CSV para abrir en Excel. */
    public function exportar(int $escaleta): StreamedResponse
    {
        $e = $this->escaleta($escaleta);
        $items = $this->tiempos->items($e->id);
        $nombre = "escaleta-{$e->fecha}-".str($e->programa)->slug().'.csv';

        return response()->streamDownload(function () use ($e, $items) {
            $f = fopen('php://output', 'w');
            fwrite($f, "\xEF\xBB\xBF"); // BOM: Excel reconoce las tildes
            fputcsv($f, ["Escaleta {$e->programa} - {$e->fecha} {$e->hora_inicio} ({$e->estado})"], ';');
            fputcsv($f, ['Página', 'Bloque', 'Tipo', 'Slug', 'Título', 'Presentador', 'Duración (s)', 'Acumulado (s)', 'Hora de salida', 'Estado'], ';');
            foreach ($items as $i) {
                fputcsv($f, [$i->pagina ?? '—', $i->bloque, $i->tipo, $i->slug, $i->titulo, $i->presentador, $i->duracion, $i->acumulado_seg, $i->hora_salida, $i->estado], ';');
            }
            fclose($f);
        }, $nombre, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function escaleta(int $id): object
    {
        return DB::selectOne(
            "SELECT e.id, e.fecha, to_char(e.hora_inicio, 'HH24:MI') AS hora_inicio, e.duracion_total, e.estado,
                    to_char(e.hora_inicio_real, 'HH24:MI') AS hora_inicio_real, e.duracion_real,
                    e.plantilla_id, pl.nombre AS plantilla, pl.cantidad_bloques, pl.palabras_por_minuto,
                    pr.nombre AS programa, u.nombre || ' ' || u.apellido AS responsable
             FROM escaleta e JOIN grilla g ON g.id = e.grilla_id JOIN programa pr ON pr.id = g.programa_id
             JOIN plantilla pl ON pl.id = e.plantilla_id JOIN usuario u ON u.id = e.responsable_id
             WHERE e.id = ?",
            [$id],
        ) ?? abort(404);
    }

    private function sinGuion(object $i): object
    {
        unset($i->guion);

        return $i;
    }
}
