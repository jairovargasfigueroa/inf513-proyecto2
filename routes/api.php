<?php

use App\Http\Controllers\Api\V1\AsignacionPersonalController;
use App\Http\Controllers\Api\V1\AusenciaController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BusquedaController;
use App\Http\Controllers\Api\V1\CoberturaController;
use App\Http\Controllers\Api\V1\GrillaController;
use App\Http\Controllers\Api\V1\MaterialController;
use App\Http\Controllers\Api\V1\MenuController;
use App\Http\Controllers\Api\V1\NotaController;
use App\Http\Controllers\Api\V1\PerfilController;
use App\Http\Controllers\Api\V1\PermisoController;
use App\Http\Controllers\Api\V1\PersonalController;
use App\Http\Controllers\Api\V1\PrestamoController;
use App\Http\Controllers\Api\V1\RecursoController;
use App\Http\Controllers\Api\V1\ReservaRecursoController;
use App\Http\Controllers\Api\V1\RolController;
use App\Http\Controllers\Api\V1\RotuloController;
use App\Http\Controllers\Api\V1\TipoRecursoController;
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

    // CU-03 Inventario, Asignación y Mantenimiento de Equipos y Unidades Móviles ─
    Route::get('/recursos', [RecursoController::class, 'index'])->middleware('permiso:recursos.listar');
    Route::post('/recursos', [RecursoController::class, 'store'])->middleware('permiso:recursos.crear');
    Route::put('/recursos/{recurso}', [RecursoController::class, 'update'])->middleware('permiso:recursos.editar');
    Route::delete('/recursos/{recurso}', [RecursoController::class, 'destroy'])->middleware('permiso:recursos.baja');
    Route::post('/recursos/{recurso}/incidencias', [RecursoController::class, 'incidencia'])->middleware('permiso:recursos.incidencia');
    Route::post('/recursos/{recurso}/alta', [RecursoController::class, 'alta'])->middleware('permiso:recursos.alta');
    Route::get('/tipos-recurso', [TipoRecursoController::class, 'index'])->middleware('permiso:recursos.listar');
    Route::get('/prestamos', [PrestamoController::class, 'index'])->middleware('permiso:prestamos.listar');
    Route::post('/prestamos', [PrestamoController::class, 'store'])->middleware('permiso:prestamos.crear');
    Route::put('/prestamos/{prestamo}/devolucion', [PrestamoController::class, 'devolver'])->middleware('permiso:prestamos.devolver');

    // CU-04 Planificar Coberturas, Validar Conflictos de Operación y Liberar Recursos
    Route::get('/coberturas', [CoberturaController::class, 'index'])->middleware('permiso:coberturas.listar');
    Route::post('/coberturas', [CoberturaController::class, 'store'])->middleware('permiso:coberturas.crear');
    Route::get('/coberturas/{cobertura}', [CoberturaController::class, 'show'])->middleware('permiso:coberturas.listar');
    Route::put('/coberturas/{cobertura}', [CoberturaController::class, 'update'])->middleware('permiso:coberturas.editar');
    Route::delete('/coberturas/{cobertura}', [CoberturaController::class, 'destroy'])->middleware('permiso:coberturas.cancelar');
    Route::post('/coberturas/{cobertura}/duplicar', [CoberturaController::class, 'duplicar'])->middleware('permiso:coberturas.duplicar');
    Route::get('/coberturas/{cobertura}/hoja', [CoberturaController::class, 'hoja'])->middleware('permiso:coberturas.hoja');
    Route::post('/coberturas/{cobertura}/retorno', [CoberturaController::class, 'retorno'])->middleware('permiso:coberturas.retorno');
    Route::post('/coberturas/{cobertura}/personal', [AsignacionPersonalController::class, 'store'])->middleware('permiso:coberturas.asignar');
    Route::delete('/coberturas/{cobertura}/personal/{personal}', [AsignacionPersonalController::class, 'destroy'])->whereNumber('personal')->middleware('permiso:coberturas.asignar');
    Route::post('/coberturas/{cobertura}/recursos', [ReservaRecursoController::class, 'store'])->middleware('permiso:coberturas.reservar');
    Route::delete('/coberturas/{cobertura}/recursos/{recurso}', [ReservaRecursoController::class, 'destroy'])->whereNumber('recurso')->middleware('permiso:coberturas.reservar');

    // CU-05 Redactar Notas (NRCS), Material Audiovisual y Flujo de Aprobación
    Route::get('/notas', [NotaController::class, 'index'])->middleware('permiso:notas.listar');
    Route::post('/notas', [NotaController::class, 'store'])->middleware('permiso:notas.crear');
    Route::get('/notas/{nota}', [NotaController::class, 'show'])->middleware('permiso:notas.listar');
    Route::put('/notas/{nota}', [NotaController::class, 'update'])->middleware('permiso:notas.editar');
    Route::delete('/notas/{nota}', [NotaController::class, 'destroy'])->middleware('permiso:notas.baja');
    Route::put('/notas/{nota}/guion', [NotaController::class, 'guion'])->middleware('permiso:notas.guion');
    Route::get('/notas/{nota}/versiones', [NotaController::class, 'versiones'])->middleware('permiso:notas.listar');
    Route::put('/notas/{nota}/rotulos', [RotuloController::class, 'update'])->middleware('permiso:notas.rotulos');
    Route::post('/notas/{nota}/enviar', [NotaController::class, 'enviar'])->middleware('permiso:notas.enviar');
    Route::post('/notas/{nota}/aprobar', [NotaController::class, 'aprobar'])->middleware('permiso:notas.aprobar');
    Route::post('/notas/{nota}/observar', [NotaController::class, 'observar'])->middleware('permiso:notas.observar');
    Route::get('/notas/{nota}/material', [MaterialController::class, 'index'])->middleware('permiso:material.listar');
    Route::post('/notas/{nota}/material', [MaterialController::class, 'store'])->middleware('permiso:material.crear');
    Route::put('/material/{material}', [MaterialController::class, 'update'])->whereNumber('material')->middleware('permiso:material.editar');

    // CU-08 Reportes y Estadísticas: contador de visitas por página
    Route::get('/visitas', [VisitaController::class, 'index'])->middleware('permiso:bitacora.ver');
});
