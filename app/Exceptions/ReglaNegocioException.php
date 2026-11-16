<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

/**
 * Una regla de negocio impide la operación (p. ej. desactivar al último
 * Director o asignar un camarógrafo ocupado). La API responde 409 Conflict con
 * el motivo en español (documento, Capítulo II, sección 2).
 */
class ReglaNegocioException extends Exception
{
    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], 409);
    }
}
