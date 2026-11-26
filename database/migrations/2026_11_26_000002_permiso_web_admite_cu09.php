<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * CU-09: la matriz de accesos (permiso_web, tabla del sistema web) admite
 * permisos del caso de uso 9. La tabla permiso del sistema vía correo no cambia.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE permiso_web DROP CONSTRAINT IF EXISTS permiso_web_caso_uso_check');
        DB::statement("ALTER TABLE permiso_web ADD CONSTRAINT permiso_web_caso_uso_check CHECK (caso_uso ~ '^CU-0[1-9]$')");
    }

    public function down(): void
    {
        DB::statement("DELETE FROM permiso_web WHERE caso_uso = 'CU-09'");
        DB::statement('ALTER TABLE permiso_web DROP CONSTRAINT IF EXISTS permiso_web_caso_uso_check');
        DB::statement("ALTER TABLE permiso_web ADD CONSTRAINT permiso_web_caso_uso_check CHECK (caso_uso ~ '^CU-0[1-8]$')");
    }
};
