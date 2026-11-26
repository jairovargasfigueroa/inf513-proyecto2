<?php

namespace Tests\Feature;

use App\Models\Cobertura;
use App\Models\Pago;
use App\Models\SolicitudCobertura;
use App\Models\Tarifa;
use App\Services\Pagos\PasarelaPagos;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
use UnexpectedValueException;

/** CU-09 Gestión de Solicitudes de Cobertura y Pagos (Stripe reemplazado por una pasarela simulada). */
class Cu09SolicitudesPagosTest extends TestCase
{
    use DatabaseTransactions;

    private const JEFE = 'jefe.prensa@canal11.test';

    private const DIRECTOR = 'director@canal11.test';

    private PasarelaSimulada $pasarela;

    protected function setUp(): void
    {
        parent::setUp();
        $this->pasarela = new PasarelaSimulada;
        $this->app->instance(PasarelaPagos::class, $this->pasarela);
    }

    public function test_el_visitante_ve_solo_las_tarifas_activas(): void
    {
        $inactiva = Tarifa::create(['servicio' => 'Servicio retirado', 'monto' => 10, 'moneda' => 'USD', 'activa' => false]);

        $servicios = $this->getJson('/api/v1/servicios')->assertOk()->json('data');

        $this->assertNotEmpty($servicios);
        $this->assertFalse(collect($servicios)->contains('id', $inactiva->id));
    }

    public function test_solicitar_crea_la_solicitud_y_la_pagina_de_pago(): void
    {
        $r = $this->postJson('/api/v1/solicitudes', $this->solicitud())->assertCreated();

        $solicitud = SolicitudCobertura::where('codigo', $r->json('data.codigo'))->firstOrFail();
        $this->assertSame('pendiente_pago', $solicitud->estado);
        $this->assertSame('https://pago.simulado/'.$this->pasarela->ultima, $r->json('data.url_pago'));
        $this->assertDatabaseHas('pago', ['solicitud_id' => $solicitud->id, 'estado' => 'pendiente', 'referencia' => $this->pasarela->ultima]);
        $this->assertEquals($this->tarifa()->monto, $solicitud->monto); // el monto sale de la tarifa, no del formulario
    }

    public function test_sin_claves_de_stripe_no_se_registra_la_solicitud(): void
    {
        $this->pasarela->configurada = false;
        $antes = SolicitudCobertura::count();

        $this->postJson('/api/v1/solicitudes', $this->solicitud())->assertStatus(503);

        $this->assertSame($antes, SolicitudCobertura::count());
    }

    public function test_la_cobertura_se_pide_con_dos_dias_de_anticipacion(): void
    {
        $manana = now()->addDay()->format('Y-m-d');

        $this->postJson('/api/v1/solicitudes', [...$this->solicitud(), 'inicio' => "{$manana}T10:00", 'fin' => "{$manana}T11:00"])
            ->assertStatus(422)
            ->assertJsonPath('errors.inicio.0', 'Solicite la cobertura con al menos 2 días de anticipación.');
    }

    public function test_al_volver_de_stripe_el_pago_queda_registrado(): void
    {
        $codigo = $this->postJson('/api/v1/solicitudes', $this->solicitud())->json('data.codigo');
        $this->pasarela->pagadas[] = $this->pasarela->ultima;

        $this->postJson('/api/v1/solicitudes/confirmar', ['session_id' => $this->pasarela->ultima])
            ->assertOk()
            ->assertJsonPath('data.codigo', $codigo)
            ->assertJsonPath('data.estado', 'pagada');

        $this->assertDatabaseHas('pago', ['referencia' => $this->pasarela->ultima, 'estado' => 'pagado', 'payment_intent' => 'pi_'.$this->pasarela->ultima]);
        // Volver a confirmar no cambia nada.
        $this->postJson('/api/v1/solicitudes/confirmar', ['session_id' => $this->pasarela->ultima])->assertJsonPath('data.estado', 'pagada');
    }

    public function test_el_visitante_consulta_con_codigo_y_correo(): void
    {
        $codigo = $this->postJson('/api/v1/solicitudes', $this->solicitud())->json('data.codigo');

        $this->getJson("/api/v1/solicitudes/consulta?codigo={$codigo}&correo=LUCIA@EJEMPLO.TEST")
            ->assertOk()
            ->assertJsonPath('data.estado', 'pendiente_pago');
        $this->getJson("/api/v1/solicitudes/consulta?codigo={$codigo}&correo=otro@ejemplo.test")
            ->assertNotFound()
            ->assertJsonPath('message', 'No encontramos una solicitud con ese código y correo.');
    }

    public function test_una_solicitud_sin_pagar_puede_volver_a_pagarse(): void
    {
        $codigo = $this->postJson('/api/v1/solicitudes', $this->solicitud())->json('data.codigo');
        $primera = $this->pasarela->ultima;

        $this->postJson('/api/v1/solicitudes/pago', ['codigo' => $codigo, 'correo' => 'lucia@ejemplo.test'])->assertOk();

        $this->assertNotSame($primera, $this->pasarela->ultima);
    }

    public function test_el_jefe_de_prensa_lista_las_solicitudes_con_su_resumen(): void
    {
        $this->solicitudPagada();

        $this->como(self::JEFE)->getJson('/api/v1/solicitudes')
            ->assertOk()
            ->assertJsonPath('data.0.estado', 'pagada')
            ->assertJsonStructure(['resumen' => ['por_atender', 'pendientes_pago', 'aceptadas', 'rechazadas', 'ingresos']]);
        $this->como('carla.rojas@canal11.test')->getJson('/api/v1/solicitudes')->assertForbidden();
    }

    public function test_aceptar_crea_la_cobertura_planificada(): void
    {
        $solicitud = $this->solicitudPagada();

        $id = $this->como(self::JEFE)
            ->postJson("/api/v1/solicitudes/{$solicitud->id}/aceptar", ['prioridad' => 'alta', 'indicaciones' => 'Llevar trípode.'])
            ->assertOk()
            ->json('data.cobertura_id');

        $cobertura = Cobertura::findOrFail($id);
        $this->assertSame('planificada', $cobertura->refresh()->estado);
        $this->assertSame($solicitud->titulo, $cobertura->titulo);
        $this->assertStringContainsString($solicitud->codigo, $cobertura->fuente);
        $this->assertDatabaseHas('solicitud_cobertura', ['id' => $solicitud->id, 'estado' => 'aceptada', 'cobertura_id' => $id]);

        $this->como(self::JEFE)->postJson("/api/v1/solicitudes/{$solicitud->id}/aceptar", ['prioridad' => 'alta'])->assertStatus(409);
    }

    public function test_rechazar_devuelve_el_pago_de_stripe(): void
    {
        $solicitud = $this->solicitudPagada('stripe');

        $this->como(self::JEFE)->postJson("/api/v1/solicitudes/{$solicitud->id}/rechazar", [])->assertStatus(422);
        $this->como(self::JEFE)
            ->postJson("/api/v1/solicitudes/{$solicitud->id}/rechazar", ['motivo' => 'No hay unidad móvil ese día.'])
            ->assertOk();

        $this->assertSame(['pi_prueba'], $this->pasarela->reembolsos);
        $this->assertDatabaseHas('solicitud_cobertura', ['id' => $solicitud->id, 'estado' => 'rechazada', 'motivo_rechazo' => 'No hay unidad móvil ese día.']);
        $this->assertDatabaseHas('pago', ['solicitud_id' => $solicitud->id, 'estado' => 'reembolsado']);
    }

    public function test_el_director_configura_las_tarifas(): void
    {
        $id = $this->como(self::DIRECTOR)
            ->postJson('/api/v1/tarifas', ['servicio' => 'Entrevista en estudio', 'monto' => 30, 'moneda' => 'USD'])
            ->assertCreated()
            ->json('data.id');
        $this->como(self::DIRECTOR)
            ->putJson("/api/v1/tarifas/{$id}", ['servicio' => 'Entrevista en estudio', 'monto' => 35, 'moneda' => 'USD', 'activa' => false])
            ->assertOk()
            ->assertJsonPath('data.activa', false);

        $this->como(self::JEFE)->getJson('/api/v1/tarifas')->assertForbidden();
    }

    public function test_el_webhook_de_stripe_confirma_el_pago(): void
    {
        $this->postJson('/api/v1/solicitudes', $this->solicitud());
        $referencia = $this->pasarela->ultima;

        $this->call('POST', '/api/v1/pagos/stripe/webhook', [], [], [], ['HTTP_STRIPE_SIGNATURE' => 'mala'], 'x')->assertStatus(400);
        $this->call('POST', '/api/v1/pagos/stripe/webhook', [], [], [], ['HTTP_STRIPE_SIGNATURE' => 'ok'], $referencia)->assertOk();

        $this->assertDatabaseHas('pago', ['referencia' => $referencia, 'estado' => 'pagado']);
    }

    private function tarifa(): Tarifa
    {
        return Tarifa::where('activa', true)->orderBy('id')->firstOrFail();
    }

    private function solicitud(): array
    {
        $dia = now()->addDays(4)->format('Y-m-d');

        return [
            'tarifa_id' => $this->tarifa()->id, 'solicitante' => 'Lucía Prueba', 'institucion' => 'Facultad de Prueba',
            'correo' => 'lucia@ejemplo.test', 'telefono' => '70000000', 'titulo' => 'Evento de prueba',
            'descripcion' => 'Descripción del evento.', 'tipo' => 'acto_institucional', 'lugar' => 'Paraninfo',
            'inicio' => "{$dia}T10:00", 'fin' => "{$dia}T12:00", 'monto' => 1,
        ];
    }

    private function solicitudPagada(string $proveedor = 'prueba'): SolicitudCobertura
    {
        $dia = now()->addDays(4)->format('Y-m-d');
        $tarifa = $this->tarifa();
        $s = SolicitudCobertura::create([
            'tarifa_id' => $tarifa->id, 'solicitante' => 'Pedro Prueba', 'correo' => 'pedro@ejemplo.test', 'titulo' => 'Solicitud pagada de prueba',
            'tipo' => 'conferencia', 'lugar' => 'Auditorio', 'fecha_hora_inicio' => "$dia 15:00", 'fecha_hora_fin' => "$dia 16:00",
            'monto' => $tarifa->monto, 'moneda' => $tarifa->moneda, 'estado' => 'pagada',
        ])->refresh();
        Pago::create([
            'solicitud_id' => $s->id, 'proveedor' => $proveedor, 'referencia' => 'ref_'.$s->codigo.uniqid(),
            'payment_intent' => $proveedor === 'stripe' ? 'pi_prueba' : null,
            'monto' => $s->monto, 'moneda' => $s->moneda, 'estado' => 'pagado', 'fecha_pago' => now(),
        ]);

        return $s;
    }
}

/** Pasarela simulada: guarda lo que se le pide en lugar de llamar a Stripe. */
class PasarelaSimulada implements PasarelaPagos
{
    public bool $configurada = true;

    public ?string $ultima = null;

    /** @var string[] sesiones que Stripe reportaría como pagadas */
    public array $pagadas = [];

    /** @var string[] */
    public array $reembolsos = [];

    public function configurada(): bool
    {
        return $this->configurada;
    }

    public function crearCheckout(SolicitudCobertura $solicitud, string $urlExito, string $urlCancelado): array
    {
        $this->ultima = 'cs_test_'.uniqid();

        return ['referencia' => $this->ultima, 'url' => 'https://pago.simulado/'.$this->ultima];
    }

    public function consultar(string $referencia): array
    {
        $pagado = in_array($referencia, $this->pagadas, true);

        return ['pagado' => $pagado, 'expirado' => false, 'payment_intent' => $pagado ? 'pi_'.$referencia : null];
    }

    public function reembolsar(string $paymentIntent): void
    {
        $this->reembolsos[] = $paymentIntent;
    }

    public function evento(string $payload, ?string $firma): array
    {
        if ($firma !== 'ok') {
            throw new UnexpectedValueException('Firma inválida.');
        }

        return ['tipo' => 'checkout.session.completed', 'referencia' => $payload, 'payment_intent' => 'pi_'.$payload, 'pagado' => true];
    }
}
