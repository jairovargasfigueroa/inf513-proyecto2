<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Datos iniciales del sistema web. La seguridad (rol Administrador, permisos,
     * matriz de accesos y menú) se carga siempre; las cuentas de prueba, solo
     * fuera de producción.
     */
    public function run(): void
    {
        $this->call(SeguridadSeeder::class);

        if (! app()->isProduction()) {
            $this->call(DatosPruebaWebSeeder::class);
        }
    }
}
