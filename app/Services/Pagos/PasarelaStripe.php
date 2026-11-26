<?php

namespace App\Services\Pagos;

use App\Models\SolicitudCobertura;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeClient;
use Stripe\Webhook;
use UnexpectedValueException;

/**
 * Stripe Checkout (página de pago alojada por Stripe: tarjeta, billeteras y QR
 * para pagar desde el celular). Se usa solo con claves de prueba (sk_test_…):
 * no mueve dinero real.
 */
class PasarelaStripe implements PasarelaPagos
{
    private ?StripeClient $cliente = null;

    public function __construct(private ?string $claveSecreta, private ?string $secretoWebhook) {}

    public function configurada(): bool
    {
        return filled($this->claveSecreta);
    }

    public function crearCheckout(SolicitudCobertura $solicitud, string $urlExito, string $urlCancelado): array
    {
        $sesion = $this->cliente()->checkout->sessions->create([
            'mode' => 'payment',
            'client_reference_id' => $solicitud->codigo,
            'customer_email' => $solicitud->correo,
            'line_items' => [[
                'quantity' => 1,
                'price_data' => [
                    'currency' => strtolower($solicitud->moneda),
                    'unit_amount' => (int) round(((float) $solicitud->monto) * 100),
                    'product_data' => [
                        'name' => "{$solicitud->tarifa->servicio} · {$solicitud->codigo}",
                        'description' => mb_substr("{$solicitud->titulo} ({$solicitud->fecha_hora_inicio->format('d/m/Y H:i')})", 0, 250),
                    ],
                ],
            ]],
            'metadata' => ['solicitud' => $solicitud->codigo],
            'success_url' => $urlExito,
            'cancel_url' => $urlCancelado,
        ]);

        return ['referencia' => $sesion->id, 'url' => $sesion->url];
    }

    public function consultar(string $referencia): array
    {
        $sesion = $this->cliente()->checkout->sessions->retrieve($referencia);

        return [
            'pagado' => $sesion->payment_status === 'paid',
            'expirado' => $sesion->status === 'expired',
            'payment_intent' => is_string($sesion->payment_intent) ? $sesion->payment_intent : ($sesion->payment_intent->id ?? null),
        ];
    }

    public function reembolsar(string $paymentIntent): void
    {
        $this->cliente()->refunds->create(['payment_intent' => $paymentIntent]);
    }

    public function evento(string $payload, ?string $firma): array
    {
        if (blank($this->secretoWebhook)) {
            throw new UnexpectedValueException('Falta STRIPE_WEBHOOK_SECRET.');
        }

        try {
            $evento = Webhook::constructEvent($payload, (string) $firma, $this->secretoWebhook);
        } catch (SignatureVerificationException $e) {
            throw new UnexpectedValueException('Firma de Stripe inválida.', 0, $e);
        }

        $objeto = $evento->data->object;

        return [
            'tipo' => $evento->type,
            'referencia' => $objeto->id ?? null,
            'payment_intent' => is_string($objeto->payment_intent ?? null) ? $objeto->payment_intent : null,
            'pagado' => ($objeto->payment_status ?? null) === 'paid',
        ];
    }

    private function cliente(): StripeClient
    {
        return $this->cliente ??= new StripeClient($this->claveSecreta);
    }
}
