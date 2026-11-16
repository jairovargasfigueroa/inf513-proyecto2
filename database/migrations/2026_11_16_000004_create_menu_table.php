<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Menu (CU-01): opción del menú lateral; reflexiva (padre) y ligada al permiso que la habilita.
 * Las 26 tablas del Proyecto 1 (sistema vía correo) ya existen en db_grupo14sa
 * y no se migran; esta migración solo agrega una de las 8 tablas nuevas del sistema web
 * (documento, sección 3.4.3.2).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
CREATE TABLE menu (
    id              SERIAL PRIMARY KEY,
    padre_id        INTEGER REFERENCES menu(id) ON UPDATE CASCADE ON DELETE SET NULL,
    permiso_web_id  INTEGER REFERENCES permiso_web(id) ON UPDATE CASCADE ON DELETE SET NULL,
    nombre          VARCHAR(60)  NOT NULL,
    ruta            VARCHAR(120),
    icono           VARCHAR(40),
    grupo           VARCHAR(40),
    orden           SMALLINT     NOT NULL DEFAULT 0,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
)
SQL);
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS menu CASCADE');
    }
};
