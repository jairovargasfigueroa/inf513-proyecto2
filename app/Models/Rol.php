<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Cache;

/**
 * Rol de negocio (tabla rol del Proyecto 1) más el rol Administrador del
 * sistema web. La matriz de accesos es la relación con permiso_web.
 */
class Rol extends Modelo
{
    public const ADMINISTRADOR = 'Administrador';

    protected $table = 'rol';

    protected $fillable = ['nombre', 'descripcion'];

    public function usuarios(): HasMany
    {
        return $this->hasMany(Usuario::class);
    }

    public function permisosWeb(): BelongsToMany
    {
        return $this->belongsToMany(PermisoWeb::class, 'rol_permiso_web', 'rol_id', 'permiso_web_id');
    }

    public function menus(): BelongsToMany
    {
        return $this->belongsToMany(Menu::class, 'rol_menu', 'rol_id', 'menu_id');
    }

    /** Permisos del rol, guardados en caché hasta que cambie la matriz. */
    public static function codigosPermiso(int $rolId): array
    {
        return Cache::rememberForever("rbac.permisos.$rolId", fn () => PermisoWeb::query()
            ->join('rol_permiso_web', 'rol_permiso_web.permiso_web_id', '=', 'permiso_web.id')
            ->where('rol_permiso_web.rol_id', $rolId)
            ->orderBy('permiso_web.codigo')
            ->pluck('permiso_web.codigo')
            ->all());
    }

    /** Se llama cuando cambian los permisos o el menú de un rol. */
    public static function olvidarCache(int $rolId): void
    {
        Cache::forget("rbac.permisos.$rolId");
        Cache::forget("rbac.menu.$rolId");
    }
}
