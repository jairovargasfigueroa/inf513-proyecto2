<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * PermisoWeb (CU-01): una celda de la matriz de accesos (recurso.accion, p. ej. coberturas.crear).
 * Las 26 tablas del Proyecto 1 (sistema vía correo) ya existen en db_grupo14sa
 * y no se migran; esta migración solo agrega una de las 8 tablas nuevas del sistema web
 * (documento, sección 3.4.3.2).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
CREATE TABLE permiso_web (
    id              SERIAL PRIMARY KEY,
    codigo          VARCHAR(60)  NOT NULL UNIQUE,
    recurso         VARCHAR(40)  NOT NULL,
    accion          VARCHAR(20)  NOT NULL,
    caso_uso        VARCHAR(5)   NOT NULL CHECK (caso_uso ~ '^CU-0[1-8]$'),
    descripcion     VARCHAR(150),
    creado_en       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
)
SQL);
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS permiso_web CASCADE');
    }
};
