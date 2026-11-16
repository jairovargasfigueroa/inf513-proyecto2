<?php

use Illuminate\Support\Facades\Route;

/*
| Laravel no genera pantallas: toda ruta que no sea de la API devuelve la
| página que carga la aplicación React (SPA), y React Router decide qué mostrar.
*/
Route::view('/{ruta?}', 'app')->where('ruta', '^(?!api/).*$');
