<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Nota periodística del NRCS (CU-05). Flujo: borrador → en_revision →
 * aprobada u observada (R15); emitida y baja ya no se modifican.
 */
class Nota extends Modelo
{
    public const TIPOS_PIEZA = ['lectura', 'vo', 'vo_sot', 'nota_completa', 'enlace_vivo', 'entrevista_estudio'];

    /** Estados en los que la nota todavía se puede modificar. */
    public const EDITABLES = ['borrador', 'en_revision', 'observada', 'aprobada'];

    protected $table = 'nota';

    protected $fillable = [
        'slug', 'titulo', 'tipo_pieza', 'guion', 'palabras', 'palabras_por_minuto', 'fecha', 'estado', 'cobertura_id', 'autor_id',
    ];

    protected function casts(): array
    {
        return ['fecha' => 'date:Y-m-d'];
    }

    public function autor(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'autor_id');
    }

    /** R14: palabras del guion (separadas por espacios o saltos de línea). */
    public static function contarPalabras(?string $texto): int
    {
        return count(preg_split('/\s+/u', trim((string) $texto), -1, PREG_SPLIT_NO_EMPTY));
    }
}
