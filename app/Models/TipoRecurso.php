<?php

namespace App\Models;

/** Tipo de recurso (cámara, micrófono, unidad móvil…) (CU-03). */
class TipoRecurso extends Modelo
{
    protected $table = 'tipo_recurso';

    protected $fillable = ['nombre', 'es_unidad_movil', 'descripcion'];

    protected function casts(): array
    {
        return ['es_unidad_movil' => 'boolean'];
    }
}
