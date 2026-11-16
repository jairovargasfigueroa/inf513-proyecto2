<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Visitas acumuladas de una página del frontend (CU-08). */
class ContadorVisita extends Model
{
    public $timestamps = false;

    protected $table = 'contador_visita';

    protected $fillable = ['pagina', 'cantidad', 'ultima_visita'];

    protected function casts(): array
    {
        return ['cantidad' => 'integer', 'ultima_visita' => 'datetime'];
    }
}
