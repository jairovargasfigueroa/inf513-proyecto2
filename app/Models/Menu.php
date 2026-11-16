<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/** Opción del menú lateral, ligada al permiso que la habilita. */
class Menu extends Modelo
{
    protected $table = 'menu';

    protected $fillable = ['padre_id', 'permiso_web_id', 'nombre', 'ruta', 'icono', 'grupo', 'orden', 'activo'];

    protected function casts(): array
    {
        return ['activo' => 'boolean', 'orden' => 'integer'];
    }

    public function permiso(): BelongsTo
    {
        return $this->belongsTo(PermisoWeb::class, 'permiso_web_id');
    }

    public function padre(): BelongsTo
    {
        return $this->belongsTo(Menu::class, 'padre_id');
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Rol::class, 'rol_menu', 'menu_id', 'rol_id');
    }
}
