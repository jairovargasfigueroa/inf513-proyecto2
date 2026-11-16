<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

/** Turno de trabajo (CU-02). Si hora_fin es menor que hora_inicio, cruza la medianoche. */
class Turno extends Modelo
{
    protected $table = 'turno';

    protected $fillable = ['nombre', 'hora_inicio', 'hora_fin', 'dias', 'descripcion'];

    public function personal(): HasMany
    {
        return $this->hasMany(Personal::class);
    }
}
