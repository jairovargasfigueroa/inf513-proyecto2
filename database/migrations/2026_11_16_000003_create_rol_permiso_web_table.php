<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * RolPermisoWeb (CU-01): clase de asociación Rol-PermisoWeb (la matriz de accesos).
 * Las 26 tablas del Proyecto 1 (sistema vía correo) ya existen en db_grupo14sa
 * y no se migran; esta migración solo agrega una de las 8 tablas nuevas del sistema web
 * (documento, sección 3.4.3.2).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
CREATE TABLE rol_permiso_web (
    id              SERIAL PRIMARY KEY,
    rol_id          INTEGER NOT NULL REFERENCES rol(id) ON UPDATE CASCADE ON DELETE CASCADE,
    permiso_web_id  INTEGER NOT NULL REFERENCES permiso_web(id) ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE (rol_id, permiso_web_id),
    creado_en       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)
SQL);
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS rol_permiso_web CASCADE');
    }
};
