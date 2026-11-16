<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PreferenciasRequest;
use App\Models\PreferenciaUsuario;
use Illuminate\Http\JsonResponse;

/**
 * PerfilController «server page» (CU-01). En esta etapa solo guarda las
 * preferencias de apariencia y accesibilidad que cambia el encabezado.
 */
class PerfilController extends Controller
{
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
