<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Base de los modelos del sistema: las tablas de db_grupo14sa (compartidas con
 * el sistema vía correo) usan las columnas creado_en y actualizado_en.
 */
abstract class Modelo extends Model
{
    public const CREATED_AT = 'creado_en';

    public const UPDATED_AT = 'actualizado_en';
}
