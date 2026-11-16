<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Models\Menu;
use App\Models\PreferenciaUsuario;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * AuthController «server page» (navegación general): login, logout, me y menu.
 */
class AuthController extends Controller
{
    /** Intentos fallidos permitidos antes de bloquear el inicio de sesión (RNF-30). */
    private const MAX_INTENTOS = 5;

    private const SEGUNDOS_BLOQUEO = 60;

    /** POST /api/v1/auth/login → 200 + token | 422 credenciales inválidas | 429 bloqueo. */
    public function login(LoginRequest $request): JsonResponse
    {
        $correo = mb_strtolower(trim($request->input('correo')));
        $clave = 'login|'.$correo.'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($clave, self::MAX_INTENTOS)) {
            $segundos = RateLimiter::availableIn($clave);

            return response()->json([
                'message' => "Demasiados intentos fallidos. Intente de nuevo en $segundos segundos.",
                'reintentar_en' => $segundos,
            ], 429);
        }

        $usuario = Usuario::whereRaw('lower(correo) = ?', [$correo])->first();

        if (! $usuario || ! Hash::check($request->input('password'), $usuario->password)) {
            RateLimiter::hit($clave, self::SEGUNDOS_BLOQUEO);

            throw ValidationException::withMessages([
                'correo' => 'El correo o la contraseña no son correctos.',
            ]);
        }

        if (! $usuario->estaActivo()) {
            RateLimiter::hit($clave, self::SEGUNDOS_BLOQUEO);

            throw ValidationException::withMessages([
                'correo' => 'Su cuenta está desactivada. Consulte con el administrador.',
            ]);
        }

        RateLimiter::clear($clave);

        // La bitácora lee la petición original (el FormRequest es una copia).
        request()->attributes->set('bitacora.usuario_id', $usuario->id);

        return response()->json([
            'token' => $usuario->createToken('web')->plainTextToken,
            ...$this->sesion($usuario),
        ]);
    }

    /** POST /api/v1/auth/logout → 204 cierre de sesión. */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(null, 204);
    }

    /** GET /api/v1/auth/me: el usuario autenticado, sus permisos y preferencias. */
    public function me(Request $request): JsonResponse
    {
        return response()->json($this->sesion($request->user()));
    }

    /**
     * GET /api/v1/auth/menu: opciones del menú asignadas al rol (rol_menu) cuyo
     * permiso tiene el rol, agrupadas y ordenadas (consigna, punto 2).
     */
    public function menu(Request $request): JsonResponse
    {
        $rolId = $request->user()->rol_id;

        $grupos = Cache::rememberForever("rbac.menu.$rolId", fn () => Menu::query()
            ->select('menu.nombre', 'menu.ruta', 'menu.icono', 'menu.grupo', 'menu.orden')
            ->join('rol_menu', 'rol_menu.menu_id', '=', 'menu.id')
            ->where('rol_menu.rol_id', $rolId)
            ->where('menu.activo', true)
            ->where(fn ($q) => $q->whereNull('menu.permiso_web_id')
                ->orWhereIn('menu.permiso_web_id', fn ($s) => $s->select('permiso_web_id')
                    ->from('rol_permiso_web')
                    ->where('rol_id', $rolId)))
            ->orderBy('menu.orden')
            ->get()
            ->groupBy('grupo')
            ->map(fn ($opciones, $grupo) => [
                'grupo' => $grupo,
                'opciones' => $opciones->map->only(['nombre', 'ruta', 'icono'])->values(),
            ])
            ->values()
            ->all());

        return response()->json(['data' => $grupos]);
    }

    private function sesion(Usuario $usuario): array
    {
        $usuario->loadMissing('rol', 'preferencia');

        return [
            'usuario' => [
                'id' => $usuario->id,
                'nombre' => $usuario->nombre,
                'apellido' => $usuario->apellido,
                'nombre_completo' => $usuario->nombre_completo,
                'correo' => $usuario->correo,
                'rol' => ['id' => $usuario->rol->id, 'nombre' => $usuario->rol->nombre],
            ],
            'permisos' => $usuario->permisos(),
            'preferencias' => $usuario->preferencia?->only(['tema', 'modo', 'tamano_fuente', 'alto_contraste'])
                ?? PreferenciaUsuario::porDefecto(),
        ];
    }
}
