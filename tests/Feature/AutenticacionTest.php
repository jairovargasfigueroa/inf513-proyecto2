<?php

namespace Tests\Feature;

use App\Models\Usuario;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * Navegación general: FormularioLogin → AuthController (200 + token, 422, 429),
 * menú del rol, cierre de sesión y su registro en la bitácora.
 *
 * Usa la base local con los datos de prueba del Proyecto 1 y los seeders; cada
 * prueba se deshace al terminar (DatabaseTransactions).
 */
class AutenticacionTest extends TestCase
{
    use DatabaseTransactions;

    private const JEFE_PRENSA = 'jefe.prensa@canal11.test';

    private const CLAVE_PRUEBA = 'canal11';

    public function test_inicia_sesion_y_recibe_token_permisos_y_preferencias(): void
    {
        $this->postJson('/api/v1/auth/login', ['correo' => 'Jefe.Prensa@canal11.test', 'password' => self::CLAVE_PRUEBA])
            ->assertOk()
            ->assertJsonStructure(['token', 'usuario' => ['id', 'nombre_completo', 'rol' => ['nombre']], 'permisos', 'preferencias'])
            ->assertJsonPath('usuario.rol.nombre', 'Jefe de Prensa')
            ->assertJsonFragment(['coberturas.crear']);

        $this->assertDatabaseHas('bitacora_acceso', [
            'tipo_evento' => 'login_exitoso',
            'correo_intentado' => self::JEFE_PRENSA,
            'usuario_id' => Usuario::where('correo', self::JEFE_PRENSA)->value('id'),
        ]);
    }

    public function test_rechaza_datos_vacios_con_mensajes_en_espanol(): void
    {
        $this->postJson('/api/v1/auth/login', [])
            ->assertStatus(422)
            ->assertJsonPath('errors.correo.0', 'El campo correo es obligatorio.')
            ->assertJsonPath('errors.password.0', 'El campo contraseña es obligatorio.');
    }

    public function test_rechaza_credenciales_incorrectas_y_lo_registra_como_login_fallido(): void
    {
        $this->postJson('/api/v1/auth/login', ['correo' => self::JEFE_PRENSA, 'password' => 'incorrecta'])
            ->assertStatus(422)
            ->assertJsonPath('errors.correo.0', 'El correo o la contraseña no son correctos.');

        $this->assertDatabaseHas('bitacora_acceso', [
            'tipo_evento' => 'login_fallido',
            'correo_intentado' => self::JEFE_PRENSA,
            'usuario_id' => null,
            'codigo_estado' => 422,
        ]);
    }

    public function test_bloquea_el_inicio_de_sesion_tras_cinco_intentos_fallidos(): void
    {
        foreach (range(1, 5) as $intento) {
            $this->postJson('/api/v1/auth/login', ['correo' => self::JEFE_PRENSA, 'password' => 'mala'])->assertStatus(422);
        }

        // Aun con la contraseña correcta, queda bloqueado durante 60 segundos.
        $this->postJson('/api/v1/auth/login', ['correo' => self::JEFE_PRENSA, 'password' => self::CLAVE_PRUEBA])
            ->assertStatus(429)
            ->assertJsonStructure(['message', 'reintentar_en']);
    }

    public function test_un_usuario_desactivado_no_puede_iniciar_sesion(): void
    {
        Usuario::where('correo', self::JEFE_PRENSA)->update(['estado' => 'inactivo']);

        $this->postJson('/api/v1/auth/login', ['correo' => self::JEFE_PRENSA, 'password' => self::CLAVE_PRUEBA])
            ->assertStatus(422)
            ->assertJsonPath('errors.correo.0', 'Su cuenta está desactivada. Consulte con el administrador.');
    }

    public function test_sin_token_responde_401(): void
    {
        $this->getJson('/api/v1/auth/me')
            ->assertStatus(401)
            ->assertJsonPath('message', 'Debe iniciar sesión para continuar.');

        $this->assertDatabaseHas('bitacora_acceso', ['tipo_evento' => 'acceso_denegado', 'codigo_estado' => 401]);
    }

    public function test_el_menu_muestra_solo_las_opciones_del_rol(): void
    {
        $token = $this->tokenDe('carla.rojas@canal11.test'); // Periodista

        $rutas = collect($this->withToken($token)->getJson('/api/v1/auth/menu')->assertOk()->json('data'))
            ->flatMap(fn ($grupo) => collect($grupo['opciones'])->pluck('ruta'));

        $this->assertContains('/coberturas', $rutas);
        $this->assertContains('/notas', $rutas);
        $this->assertContains('/perfil', $rutas);
        $this->assertNotContains('/usuarios', $rutas);
        $this->assertNotContains('/seguridad/matriz', $rutas);
    }

    public function test_cierra_sesion_y_el_token_deja_de_servir(): void
    {
        $token = $this->tokenDe(self::JEFE_PRENSA);

        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertNoContent();
        $this->assertDatabaseHas('bitacora_acceso', ['tipo_evento' => 'logout']);

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    private function tokenDe(string $correo): string
    {
        return Usuario::where('correo', $correo)->firstOrFail()->createToken('prueba')->plainTextToken;
    }
}
