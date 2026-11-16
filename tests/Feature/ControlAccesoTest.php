<?php

namespace Tests\Feature;

use App\Models\Usuario;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * Matriz de accesos, preferencias, contador de visitas y búsqueda global.
 */
class ControlAccesoTest extends TestCase
{
    use DatabaseTransactions;

    public function test_sin_el_permiso_responde_403_y_queda_como_acceso_denegado(): void
    {
        $this->withToken($this->tokenDe('jefe.prensa@canal11.test'))
            ->getJson('/api/v1/visitas')
            ->assertForbidden()
            ->assertJsonPath('message', 'No tiene permiso para realizar esta acción.');

        $this->assertDatabaseHas('bitacora_acceso', [
            'tipo_evento' => 'acceso_denegado',
            'recurso' => '/api/v1/visitas',
            'codigo_estado' => 403,
        ]);
    }

    public function test_con_el_permiso_accede(): void
    {
        $this->withToken($this->tokenDe('admin@canal11.test'))
            ->getJson('/api/v1/visitas')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_un_usuario_desactivado_pierde_el_acceso_aunque_tenga_token(): void
    {
        $token = $this->tokenDe('jefe.prensa@canal11.test');
        Usuario::where('correo', 'jefe.prensa@canal11.test')->update(['estado' => 'inactivo']);

        $this->withToken($token)->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    public function test_guarda_las_preferencias_validas(): void
    {
        $preferencias = ['tema' => 'ninos', 'modo' => 'noche', 'tamano_fuente' => 120, 'alto_contraste' => true];

        $this->withToken($this->tokenDe('carla.rojas@canal11.test'))
            ->putJson('/api/v1/perfil/preferencias', $preferencias)
            ->assertOk()
            ->assertJsonPath('data', $preferencias);
    }

    public function test_rechaza_preferencias_fuera_de_rango(): void
    {
        $this->withToken($this->tokenDe('carla.rojas@canal11.test'))
            ->putJson('/api/v1/perfil/preferencias', ['tema' => 'otro', 'modo' => 'dia', 'tamano_fuente' => 200, 'alto_contraste' => false])
            ->assertStatus(422)
            ->assertJsonPath('errors.tema.0', 'El valor elegido en tema no es válido.')
            ->assertJsonPath('errors.tamano_fuente.0', 'El campo tamaño de letra debe estar entre 80 y 150.');
    }

    public function test_el_contador_suma_visitas_por_pagina(): void
    {
        $primera = $this->postJson('/api/v1/visitas', ['pagina' => '/coberturas/15'])->assertOk()->json('total');

        $this->postJson('/api/v1/visitas', ['pagina' => '/coberturas/99'])
            ->assertOk()
            ->assertJsonPath('pagina', '/coberturas/{id}')
            ->assertJsonPath('total', $primera + 1);
    }

    public function test_el_contador_rechaza_paginas_invalidas(): void
    {
        $this->postJson('/api/v1/visitas', ['pagina' => 'http://otro.sitio'])->assertStatus(422);
    }

    public function test_la_busqueda_solo_devuelve_lo_que_el_rol_puede_ver(): void
    {
        $tipos = fn ($respuesta) => collect($respuesta->json('data'))->pluck('tipo')->all();

        // Visitante: solo programas.
        $this->assertSame(['programas'], $tipos($this->getJson('/api/v1/busqueda?q=noticiero')->assertOk()));
        $this->assertSame([], $tipos($this->getJson('/api/v1/busqueda?q=CAM-01')->assertOk()));

        // Jefe de Área Técnica: ve recursos.
        $this->assertContains('recursos', $tipos(
            $this->withToken($this->tokenDe('area.tecnica@canal11.test'))->getJson('/api/v1/busqueda?q=CAM-01')->assertOk()
        ));
    }

    public function test_la_busqueda_exige_al_menos_dos_caracteres(): void
    {
        $this->getJson('/api/v1/busqueda?q=a')
            ->assertStatus(422)
            ->assertJsonPath('errors.q.0', 'El campo texto a buscar debe tener al menos 2 caracteres.');
    }

    private function tokenDe(string $correo): string
    {
        return Usuario::where('correo', $correo)->firstOrFail()->createToken('prueba')->plainTextToken;
    }
}
