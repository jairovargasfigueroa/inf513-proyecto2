<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UsuarioRequest;
use App\Http\Resources\UsuarioResource;
use App\Models\Usuario;
use App\Services\ReglasUsuarios;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * UsuarioController «server page» (CU-01): Gestión de Usuarios lista con
 * GET /usuarios, FormularioUsuario envía POST | PUT y la pantalla desactiva
 * con DELETE; la respuesta 201 / 200 vuelve a Gestión de Usuarios.
 */
class UsuarioController extends Controller
{
    public function __construct(private ReglasUsuarios $reglas)
    {
    }

    /** GET /api/v1/usuarios?buscar=&rol_id=&estado= (usuarios.listar). */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filtros = $request->validate([
            'buscar' => ['nullable', 'string', 'max:100'],
            'rol_id' => ['nullable', 'integer'],
            'estado' => ['nullable', 'in:activo,inactivo'],
        ]);

        $usuarios = Usuario::with('rol')
            ->when($filtros['buscar'] ?? null, function ($q, $texto) {
                $patron = '%'.addcslashes($texto, '%_\\').'%';
                $q->where(fn ($w) => $w->whereRaw("nombre || ' ' || apellido ilike ?", [$patron])
                    ->orWhere('ci', 'ilike', $patron)
                    ->orWhere('correo', 'ilike', $patron));
            })
            ->when($filtros['rol_id'] ?? null, fn ($q, $rol) => $q->where('rol_id', $rol))
            ->when($filtros['estado'] ?? null, fn ($q, $estado) => $q->where('estado', $estado))
            ->orderBy('apellido')
            ->orderBy('nombre')
            ->paginate(15);

        return UsuarioResource::collection($usuarios);
    }

    /** POST /api/v1/usuarios (usuarios.crear) → 201. */
    public function store(UsuarioRequest $request): JsonResponse
    {
        $this->reglas->verificarQuienAdministra($request->user(), null, (int) $request->rol_id);

        $usuario = Usuario::create($request->safe()->except('estado'));

        return response()->json([
            'message' => 'Usuario registrado.',
            'data' => new UsuarioResource($usuario->load('rol')),
        ], 201);
    }

    /** PUT /api/v1/usuarios/{id} (usuarios.editar) → 200. */
    public function update(UsuarioRequest $request, Usuario $usuario): JsonResponse
    {
        $actor = $request->user();
        $estado = $request->input('estado', $usuario->estado);

        $this->reglas->verificarQuienAdministra($actor, $usuario, (int) $request->rol_id);
        $this->reglas->verificarCambio($actor, $usuario->load('rol'), (int) $request->rol_id, $estado);

        DB::transaction(function () use ($request, $usuario, $estado) {
            $datos = $request->safe()->except(['password', 'estado']);
            if ($request->filled('password')) {
                $datos['password'] = $request->password;
            }
            $usuario->update([...$datos, 'estado' => $estado]);

            if ($estado === 'inactivo') {
                $usuario->tokens()->delete();
            }
        });

        return response()->json([
            'message' => 'Usuario modificado.',
            'data' => new UsuarioResource($usuario->fresh('rol')),
        ]);
    }

    /** DELETE /api/v1/usuarios/{id} (usuarios.desactivar): baja lógica, revoca sus sesiones. */
    public function destroy(Request $request, Usuario $usuario): JsonResponse
    {
        $this->reglas->verificarQuienAdministra($request->user(), $usuario, null);
        $this->reglas->verificarDesactivacion($request->user(), $usuario->load('rol'));

        DB::transaction(function () use ($usuario) {
            $usuario->update(['estado' => 'inactivo']);
            $usuario->tokens()->delete();
        });

        return response()->json(['message' => 'Usuario desactivado.', 'data' => new UsuarioResource($usuario->fresh('rol'))]);
    }
}
