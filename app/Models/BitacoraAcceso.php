<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Registro de auditoría de cada petición e inicio de sesión (CU-08). */
class BitacoraAcceso extends Model
{
    public $timestamps = false;

    protected $table = 'bitacora_acceso';

    protected $fillable = [
        'usuario_id', 'tipo_evento', 'correo_intentado', 'metodo_http',
        'recurso', 'codigo_estado', 'ip', 'user_agent',
    ];

    protected function casts(): array
    {
        return ['fecha_hora' => 'datetime'];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }
}
