<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Ficha laboral del personal de prensa (tabla personal del Proyecto 1, CU-02). */
class Personal extends Modelo
{
    public const CARGOS = ['periodista', 'camarografo', 'editor', 'presentador', 'conductor', 'jefe_prensa'];

    public const CONDICIONES = ['planta', 'contrato', 'practicante'];

    protected $table = 'personal';

    protected $fillable = [
        'usuario_id', 'cargo', 'condicion_laboral', 'unidad_academica', 'turno_id', 'fecha_ingreso', 'estado',
    ];

    protected function casts(): array
    {
        return ['fecha_ingreso' => 'date:Y-m-d'];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }

    public function turno(): BelongsTo
    {
        return $this->belongsTo(Turno::class);
    }

    public function ausencias(): HasMany
    {
        return $this->hasMany(Ausencia::class);
    }
}
