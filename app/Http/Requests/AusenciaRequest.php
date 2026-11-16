<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** FormularioAusencia (CU-02): 422 si el rango no es válido. */
class AusenciaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'personal_id' => ['required', 'integer', 'exists:personal,id'],
            'tipo' => ['required', 'in:permiso,vacacion,baja_medica,comision'],
            'inicio' => ['required', 'date_format:Y-m-d\TH:i'],
            'fin' => ['required', 'date_format:Y-m-d\TH:i', 'after:inicio'],
            'motivo' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return ['fin.after' => 'El fin de la ausencia debe ser posterior a su inicio.'];
    }

    public function attributes(): array
    {
        return ['personal_id' => 'persona', 'inicio' => 'inicio', 'fin' => 'fin', 'motivo' => 'motivo'];
    }
}
