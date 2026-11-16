<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** FormularioPreferencias (CU-01): apariencia y accesibilidad del usuario. */
class PreferenciasRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tema' => ['required', 'in:ninos,jovenes,adultos'],
            'modo' => ['required', 'in:dia,noche,auto'],
            'tamano_fuente' => ['required', 'integer', 'between:80,150'],
            'alto_contraste' => ['required', 'boolean'],
        ];
    }
}
