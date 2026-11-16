<?php

namespace Tests\Feature;

use App\Models\Menu;
use App\Models\PermisoWeb;
use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * CU-01 Gestión de Usuarios: Gestión de Usuarios, Mi Perfil, Matriz de Accesos
 * y Menú Dinámico (diagrama «Navegación CU-01 Gestión de Usuarios»).
 */
class Cu01GestionUsuariosTest extends TestCase
{
    use DatabaseTransactions;

    private const CLAVE = 'canal11';

    // ── Gestión de Usuarios ───────────────────────────────────────────────

    public function test_el_director_lista_y_filtra_usuarios(): void
    {
        $this->como('director@canal11.test')
            ->getJson('/api/v1/usuarios?buscar=rojas')
            ->assertOk()
            ->assertJsonPath('data.0.correo', 'carla.rojas@canal11.test')
            ->assertJsonStructure(['data' => [['id', 'nombre_completo', 'rol' => ['nombre'], 'estado']], 'meta' => ['total', 'last_page']]);
    }

    public function test_un_periodista_no_puede_listar_usuarios(): void
    {
        $this->como('carla.rojas@canal11.test')->getJson('/api/v1/usuarios')->assertForbidden();
    }

    public function test_registra_un_usuario_y_la_contrasena_queda_cifrada(): void
    {
        $this->como('director@canal11.test')
            ->postJson('/api/v1/usuarios', $this->nuevo(['correo' => 'Nuevo.Periodista@Canal11.test']))
            ->assertCreated()
            ->assertJsonPath('data.correo', 'nuevo.periodista@canal11.test')
            ->assertJsonMissingPath('data.password');

        $guardado = Usuario::where('correo', 'nuevo.periodista@canal11.test')->first();
        $this->assertStringStartsWith('$2y$', $guardado->password);
        $this->assertDatabaseHas('preferencia_usuario', ['usuario_id' => $guardado->id]); // trigger
    }

    public function test_rechaza_correo_y_ci_repetidos_y_contrasena_corta(): void
    {
        $this->como('director@canal11.test')
            ->postJson('/api/v1/usuarios', $this->nuevo(['correo' => 'CARLA.ROJAS@canal11.test', 'ci' => '3100003', 'password' => '123']))
            ->assertStatus(422)
            ->assertJsonPath('errors.correo.0', 'El correo ya está registrado.')
            ->assertJsonPath('errors.ci.0', 'El valor de carnet de identidad ya está registrado.')
            ->assertJsonPath('errors.password.0', 'El campo contraseña debe tener al menos 6 caracteres.');
    }

    public function test_solo_un_administrador_crea_administradores(): void
    {
        $admin = Rol::where('nombre', Rol::ADMINISTRADOR)->value('id');

        $this->como('director@canal11.test')
            ->postJson('/api/v1/usuarios', $this->nuevo(['rol_id' => $admin]))
            ->assertStatus(409)
            ->assertJsonPath('message', 'Solo un Administrador puede gestionar cuentas con el rol Administrador.');

        $this->como('admin@canal11.test')->postJson('/api/v1/usuarios', $this->nuevo(['rol_id' => $admin]))->assertCreated();
    }

    public function test_nadie_se_desactiva_a_si_mismo(): void
    {
        $director = Usuario::where('correo', 'director@canal11.test')->first();

        $this->como('director@canal11.test')
            ->deleteJson("/api/v1/usuarios/{$director->id}")
            ->assertStatus(409);
    }

    public function test_siempre_queda_un_director_activo(): void
    {
        $director = Usuario::where('correo', 'director@canal11.test')->first();

        $this->como('admin@canal11.test')
            ->deleteJson("/api/v1/usuarios/{$director->id}")
            ->assertStatus(409)
            ->assertJsonPath('message', 'Debe quedar al menos un usuario activo con el rol Director.');
    }

    public function test_desactiva_a_un_usuario_revoca_sus_sesiones_y_lo_puede_reactivar(): void
    {
        $carla = Usuario::where('correo', 'carla.rojas@canal11.test')->first();
        $carla->createToken('sesion');

        $this->como('director@canal11.test')
            ->deleteJson("/api/v1/usuarios/{$carla->id}")
            ->assertOk()
            ->assertJsonPath('data.estado', 'inactivo');
        $this->assertSame(0, $carla->tokens()->count());

        $this->como('director@canal11.test')
            ->putJson("/api/v1/usuarios/{$carla->id}", [...$this->datosDe($carla), 'estado' => 'activo'])
            ->assertOk()
            ->assertJsonPath('data.estado', 'activo');
    }

    // ── Mi Perfil ─────────────────────────────────────────────────────────

    public function test_mi_perfil_muestra_mis_datos_y_preferencias(): void
    {
        $this->como('carla.rojas@canal11.test')
            ->getJson('/api/v1/perfil')
            ->assertOk()
            ->assertJsonPath('data.correo', 'carla.rojas@canal11.test')
            ->assertJsonStructure(['preferencias' => ['tema', 'modo', 'tamano_fuente', 'alto_contraste']]);
    }

    public function test_para_cambiar_la_contrasena_pide_la_actual_y_la_confirmacion(): void
    {
        $datos = ['nombre' => 'Carla', 'apellido' => 'Rojas Suárez', 'telefono' => '71234580', 'password' => 'nueva123'];

        $this->como('carla.rojas@canal11.test')
            ->putJson('/api/v1/perfil', $datos)
            ->assertStatus(422)
            ->assertJsonPath('errors.password_actual.0', 'Escriba su contraseña actual para cambiarla.')
            ->assertJsonPath('errors.password_confirmacion.0', 'Repita la contraseña nueva.');

        $this->como('carla.rojas@canal11.test')
            ->putJson('/api/v1/perfil', [...$datos, 'password_actual' => 'equivocada', 'password_confirmacion' => 'nueva123'])
            ->assertStatus(422)
            ->assertJsonPath('errors.password_actual.0', 'La contraseña actual no es correcta.');

        $this->como('carla.rojas@canal11.test')
            ->putJson('/api/v1/perfil', [...$datos, 'password_actual' => self::CLAVE, 'password_confirmacion' => 'nueva123'])
            ->assertOk();

        $this->postJson('/api/v1/auth/login', ['correo' => 'carla.rojas@canal11.test', 'password' => 'nueva123'])->assertOk();
    }

    // ── Matriz de Accesos ─────────────────────────────────────────────────

    public function test_el_director_ve_la_matriz_pero_no_la_modifica(): void
    {
        $this->como('director@canal11.test')
            ->getJson('/api/v1/permisos/matriz')
            ->assertOk()
            ->assertJsonStructure(['roles', 'casos_uso' => [['caso_uso', 'permisos']], 'asignaciones']);

        $periodista = Rol::where('nombre', 'Periodista')->value('id');
        $this->como('director@canal11.test')
            ->putJson("/api/v1/roles/$periodista/permisos", ['permisos' => []])
            ->assertForbidden();
    }

    public function test_el_administrador_cambia_los_permisos_y_el_menu_del_rol_se_actualiza(): void
    {
        $periodista = Rol::where('nombre', 'Periodista')->first();
        $sinNotas = $periodista->permisosWeb()->where('codigo', '<>', 'notas.listar')->pluck('permiso_web.id')->all();

        $this->como('carla.rojas@canal11.test')->getJson('/api/v1/auth/menu')->assertJsonFragment(['ruta' => '/notas']);

        $this->como('admin@canal11.test')
            ->putJson("/api/v1/roles/{$periodista->id}/permisos", ['permisos' => $sinNotas])
            ->assertOk();

        $this->como('carla.rojas@canal11.test')->getJson('/api/v1/auth/menu')->assertJsonMissing(['ruta' => '/notas']);
    }

    public function test_el_administrador_no_pierde_los_permisos_de_seguridad(): void
    {
        $admin = Rol::where('nombre', Rol::ADMINISTRADOR)->value('id');

        $this->como('admin@canal11.test')
            ->putJson("/api/v1/roles/$admin/permisos", ['permisos' => [PermisoWeb::where('codigo', 'usuarios.listar')->value('id')]])
            ->assertStatus(409);
    }

    // ── Menú Dinámico ─────────────────────────────────────────────────────

    public function test_registra_una_opcion_del_menu_y_la_asigna_a_un_rol(): void
    {
        $id = $this->como('admin@canal11.test')
            ->postJson('/api/v1/menus', [
                'nombre' => 'Ayuda', 'ruta' => '/ayuda', 'icono' => 'perfil', 'grupo' => 'Cuenta',
                'orden' => 200, 'padre_id' => null, 'permiso_web_id' => null, 'activo' => true,
            ])
            ->assertCreated()
            ->json('data.id');

        $periodista = Rol::where('nombre', 'Periodista')->first();
        $menus = [...$periodista->menus()->pluck('menu.id')->all(), $id];

        $this->como('admin@canal11.test')->putJson("/api/v1/roles/{$periodista->id}/menus", ['menus' => $menus])->assertOk();

        $this->como('carla.rojas@canal11.test')->getJson('/api/v1/auth/menu')->assertJsonFragment(['ruta' => '/ayuda']);
    }

    public function test_valida_la_ruta_de_la_opcion_del_menu(): void
    {
        $this->como('admin@canal11.test')
            ->postJson('/api/v1/menus', ['nombre' => 'X', 'ruta' => 'sin-barra', 'grupo' => 'Cuenta', 'orden' => 1, 'activo' => true])
            ->assertStatus(422)
            ->assertJsonPath('errors.ruta.0', 'La ruta debe empezar con / y tener solo minúsculas, números, guiones y barras.');
    }

    public function test_un_director_no_administra_el_menu(): void
    {
        $this->como('director@canal11.test')->getJson('/api/v1/menus')->assertForbidden();
        $this->assertTrue(Menu::count() > 0);
    }

    // ── Ayudas ────────────────────────────────────────────────────────────

    private function como(string $correo): static
    {
        $this->app['auth']->forgetGuards(); // cada petición se autentica de nuevo con su token

        return $this->withToken(Usuario::where('correo', $correo)->firstOrFail()->createToken('prueba')->plainTextToken);
    }

    private function nuevo(array $cambios = []): array
    {
        return [
            'nombre' => 'Nuevo', 'apellido' => 'Periodista', 'ci' => '9000001', 'correo' => 'nuevo@canal11.test',
            'telefono' => '70000000', 'password' => 'secreta1', 'rol_id' => Rol::where('nombre', 'Periodista')->value('id'),
            ...$cambios,
        ];
    }

    private function datosDe(Usuario $u): array
    {
        return ['nombre' => $u->nombre, 'apellido' => $u->apellido, 'ci' => $u->ci, 'correo' => $u->correo, 'telefono' => $u->telefono, 'rol_id' => $u->rol_id];
    }
}
