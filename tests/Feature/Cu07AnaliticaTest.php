<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/** CU-07 Gestión de Analítica Periodística y Panel Analítico (consigna, punto 8). */
class Cu07AnaliticaTest extends TestCase
{
    use DatabaseTransactions;

    public function test_el_panel_trae_indicadores_y_series_del_negocio_y_los_accesos(): void
    {
        $this->como('director@canal11.test')
            ->getJson('/api/v1/dashboard?desde=2026-11-01&hasta=2026-11-30')
            ->assertOk()
            ->assertJsonPath('periodo.desde', '2026-11-01')
            ->assertJsonStructure([
                'indicadores' => ['coberturas', 'cumplimiento', 'notas', 'recursos_operativos', 'peticiones', 'logins_fallidos', 'visitas'],
                'coberturas_por_tipo', 'notas_por_estado', 'logins_por_dia' => [['dia', 'exitosos', 'fallidos']], 'paginas_top',
            ])
            ->assertJsonCount(30, 'logins_por_dia');
    }

    public function test_rechaza_un_periodo_invalido(): void
    {
        $this->como('director@canal11.test')
            ->getJson('/api/v1/dashboard?desde=2026-11-30&hasta=2026-11-01')
            ->assertStatus(422)
            ->assertJsonPath('errors.hasta.0', 'Período inválido: la fecha final es anterior a la inicial.');

        $this->como('director@canal11.test')
            ->getJson('/api/v1/dashboard?desde=2024-01-01&hasta=2026-01-01')
            ->assertStatus(422)
            ->assertJsonPath('errors.hasta.0', 'Pida un período de hasta un año.');
    }

    public function test_la_analitica_da_produccion_y_cumplimiento(): void
    {
        $this->como('jefe.prensa@canal11.test')
            ->getJson('/api/v1/analitica/produccion?desde=2026-11-01&hasta=2026-11-30')
            ->assertOk()
            ->assertJsonStructure(['data' => [['autor', 'notas', 'aprobadas', 'a_la_primera', 'minutos_aprobacion']]]);

        $this->como('jefe.prensa@canal11.test')
            ->getJson('/api/v1/analitica/coberturas?desde=2026-11-01&hasta=2026-11-30')
            ->assertOk()
            ->assertJsonStructure(['data' => [['tipo', 'coberturas', 'cumplidas', 'cumplimiento']]]);
    }

    public function test_el_administrador_ve_el_panel_pero_no_la_analitica_y_el_periodista_ninguno(): void
    {
        $this->como('admin@canal11.test')->getJson('/api/v1/dashboard')->assertOk();
        $this->como('admin@canal11.test')->getJson('/api/v1/analitica/produccion')->assertForbidden();
        $this->como('carla.rojas@canal11.test')->getJson('/api/v1/dashboard')->assertForbidden();
    }
}
