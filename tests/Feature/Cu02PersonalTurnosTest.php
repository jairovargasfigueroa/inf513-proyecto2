<?php

namespace Tests\Feature;

use App\Models\Personal;
use App\Models\Rol;
use App\Models\Turno;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** CU-02 Gestión de Personal de Prensa, Turnos y Disponibilidad. */
class Cu02PersonalTurnosTest extends TestCase
{
    use DatabaseTransactions;

    private const JEFE = 'jefe.prensa@canal11.test';

    public function test_lista_el_personal_con_su_turno(): void
    {
        $this->como(self::JEFE)
            ->getJson('/api/v1/personal?cargo=camarografo')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'nombre_completo', 'cargo', 'turno', 'estado']], 'meta'])
            ->assertJsonPath('data.0.cargo', 'camarografo');
    }

    public function test_un_periodista_no_gestiona_personal(): void
    {
        $this->como('carla.rojas@canal11.test')->getJson('/api/v1/personal')->assertForbidden();
    }

    public function test_registra_la_ficha_de_un_usuario_sin_ficha(): void
    {
        $usuario = $this->usuarioSinFicha();

        $this->como(self::JEFE)
            ->getJson('/api/v1/usuarios?sin_ficha=1')
            ->assertOk()
            ->assertJsonFragment(['correo' => $usuario->correo]);

        $this->como(self::JEFE)
            ->postJson('/api/v1/personal', $this->ficha($usuario->id))
            ->assertCreated()
            ->assertJsonPath('data.nombre_completo', $usuario->nombre_completo);

        $this->como(self::JEFE)
            ->postJson('/api/v1/personal', $this->ficha($usuario->id))
            ->assertStatus(422)
            ->assertJsonPath('errors.usuario_id.0', 'El usuario ya tiene una ficha de personal.');
    }

    public function test_la_unidad_academica_es_solo_para_practicantes(): void
    {
        $id = $this->usuarioSinFicha()->id;

        $this->como(self::JEFE)
            ->postJson('/api/v1/personal', [...$this->ficha($id), 'unidad_academica' => 'FHCE'])
            ->assertStatus(422)
            ->assertJsonPath('errors.unidad_academica.0', 'La unidad académica solo se registra para los practicantes.');

        $this->como(self::JEFE)
            ->postJson('/api/v1/personal', [...$this->ficha($id), 'condicion_laboral' => 'practicante'])
            ->assertStatus(422)
            ->assertJsonPath('errors.unidad_academica.0', 'La unidad académica es obligatoria para los practicantes.');
    }

    public function test_desactivar_una_ficha_avisa_las_coberturas_que_hay_que_reasignar(): void
    {
        $personal = Personal::first();
        $cobertura = $this->coberturaFutura();
        DB::table('cobertura_personal')->insert(['cobertura_id' => $cobertura, 'personal_id' => $personal->id, 'funcion' => 'periodista']);

        $avisos = $this->como(self::JEFE)
            ->deleteJson("/api/v1/personal/{$personal->id}")
            ->assertOk()
            ->assertJsonPath('data.estado', 'inactivo')
            ->json('avisos');
        $this->assertTrue(collect($avisos)->contains(fn ($a) => str_contains($a, 'Cobertura de prueba')));

        $this->como(self::JEFE)->deleteJson("/api/v1/personal/{$personal->id}")->assertStatus(409);
    }

    public function test_registra_un_turno_nocturno(): void
    {
        $this->como(self::JEFE)
            ->postJson('/api/v1/turnos', ['nombre' => 'Madrugada', 'hora_inicio' => '22:00', 'hora_fin' => '06:00', 'dias' => '1,2,3'])
            ->assertCreated();

        $this->como(self::JEFE)
            ->postJson('/api/v1/turnos', ['nombre' => 'Madrugada', 'hora_inicio' => '08:00', 'hora_fin' => '08:00', 'dias' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nombre', 'hora_fin', 'dias']);
    }

    public function test_la_ausencia_exige_un_rango_valido(): void
    {
        $this->como(self::JEFE)
            ->postJson('/api/v1/ausencias', [
                'personal_id' => Personal::first()->id, 'tipo' => 'permiso',
                'inicio' => '2026-12-10T10:00', 'fin' => '2026-12-10T09:00',
            ])
            ->assertStatus(422)
            ->assertJsonPath('errors.fin.0', 'El fin de la ausencia debe ser posterior a su inicio.');
    }

    public function test_una_ausencia_saca_a_la_persona_de_la_disponibilidad(): void
    {
        $personal = Personal::where('estado', 'activo')->where('cargo', 'camarografo')->first();
        $turno = Turno::find($personal->turno_id);
        $fecha = $this->proximoDiaDelTurno($turno);
        $hora = substr($turno->hora_inicio, 0, 5);
        $momento = "$fecha $hora";

        $disponibles = fn () => collect($this->como(self::JEFE)
            ->getJson("/api/v1/personal/disponibilidad?fecha=$fecha&hora=$hora&cargo=camarografo")
            ->assertOk()->json('data'))->pluck('id');

        $this->assertContains($personal->id, $disponibles());

        $this->como(self::JEFE)->postJson('/api/v1/ausencias', [
            'personal_id' => $personal->id, 'tipo' => 'baja_medica',
            'inicio' => str_replace(' ', 'T', date('Y-m-d H:i', strtotime("$momento -1 hour"))),
            'fin' => str_replace(' ', 'T', date('Y-m-d H:i', strtotime("$momento +2 hours"))),
        ])->assertCreated();

        $this->assertNotContains($personal->id, $disponibles());
    }

    // ── Ayudas ────────────────────────────────────────────────────────────

    private function usuarioSinFicha(): Usuario
    {
        return Usuario::create([
            'nombre' => 'Lucía', 'apellido' => 'Méndez', 'ci' => '9100001', 'correo' => 'lucia.mendez@canal11.test',
            'password' => 'secreta1', 'rol_id' => Rol::where('nombre', 'Periodista')->value('id'),
        ]);
    }

    private function ficha(int $usuarioId): array
    {
        return [
            'usuario_id' => $usuarioId, 'cargo' => 'periodista', 'condicion_laboral' => 'contrato',
            'turno_id' => Turno::value('id'), 'fecha_ingreso' => '2026-01-15',
        ];
    }

    private function coberturaFutura(): int
    {
        return DB::table('cobertura')->insertGetId([
            'titulo' => 'Cobertura de prueba', 'tipo' => 'conferencia', 'lugar' => 'Rectorado',
            'fecha_hora_inicio' => now()->addDays(3)->setTime(10, 0), 'fecha_hora_fin' => now()->addDays(3)->setTime(12, 0),
            'creado_por' => Usuario::where('correo', self::JEFE)->value('id'),
        ]);
    }

    private function proximoDiaDelTurno(Turno $turno): string
    {
        $dias = explode(',', $turno->dias);
        $fecha = now()->addDays(30); // lejos de los datos de prueba
        while (! in_array((string) $fecha->isoWeekday(), $dias, true)) {
            $fecha->addDay();
        }

        return $fecha->toDateString();
    }
}
