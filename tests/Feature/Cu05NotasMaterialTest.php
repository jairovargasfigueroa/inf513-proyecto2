<?php

namespace Tests\Feature;

use App\Models\Nota;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** CU-05 Redactar Notas (NRCS), Gestionar Material Audiovisual y Flujo de Aprobación. */
class Cu05NotasMaterialTest extends TestCase
{
    use DatabaseTransactions;

    private const CARLA = 'carla.rojas@canal11.test';      // periodista, autora de notas

    private const JEFE = 'jefe.prensa@canal11.test';

    private const EDITORA = 'patricia.saucedo@canal11.test';

    public function test_redacta_una_nota_cuenta_las_palabras_y_guarda_la_version_1(): void
    {
        $id = $this->redactar()->assertJsonPath('data.palabras', 6)->assertJsonPath('data.slug', 'FERIA-LIBRO')->json('data.id');

        $this->assertDatabaseHas('nota_version', ['nota_id' => $id, 'numero' => 1, 'palabras' => 6]);
    }

    public function test_el_slug_no_se_repite_en_la_misma_fecha(): void
    {
        $this->redactar();

        $this->como(self::CARLA)
            ->postJson('/api/v1/notas', $this->datos())
            ->assertStatus(422)
            ->assertJsonPath('errors.slug.0', 'Ya existe una nota con ese slug para esa fecha.');
    }

    public function test_un_usuario_sin_ficha_no_redacta(): void
    {
        $this->como('admin@canal11.test')->postJson('/api/v1/notas', $this->datos())->assertForbidden();
    }

    public function test_flujo_borrador_revision_observada_y_aprobada(): void
    {
        $id = $this->redactar()->json('data.id');

        $this->como(self::JEFE)->postJson("/api/v1/notas/$id/aprobar")->assertStatus(422); // todavía en borrador

        $this->como(self::CARLA)->postJson("/api/v1/notas/$id/enviar")->assertOk()->assertJsonPath('data.estado', 'en_revision');

        $this->como(self::JEFE)->postJson("/api/v1/notas/$id/observar", [])->assertStatus(422)->assertJsonValidationErrors('motivo');
        $this->como(self::JEFE)->postJson("/api/v1/notas/$id/observar", ['motivo' => 'Falta la cifra oficial.'])->assertOk()->assertJsonPath('data.estado', 'observada');

        $this->como(self::CARLA)->postJson("/api/v1/notas/$id/enviar")->assertOk();
        $this->como(self::JEFE)->postJson("/api/v1/notas/$id/aprobar")->assertOk()->assertJsonPath('data.estado', 'aprobada');

        $this->assertSame(4, DB::table('revision_nota')->where('nota_id', $id)->count());
    }

    public function test_cambiar_el_guion_de_una_nota_aprobada_la_vuelve_a_revision(): void
    {
        $id = $this->redactar()->json('data.id');
        Nota::where('id', $id)->update(['estado' => 'aprobada']);

        $this->como(self::CARLA)
            ->putJson("/api/v1/notas/$id/guion", ['guion' => 'Texto corregido con la cifra oficial del municipio.'])
            ->assertOk()
            ->assertJsonPath('data.estado', 'en_revision')
            ->assertJsonPath('data.palabras', 8);

        $this->como(self::CARLA)->getJson("/api/v1/notas/$id/versiones")->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_solo_el_autor_o_el_jefe_modifican_la_nota(): void
    {
        $id = $this->redactar()->json('data.id');

        $this->como('daniela.vaca@canal11.test')
            ->putJson("/api/v1/notas/$id/guion", ['guion' => 'Otro texto'])
            ->assertStatus(409)
            ->assertJsonPath('message', 'Solo el autor o el Jefe de Prensa pueden modificar esta nota.');

        $this->como(self::JEFE)->putJson("/api/v1/notas/$id/guion", ['guion' => 'Corrección del jefe'])->assertOk();
    }

    public function test_registra_los_rotulos_y_rechaza_posiciones_repetidas(): void
    {
        $id = $this->redactar()->json('data.id');

        $this->como(self::CARLA)
            ->putJson("/api/v1/notas/$id/rotulos", ['rotulos' => [['orden' => 1, 'nombre' => 'Ana Pérez', 'cargo' => 'Directora'], ['orden' => 1, 'nombre' => 'Luis Rojas']]])
            ->assertStatus(422);

        $this->como(self::CARLA)
            ->putJson("/api/v1/notas/$id/rotulos", ['rotulos' => [['orden' => 1, 'nombre' => 'Ana Pérez', 'cargo' => 'Directora'], ['orden' => 2, 'nombre' => 'Luis Rojas']]])
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_material_lo_registra_el_periodista_y_lo_actualiza_el_editor(): void
    {
        $id = $this->redactar(['tipo_pieza' => 'nota_completa'])->json('data.id');
        $material = ['descripcion' => 'Entrevista al organizador', 'tipo' => 'video', 'duracion' => 90, 'ubicacion' => null, 'estado' => 'pendiente'];

        $mid = $this->como(self::CARLA)->postJson("/api/v1/notas/$id/material", $material)->assertCreated()->json('data.id');
        $this->como(self::CARLA)->putJson("/api/v1/material/$mid", [...$material, 'estado' => 'listo'])->assertForbidden();
        $this->como(self::EDITORA)->putJson("/api/v1/material/$mid", [...$material, 'estado' => 'listo'])->assertOk();

        // R25: la duración suma la lectura y el video.
        $this->como(self::CARLA)->getJson("/api/v1/notas/$id")->assertJsonPath('data.duracion.video', 90);
    }

    public function test_no_da_de_baja_una_nota_que_esta_en_una_escaleta(): void
    {
        $enEscaleta = DB::table('item_escaleta')->whereNotNull('nota_id')->whereIn('estado', ['programado', 'flotado'])->value('nota_id');
        $nota = Nota::findOrFail($enEscaleta);

        if (in_array($nota->estado, Nota::EDITABLES, true)) {
            $this->como(self::JEFE)->deleteJson("/api/v1/notas/{$nota->id}")->assertStatus(409);
        } else {
            $this->como(self::JEFE)->deleteJson("/api/v1/notas/{$nota->id}")->assertStatus(409)->assertJsonPath('message', "La nota está {$nota->estado}: ya no se modifica.");
        }
    }

    private function datos(array $cambios = []): array
    {
        return [
            'slug' => 'feria-libro', 'titulo' => 'Feria del libro en la UAGRM', 'tipo_pieza' => 'lectura',
            'fecha' => today()->addDays(40)->toDateString(), 'cobertura_id' => null,
            'guion' => 'La feria del libro abre hoy.', ...$cambios,
        ];
    }

    private function redactar(array $cambios = [])
    {
        return $this->como(self::CARLA)->postJson('/api/v1/notas', $this->datos($cambios))->assertCreated();
    }
}
