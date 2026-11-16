<?php

use Illuminate\Support\Facades\Route;

/*
| API RESTful del Sistema Web Canal 11 (prefijo /api/v1).
| Las rutas de cada caso de uso se agregan aquí, agrupadas por CU, con su
| middleware permiso:<código> (documento, Anexo A).
*/

Route::get('/estado', fn () => response()->json([
    'sistema' => config('app.name'),
    'estado' => 'ok',
]));
