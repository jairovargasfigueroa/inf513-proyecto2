<?php

use App\Http\Controllers\Api\V1\AusenciaController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BusquedaController;
use App\Http\Controllers\Api\V1\GrillaController;
use App\Http\Controllers\Api\V1\MenuController;
use App\Http\Controllers\Api\V1\PerfilController;
use App\Http\Controllers\Api\V1\PermisoController;
use App\Http\Controllers\Api\V1\PersonalController;
use App\Http\Controllers\Api\V1\RolController;
use App\Http\Controllers\Api\V1\TurnoController;
use App\Http\Controllers\Api\V1\UsuarioController;
use App\Http\Controllers\Api\V1\VisitaController;
use Illuminate\Support\Facades\Route;

/*
| API RESTful del Sistema Web Canal 11 (prefijo /api/v1).
| Cada ruta protegida declara su permiso con permiso:<código> (documento, Anexo A).
| Toda petición queda en la bitácora (middleware RegistrarBitacora del grupo api).
*/

Route::get('/estado', fn () => response()->json(['sistema' => config('app.name'), 'estado' => 'ok']));

// ── Rutas públicas (Visitante) ─────────────────────────────────────────────
Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/busqueda', [BusquedaController::class, 'buscar'])->middleware('throttle:60,1');
Route::post('/visitas', [VisitaController::class, 'registrar'])->middleware('throttle:120,1');
Route::get('/grilla', [GrillaController::class, 'index']);

// ── Rutas con sesión ───────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'activo'])->group(function () {
    // CU-01 Gestión de Usuarios ─────────────────────────────────────────────
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::get('/auth/menu', [AuthController::class, 'menu']);

    Route::get('/perfil', [PerfilController::class, 'show']);
    Route::put('/perfil', [PerfilController::class, 'update']);
    Route::put('/perfil/preferencias', [PerfilController::class, 'preferencias']);

    Route::get('/usuarios', [UsuarioController::class, 'index'])->middleware('permiso:usuarios.listar');
    Route::post('/usuarios', [UsuarioController::class, 'store'])->middleware('permiso:usuarios.crear');
    Route::put('/usuarios/{usuario}', [UsuarioController::class, 'update'])->middleware('permiso:usuarios.editar');
    Route::delete('/usuarios/{usuario}', [UsuarioController::class, 'destroy'])->middleware('permiso:usuarios.desactivar');
    Route::get('/roles', [RolController::class, 'index'])->middleware('permiso:roles.listar');

    Route::get('/permisos/matriz', [PermisoController::class, 'matriz'])->middleware('permiso:seguridad.matriz.ver');
    Route::put('/roles/{rol}/permisos', [PermisoController::class, 'actualizar'])->middleware('permiso:seguridad.matriz.editar');

    Route::get('/menus', [MenuController::class, 'index'])->middleware('permiso:seguridad.menu');
    Route::post('/menus', [MenuController::class, 'store'])->middleware('permiso:seguridad.menu');
    Route::put('/menus/{menu}', [MenuController::class, 'update'])->middleware('permiso:seguridad.menu');
    Route::put('/roles/{rol}/menus', [MenuController::class, 'asignar'])->middleware('permiso:seguridad.menu');

    // CU-02 Gestión de Personal de Prensa, Turnos y Disponibilidad ─────────
    Route::get('/personal/disponibilidad', [PersonalController::class, 'disponibilidad'])->middleware('permiso:personal.disponibilidad');
    Route::get('/personal', [PersonalController::class, 'index'])->middleware('permiso:personal.listar');
    Route::post('/personal', [PersonalController::class, 'store'])->middleware('permiso:personal.crear');
    Route::put('/personal/{personal}', [PersonalController::class, 'update'])->middleware('permiso:personal.editar');
    Route::delete('/personal/{personal}', [PersonalController::class, 'destroy'])->middleware('permiso:personal.desactivar');
    Route::get('/turnos', [TurnoController::class, 'index'])->middleware('permiso:turnos.listar');
    Route::post('/turnos', [TurnoController::class, 'store'])->middleware('permiso:turnos.crear');
    Route::get('/ausencias', [AusenciaController::class, 'index'])->middleware('permiso:ausencias.listar');
    Route::post('/ausencias', [AusenciaController::class, 'store'])->middleware('permiso:ausencias.crear');

    // CU-08 Reportes y Estadísticas: contador de visitas por página
    Route::get('/visitas', [VisitaController::class, 'index'])->middleware('permiso:bitacora.ver');
});
