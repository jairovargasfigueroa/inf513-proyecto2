<?php

namespace Tests\Feature;

use App\Models\Personal;
use App\Models\Prestamo;
use App\Models\Recurso;
use App\Models\TipoRecurso;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/** CU-03 Inventario, Asignación y Mantenimiento de Equipos Técnicos y Unidades Móviles. */
class Cu03InventarioPrestamosTest extends TestCase
{
    use DatabaseTransactions;

    private const TECNICO = 'area.tecnica@canal11.test';

    private const CAMARA = 'jorge.mendoza@canal11.test';

    public function test_lista_el_inventario_y_filtra_por_estado(): void
    {
        $this->como(self::TECNICO)
            ->getJson('/api/v1/recursos?estado=operativo')
            ->assertOk()
            ->assertJsonPath('data.0.estado', 'operativo')
            ->assertJsonStructure(['data' => [['codigo', 'tipo', 'prestado']], 'meta']);
    }

    public function test_registra_un_recurso_con_codigo_en_mayusculas(): void
    {
        $this->como(self::TECNICO)
            ->postJson('/api/v1/recursos', $this->recurso(['codigo' => 'cam-09']))
            ->assertCreated()
            ->assertJsonPath('data.codigo', 'CAM-09')
            ->assertJsonPath('data.estado', 'operativo');
    }

    public function test_solo_las_unidades_moviles_llevan_placa(): void
    {
        $this->como(self::TECNICO)
            ->postJson('/api/v1/recursos', $this->recurso(['placa' => '1234-ABC']))
            ->assertStatus(422)
            ->assertJsonPath('errors.placa.0', 'Solo las unidades móviles llevan placa.');

        $movil = TipoRecurso::where('es_unidad_movil', true)->value('id');
        $this->como(self::TECNICO)
            ->postJson('/api/v1/recursos', $this->recurso(['codigo' => 'MOV-09', 'tipo_recurso_id' => $movil, 'placa' => '9999-xyz']))
            ->assertCreated()
            ->assertJsonPath('data.placa', '9999-XYZ');
    }

    public function test_un_camarografo_reporta_una_incidencia_pero_no_registra_recursos(): void
    {
        $recurso = Recurso::where('estado', 'operativo')->first();

        $this->como(self::CAMARA)->postJson('/api/v1/recursos', $this->recurso())->assertForbidden();

        $this->como(self::CAMARA)
            ->postJson("/api/v1/recursos/{$recurso->id}/incidencias", ['descripcion' => 'El lente no enfoca.'])
            ->assertCreated()
            ->assertJsonPath('data.estado', 'mantenimiento');

        $this->assertDatabaseHas('mantenimiento', ['recurso_id' => $recurso->id, 'tipo' => 'incidencia']);
    }

    public function test_alta_de_un_recurso_reparado(): void
    {
        $recurso = Recurso::where('estado', 'operativo')->first();

        $this->como(self::TECNICO)->postJson("/api/v1/recursos/{$recurso->id}/alta")->assertStatus(409);

        $this->como(self::TECNICO)->postJson("/api/v1/recursos/{$recurso->id}/incidencias", ['descripcion' => 'Batería dañada.'])->assertCreated();
        $this->como(self::TECNICO)->postJson("/api/v1/recursos/{$recurso->id}/alta")->assertOk()->assertJsonPath('data.estado', 'operativo');
    }

    public function test_entrega_y_devolucion_de_un_recurso(): void
    {
        $recurso = $this->recursoLibre();
        $responsable = Personal::where('estado', 'activo')->value('id');

        $id = $this->como(self::TECNICO)
            ->postJson('/api/v1/prestamos', ['recurso_id' => $recurso->id, 'responsable_id' => $responsable])
            ->assertCreated()
            ->json('data.id');

        // R8: no tiene dos entregas abiertas.
        $this->como(self::TECNICO)
            ->postJson('/api/v1/prestamos', ['recurso_id' => $recurso->id, 'responsable_id' => $responsable])
            ->assertStatus(409);

        // No se da de baja mientras está entregado.
        $this->como(self::TECNICO)->deleteJson("/api/v1/recursos/{$recurso->id}")->assertStatus(409);

        $this->como(self::TECNICO)
            ->putJson("/api/v1/prestamos/$id/devolucion", ['fecha_devolucion' => now()->addDay()->format('Y-m-d\TH:i')])
            ->assertStatus(422)
            ->assertJsonPath('errors.fecha_devolucion.0', 'La devolución no puede ser una fecha futura.');

        $this->como(self::TECNICO)
            ->putJson("/api/v1/prestamos/$id/devolucion", ['fecha_devolucion' => now()->format('Y-m-d\TH:i'), 'observaciones' => 'Sin novedad'])
            ->assertOk();

        $this->como(self::TECNICO)->putJson("/api/v1/prestamos/$id/devolucion", ['fecha_devolucion' => now()->format('Y-m-d\TH:i')])->assertStatus(409);
    }

    public function test_no_entrega_un_recurso_en_mantenimiento(): void
    {
        $recurso = Recurso::where('estado', 'mantenimiento')->firstOrFail();

        $this->como(self::TECNICO)
            ->postJson('/api/v1/prestamos', ['recurso_id' => $recurso->id, 'responsable_id' => Personal::value('id')])
            ->assertStatus(409)
            ->assertJsonPath('message', "{$recurso->codigo} no está disponible: está en mantenimiento.");
    }

    public function test_el_jefe_de_prensa_ve_los_prestamos_pero_no_entrega(): void
    {
        $this->como('jefe.prensa@canal11.test')->getJson('/api/v1/prestamos?abiertos=1')->assertOk();
        $this->como('jefe.prensa@canal11.test')->postJson('/api/v1/prestamos', [])->assertForbidden();
    }

    private function recurso(array $cambios = []): array
    {
        return [
            'codigo' => 'CAM-99', 'tipo_recurso_id' => TipoRecurso::where('es_unidad_movil', false)->value('id'),
            'marca' => 'Sony', 'modelo' => 'FX6', 'placa' => null, 'caracteristicas' => '4K', ...$cambios,
        ];
    }

    private function recursoLibre(): Recurso
    {
        return Recurso::where('estado', 'operativo')
            ->whereNotIn('id', Prestamo::whereNull('fecha_devolucion')->pluck('recurso_id'))
            ->firstOrFail();
    }
}
