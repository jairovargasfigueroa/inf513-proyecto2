<?php

namespace App\Models;

/** Tarifa de un servicio que el canal ofrece a externos (CU-09). */
class Tarifa extends Modelo
{
    public const MONEDAS = ['USD', 'BOB'];

    protected $table = 'tarifa';

    protected $fillable = ['servicio', 'descripcion', 'monto', 'moneda', 'activa'];

    protected function casts(): array
    {
        return ['monto' => 'decimal:2', 'activa' => 'boolean'];
    }
}
