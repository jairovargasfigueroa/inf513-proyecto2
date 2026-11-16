<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ReglaNegocioException;
use App\Http\Controllers\Controller;
use App\Models\Nota;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * RotuloController «server page» (CU-05): FormularioRotulos envía
 * PUT /notas/{id}/rotulos con la lista completa (nuevo en la web).
 */
class RotuloController extends Controller
{
    /** PUT /api/v1/notas/{id}/rotulos (notas.rotulos) → 200. */
    public function update(Request $request, Nota $nota): JsonResponse
    {
        $d = $request->validate([
            'rotulos' => ['present', 'array', 'max:15'],
            'rotulos.*.orden' => ['required', 'integer', 'between:1,99', 'distinct'],
            'rotulos.*.nombre' => ['required', 'string', 'max:100'],
            'rotulos.*.cargo' => ['nullable', 'string', 'max:150'],
        ], [
            'rotulos.*.orden.distinct' => 'Dos rótulos no pueden ocupar la misma posición.',
            'rotulos.*.nombre.required' => 'Cada rótulo necesita el nombre de la persona.',
        ], ['rotulos.*.orden' => 'orden', 'rotulos.*.nombre' => 'nombre', 'rotulos.*.cargo' => 'cargo']);

        if (! in_array($nota->estado, Nota::EDITABLES, true)) {
            throw new ReglaNegocioException("La nota está {$nota->estado}: ya no se modifica.");
        }
        $usuario = $request->user();
        if (! $usuario->tienePermiso('notas.aprobar') && $usuario->personal?->id !== $nota->autor_id) {
            throw new ReglaNegocioException('Solo el autor o el Jefe de Prensa pueden modificar esta nota.');
        }

        DB::transaction(function () use ($nota, $d) {
            DB::table('nota_rotulo')->where('nota_id', $nota->id)->delete();
            DB::table('nota_rotulo')->insert(array_map(fn ($r) => [
                'nota_id' => $nota->id, 'orden' => $r['orden'], 'nombre' => trim($r['nombre']), 'cargo' => $r['cargo'] ?? null,
            ], $d['rotulos']));
        });

        return response()->json([
            'message' => count($d['rotulos']).' rótulo(s) guardado(s).',
            'data' => DB::table('nota_rotulo')->where('nota_id', $nota->id)->orderBy('orden')->get(['orden', 'nombre', 'cargo']),
        ]);
    }
}
