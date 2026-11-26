<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Pago;
use App\Services\Pagos\PasarelaPagos;
use App\Services\Pagos\RegistroPagos;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use UnexpectedValueException;

/**
 * StripeWebhookController «server page» (CU-09): Stripe avisa aquí cuando un pago
 * se completa o vence, aunque el Visitante cierre la página antes de volver.
 */
class StripeWebhookController extends Controller
{
    /** POST /api/v1/pagos/stripe/webhook (público, firmado por Stripe). */
    public function __invoke(Request $request, PasarelaPagos $pasarela, RegistroPagos $pagos): JsonResponse
    {
        try {
            $evento = $pasarela->evento($request->getContent(), $request->header('Stripe-Signature'));
        } catch (UnexpectedValueException) {
            return response()->json(['message' => 'Firma inválida.'], 400);
        }

        $pago = $evento['referencia'] ? Pago::where('referencia', $evento['referencia'])->first() : null;
        if ($pago) {
            match ($evento['tipo']) {
                'checkout.session.completed', 'checkout.session.async_payment_succeeded' => $evento['pagado']
                    ? $pagos->confirmar($pago, $evento['payment_intent']) : null,
                'checkout.session.expired' => $pagos->expirar($pago),
                default => null,
            };
        }

        return response()->json(['recibido' => true]);
    }
}
