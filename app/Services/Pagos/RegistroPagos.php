<?php

namespace App\Services\Pagos;

use App\Models\Pago;
use Illuminate\Support\Facades\DB;

/**
 * Cambios de estado de un pago y de su solicitud (CU-09). Los usan la página
 * «Pago recibido» y el webhook de Stripe; ambos pueden llegar, así que cada
 * método es idempotente.
 */
class RegistroPagos
{
    /** El pago se cobró: el pago pasa a «pagado» y la solicitud a «pagada». */
    public function confirmar(Pago $pago, ?string $paymentIntent): void
    {
        DB::transaction(function () use ($pago, $paymentIntent) {
            $pago = Pago::lockForUpdate()->findOrFail($pago->id);
            if ($pago->estado !== 'pendiente') {
                return;
            }
            $pago->update(['estado' => 'pagado', 'payment_intent' => $paymentIntent, 'fecha_pago' => now()]);
            $pago->solicitud()->where('estado', 'pendiente_pago')->update(['estado' => 'pagada', 'actualizado_en' => now()]);
        });
    }

    /** La sesión de pago venció sin cobrarse: la solicitud sigue pendiente de pago. */
    public function expirar(Pago $pago): void
    {
        Pago::whereKey($pago->id)->where('estado', 'pendiente')->update(['estado' => 'expirado', 'actualizado_en' => now()]);
    }
}
