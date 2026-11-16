<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BusquedaController;
use App\Http\Controllers\Api\V1\GrillaController;
use App\Http\Controllers\Api\V1\PerfilController;
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
    // CU-01 Gestión de Usuarios: sesión, menú y preferencias
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::get('/auth/menu', [AuthController::class, 'menu']);
    Route::put('/perfil/preferencias', [PerfilController::class, 'preferencias']);

    // CU-08 Reportes y Estadísticas: contador de visitas por página
    Route::get('/visitas', [VisitaController::class, 'index'])->middleware('permiso:bitacora.ver');
});
