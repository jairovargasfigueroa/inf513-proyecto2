<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Equipo técnico o unidad móvil del inventario (CU-03). */
class Recurso extends Modelo
{
    protected $table = 'recurso';

    protected $fillable = ['codigo', 'tipo_recurso_id', 'marca', 'modelo', 'placa', 'caracteristicas', 'estado', 'observacion'];

    public function tipo(): BelongsTo
    {
        return $this->belongsTo(TipoRecurso::class, 'tipo_recurso_id');
    }

    public function prestamos(): HasMany
    {
        return $this->hasMany(Prestamo::class);
    }

    public function prestamoAbierto(): ?Prestamo
    {
        return $this->prestamos()->whereNull('fecha_devolucion')->first();
    }
}
