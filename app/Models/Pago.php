<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Intento de pago de una solicitud (CU-09). La referencia es el id de la sesión
 * de Stripe Checkout; payment_intent sirve para devolver el pago. Los datos de
 * prueba usan el proveedor «prueba», que no pasa por Stripe.
 */
class Pago extends Modelo
{
    protected $table = 'pago';

    protected $fillable = [
        'solicitud_id', 'proveedor', 'referencia', 'payment_intent', 'monto', 'moneda', 'estado', 'fecha_pago', 'fecha_reembolso',
    ];

    protected function casts(): array
    {
        return [
            'monto' => 'decimal:2',
            'fecha_pago' => 'datetime:Y-m-d H:i',
            'fecha_reembolso' => 'datetime:Y-m-d H:i',
        ];
    }

    public function solicitud(): BelongsTo
    {
        return $this->belongsTo(SolicitudCobertura::class, 'solicitud_id');
    }
}
