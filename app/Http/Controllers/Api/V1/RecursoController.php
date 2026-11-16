<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ReglaNegocioException;
use App\Http\Controllers\Controller;
use App\Http\Requests\RecursoRequest;
use App\Models\Mantenimiento;
use App\Models\Recurso;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * RecursoController «server page» (CU-03): Inventario de
 * Recursos lista, registra, modifica, da de baja, reporta incidencias y da de
 * alta. Cada paso de mantenimiento queda en la tabla mantenimiento (R9).
 */
class RecursoController extends Controller
{
    /** GET /api/v1/recursos?buscar=&tipo_recurso_id=&estado=&todos=1 (recursos.listar). */
    public function index(Request $request): JsonResponse
    {
        $f = $request->validate([
            'buscar' => ['nullable', 'string', 'max:100'],
            'tipo_recurso_id' => ['nullable', 'integer'],
            'estado' => ['nullable', 'in:operativo,mantenimiento,baja'],
            'todos' => ['nullable', 'boolean'],
        ]);

        $consulta = DB::table('recurso as r')
            ->join('tipo_recurso as t', 't.id', '=', 'r.tipo_recurso_id')
            ->when($f['buscar'] ?? null, function ($q, $texto) {
                $p = '%'.addcslashes($texto, '%_\\').'%';
                $q->where(fn ($w) => $w->where('r.codigo', 'ilike', $p)->orWhere('r.marca', 'ilike', $p)
                    ->orWhere('r.modelo', 'ilike', $p)->orWhere('r.placa', 'ilike', $p));
            })
            ->when($f['tipo_recurso_id'] ?? null, fn ($q, $t) => $q->where('r.tipo_recurso_id', $t))
            ->when($f['estado'] ?? null, fn ($q, $e) => $q->where('r.estado', $e), fn ($q) => $q->where('r.estado', '<>', 'baja'))
            ->orderBy('r.codigo')
            ->select('r.id', 'r.codigo', 'r.tipo_recurso_id', 'r.marca', 'r.modelo', 'r.placa', 'r.caracteristicas', 'r.estado', 'r.observacion',
                't.nombre as tipo', 't.es_unidad_movil',
                DB::raw('EXISTS (SELECT 1 FROM prestamo p WHERE p.recurso_id = r.id AND p.fecha_devolucion IS NULL) AS prestado'));

        if ($request->boolean('todos')) {
            return response()->json(['data' => $consulta->get()]);
        }

        $pagina = $consulta->paginate(15);

        return response()->json([
            'data' => $pagina->items(),
            'meta' => ['current_page' => $pagina->currentPage(), 'last_page' => $pagina->lastPage(), 'total' => $pagina->total()],
        ]);
    }

    /** POST /api/v1/recursos (recursos.crear) → 201. */
    public function store(RecursoRequest $request): JsonResponse
    {
        $recurso = Recurso::create($request->validated());

        return response()->json(['message' => "Recurso {$recurso->codigo} registrado.", 'data' => $recurso->refresh()], 201);
    }

    /** PUT /api/v1/recursos/{id} (recursos.editar) → 200. */
    public function update(RecursoRequest $request, Recurso $recurso): JsonResponse
    {
        if ($recurso->estado === 'baja') {
            throw new ReglaNegocioException("El recurso {$recurso->codigo} está dado de baja: no se modifica.");
        }
        $recurso->update($request->validated());

        return response()->json(['message' => "Recurso {$recurso->codigo} modificado.", 'data' => $recurso]);
    }

    /** DELETE /api/v1/recursos/{id} (recursos.baja): baja definitiva, queda en el historial. */
    public function destroy(Request $request, Recurso $recurso): JsonResponse
    {
        if ($recurso->estado === 'baja') {
            throw new ReglaNegocioException("El recurso {$recurso->codigo} ya está dado de baja.");
        }
        $this->sinEntregaAbierta($recurso, 'darlo de baja');

        $avisos = $this->coberturasPendientes($recurso);
        $this->cambiarEstado($request, $recurso, 'baja', 'baja', 'Dado de baja desde el sistema web.');

        return response()->json(['message' => "Recurso {$recurso->codigo} dado de baja.", 'avisos' => $avisos, 'data' => $recurso]);
    }

    /** POST /api/v1/recursos/{id}/incidencias (recursos.incidencia): pasa a mantenimiento. */
    public function incidencia(Request $request, Recurso $recurso): JsonResponse
    {
        $datos = $request->validate(['descripcion' => ['required', 'string', 'min:5', 'max:255']], [], ['descripcion' => 'descripción']);

        if ($recurso->estado === 'baja') {
            throw new ReglaNegocioException("El recurso {$recurso->codigo} está dado de baja.");
        }

        $avisos = $this->coberturasPendientes($recurso);
        $this->cambiarEstado($request, $recurso, 'mantenimiento', 'incidencia', $datos['descripcion']);

        return response()->json(['message' => "Incidencia registrada: {$recurso->codigo} pasa a mantenimiento.", 'avisos' => $avisos, 'data' => $recurso], 201);
    }

    /** POST /api/v1/recursos/{id}/alta (recursos.alta): vuelve a operativo tras la reparación. */
    public function alta(Request $request, Recurso $recurso): JsonResponse
    {
        if ($recurso->estado !== 'mantenimiento') {
            throw new ReglaNegocioException("El recurso {$recurso->codigo} no está en mantenimiento.");
        }
        $this->cambiarEstado($request, $recurso, 'operativo', 'alta', 'Reparado y dado de alta desde el sistema web.');

        return response()->json(['message' => "Recurso {$recurso->codigo} dado de alta: está operativo.", 'data' => $recurso]);
    }

    private function cambiarEstado(Request $request, Recurso $recurso, string $estado, string $tipo, string $descripcion): void
    {
        DB::transaction(function () use ($request, $recurso, $estado, $tipo, $descripcion) {
            $recurso->update(['estado' => $estado]);
            Mantenimiento::create([
                'recurso_id' => $recurso->id, 'tipo' => $tipo, 'descripcion' => $descripcion, 'usuario_id' => $request->user()->id,
            ]);
        });
    }

    private function sinEntregaAbierta(Recurso $recurso, string $accion): void
    {
        if ($recurso->prestamoAbierto()) {
            throw new ReglaNegocioException("El recurso {$recurso->codigo} está entregado: registre su devolución antes de $accion.");
        }
    }

    /** Coberturas planificadas o en curso que tienen reservado el recurso (paso 6 del CU-03). */
    private function coberturasPendientes(Recurso $recurso): array
    {
        return array_map(
            fn ($c) => "La cobertura «{$c->titulo}» ({$c->inicio}) tenía reservado {$recurso->codigo}: reserve otro equipo.",
            DB::select(
                "SELECT titulo, to_char(fecha_hora_inicio, 'DD/MM/YYYY HH24:MI') AS inicio FROM v_ocupacion_recurso
                 WHERE recurso_id = ? AND fecha_hora_fin > LOCALTIMESTAMP ORDER BY fecha_hora_inicio",
                [$recurso->id],
            ),
        );
    }
}
