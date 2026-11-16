<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Entrega de un recurso a un responsable; abierto mientras no tiene fecha de devolución (CU-03). */
class Prestamo extends Modelo
{
    protected $table = 'prestamo';

    protected $fillable = [
        'recurso_id', 'responsable_id', 'cobertura_id', 'fecha_entrega', 'fecha_devolucion',
        'observacion_entrega', 'observacion_devolucion',
    ];

    protected function casts(): array
    {
        return ['fecha_entrega' => 'datetime:Y-m-d H:i', 'fecha_devolucion' => 'datetime:Y-m-d H:i'];
    }

    public function recurso(): BelongsTo
    {
        return $this->belongsTo(Recurso::class);
    }

    public function responsable(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'responsable_id');
    }
}
