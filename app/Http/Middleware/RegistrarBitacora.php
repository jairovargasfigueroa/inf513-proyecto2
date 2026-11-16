<?php

namespace App\Http\Middleware;

use App\Models\BitacoraAcceso;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bitácora de auditoría (consigna, punto 4; RNF-33): registra cada petición a la
 * API después de responderla, con el usuario, el método, el recurso, el código
 * de estado, la IP y el navegador. El inicio de sesión se registra como
 * login_exitoso o login_fallido con el correo intentado, y el cierre como logout.
 */
class RegistrarBitacora
{
    public function handle(Request $request, Closure $next): Response
    {
        $respuesta = $next($request);

        try {
            $estado = $respuesta->getStatusCode();
            $recurso = $this->recurso($request);
            $esLogin = $recurso === '/api/v1/auth/login';

            BitacoraAcceso::create([
                'usuario_id' => $request->attributes->get('bitacora.usuario_id') ?? $request->user('sanctum')?->getKey(),
                'tipo_evento' => $this->tipoEvento($recurso, $estado),
                'correo_intentado' => $esLogin ? Str::limit(mb_strtolower(trim((string) $request->input('correo'))), 150, '') ?: null : null,
                'metodo_http' => $request->method(),
                'recurso' => Str::limit($recurso, 200, ''),
                'codigo_estado' => $estado,
                'ip' => $request->ip() ?? '0.0.0.0',
                'user_agent' => Str::limit((string) $request->userAgent(), 500, ''),
            ]);
        } catch (\Throwable $e) {
            // La auditoría nunca debe impedir que el usuario reciba su respuesta.
            report($e);
        }

        return $respuesta;
    }

    private function tipoEvento(string $recurso, int $estado): string
    {
        return match (true) {
            $recurso === '/api/v1/auth/login' => $estado === 200 ? 'login_exitoso' : 'login_fallido',
            $recurso === '/api/v1/auth/logout' && $estado < 300 => 'logout',
            $estado === 401, $estado === 403 => 'acceso_denegado',
            $estado >= 500 => 'error',
            default => 'acceso',
        };
    }

    /** Ruta de la API con sus parámetros genéricos, p. ej. /api/v1/coberturas/{id}. */
    private function recurso(Request $request): string
    {
        return '/'.ltrim($request->route()?->uri() ?? $request->path(), '/');
    }
}
