<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PerfilRequest;
use App\Http\Requests\PreferenciasRequest;
use App\Http\Resources\UsuarioResource;
use App\Models\PreferenciaUsuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * PerfilController «server page» (CU-01): Mi Perfil carga con GET /perfil;
 * FormularioPerfil envía PUT /perfil y FormularioPreferencias PUT
 * /perfil/preferencias; la respuesta 200 vuelve a Mi Perfil.
 */
class PerfilController extends Controller
{
    /** GET /api/v1/perfil: datos del usuario y sus preferencias. */
    public function show(Request $request): JsonResponse
    {
        $usuario = $request->user()->load('rol', 'preferencia');

        return response()->json([
            'data' => new UsuarioResource($usuario),
            'preferencias' => $usuario->preferencia?->only(['tema', 'modo', 'tamano_fuente', 'alto_contraste'])
                ?? PreferenciaUsuario::porDefecto(),
        ]);
    }

    /** PUT /api/v1/perfil: nombre, apellido, teléfono y, si se pide, contraseña. */
    public function update(PerfilRequest $request): JsonResponse
    {
        $usuario = $request->user();
        $datos = $request->safe()->only(['nombre', 'apellido', 'telefono']);

        if ($request->filled('password')) {
            $datos['password'] = $request->password;
        }
        $usuario->update($datos);

        $mensaje = $request->filled('password') ? 'Datos y contraseña actualizados.' : 'Datos actualizados.';

        return response()->json(['message' => $mensaje, 'data' => new UsuarioResource($usuario->fresh('rol'))]);
    }

    /** PUT /api/v1/perfil/preferencias → 200. */
    public function preferencias(PreferenciasRequest $request): JsonResponse
    {
        $preferencia = PreferenciaUsuario::updateOrCreate(
            ['usuario_id' => $request->user()->id],
            $request->validated(),
        );

        return response()->json([
            'message' => 'Preferencias guardadas.',
            'data' => $preferencia->only(['tema', 'modo', 'tamano_fuente', 'alto_contraste']),
        ]);
    }
}
