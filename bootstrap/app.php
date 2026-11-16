<?php

use App\Exceptions\ReglaNegocioException;
use App\Http\Middleware\RegistrarBitacora;
use App\Http\Middleware\UsuarioActivo;
use App\Http\Middleware\VerificarPermiso;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api/v1',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // La bitácora envuelve toda la API, también los rechazos 401 y 403.
        $middleware->api(prepend: [RegistrarBitacora::class]);

        $middleware->alias([
            'permiso' => VerificarPermiso::class,
            'activo' => UsuarioActivo::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Toda respuesta de la API es JSON, con mensajes en español (RNF-36).
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*'));

        // Una regla de negocio que se cumple (409) no es un error del sistema: no va al log.
        $exceptions->dontReport(ReglaNegocioException::class);

        $json = fn (string $mensaje, int $estado) => response()->json(['message' => $mensaje], $estado);

        $exceptions->render(fn (AuthenticationException $e, Request $request) => $request->is('api/*')
            ? $json('Debe iniciar sesión para continuar.', 401) : null);

        $exceptions->render(fn (AccessDeniedHttpException $e, Request $request) => $request->is('api/*')
            ? $json($e->getMessage() ?: 'No tiene permiso para realizar esta acción.', 403) : null);

        $exceptions->render(fn (AuthorizationException $e, Request $request) => $request->is('api/*')
            ? $json('No tiene permiso para realizar esta acción.', 403) : null);

        $exceptions->render(fn (NotFoundHttpException $e, Request $request) => $request->is('api/*')
            ? $json('El recurso solicitado no existe.', 404) : null);

        $exceptions->render(fn (ModelNotFoundException $e, Request $request) => $request->is('api/*')
            ? $json('El recurso solicitado no existe.', 404) : null);

        $exceptions->render(fn (ThrottleRequestsException $e, Request $request) => $request->is('api/*')
            ? $json('Demasiadas solicitudes. Espere un momento e intente de nuevo.', 429) : null);

        $exceptions->render(fn (ValidationException $e, Request $request) => $request->is('api/*')
            ? response()->json(['message' => 'Revise los datos del formulario.', 'errors' => $e->errors()], 422) : null);

        $exceptions->render(function (Throwable $e, Request $request) use ($json) {
            if (! $request->is('api/*') || config('app.debug') || $e instanceof HttpExceptionInterface) {
                return null;
            }

            return $json('Ocurrió un error en el servidor. Intente de nuevo más tarde.', 500);
        });
    })->create();
