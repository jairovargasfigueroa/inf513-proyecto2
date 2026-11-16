<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Ficha laboral del personal de prensa (tabla personal del Proyecto 1, CU-02). */
class Personal extends Modelo
{
    protected $table = 'personal';

    protected $fillable = [
        'usuario_id', 'cargo', 'condicion_laboral', 'unidad_academica', 'turno_id', 'fecha_ingreso', 'estado',
    ];

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }
}
