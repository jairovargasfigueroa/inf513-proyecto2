<?php

namespace Tests;

use App\Models\Usuario;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /** Contraseña de las cuentas de prueba (datos_prueba.sql y DatosPruebaWebSeeder). */
    protected const CLAVE = 'canal11';

    /** La próxima petición se hace con un token de ese usuario de prueba. */
    protected function como(string $correo): static
    {
        $this->app['auth']->forgetGuards(); // cada petición se autentica de nuevo con su token

        return $this->withToken(Usuario::where('correo', $correo)->firstOrFail()->createToken('prueba')->plainTextToken);
    }
}
