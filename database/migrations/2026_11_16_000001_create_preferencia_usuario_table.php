<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * PreferenciaUsuario (CU-01): tema, modo día/noche, tamaño de letra y alto contraste de cada usuario.
 * Las 26 tablas del Proyecto 1 (sistema vía correo) ya existen en db_grupo14sa
 * y no se migran; esta migración solo agrega una de las 8 tablas nuevas del sistema web
 * (documento, sección 3.4.3.2).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
CREATE TABLE preferencia_usuario (
    id              SERIAL PRIMARY KEY,
    usuario_id      INTEGER NOT NULL UNIQUE REFERENCES usuario(id) ON UPDATE CASCADE ON DELETE CASCADE,
    tema            VARCHAR(10) NOT NULL DEFAULT 'adultos' CHECK (tema IN ('ninos','jovenes','adultos')),
    modo            VARCHAR(5)  NOT NULL DEFAULT 'auto' CHECK (modo IN ('dia','noche','auto')),
    tamano_fuente   SMALLINT    NOT NULL DEFAULT 100 CHECK (tamano_fuente BETWEEN 80 AND 150),
    alto_contraste  BOOLEAN     NOT NULL DEFAULT FALSE,
    creado_en       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
)
SQL);
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS preferencia_usuario CASCADE');
    }
};
