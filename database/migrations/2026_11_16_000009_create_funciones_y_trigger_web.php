<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Función del contador de visitas (fn_registrar_visita) y trigger que crea las
 * preferencias por defecto de cada usuario nuevo, registrado desde la web o desde
 * el correo (documento, sección 3.4.3.2). También crea las preferencias de los
 * usuarios que ya existían antes del sistema web.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION fn_registrar_visita(p_pagina VARCHAR) RETURNS BIGINT AS $$
DECLARE
    v_total BIGINT;
BEGIN
    INSERT INTO contador_visita (pagina, cantidad, ultima_visita)
    VALUES (p_pagina, 1, CURRENT_TIMESTAMP)
    ON CONFLICT (pagina) DO UPDATE
        SET cantidad = contador_visita.cantidad + 1,
            ultima_visita = CURRENT_TIMESTAMP
    RETURNING cantidad INTO v_total;
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_usuario_preferencia() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO preferencia_usuario (usuario_id) VALUES (NEW.id)
    ON CONFLICT (usuario_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_usuario_preferencia ON usuario;
CREATE TRIGGER tg_usuario_preferencia AFTER INSERT ON usuario
    FOR EACH ROW EXECUTE FUNCTION fn_usuario_preferencia();

INSERT INTO preferencia_usuario (usuario_id)
SELECT id FROM usuario
ON CONFLICT (usuario_id) DO NOTHING;
SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
DROP TRIGGER IF EXISTS tg_usuario_preferencia ON usuario;
DROP FUNCTION IF EXISTS fn_usuario_preferencia();
DROP FUNCTION IF EXISTS fn_registrar_visita(VARCHAR);
SQL);
    }
};
