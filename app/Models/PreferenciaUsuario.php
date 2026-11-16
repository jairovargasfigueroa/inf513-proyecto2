<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Tema, modo día/noche, tamaño de letra y alto contraste de un usuario. */
class PreferenciaUsuario extends Modelo
{
    protected $table = 'preferencia_usuario';

    protected $fillable = ['usuario_id', 'tema', 'modo', 'tamano_fuente', 'alto_contraste'];

    protected $hidden = ['id', 'usuario_id', 'creado_en', 'actualizado_en'];

    protected function casts(): array
    {
        return ['tamano_fuente' => 'integer', 'alto_contraste' => 'boolean'];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }

    /** Valores por defecto (los mismos de la tabla), para quien no tiene fila. */
    public static function porDefecto(): array
    {
        return ['tema' => 'adultos', 'modo' => 'auto', 'tamano_fuente' => 100, 'alto_contraste' => false];
    }
}
