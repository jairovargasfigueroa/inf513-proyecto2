<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ContadorVisita (CU-08): un contador por ruta del frontend (consigna, punto 7).
 * Las 26 tablas del Proyecto 1 (sistema vía correo) ya existen en db_grupo14sa
 * y no se migran; esta migración solo agrega una de las 8 tablas nuevas del sistema web
 * (documento, sección 3.4.3.2).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
CREATE TABLE contador_visita (
    id             SERIAL PRIMARY KEY,
    pagina         VARCHAR(120) NOT NULL UNIQUE,
    cantidad       BIGINT       NOT NULL DEFAULT 0,
    ultima_visita  TIMESTAMP
)
SQL);
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS contador_visita CASCADE');
    }
};
