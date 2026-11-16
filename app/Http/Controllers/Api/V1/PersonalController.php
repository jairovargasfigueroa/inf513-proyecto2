<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ReglaNegocioException;
use App\Http\Controllers\Controller;
use App\Http\Requests\PersonalRequest;
use App\Models\Personal;
use App\Models\Usuario;
use App\Services\ValidadorConflictos;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * PersonalController «server page» (CU-02): Gestión de Personal lista con
 * GET /personal; FormularioPersonal envía POST | PUT; la pantalla desactiva con
 * DELETE; Disponibilidad del Personal consulta GET /personal/disponibilidad.
 */
class PersonalController extends Controller
{
    public function __construct(private ValidadorConflictos $conflictos) {}

    /** GET /api/v1/personal?buscar=&cargo=&estado=&todos=1 (personal.listar). */
    public function index(Request $request): JsonResponse
    {
        $f = $request->validate([
            'buscar' => ['nullable', 'string', 'max:100'],
            'cargo' => ['nullable', 'in:'.implode(',', Personal::CARGOS)],
            'estado' => ['nullable', 'in:activo,inactivo'],
            'todos' => ['nullable', 'boolean'],
        ]);

        $consulta = Personal::query()
            ->join('usuario', 'usuario.id', '=', 'personal.usuario_id')
            ->join('turno', 'turno.id', '=', 'personal.turno_id')
            ->select('personal.*', 'usuario.nombre', 'usuario.apellido', 'usuario.correo', 'usuario.telefono', 'turno.nombre as turno')
            ->when($f['buscar'] ?? null, function ($q, $texto) {
                $q->whereRaw("usuario.nombre || ' ' || usuario.apellido ilike ?", ['%'.addcslashes($texto, '%_\\').'%']);
            })
            ->when($f['cargo'] ?? null, fn ($q, $cargo) => $q->where('personal.cargo', $cargo))
            ->when($f['estado'] ?? null, fn ($q, $estado) => $q->where('personal.estado', $estado))
            ->orderBy('usuario.apellido')
            ->orderBy('usuario.nombre');

        // Para las listas de los formularios (asignar personal, entregar recursos).
        if ($request->boolean('todos')) {
            return response()->json(['data' => $consulta->get()->map(fn ($p) => $this->fila($p))]);
        }

        $pagina = $consulta->paginate(15);

        return response()->json([
            'data' => collect($pagina->items())->map(fn ($p) => $this->fila($p)),
            'meta' => ['current_page' => $pagina->currentPage(), 'last_page' => $pagina->lastPage(), 'total' => $pagina->total()],
        ]);
    }

    /** POST /api/v1/personal (personal.crear) → 201. */
    public function store(PersonalRequest $request): JsonResponse
    {
        if (Usuario::find($request->usuario_id)->estado !== 'activo') {
            throw new ReglaNegocioException('El usuario está inactivo: actívelo antes de registrar su ficha.');
        }

        $personal = Personal::create($request->validated());

        return response()->json(['message' => 'Ficha de personal registrada.', 'data' => $this->detalle($personal)], 201);
    }

    /** PUT /api/v1/personal/{id} (personal.editar) → 200. */
    public function update(PersonalRequest $request, Personal $personal): JsonResponse
    {
        $personal->update($request->validated());
        $avisos = $personal->estado === 'inactivo' ? $this->avisoCoberturas($personal) : [];

        return response()->json(['message' => 'Ficha de personal modificada.', 'avisos' => $avisos, 'data' => $this->detalle($personal)]);
    }

    /** DELETE /api/v1/personal/{id} (personal.desactivar): baja lógica; avisa qué coberturas reasignar. */
    public function destroy(Personal $personal): JsonResponse
    {
        if ($personal->estado === 'inactivo') {
            throw new ReglaNegocioException('La ficha ya está inactiva.');
        }

        $personal->update(['estado' => 'inactivo']);

        return response()->json([
            'message' => 'Ficha de personal desactivada.',
            'avisos' => $this->avisoCoberturas($personal),
            'data' => $this->detalle($personal),
        ]);
    }

    /** GET /api/v1/personal/disponibilidad?fecha=&hora=&cargo= (personal.disponibilidad). */
    public function disponibilidad(Request $request): JsonResponse
    {
        $f = $request->validate([
            'fecha' => ['required', 'date_format:Y-m-d'],
            'hora' => ['required', 'date_format:H:i'],
            'cargo' => ['nullable', 'in:'.implode(',', Personal::CARGOS)],
        ]);

        return response()->json([
            'momento' => "{$f['fecha']} {$f['hora']}",
            'data' => $this->conflictos->disponibles("{$f['fecha']} {$f['hora']}", $f['cargo'] ?? null),
        ]);
    }

    private function avisoCoberturas(Personal $personal): array
    {
        return array_map(
            fn ($c) => "Tiene asignada la cobertura «{$c->titulo}» ({$c->inicio}): reasígnela.",
            $this->conflictos->coberturasDePersona($personal->id),
        );
    }

    private function detalle(Personal $personal): array
    {
        $personal->refresh()->load('usuario', 'turno'); // trae los valores por defecto de la base (estado)

        return $this->fila((object) [
            ...$personal->attributesToArray(),
            'nombre' => $personal->usuario->nombre, 'apellido' => $personal->usuario->apellido,
            'correo' => $personal->usuario->correo, 'telefono' => $personal->usuario->telefono,
            'turno' => $personal->turno->nombre,
        ]);
    }

    private function fila(object $p): array
    {
        return [
            'id' => $p->id,
            'usuario_id' => $p->usuario_id,
            'nombre_completo' => trim("{$p->nombre} {$p->apellido}"),
            'correo' => $p->correo,
            'telefono' => $p->telefono,
            'cargo' => $p->cargo,
            'condicion_laboral' => $p->condicion_laboral,
            'unidad_academica' => $p->unidad_academica,
            'turno_id' => $p->turno_id,
            'turno' => $p->turno,
            'fecha_ingreso' => $p->fecha_ingreso instanceof \DateTimeInterface ? $p->fecha_ingreso->format('Y-m-d') : $p->fecha_ingreso,
            'estado' => $p->estado,
        ];
    }
}
