<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Un usuario desactivado pierde el acceso aunque tenga un token vigente: se
 * revoca el token y se responde 401.
 */
class UsuarioActivo
{
    public function handle(Request $request, Closure $next): Response
    {
        $usuario = $request->user();

        if ($usuario && ! $usuario->estaActivo()) {
            $usuario->currentAccessToken()?->delete();

            return response()->json(['message' => 'Su cuenta está desactivada. Consulte con el administrador.'], 401);
        }

        return $next($request);
    }
}
