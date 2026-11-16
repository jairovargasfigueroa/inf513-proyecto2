<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Matriz de accesos (consigna, punto 4): cada ruta declara el permiso que exige,
 * por ejemplo ->middleware('permiso:coberturas.crear'). Si el rol del usuario no
 * lo tiene, se responde 403 y la bitácora lo registra como acceso_denegado.
 * Con varios permisos (permiso:a,b) basta con tener uno.
 */
class VerificarPermiso
{
    public function handle(Request $request, Closure $next, string ...$permisos): Response
    {
        $usuario = $request->user();

        if (! $usuario) {
            throw new AuthenticationException;
        }

        foreach ($permisos as $permiso) {
            if ($usuario->tienePermiso($permiso)) {
                return $next($request);
            }
        }

        throw new AccessDeniedHttpException('No tiene permiso para realizar esta acción.');
    }
}
