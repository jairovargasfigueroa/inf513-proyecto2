<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Cobertura periodística (CU-04). Solo las planificadas y en curso ocupan al
 * personal y a los recursos (R3).
 */
class Cobertura extends Modelo
{
    public const TIPOS = ['conferencia', 'hecho_noticioso', 'deportes', 'acto_institucional', 'entrevista'];

    public const ACTIVAS = ['planificada', 'en_curso'];

    protected $table = 'cobertura';

    protected $fillable = [
        'titulo', 'tema', 'tipo', 'fecha_hora_inicio', 'fecha_hora_fin', 'lugar', 'prioridad', 'fuente', 'indicaciones',
        'estado', 'parte_retorno', 'incidencias_retorno', 'fecha_hora_retorno', 'cobertura_origen_id', 'creado_por',
    ];

    protected function casts(): array
    {
        return [
            'fecha_hora_inicio' => 'datetime:Y-m-d H:i',
            'fecha_hora_fin' => 'datetime:Y-m-d H:i',
            'fecha_hora_retorno' => 'datetime:Y-m-d H:i',
        ];
    }

    public function creador(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'creado_por');
    }

    public function estaActiva(): bool
    {
        return in_array($this->estado, self::ACTIVAS, true);
    }

    public function inicio(): string
    {
        return $this->fecha_hora_inicio->format('Y-m-d H:i:s');
    }

    public function fin(): string
    {
        return $this->fecha_hora_fin->format('Y-m-d H:i:s');
    }
}
