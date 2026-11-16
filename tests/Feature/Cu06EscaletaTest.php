<?php

namespace Tests\Feature;

use App\Models\Personal;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** CU-06 Configurar Plantillas y Confeccionar Escaleta del Noticiero con Control de Tiempos. */
class Cu06EscaletaTest extends TestCase
{
    use DatabaseTransactions;

    private const JEFE = 'jefe.prensa@canal11.test';

    public function test_la_grilla_semanal_es_publica_y_un_horario_no_choca(): void
    {
        $this->getJson('/api/v1/grilla?vista=semana')->assertOk()->assertJsonStructure(['data' => [['dia', 'programa', 'hora_inicio']]]);

        $central = DB::table('v_grilla_semanal')->where('programa', 'Noticiero Central')->first();
        $this->como(self::JEFE)
            ->postJson('/api/v1/grilla', [
                'programa_id' => $central->programa_id, 'dia_semana' => $central->dia_semana,
                'hora_inicio' => substr($central->hora_inicio, 0, 5), 'hora_fin' => '23:59', 'vigente_desde' => today()->toDateString(),
            ])
            ->assertStatus(409)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'choca con'));
    }

    public function test_un_horario_no_cruza_la_medianoche(): void
    {
        $this->como(self::JEFE)
            ->postJson('/api/v1/grilla', ['programa_id' => 1, 'dia_semana' => 7, 'hora_inicio' => '23:00', 'hora_fin' => '01:00', 'vigente_desde' => today()->toDateString()])
            ->assertStatus(422)
            ->assertJsonValidationErrors('hora_fin');
    }

    public function test_crea_una_plantilla_y_sus_cortes_con_el_tiempo_neto(): void
    {
        $id = $this->como(self::JEFE)
            ->postJson('/api/v1/plantillas', ['programa_id' => 3, 'nombre' => 'Especial de prueba', 'duracion_total' => 1800, 'cantidad_bloques' => 2, 'palabras_por_minuto' => 150])
            ->assertCreated()
            ->assertJsonPath('data.control', 'debe tener 1 cortes')
            ->json('data.id');

        $this->como(self::JEFE)->postJson("/api/v1/plantillas/$id/cortes", ['numero' => 2, 'minuto_inicio' => 10, 'duracion' => 120])->assertStatus(422);
        $this->como(self::JEFE)->postJson("/api/v1/plantillas/$id/cortes", ['numero' => 1, 'minuto_inicio' => 29, 'duracion' => 120])->assertStatus(409);

        $this->como(self::JEFE)
            ->postJson("/api/v1/plantillas/$id/cortes", ['numero' => 1, 'minuto_inicio' => 14, 'duracion' => 120])
            ->assertCreated()
            ->assertJsonPath('data.control', 'ok')
            ->assertJsonPath('data.tiempo_neto', 1680);
    }

    public function test_no_cambia_una_plantilla_con_escaletas_en_borrador(): void
    {
        $plantilla = DB::table('escaleta')->where('estado', 'borrador')->value('plantilla_id');
        $p = DB::table('plantilla')->find($plantilla);

        $this->como(self::JEFE)
            ->putJson("/api/v1/plantillas/$plantilla", [...(array) $p, 'duracion_total' => $p->duracion_total + 60])
            ->assertStatus(409)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'escaletas en borrador'));
    }

    public function test_genera_la_escaleta_con_sus_cortes_y_no_la_repite(): void
    {
        [$grilla, $fecha] = $this->horarioLibre();

        $id = $this->como(self::JEFE)->postJson('/api/v1/escaletas', ['grilla_id' => $grilla, 'plantilla_id' => 1, 'fecha' => $fecha])->assertCreated()->json('data.id');

        $this->assertSame(3, DB::table('item_escaleta')->where(['escaleta_id' => $id, 'tipo' => 'corte'])->count());
        $this->como(self::JEFE)->postJson('/api/v1/escaletas', ['grilla_id' => $grilla, 'plantilla_id' => 1, 'fecha' => $fecha])->assertStatus(409);
        $this->como(self::JEFE)->postJson('/api/v1/escaletas', ['grilla_id' => $grilla, 'plantilla_id' => 2, 'fecha' => $fecha])->assertStatus(409); // otro programa
    }

    public function test_solo_entran_notas_aprobadas_y_no_se_repiten(): void
    {
        $e = $this->escaletaNueva();
        $borrador = $this->nota('borrador');
        $aprobada = $this->nota('aprobada');

        $this->como(self::JEFE)->postJson("/api/v1/escaletas/$e/items", ['bloque' => 'A', 'tipo' => 'nota', 'nota_id' => $borrador])->assertStatus(409);
        $this->como(self::JEFE)->postJson("/api/v1/escaletas/$e/items", ['bloque' => 'A', 'tipo' => 'nota', 'nota_id' => $aprobada])->assertCreated()->assertJsonStructure(['balance' => [['bloque', 'tiempo_usado', 'alerta']]]);
        $this->como(self::JEFE)->postJson("/api/v1/escaletas/$e/items", ['bloque' => 'B', 'tipo' => 'nota', 'nota_id' => $aprobada])->assertStatus(409);
    }

    public function test_reordena_flota_y_da_de_baja_items(): void
    {
        $e = $this->escaletaNueva();
        $a = $this->agregar($e, 'Apertura', 30);
        $b = $this->agregar($e, 'Titulares', 60);
        $c = $this->agregar($e, 'Despedida', 20);

        // Mover la despedida a la posición 1.
        $this->como(self::JEFE)->putJson("/api/v1/items/$c", ['bloque' => 'A', 'orden' => 1, 'tipo' => 'despedida', 'titulo' => 'Despedida', 'duracion_estimada' => 20])->assertOk();
        $this->assertSame([$c, $a, $b], DB::table('item_escaleta')->where('escaleta_id', $e)->where('bloque', 'A')->where('tipo', '<>', 'corte')->orderBy('orden')->pluck('id')->all());

        $usado = fn () => DB::table('v_bloque_balance')->where(['escaleta_id' => $e, 'bloque' => 'A'])->value('tiempo_usado');
        $this->assertSame(110, $usado());

        $this->como(self::JEFE)->postJson("/api/v1/items/$b/flotar")->assertOk();
        $this->assertSame(50, $usado()); // flotado no suma

        $this->como(self::JEFE)->deleteJson("/api/v1/items/$a")->assertOk();
        $this->assertSame(20, $usado());

        $corte = DB::table('item_escaleta')->where(['escaleta_id' => $e, 'tipo' => 'corte'])->value('id');
        $this->como(self::JEFE)->deleteJson("/api/v1/items/$corte")->assertStatus(409);
    }

    public function test_cerrar_exige_la_lista_de_control_y_emitir_marca_las_notas(): void
    {
        $e = $this->escaletaNueva();
        $nota = $this->nota('aprobada');
        $this->como(self::JEFE)->postJson("/api/v1/escaletas/$e/items", ['bloque' => 'A', 'tipo' => 'nota', 'nota_id' => $nota])->assertCreated();

        // La nota vuelve a revisión: la lista de control lo detecta.
        DB::table('nota')->where('id', $nota)->update(['estado' => 'en_revision']);
        $this->como(self::JEFE)->putJson("/api/v1/escaletas/$e/estado", ['estado' => 'cerrada'])->assertStatus(422)->assertJsonStructure(['pendientes']);

        DB::table('nota')->where('id', $nota)->update(['estado' => 'aprobada']);
        $this->como(self::JEFE)->putJson("/api/v1/escaletas/$e/estado", ['estado' => 'cerrada'])->assertOk();
        $this->como(self::JEFE)->putJson("/api/v1/escaletas/$e/estado", ['estado' => 'emitida'])->assertStatus(422);
        $this->como(self::JEFE)->putJson("/api/v1/escaletas/$e/estado", ['estado' => 'emitida', 'hora_inicio_real' => '20:01', 'duracion_real' => 3590])->assertOk();

        $this->assertSame('emitida', DB::table('nota')->where('id', $nota)->value('estado'));
        $this->como(self::JEFE)->postJson("/api/v1/escaletas/$e/items", ['bloque' => 'A', 'tipo' => 'otro', 'titulo' => 'X'])->assertStatus(409);
    }

    public function test_el_presentador_lee_y_exporta_pero_no_arma(): void
    {
        $e = $this->escaletaNueva();
        $presentador = 'mariana.terceros@canal11.test';

        $this->como($presentador)->getJson("/api/v1/escaletas/$e/lectura")->assertOk()->assertJsonStructure(['data', 'items']);
        $this->como($presentador)->get("/api/v1/escaletas/$e/exportar")->assertOk()->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $this->como($presentador)->postJson("/api/v1/escaletas/$e/items", ['bloque' => 'A', 'tipo' => 'otro', 'titulo' => 'X'])->assertForbidden();
    }

    // ── Ayudas ────────────────────────────────────────────────────────────

    /** Un horario del Noticiero Central y una fecha futura sin escaleta. */
    private function horarioLibre(): array
    {
        $g = DB::table('grilla')->where('programa_id', 1)->where('estado', 'vigente')->first();
        $fecha = Carbon::today()->addDays(40);
        while ($fecha->isoWeekday() !== (int) $g->dia_semana) {
            $fecha->addDay();
        }

        return [$g->id, $fecha->toDateString()];
    }

    private function escaletaNueva(): int
    {
        [$grilla, $fecha] = $this->horarioLibre();

        return $this->como(self::JEFE)->postJson('/api/v1/escaletas', ['grilla_id' => $grilla, 'plantilla_id' => 1, 'fecha' => $fecha])->assertCreated()->json('data.id');
    }

    private function agregar(int $escaleta, string $titulo, int $segundos): int
    {
        return $this->como(self::JEFE)
            ->postJson("/api/v1/escaletas/$escaleta/items", ['bloque' => 'A', 'tipo' => 'otro', 'titulo' => $titulo, 'duracion_estimada' => $segundos])
            ->assertCreated()->json('data.id');
    }

    private function nota(string $estado): int
    {
        return DB::table('nota')->insertGetId([
            'slug' => 'PRUEBA-'.strtoupper(substr(md5(uniqid()), 0, 6)), 'titulo' => 'Nota de prueba', 'tipo_pieza' => 'lectura',
            'guion' => 'Texto de prueba', 'palabras' => 3, 'fecha' => today()->addDays(40), 'estado' => $estado,
            'autor_id' => Personal::value('id'),
        ]);
    }
}
