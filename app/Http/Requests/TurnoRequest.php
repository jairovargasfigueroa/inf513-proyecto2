<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** FormularioTurno (CU-02). */
class TurnoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:50', 'unique:turno,nombre'],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'hora_fin' => ['required', 'date_format:H:i', 'different:hora_inicio'],
            'dias' => ['required', 'string', 'regex:/^[1-7](,[1-7])*$/'],
            'descripcion' => ['nullable', 'string', 'max:150'],
        ];
    }

    public function messages(): array
    {
        return [
            'hora_fin.different' => 'La hora de fin debe ser distinta de la de inicio (si es menor, el turno cruza la medianoche).',
            'dias.regex' => 'Elija al menos un día de la semana.',
        ];
    }

    public function attributes(): array
    {
        return ['hora_inicio' => 'hora de inicio', 'hora_fin' => 'hora de fin', 'dias' => 'días', 'descripcion' => 'descripción'];
    }
}
