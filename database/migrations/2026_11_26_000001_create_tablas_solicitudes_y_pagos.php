<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * CU-09 Gestión de Solicitudes de Cobertura y Pagos: tarifas de los servicios,
 * solicitudes de cobertura de personas o instituciones externas y sus pagos con
 * Stripe (modo de prueba). Son tablas nuevas: no cambian ninguna tabla del
 * sistema vía correo; la solicitud aceptada solo guarda la cobertura que generó.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
CREATE TABLE tarifa (
    id              SERIAL PRIMARY KEY,
    servicio        VARCHAR(100)  NOT NULL UNIQUE,
    descripcion     VARCHAR(255),
    monto           NUMERIC(10,2) NOT NULL CHECK (monto >= 1),
    moneda          CHAR(3)       NOT NULL DEFAULT 'USD' CHECK (moneda IN ('USD', 'BOB')),
    activa          BOOLEAN       NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
)
SQL);

        DB::statement(<<<'SQL'
CREATE TABLE solicitud_cobertura (
    id                  SERIAL PRIMARY KEY,
    codigo              VARCHAR(12)   UNIQUE,
    tarifa_id           INT           NOT NULL REFERENCES tarifa(id),
    solicitante         VARCHAR(150)  NOT NULL,
    institucion         VARCHAR(150),
    correo              VARCHAR(150)  NOT NULL,
    telefono            VARCHAR(20),
    titulo              VARCHAR(200)  NOT NULL,
    descripcion         VARCHAR(1000),
    tipo                VARCHAR(30)   NOT NULL
                        CHECK (tipo IN ('conferencia', 'hecho_noticioso', 'deportes', 'acto_institucional', 'entrevista')),
    lugar               VARCHAR(200)  NOT NULL,
    fecha_hora_inicio   TIMESTAMP     NOT NULL,
    fecha_hora_fin      TIMESTAMP     NOT NULL,
    monto               NUMERIC(10,2) NOT NULL,
    moneda              CHAR(3)       NOT NULL,
    estado              VARCHAR(20)   NOT NULL DEFAULT 'pendiente_pago'
                        CHECK (estado IN ('pendiente_pago', 'pagada', 'aceptada', 'rechazada')),
    motivo_rechazo      VARCHAR(500),
    cobertura_id        INT           REFERENCES cobertura(id),
    atendida_por        INT           REFERENCES usuario(id),
    fecha_atencion      TIMESTAMP,
    creado_en           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (fecha_hora_fin > fecha_hora_inicio)
)
SQL);

        DB::statement(<<<'SQL'
CREATE TABLE pago (
    id               SERIAL PRIMARY KEY,
    solicitud_id     INT           NOT NULL REFERENCES solicitud_cobertura(id),
    proveedor        VARCHAR(20)   NOT NULL DEFAULT 'stripe' CHECK (proveedor IN ('stripe', 'prueba')),
    referencia       VARCHAR(255)  NOT NULL UNIQUE,
    payment_intent   VARCHAR(255),
    monto            NUMERIC(10,2) NOT NULL,
    moneda           CHAR(3)       NOT NULL,
    estado           VARCHAR(20)   NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente', 'pagado', 'reembolsado', 'expirado')),
    fecha_pago       TIMESTAMP,
    fecha_reembolso  TIMESTAMP,
    creado_en        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
)
SQL);

        DB::statement('CREATE INDEX ix_solicitud_estado ON solicitud_cobertura(estado, fecha_hora_inicio)');
        DB::statement('CREATE INDEX ix_pago_solicitud ON pago(solicitud_id)');
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS pago CASCADE');
        DB::statement('DROP TABLE IF EXISTS solicitud_cobertura CASCADE');
        DB::statement('DROP TABLE IF EXISTS tarifa CASCADE');
    }
};
