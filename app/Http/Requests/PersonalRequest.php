<?php

namespace App\Http\Requests;

use App\Models\Personal;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** FormularioPersonal (CU-02): ficha laboral de un usuario. */
class PersonalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['unidad_academica' => $this->filled('unidad_academica') ? trim($this->unidad_academica) : null]);
    }

    public function rules(): array
    {
        $editando = $this->route('personal') !== null;

        return [
            'usuario_id' => [$editando ? 'prohibited' : 'required', 'integer', 'exists:usuario,id', Rule::unique('personal', 'usuario_id')],
            'cargo' => ['required', Rule::in(Personal::CARGOS)],
            'condicion_laboral' => ['required', Rule::in(Personal::CONDICIONES)],
            'unidad_academica' => ['nullable', 'string', 'max:150', 'required_if:condicion_laboral,practicante', 'prohibited_unless:condicion_laboral,practicante'],
            'turno_id' => ['required', 'integer', 'exists:turno,id'],
            'fecha_ingreso' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'estado' => [$editando ? 'sometimes' : 'prohibited', 'in:activo,inactivo'],
        ];
    }

    public function messages(): array
    {
        return [
            'usuario_id.unique' => 'El usuario ya tiene una ficha de personal.',
            'unidad_academica.required_if' => 'La unidad académica es obligatoria para los practicantes.',
            'unidad_academica.prohibited_unless' => 'La unidad académica solo se registra para los practicantes.',
            'fecha_ingreso.before_or_equal' => 'La fecha de ingreso no puede ser futura.',
        ];
    }

    public function attributes(): array
    {
        return [
            'usuario_id' => 'usuario', 'cargo' => 'cargo', 'condicion_laboral' => 'condición laboral',
            'unidad_academica' => 'unidad académica', 'turno_id' => 'turno', 'fecha_ingreso' => 'fecha de ingreso',
        ];
    }
}
