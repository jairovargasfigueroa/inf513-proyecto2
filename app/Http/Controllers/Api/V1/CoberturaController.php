<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ReglaNegocioException;
use App\Http\Controllers\Controller;
use App\Http\Requests\CoberturaRequest;
use App\Models\Cobertura;
use App\Services\ValidadorConflictos;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * CoberturaController «server page» (CU-04): Agenda de Coberturas, Detalle de
 * Cobertura y Hoja de Asignación. Las respuestas 201 / 200 / 409 conflicto
 * vuelven a la Agenda o al Detalle según el diagrama de navegación.
 */
class CoberturaController extends Controller
{
    /** Máximo de copias que genera una duplicación recurrente. */
    private const MAX_COPIAS = 60;

    public function __construct(private ValidadorConflictos $conflictos) {}

    /** GET /api/v1/coberturas?fecha=&vista=dia|semana&estado=&tipo= (coberturas.listar). */
    public function index(Request $request): JsonResponse
    {
        $f = $request->validate([
            'fecha' => ['nullable', 'date_format:Y-m-d'],
            'vista' => ['nullable', 'in:dia,semana'],
            'estado' => ['nullable', 'in:planificada,en_curso,cumplida,cancelada,reprogramada'],
            'tipo' => ['nullable', 'in:'.implode(',', Cobertura::TIPOS)],
        ]);

        $fecha = Carbon::parse($f['fecha'] ?? today());
        [$desde, $hasta] = ($f['vista'] ?? 'dia') === 'semana'
            ? [$fecha->copy()->startOfWeek(), $fecha->copy()->endOfWeek()->startOfDay()]
            : [$fecha->copy()->startOfDay(), $fecha->copy()->startOfDay()];

        $coberturas = DB::table('cobertura as c')
            ->where('c.fecha_hora_inicio', '<', $hasta->copy()->addDay())
            ->where('c.fecha_hora_fin', '>', $desde)
            ->when($f['estado'] ?? null, fn ($q, $e) => $q->where('c.estado', $e))
            ->when($f['tipo'] ?? null, fn ($q, $t) => $q->where('c.tipo', $t))
            ->orderBy('c.fecha_hora_inicio')
            ->select('c.id', 'c.titulo', 'c.tipo', 'c.lugar', 'c.prioridad', 'c.estado', 'c.cobertura_origen_id',
                DB::raw("to_char(c.fecha_hora_inicio, 'YYYY-MM-DD HH24:MI') AS fecha_hora_inicio"),
                DB::raw("to_char(c.fecha_hora_fin, 'YYYY-MM-DD HH24:MI') AS fecha_hora_fin"),
                DB::raw('(SELECT COUNT(*) FROM cobertura_personal cp WHERE cp.cobertura_id = c.id) AS personal'),
                DB::raw('(SELECT COUNT(*) FROM cobertura_recurso cr WHERE cr.cobertura_id = c.id) AS recursos'))
            ->get();

        return response()->json(['desde' => $desde->toDateString(), 'hasta' => $hasta->toDateString(), 'data' => $coberturas]);
    }

    /** GET /api/v1/coberturas/{id} (coberturas.listar): datos, equipo, recursos y advertencias. */
    public function show(Cobertura $cobertura): JsonResponse
    {
        $equipo = $this->equipo($cobertura->id);
        $advertencias = $cobertura->estaActiva()
            ? array_values(array_filter(array_map(
                fn ($p) => ($msg = $this->conflictos->fueraDeTurno($p->personal_id, $cobertura->inicio(), $cobertura->fin())) ? "{$p->nombre} $msg." : null,
                $equipo,
            )))
            : [];

        return response()->json([
            'data' => $this->datos($cobertura),
            'equipo' => $equipo,
            'recursos' => $this->recursos($cobertura->id),
            'advertencias' => $advertencias,
        ]);
    }

    /** POST /api/v1/coberturas (coberturas.crear) → 201. */
    public function store(CoberturaRequest $request): JsonResponse
    {
        $cobertura = Cobertura::create([...$request->datos(), 'creado_por' => $request->user()->id]);

        return response()->json(['message' => 'Cobertura planificada.', 'data' => $this->datos($cobertura->refresh())], 201);
    }

    /** PUT /api/v1/coberturas/{id} (coberturas.editar): reprograma y vuelve a validar al equipo asignado. */
    public function update(CoberturaRequest $request, Cobertura $cobertura): JsonResponse
    {
        $this->exigirActiva($cobertura);

        $avisos = DB::transaction(function () use ($request, $cobertura) {
            $cobertura->update($request->datos());
            [$errores, $avisos] = $this->revisarEquipo($cobertura);

            if ($errores) {
                throw new ReglaNegocioException('No se puede reprogramar: '.implode(' ', $errores));
            }

            return $avisos;
        });

        return response()->json(['message' => 'Cobertura reprogramada.', 'avisos' => $avisos, 'data' => $this->datos($cobertura)]);
    }

    /** DELETE /api/v1/coberturas/{id} (coberturas.cancelar): la cancela y libera personal y recursos. */
    public function destroy(Cobertura $cobertura): JsonResponse
    {
        $this->exigirActiva($cobertura);

        DB::transaction(function () use ($cobertura) {
            $cobertura->update(['estado' => 'cancelada']);
            $this->cerrarEntregas($cobertura, 'Cobertura cancelada');
        });

        return response()->json(['message' => 'Cobertura cancelada: el personal y los recursos quedan libres.', 'data' => $this->datos($cobertura)]);
    }

    /** POST /api/v1/coberturas/{id}/duplicar (coberturas.duplicar): copias diarias o semanales hasta una fecha. */
    public function duplicar(Request $request, Cobertura $cobertura): JsonResponse
    {
        $d = $request->validate([
            'frecuencia' => ['required', 'in:diaria,semanal'],
            'hasta' => ['required', 'date_format:Y-m-d', 'after:'.$cobertura->fecha_hora_inicio->toDateString()],
        ], ['hasta.after' => 'La fecha «hasta» debe ser posterior a la de la cobertura.'], ['hasta' => 'hasta', 'frecuencia' => 'frecuencia']);

        $paso = $d['frecuencia'] === 'diaria' ? 1 : 7;
        $hasta = Carbon::parse($d['hasta'])->endOfDay();
        $fechas = [];
        for ($i = $paso; $cobertura->fecha_hora_inicio->copy()->addDays($i)->lte($hasta); $i += $paso) {
            $fechas[] = $i;
        }

        if ($fechas === []) {
            throw new ReglaNegocioException('Con esa frecuencia no cae ninguna copia antes de la fecha indicada.');
        }
        if (count($fechas) > self::MAX_COPIAS) {
            throw new ReglaNegocioException('Se generarían '.count($fechas).' coberturas; el máximo es '.self::MAX_COPIAS.'. Elija una fecha más cercana.');
        }

        $copias = DB::transaction(fn () => array_map(fn ($dias) => Cobertura::create([
            ...$cobertura->only(['titulo', 'tema', 'tipo', 'lugar', 'prioridad', 'fuente', 'indicaciones']),
            'fecha_hora_inicio' => $cobertura->fecha_hora_inicio->copy()->addDays($dias),
            'fecha_hora_fin' => $cobertura->fecha_hora_fin->copy()->addDays($dias),
            'cobertura_origen_id' => $cobertura->id,
            'creado_por' => $request->user()->id,
        ])->id, $fechas));

        return response()->json([
            'message' => count($copias).' cobertura(s) creada(s). Asigne el personal y los recursos de cada una.',
            'data' => ['ids' => $copias],
        ], 201);
    }

    /** GET /api/v1/coberturas/{id}/hoja (coberturas.hoja): hoja de asignación imprimible. */
    public function hoja(Cobertura $cobertura): JsonResponse
    {
        return response()->json([
            'data' => $this->datos($cobertura),
            'equipo' => $this->equipo($cobertura->id),
            'recursos' => $this->recursos($cobertura->id),
        ]);
    }

    /** POST /api/v1/coberturas/{id}/retorno (coberturas.retorno): 200 retorno registrado y recursos liberados (R4). */
    public function retorno(Request $request, Cobertura $cobertura): JsonResponse
    {
        if (! $cobertura->estaActiva()) {
            throw new ReglaNegocioException("La cobertura ya tiene registrado su retorno ({$cobertura->estado}).");
        }

        $usuario = $request->user();
        $asignado = DB::table('cobertura_personal')->where('cobertura_id', $cobertura->id)
            ->where('personal_id', $usuario->personal?->id ?? 0)->exists();
        if (! $usuario->tienePermiso('coberturas.asignar') && ! $asignado) {
            throw new ReglaNegocioException('Solo el Jefe de Prensa o el personal asignado a la cobertura registra su retorno.');
        }

        $d = $request->validate([
            'estado' => ['required', 'in:cumplida,cancelada,reprogramada'],
            'parte' => ['nullable', 'string', 'max:2000', 'required_if:estado,cumplida'],
            'incidencias' => ['nullable', 'string', 'max:2000'],
            'fecha_retorno' => ['required', 'date_format:Y-m-d\TH:i', 'before_or_equal:now'],
        ], [
            'parte.required_if' => 'Describa el resultado de la cobertura cumplida.',
            'fecha_retorno.before_or_equal' => 'La fecha de retorno no puede ser futura.',
        ], ['estado' => 'resultado', 'parte' => 'parte de la cobertura', 'fecha_retorno' => 'fecha de retorno']);

        if ($d['estado'] === 'cumplida' && $cobertura->fecha_hora_inicio->isFuture()) {
            throw new ReglaNegocioException('La cobertura todavía no empezó: no puede estar cumplida.');
        }

        $devueltos = DB::transaction(function () use ($cobertura, $d) {
            DB::update(
                'UPDATE cobertura SET estado = ?, parte_retorno = ?, incidencias_retorno = ?,
                        fecha_hora_retorno = GREATEST(?::timestamp, fecha_hora_inicio), actualizado_en = CURRENT_TIMESTAMP
                 WHERE id = ?',
                [$d['estado'], $d['parte'] ?? null, $d['incidencias'] ?? null, str_replace('T', ' ', $d['fecha_retorno']), $cobertura->id],
            );

            return $this->cerrarEntregas($cobertura, 'Retorno de cobertura');
        });

        $avisos = $devueltos ? ["Se registró la devolución de $devueltos recurso(s) entregado(s) para esta cobertura."] : [];
        if ($d['estado'] === 'reprogramada') {
            $avisos[] = 'Para la nueva fecha, duplique esta cobertura o planifique una nueva.';
        }

        return response()->json([
            'message' => 'Retorno registrado: el personal y los recursos quedan libres.',
            'avisos' => $avisos,
            'data' => $this->datos($cobertura->refresh()),
        ]);
    }

    // ── Ayudas ────────────────────────────────────────────────────────────

    private function exigirActiva(Cobertura $cobertura): void
    {
        if (! $cobertura->estaActiva()) {
            throw new ReglaNegocioException("La cobertura ya terminó ({$cobertura->estado}): no se modifica.");
        }
    }

    /** Errores (ausencias, choques de horario, recursos) y avisos (fuera de turno) del equipo ya asignado. */
    private function revisarEquipo(Cobertura $c): array
    {
        $errores = [];
        $avisos = [];
        foreach ($this->equipo($c->id) as $p) {
            if ($m = $this->conflictos->ausencia($p->personal_id, $c->inicio(), $c->fin())
                ?? $this->conflictos->otraCoberturaDePersona($p->personal_id, $c->inicio(), $c->fin(), $c->id)) {
                $errores[] = "{$p->nombre} $m.";
            } elseif ($m = $this->conflictos->fueraDeTurno($p->personal_id, $c->inicio(), $c->fin())) {
                $avisos[] = "{$p->nombre} $m.";
            }
        }
        foreach ($this->recursos($c->id) as $r) {
            if ($m = $this->conflictos->recurso($r->id, $c->inicio(), $c->fin(), $c->id)) {
                $errores[] = "$m.";
            }
        }

        return [$errores, $avisos];
    }

    /** Cierra las entregas abiertas de la cobertura (R4). */
    private function cerrarEntregas(Cobertura $cobertura, string $motivo): int
    {
        return DB::update(
            'UPDATE prestamo SET fecha_devolucion = GREATEST(LOCALTIMESTAMP, fecha_entrega), observacion_devolucion = ?, actualizado_en = CURRENT_TIMESTAMP
             WHERE cobertura_id = ? AND fecha_devolucion IS NULL',
            [$motivo, $cobertura->id],
        );
    }

    private function datos(Cobertura $c): array
    {
        $c->loadMissing('creador');

        return [
            'id' => $c->id, 'titulo' => $c->titulo, 'tema' => $c->tema, 'tipo' => $c->tipo, 'lugar' => $c->lugar,
            'prioridad' => $c->prioridad, 'fuente' => $c->fuente, 'indicaciones' => $c->indicaciones, 'estado' => $c->estado,
            'fecha_hora_inicio' => $c->fecha_hora_inicio->format('Y-m-d H:i'),
            'fecha_hora_fin' => $c->fecha_hora_fin->format('Y-m-d H:i'),
            'parte_retorno' => $c->parte_retorno, 'incidencias_retorno' => $c->incidencias_retorno,
            'fecha_hora_retorno' => $c->fecha_hora_retorno?->format('Y-m-d H:i'),
            'cobertura_origen_id' => $c->cobertura_origen_id,
            'creado_por' => $c->creador?->nombre_completo,
        ];
    }

    private function equipo(int $coberturaId): array
    {
        return DB::select(
            "SELECT cp.personal_id, cp.funcion, p.cargo, u.nombre || ' ' || u.apellido AS nombre, u.telefono
             FROM cobertura_personal cp JOIN personal p ON p.id = cp.personal_id JOIN usuario u ON u.id = p.usuario_id
             WHERE cp.cobertura_id = ? ORDER BY cp.funcion, u.apellido",
            [$coberturaId],
        );
    }

    private function recursos(int $coberturaId): array
    {
        return DB::select(
            "SELECT r.id, r.codigo, t.nombre AS tipo, r.marca || ' ' || r.modelo AS equipo, r.placa, r.estado
             FROM cobertura_recurso cr JOIN recurso r ON r.id = cr.recurso_id JOIN tipo_recurso t ON t.id = r.tipo_recurso_id
             WHERE cr.cobertura_id = ? ORDER BY r.codigo",
            [$coberturaId],
        );
    }
}
