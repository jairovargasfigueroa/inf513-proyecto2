<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Historial de incidencias, altas y bajas de un recurso; nunca se borra (R9, CU-03). */
class Mantenimiento extends Model
{
    public $timestamps = false;

    protected $table = 'mantenimiento';

    protected $fillable = ['recurso_id', 'tipo', 'descripcion', 'cobertura_id', 'usuario_id'];
}
