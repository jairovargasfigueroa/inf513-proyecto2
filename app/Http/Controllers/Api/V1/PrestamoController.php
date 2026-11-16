<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ReglaNegocioException;
use App\Http\Controllers\Controller;
use App\Models\Personal;
use App\Models\Prestamo;
use App\Models\Recurso;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * PrestamoController «server page» (CU-03): Préstamos de Recursos lista con
 * GET /prestamos; FormularioEntrega envía POST /prestamos (201 / 409 recurso no
 * disponible) y FormularioDevolucion PUT /prestamos/{id}/devolucion.
 */
class PrestamoController extends Controller
{
    /** GET /api/v1/prestamos?abiertos=1&buscar= (prestamos.listar). */
    public function index(Request $request): JsonResponse
    {
        $f = $request->validate(['abiertos' => ['nullable', 'boolean'], 'buscar' => ['nullable', 'string', 'max:100']]);

        $pagina = DB::table('prestamo as p')
            ->join('recurso as r', 'r.id', '=', 'p.recurso_id')
            ->join('tipo_recurso as t', 't.id', '=', 'r.tipo_recurso_id')
            ->join('personal as pe', 'pe.id', '=', 'p.responsable_id')
            ->join('usuario as u', 'u.id', '=', 'pe.usuario_id')
            ->leftJoin('cobertura as c', 'c.id', '=', 'p.cobertura_id')
            ->when($request->boolean('abiertos'), fn ($q) => $q->whereNull('p.fecha_devolucion'))
            ->when($f['buscar'] ?? null, function ($q, $texto) {
                $patron = '%'.addcslashes($texto, '%_\\').'%';
                $q->where(fn ($w) => $w->where('r.codigo', 'ilike', $patron)->orWhereRaw("u.nombre || ' ' || u.apellido ilike ?", [$patron]));
            })
            ->orderByRaw('p.fecha_devolucion IS NOT NULL, p.fecha_entrega DESC')
            ->select('p.id', 'p.recurso_id', 'r.codigo', 't.nombre as tipo', DB::raw("r.marca || ' ' || r.modelo AS equipo"),
                'p.responsable_id', DB::raw("u.nombre || ' ' || u.apellido AS responsable"),
                'p.cobertura_id', 'c.titulo as cobertura',
                DB::raw("to_char(p.fecha_entrega, 'YYYY-MM-DD HH24:MI') AS fecha_entrega"),
                DB::raw("to_char(p.fecha_devolucion, 'YYYY-MM-DD HH24:MI') AS fecha_devolucion"),
                'p.observacion_entrega', 'p.observacion_devolucion')
            ->paginate(15);

        return response()->json([
            'data' => $pagina->items(),
            'meta' => ['current_page' => $pagina->currentPage(), 'last_page' => $pagina->lastPage(), 'total' => $pagina->total()],
        ]);
    }

    /** POST /api/v1/prestamos (prestamos.crear) → 201 | 409 recurso no disponible (R8). */
    public function store(Request $request): JsonResponse
    {
        $d = $request->validate([
            'recurso_id' => ['required', 'integer', 'exists:recurso,id'],
            'responsable_id' => ['required', 'integer', 'exists:personal,id'],
            'cobertura_id' => ['nullable', 'integer', 'exists:cobertura,id'],
            'observaciones' => ['nullable', 'string', 'max:255'],
        ], [], ['recurso_id' => 'recurso', 'responsable_id' => 'responsable', 'cobertura_id' => 'cobertura', 'observaciones' => 'observaciones']);

        $recurso = Recurso::findOrFail($d['recurso_id']);
        if ($recurso->estado !== 'operativo') {
            throw new ReglaNegocioException("{$recurso->codigo} no está disponible: está ".($recurso->estado === 'baja' ? 'dado de baja' : 'en mantenimiento').'.');
        }
        if ($recurso->prestamoAbierto()) {
            throw new ReglaNegocioException("{$recurso->codigo} no está disponible: ya está entregado y no se devolvió.");
        }
        if (Personal::find($d['responsable_id'])->estado !== 'activo') {
            throw new ReglaNegocioException('El responsable indicado está inactivo.');
        }

        $prestamo = Prestamo::create([
            'recurso_id' => $recurso->id,
            'responsable_id' => $d['responsable_id'],
            'cobertura_id' => $d['cobertura_id'] ?? null,
            'observacion_entrega' => $d['observaciones'] ?? null,
        ]);

        return response()->json(['message' => "{$recurso->codigo} entregado.", 'data' => $prestamo->refresh()], 201);
    }

    /** PUT /api/v1/prestamos/{id}/devolucion (prestamos.devolver) → 200. */
    public function devolver(Request $request, Prestamo $prestamo): JsonResponse
    {
        if ($prestamo->fecha_devolucion) {
            throw new ReglaNegocioException('El préstamo ya fue devuelto.');
        }

        $d = $request->validate([
            'fecha_devolucion' => ['required', 'date_format:Y-m-d\TH:i', 'after_or_equal:'.$prestamo->fecha_entrega->format('Y-m-d H:i'), 'before_or_equal:now'],
            'observaciones' => ['nullable', 'string', 'max:255'],
        ], [
            'fecha_devolucion.after_or_equal' => 'La devolución no puede ser anterior a la entrega ('.$prestamo->fecha_entrega->format('d/m/Y H:i').').',
            'fecha_devolucion.before_or_equal' => 'La devolución no puede ser una fecha futura.',
        ], ['fecha_devolucion' => 'fecha de devolución']);

        // El formulario trae minutos y la entrega tiene microsegundos: en el mismo minuto se usa la hora de entrega.
        DB::update(
            'UPDATE prestamo SET fecha_devolucion = GREATEST(?::timestamp, fecha_entrega), observacion_devolucion = ?,
                                 actualizado_en = CURRENT_TIMESTAMP WHERE id = ?',
            [Carbon::parse($d['fecha_devolucion'])->format('Y-m-d H:i:s'), $d['observaciones'] ?? null, $prestamo->id],
        );
        $prestamo->refresh();

        return response()->json(['message' => "{$prestamo->recurso->codigo} devuelto.", 'data' => $prestamo]);
    }
}
