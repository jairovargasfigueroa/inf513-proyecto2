<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Solicitud de cobertura de una persona o institución externa (CU-09).
 * Estados: pendiente_pago → pagada → aceptada | rechazada (pago devuelto).
 */
class SolicitudCobertura extends Modelo
{
    public const ESTADOS = ['pendiente_pago', 'pagada', 'aceptada', 'rechazada'];

    protected $table = 'solicitud_cobertura';

    protected $fillable = [
        'codigo', 'tarifa_id', 'solicitante', 'institucion', 'correo', 'telefono', 'titulo', 'descripcion', 'tipo', 'lugar',
        'fecha_hora_inicio', 'fecha_hora_fin', 'monto', 'moneda', 'estado', 'motivo_rechazo', 'cobertura_id', 'atendida_por',
        'fecha_atencion',
    ];

    protected function casts(): array
    {
        return [
            'fecha_hora_inicio' => 'datetime:Y-m-d H:i',
            'fecha_hora_fin' => 'datetime:Y-m-d H:i',
            'fecha_atencion' => 'datetime:Y-m-d H:i',
            'monto' => 'decimal:2',
        ];
    }

    /** Asigna el código de seguimiento SOL-0001 a partir del id. */
    protected static function booted(): void
    {
        static::created(function (SolicitudCobertura $s) {
            $s->forceFill(['codigo' => sprintf('SOL-%04d', $s->id)])->saveQuietly();
        });
    }

    public function tarifa(): BelongsTo
    {
        return $this->belongsTo(Tarifa::class);
    }

    public function cobertura(): BelongsTo
    {
        return $this->belongsTo(Cobertura::class);
    }

    public function atendidaPor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'atendida_por');
    }

    public function pagos(): HasMany
    {
        return $this->hasMany(Pago::class, 'solicitud_id');
    }

    /** El pago cobrado (o devuelto) de la solicitud. */
    public function pagoCobrado(): HasOne
    {
        return $this->hasOne(Pago::class, 'solicitud_id')->whereIn('estado', ['pagado', 'reembolsado'])->latestOfMany();
    }
}
