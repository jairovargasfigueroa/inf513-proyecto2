<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * BitacoraAcceso (CU-08): inicios de sesión exitosos y fallidos, IP y recurso de cada petición (consigna, punto 4).
 * Las 26 tablas del Proyecto 1 (sistema vía correo) ya existen en db_grupo14sa
 * y no se migran; esta migración solo agrega una de las 8 tablas nuevas del sistema web
 * (documento, sección 3.4.3.2).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
CREATE TABLE bitacora_acceso (
    id                SERIAL PRIMARY KEY,
    usuario_id        INTEGER REFERENCES usuario(id) ON UPDATE CASCADE ON DELETE SET NULL,
    tipo_evento       VARCHAR(20) NOT NULL CHECK (tipo_evento IN ('login_exitoso','login_fallido','logout','acceso','acceso_denegado','error')),
    correo_intentado  VARCHAR(150),
    metodo_http       VARCHAR(7),
    recurso           VARCHAR(200) NOT NULL,
    codigo_estado     SMALLINT,
    ip                VARCHAR(45)  NOT NULL,
    user_agent        TEXT,
    fecha_hora        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_bitacora_acceso_fecha   ON bitacora_acceso (fecha_hora);
CREATE INDEX ix_bitacora_acceso_tipo_ip ON bitacora_acceso (tipo_evento, ip);
CREATE INDEX ix_bitacora_acceso_recurso ON bitacora_acceso (recurso)
SQL);
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS bitacora_acceso CASCADE');
    }
};
