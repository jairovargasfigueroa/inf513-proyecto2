<?php

namespace App\Http\Controllers\Concerns;

use App\Exceptions\ReglaNegocioException;
use Illuminate\Support\Facades\DB;

/** Reglas comunes de PlantillaController y CorteController (CU-06). */
trait ReglasPlantilla
{
    /** R19: la estructura no cambia mientras la plantilla tenga escaletas en borrador. */
    private function sinEscaletasEnBorrador(int $plantilla): void
    {
        $e = DB::table('escaleta')->where('plantilla_id', $plantilla)->where('estado', 'borrador')->first(['id', 'fecha']);
        if ($e) {
            throw new ReglaNegocioException("La plantilla tiene escaletas en borrador (la {$e->id}, del {$e->fecha}): ciérrelas antes de cambiar su estructura.");
        }
    }
}
