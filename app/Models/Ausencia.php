<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Ausencia del personal: permiso, vacación, baja médica o comisión (CU-02). */
class Ausencia extends Modelo
{
    protected $table = 'ausencia';

    protected $fillable = ['personal_id', 'tipo', 'fecha_hora_inicio', 'fecha_hora_fin', 'motivo'];

    protected function casts(): array
    {
        return ['fecha_hora_inicio' => 'datetime:Y-m-d H:i', 'fecha_hora_fin' => 'datetime:Y-m-d H:i'];
    }

    public function personal(): BelongsTo
    {
        return $this->belongsTo(Personal::class);
    }
}
