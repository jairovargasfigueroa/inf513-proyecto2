<?php

namespace Database\Seeders;

use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Database\Seeder;

/**
 * Datos de prueba del sistema web (solo en desarrollo): la cuenta del
 * Administrador del Sistema, que no existe en los datos del Proyecto 1. Usa la
 * misma contraseña de prueba que las demás cuentas de datos_prueba.sql.
 */
class DatosPruebaWebSeeder extends Seeder
{
    public function run(): void
    {
        Usuario::firstOrCreate(['correo' => 'admin@canal11.test'], [
            'nombre' => 'Administrador',
            'apellido' => 'del Sistema',
            'ci' => '3100000',
            'password' => 'canal11',
            'rol_id' => Rol::where('nombre', Rol::ADMINISTRADOR)->value('id'),
        ]);
    }
}
