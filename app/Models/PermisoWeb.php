<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/** Una celda de la matriz de accesos: recurso.accion, por ejemplo coberturas.crear. */
class PermisoWeb extends Modelo
{
    protected $table = 'permiso_web';

    protected $fillable = ['codigo', 'recurso', 'accion', 'caso_uso', 'descripcion'];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Rol::class, 'rol_permiso_web', 'permiso_web_id', 'rol_id');
    }
}
