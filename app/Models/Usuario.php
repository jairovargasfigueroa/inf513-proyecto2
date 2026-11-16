<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Usuario del sistema (tabla usuario del Proyecto 1). Inicia sesión con su
 * correo y contraseña; sus permisos son los de su rol (RBAC).
 */
class Usuario extends Authenticatable
{
    use HasApiTokens;

    public const CREATED_AT = 'creado_en';

    public const UPDATED_AT = 'actualizado_en';

    protected $table = 'usuario';

    protected $fillable = [
        'nombre', 'apellido', 'ci', 'correo', 'telefono', 'password', 'estado', 'rol_id',
    ];

    protected $hidden = ['password'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'creado_en' => 'datetime',
            'actualizado_en' => 'datetime',
        ];
    }

    public function rol(): BelongsTo
    {
        return $this->belongsTo(Rol::class);
    }

    public function preferencia(): HasOne
    {
        return $this->hasOne(PreferenciaUsuario::class);
    }

    public function personal(): HasOne
    {
        return $this->hasOne(Personal::class);
    }

    public function estaActivo(): bool
    {
        return $this->estado === 'activo';
    }

    /** Códigos de permiso (recurso.accion) del rol del usuario. */
    public function permisos(): array
    {
        return Rol::codigosPermiso($this->rol_id);
    }

    public function tienePermiso(string $codigo): bool
    {
        return in_array($codigo, $this->permisos(), true);
    }

    public function getNombreCompletoAttribute(): string
    {
        return trim("{$this->nombre} {$this->apellido}");
    }
}
