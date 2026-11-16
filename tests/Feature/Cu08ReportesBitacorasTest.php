<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/** CU-08 Reportes y Estadísticas: reportes, bitácora de comandos, bitácora de accesos y visitas. */
class Cu08ReportesBitacorasTest extends TestCase
{
    use DatabaseTransactions;

    private const PERIODO = 'desde=2026-11-01&hasta=2026-11-30';

    public function test_los_reportes_responden_con_columnas_filas_y_totales(): void
    {
        foreach (['coberturas', 'recursos', 'notas'] as $reporte) {
            $this->como('director@canal11.test')
                ->getJson("/api/v1/reportes/$reporte?".self::PERIODO)
                ->assertOk()
                ->assertJsonStructure(['titulo', 'periodo', 'columnas' => [['clave', 'titulo', 'tipo']], 'filas', 'totales', 'nota']);
        }
    }

    public function test_el_jefe_tecnico_ve_el_reporte_de_mantenimiento_y_su_opcion_del_menu(): void
    {
        $this->como('area.tecnica@canal11.test')->getJson('/api/v1/reportes/mantenimiento?'.self::PERIODO)->assertOk();
        $this->como('area.tecnica@canal11.test')->getJson('/api/v1/reportes/coberturas?'.self::PERIODO)->assertForbidden();
        $this->como('area.tecnica@canal11.test')->getJson('/api/v1/auth/menu')->assertJsonFragment(['ruta' => '/reportes']);
    }

    public function test_sin_datos_lo_dice_y_rechaza_un_periodo_invalido(): void
    {
        $this->como('director@canal11.test')
            ->getJson('/api/v1/reportes/coberturas?desde=2020-01-01&hasta=2020-01-31')
            ->assertOk()
            ->assertJsonPath('nota', 'No hay datos para el período indicado.');

        $this->como('director@canal11.test')->getJson('/api/v1/reportes/coberturas?desde=2026-12-01&hasta=2026-11-01')->assertStatus(422);
    }

    public function test_la_bitacora_de_comandos_del_correo_es_solo_para_quien_tiene_bitacora_ver(): void
    {
        $this->como('director@canal11.test')->getJson('/api/v1/bitacora-comandos?desde=2026-11-01&hasta=2026-11-30&resultado=error')
            ->assertOk()
            ->assertJsonPath('data.0.resultado', 'error');
        $this->como('jefe.prensa@canal11.test')->getJson('/api/v1/bitacora-comandos')->assertForbidden();
    }

    public function test_la_bitacora_registra_y_muestra_los_intentos_fallidos_por_ip(): void
    {
        $this->postJson('/api/v1/auth/login', ['correo' => 'nadie@canal11.test', 'password' => 'x'])->assertStatus(422);
        $hoy = today()->toDateString();

        $this->como('admin@canal11.test')
            ->getJson("/api/v1/bitacora?desde=$hoy&hasta=$hoy&tipo=login_fallido")
            ->assertOk()
            ->assertJsonPath('data.0.correo_intentado', 'nadie@canal11.test');

        $this->como('admin@canal11.test')
            ->getJson("/api/v1/bitacora/intentos-fallidos?desde=$hoy&hasta=$hoy")
            ->assertOk()
            ->assertJsonStructure(['data' => [['ip', 'intentos', 'correos', 'ultimo']]]);

        // Los intentos fallidos por IP son solo del Administrador.
        $this->como('director@canal11.test')->getJson('/api/v1/bitacora/intentos-fallidos')->assertForbidden();
    }

    public function test_recursos_mas_accedidos_y_visitas_por_pagina(): void
    {
        $hoy = today()->toDateString();
        $this->postJson('/api/v1/visitas', ['pagina' => '/coberturas'])->assertOk();

        $this->como('director@canal11.test')
            ->getJson("/api/v1/bitacora/recursos-top?desde=$hoy&hasta=$hoy")
            ->assertOk()
            ->assertJsonStructure(['data' => [['recurso', 'accesos', 'usuarios', 'rechazos']]]);

        $this->como('director@canal11.test')->getJson('/api/v1/visitas')->assertOk()->assertJsonFragment(['pagina' => '/coberturas']);
    }
}
