<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ReglaNegocioException;
use App\Http\Controllers\Controller;
use App\Services\CalculadoraTiempos;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ItemEscaletaController «server page» (CU-06): FormularioItem agrega o ajusta
 * ítems; el Editor reordena, flota y da de baja. Cada respuesta trae el balance
 * del bloque (R26). Los cortes los genera el sistema (R21).
 */
class ItemEscaletaController extends Controller
{
    private const TIPOS = ['apertura', 'titulares', 'nota', 'enlace_vivo', 'entrevista', 'despedida', 'otro'];

    public function __construct(private CalculadoraTiempos $tiempos)
    {
    }

    /** POST /api/v1/escaletas/{id}/items (escaletas.items) → 201 + balance del bloque. */
    public function store(Request $request, int $escaleta): JsonResponse
    {
        $e = $this->escaletaEnBorrador($escaleta);
        $d = $this->validar($request, $e);

        $this->verificarNota($e->id, $d['nota_id'] ?? null, null);

        $id = DB::transaction(function () use ($e, $d) {
            $orden = $d['orden'] ?? null;
            $id = DB::table('item_escaleta')->insertGetId([
                'escaleta_id' => $e->id, 'bloque' => $d['bloque'], 'orden' => 998, 'tipo' => $d['tipo'],
                'nota_id' => $d['tipo'] === 'nota' ? $d['nota_id'] : null,
                'titulo' => $d['tipo'] === 'nota' ? null : $d['titulo'],
                'presentador_id' => $d['presentador_id'] ?? null,
                'duracion_estimada' => $d['tipo'] === 'nota' ? 0 : ($d['duracion_estimada'] ?? 0),
            ]);
            $this->colocar($e->id, $id, $d['bloque'], $orden);

            return $id;
        });

        return response()->json(['message' => 'Ítem agregado a la escaleta.', 'data' => ['id' => $id], 'balance' => $this->tiempos->balance($e->id, $d['bloque'])], 201);
    }

    /** PUT /api/v1/items/{id} (escaletas.items): ajustar datos o reordenar (bloque y posición). */
    public function update(Request $request, int $item): JsonResponse
    {
        $i = $this->item($item);
        $e = $this->escaletaEnBorrador($i->escaleta_id);
        if ($i->tipo === 'corte') {
            throw new ReglaNegocioException('Los cortes los genera el sistema: no se mueven ni se modifican.');
        }
        if ($i->estado === 'baja') {
            throw new ReglaNegocioException('El ítem está dado de baja.');
        }

        $d = $this->validar($request, $e);
        $this->verificarNota($e->id, $d['nota_id'] ?? null, $i->id);

        DB::transaction(function () use ($i, $e, $d) {
            DB::table('item_escaleta')->where('id', $i->id)->update([
                'tipo' => $d['tipo'],
                'nota_id' => $d['tipo'] === 'nota' ? $d['nota_id'] : null,
                'titulo' => $d['tipo'] === 'nota' ? null : $d['titulo'],
                'presentador_id' => $d['presentador_id'] ?? null,
                'duracion_estimada' => $d['tipo'] === 'nota' ? 0 : ($d['duracion_estimada'] ?? 0),
                'actualizado_en' => now(),
            ]);
            $this->colocar($e->id, $i->id, $d['bloque'], $d['orden'] ?? null);
            if ($d['bloque'] !== $i->bloque) {
                $this->renumerar($e->id, $i->bloque);
            }
        });

        return response()->json(['message' => 'Ítem actualizado.', 'balance' => $this->tiempos->balance($e->id)]);
    }

    /** POST /api/v1/items/{id}/flotar (escaletas.items): programado ↔ flotado; flotado no suma tiempo. */
    public function flotar(int $item): JsonResponse
    {
        $i = $this->item($item);
        $e = $this->escaletaEnBorrador($i->escaleta_id);
        if ($i->tipo === 'corte') {
            throw new ReglaNegocioException('Los cortes los genera el sistema: no se flotan.');
        }
        if (! in_array($i->estado, ['programado', 'flotado'], true)) {
            throw new ReglaNegocioException("El ítem ya está {$i->estado}.");
        }

        $nuevo = $i->estado === 'programado' ? 'flotado' : 'programado';
        DB::table('item_escaleta')->where('id', $i->id)->update(['estado' => $nuevo, 'actualizado_en' => now()]);

        return response()->json([
            'message' => $nuevo === 'flotado' ? 'Ítem flotado: queda en espera y no suma tiempo.' : 'Ítem programado de nuevo.',
            'balance' => $this->tiempos->balance($e->id, $i->bloque),
        ]);
    }

    /** DELETE /api/v1/items/{id} (escaletas.items): baja del ítem; queda en el historial de la escaleta. */
    public function destroy(int $item): JsonResponse
    {
        $i = $this->item($item);
        $e = $this->escaletaEnBorrador($i->escaleta_id);
        if ($i->tipo === 'corte') {
            throw new ReglaNegocioException('Los cortes los genera el sistema: no se dan de baja.');
        }

        DB::table('item_escaleta')->where('id', $i->id)->update(['estado' => 'baja', 'actualizado_en' => now()]);

        return response()->json(['message' => 'Ítem dado de baja.', 'balance' => $this->tiempos->balance($e->id, $i->bloque)]);
    }

    // ── Ayudas ────────────────────────────────────────────────────────────

    private function validar(Request $request, object $e): array
    {
        $ultimo = chr(64 + $e->cantidad_bloques);

        return $request->validate([
            'bloque' => ['required', 'string', 'size:1', "regex:/^[A-$ultimo]$/"],
            'orden' => ['nullable', 'integer', 'between:1,998'],
            'tipo' => ['required', 'in:'.implode(',', self::TIPOS)],
            'nota_id' => ['required_if:tipo,nota', 'nullable', 'integer', 'exists:nota,id'],
            'titulo' => ['required_unless:tipo,nota', 'nullable', 'string', 'max:200'],
            'presentador_id' => ['nullable', 'integer', 'exists:personal,id'],
            'duracion_estimada' => ['nullable', 'integer', 'between:0,3600'],
        ], [
            'bloque.regex' => "La escaleta tiene los bloques de la A a la $ultimo.",
            'tipo.in' => 'El tipo no es válido (los cortes los genera el sistema).',
            'nota_id.required_if' => 'Elija la nota.',
            'titulo.required_unless' => 'Escriba el título del ítem.',
        ], ['nota_id' => 'nota', 'titulo' => 'título', 'presentador_id' => 'presentador', 'duracion_estimada' => 'duración estimada']);
    }

    /** R23: solo notas aprobadas; R24: una nota no se repite en la misma emisión. */
    private function verificarNota(int $escaleta, ?int $notaId, ?int $itemId): void
    {
        if (! $notaId) {
            return;
        }
        $n = DB::table('nota')->where('id', $notaId)->first(['slug', 'estado']);
        if ($n->estado !== 'aprobada') {
            throw new ReglaNegocioException("Solo se agregan notas aprobadas ({$n->slug} está ".str_replace('_', ' ', $n->estado).').');
        }
        $repetida = DB::table('item_escaleta')->where('escaleta_id', $escaleta)->where('nota_id', $notaId)
            ->where('estado', '<>', 'baja')->when($itemId, fn ($q) => $q->where('id', '<>', $itemId))->first(['estado']);
        if ($repetida) {
            throw new ReglaNegocioException($repetida->estado === 'flotado'
                ? "La nota {$n->slug} está flotada en esta escaleta: vuelva a programarla."
                : "La nota {$n->slug} ya está en la escaleta.");
        }
    }

    /**
     * R22: pone el ítem en la posición pedida dentro del bloque (o al final) y
     * renumera los demás 1, 2, 3…; la restricción única se verifica al confirmar.
     */
    private function colocar(int $escaleta, int $itemId, string $bloque, ?int $posicion): void
    {
        DB::table('item_escaleta')->where('id', $itemId)->update(['bloque' => $bloque]);

        $ids = DB::table('item_escaleta')->where('escaleta_id', $escaleta)->where('bloque', $bloque)
            ->where('tipo', '<>', 'corte')->where('id', '<>', $itemId)
            ->orderBy('orden')->pluck('id')->all();

        $posicion = $posicion === null ? count($ids) : max(0, min(count($ids), $posicion - 1));
        array_splice($ids, $posicion, 0, [$itemId]);

        foreach ($ids as $n => $id) {
            DB::table('item_escaleta')->where('id', $id)->update(['orden' => $n + 1]);
        }
    }

    private function renumerar(int $escaleta, string $bloque): void
    {
        $ids = DB::table('item_escaleta')->where('escaleta_id', $escaleta)->where('bloque', $bloque)
            ->where('tipo', '<>', 'corte')->orderBy('orden')->pluck('id');
        foreach ($ids as $n => $id) {
            DB::table('item_escaleta')->where('id', $id)->update(['orden' => $n + 1]);
        }
    }

    private function item(int $id): object
    {
        return DB::table('item_escaleta')->where('id', $id)->first() ?? abort(404);
    }

    private function escaletaEnBorrador(int $id): object
    {
        $e = DB::selectOne('SELECT e.id, e.estado, pl.cantidad_bloques FROM escaleta e JOIN plantilla pl ON pl.id = e.plantilla_id WHERE e.id = ?', [$id]) ?? abort(404);
        if ($e->estado !== 'borrador') {
            throw new ReglaNegocioException("La escaleta está {$e->estado}: solo se arma una escaleta en borrador.");
        }

        return $e;
    }
}
