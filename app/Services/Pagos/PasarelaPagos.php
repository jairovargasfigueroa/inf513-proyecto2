<?php

namespace App\Services\Pagos;

use App\Models\SolicitudCobertura;

/**
 * Pasarela de pagos del CU-09. La implementación real es Stripe Checkout en modo
 * de prueba (PasarelaStripe); las pruebas automáticas usan una pasarela simulada.
 */
interface PasarelaPagos
{
    /** Hay claves configuradas para cobrar. */
    public function configurada(): bool;

    /**
     * Crea la página de pago de la solicitud.
     *
     * @return array{referencia: string, url: string}
     */
    public function crearCheckout(SolicitudCobertura $solicitud, string $urlExito, string $urlCancelado): array;

    /**
     * Estado de una sesión de pago.
     *
     * @return array{pagado: bool, expirado: bool, payment_intent: ?string}
     */
    public function consultar(string $referencia): array;

    /** Devuelve el pago completo. */
    public function reembolsar(string $paymentIntent): void;

    /**
     * Verifica la firma de un webhook y lo traduce.
     *
     * @return array{tipo: string, referencia: ?string, payment_intent: ?string, pagado: bool}
     *
     * @throws \UnexpectedValueException si la firma no es válida
     */
    public function evento(string $payload, ?string $firma): array;
}
