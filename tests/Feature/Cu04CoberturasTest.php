<?php

namespace Tests\Feature;

use App\Models\Cobertura;
use App\Models\Personal;
use App\Models\Recurso;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * CU-04 Planificar Coberturas, Validar Conflictos de Operación y Liberar Recursos.
 * Las coberturas de prueba van 40 días adelante para no chocar con los datos del Proyecto 1.
 */
class Cu04CoberturasTest extends TestCase
{
    use DatabaseTransactions;

    private const JEFE = 'jefe.prensa@canal11.test';

    public function test_planifica_una_cobertura_y_aparece_en_la_agenda(): void
    {
        $id = $this->planificar()->json('data.id');
        $dia = $this->dia()->toDateString();

        $this->como('carla.rojas@canal11.test')
            ->getJson("/api/v1/coberturas?fecha=$dia&vista=semana")
            ->assertOk()
            ->assertJsonFragment(['id' => $id, 'estado' => 'planificada']);
    }

    public function test_valida_que_termine_despues_de_empezar(): void
    {
        $this->como(self::JEFE)
            ->postJson('/api/v1/coberturas', $this->datos(['fin' => $this->hora(9)]))
            ->assertStatus(422)
            ->assertJsonPath('errors.fin.0', 'La cobertura debe terminar después de empezar.');
    }

    public function test_un_periodista_ve_la_agenda_pero_no_planifica(): void
    {
        $this->como('carla.rojas@canal11.test')->postJson('/api/v1/coberturas', $this->datos())->assertForbidden();
    }

    public function test_asigna_personal_y_rechaza_el_choque_de_horario(): void
    {
        $persona = $this->camarografo();
        $a = $this->planificar()->json('data.id');
        $b = $this->planificar(['titulo' => 'Otra', 'inicio' => $this->hora(11), 'fin' => $this->hora(13)])->json('data.id');

        $this->como(self::JEFE)
            ->postJson("/api/v1/coberturas/$a/personal", ['personal_id' => $persona->id, 'funcion' => 'camarografo'])
            ->assertCreated();

        $this->como(self::JEFE)
            ->postJson("/api/v1/coberturas/$b/personal", ['personal_id' => $persona->id, 'funcion' => 'camarografo'])
            ->assertStatus(409)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'ya tiene asignada la cobertura'));
    }

    public function test_la_funcion_debe_corresponder_al_cargo(): void
    {
        $a = $this->planificar()->json('data.id');

        $this->como(self::JEFE)
            ->postJson("/api/v1/coberturas/$a/personal", ['personal_id' => $this->camarografo()->id, 'funcion' => 'periodista'])
            ->assertStatus(409)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'no puede ir como periodista'));
    }

    public function test_una_ausencia_impide_la_asignacion(): void
    {
        $persona = $this->camarografo();
        DB::table('ausencia')->insert([
            'personal_id' => $persona->id, 'tipo' => 'vacacion',
            'fecha_hora_inicio' => $this->dia()->startOfDay(), 'fecha_hora_fin' => $this->dia()->addDay()->startOfDay(),
        ]);
        $a = $this->planificar()->json('data.id');

        $this->como(self::JEFE)
            ->postJson("/api/v1/coberturas/$a/personal", ['personal_id' => $persona->id, 'funcion' => 'camarografo'])
            ->assertStatus(409)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'tiene vacacion en ese horario'));
    }

    public function test_reserva_recursos_y_rechaza_uno_ocupado_o_en_mantenimiento(): void
    {
        $recurso = Recurso::where('estado', 'operativo')->first();
        $a = $this->planificar()->json('data.id');
        $b = $this->planificar(['inicio' => $this->hora(11), 'fin' => $this->hora(12)])->json('data.id');

        $this->como(self::JEFE)->postJson("/api/v1/coberturas/$a/recursos", ['recurso_id' => $recurso->id])->assertCreated();
        $this->como(self::JEFE)->postJson("/api/v1/coberturas/$b/recursos", ['recurso_id' => $recurso->id])->assertStatus(409);

        $roto = Recurso::where('estado', 'mantenimiento')->firstOrFail();
        $this->como(self::JEFE)
            ->postJson("/api/v1/coberturas/$b/recursos", ['recurso_id' => $roto->id])
            ->assertStatus(409)
            ->assertJsonPath('message', "{$roto->codigo} está en mantenimiento.");
    }

    public function test_al_reprogramar_vuelve_a_validar_al_equipo(): void
    {
        $persona = $this->camarografo();
        $a = $this->planificar()->json('data.id');
        $b = $this->planificar(['inicio' => $this->hora(14), 'fin' => $this->hora(16)])->json('data.id');
        $this->como(self::JEFE)->postJson("/api/v1/coberturas/$a/personal", ['personal_id' => $persona->id, 'funcion' => 'camarografo'])->assertCreated();
        $this->como(self::JEFE)->postJson("/api/v1/coberturas/$b/personal", ['personal_id' => $persona->id, 'funcion' => 'camarografo'])->assertCreated();

        // Mover la cobertura b encima de la a: choca y no se guarda.
        $this->como(self::JEFE)
            ->putJson("/api/v1/coberturas/$b", $this->datos(['inicio' => $this->hora(10), 'fin' => $this->hora(11)]))
            ->assertStatus(409);
        $this->assertSame('14:00', Cobertura::find($b)->fecha_hora_inicio->format('H:i'));
    }

    public function test_duplica_una_cobertura_semanal(): void
    {
        $a = $this->planificar()->json('data.id');

        $this->como(self::JEFE)
            ->postJson("/api/v1/coberturas/$a/duplicar", ['frecuencia' => 'semanal', 'hasta' => $this->dia()->addDays(21)->toDateString()])
            ->assertCreated()
            ->assertJsonCount(3, 'data.ids');

        $this->assertSame(3, Cobertura::where('cobertura_origen_id', $a)->count());
    }

    public function test_el_retorno_libera_al_personal_y_cierra_las_entregas(): void
    {
        $persona = $this->camarografo();
        $c = $this->planificar(['inicio' => now()->subHours(3)->format('Y-m-d\TH:i'), 'fin' => now()->subHour()->format('Y-m-d\TH:i')])->json('data.id');
        DB::table('cobertura_personal')->insert(['cobertura_id' => $c, 'personal_id' => $persona->id, 'funcion' => 'camarografo']);
        $recurso = Recurso::where('estado', 'operativo')->whereNotIn('id', DB::table('prestamo')->whereNull('fecha_devolucion')->pluck('recurso_id'))->first();
        DB::table('prestamo')->insert(['recurso_id' => $recurso->id, 'responsable_id' => $persona->id, 'cobertura_id' => $c, 'fecha_entrega' => now()->subHours(4)]);

        $this->como(self::JEFE)
            ->postJson("/api/v1/coberturas/$c/retorno", ['estado' => 'cumplida', 'fecha_retorno' => now()->format('Y-m-d\TH:i')])
            ->assertStatus(422)
            ->assertJsonPath('errors.parte.0', 'Describa el resultado de la cobertura cumplida.');

        $this->como(self::JEFE)
            ->postJson("/api/v1/coberturas/$c/retorno", ['estado' => 'cumplida', 'parte' => 'Nota grabada.', 'fecha_retorno' => now()->format('Y-m-d\TH:i')])
            ->assertOk()
            ->assertJsonPath('data.estado', 'cumplida');

        $this->assertSame(0, DB::table('prestamo')->where('cobertura_id', $c)->whereNull('fecha_devolucion')->count());
        $this->assertSame(0, DB::table('v_ocupacion_personal')->where('cobertura_id', $c)->count());
    }

    public function test_cancela_una_cobertura_y_ya_no_se_modifica(): void
    {
        $a = $this->planificar()->json('data.id');

        $this->como(self::JEFE)->deleteJson("/api/v1/coberturas/$a")->assertOk()->assertJsonPath('data.estado', 'cancelada');
        $this->como(self::JEFE)->putJson("/api/v1/coberturas/$a", $this->datos())->assertStatus(409);
    }

    public function test_la_hoja_de_asignacion_trae_el_equipo(): void
    {
        $a = $this->planificar()->json('data.id');

        $this->como('jorge.mendoza@canal11.test')
            ->getJson("/api/v1/coberturas/$a/hoja")
            ->assertOk()
            ->assertJsonStructure(['data' => ['titulo', 'lugar'], 'equipo', 'recursos']);
    }

    // ── Ayudas ────────────────────────────────────────────────────────────

    private function dia(): Carbon
    {
        return today()->addDays(40);
    }

    private function hora(int $h): string
    {
        return $this->dia()->setTime($h, 0)->format('Y-m-d\TH:i');
    }

    private function datos(array $cambios = []): array
    {
        return [
            'titulo' => 'Conferencia del Rector', 'tema' => 'Presupuesto', 'tipo' => 'conferencia',
            'inicio' => $this->hora(10), 'fin' => $this->hora(12), 'lugar' => 'Rectorado UAGRM',
            'prioridad' => 'alta', 'fuente' => 'Relaciones públicas', 'indicaciones' => null, ...$cambios,
        ];
    }

    private function planificar(array $cambios = [])
    {
        return $this->como(self::JEFE)->postJson('/api/v1/coberturas', $this->datos($cambios))->assertCreated();
    }

    private function camarografo(): Personal
    {
        return Personal::where('cargo', 'camarografo')->where('estado', 'activo')->firstOrFail();
    }
}
