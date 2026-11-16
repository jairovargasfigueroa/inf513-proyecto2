<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * FormularioPerfil (CU-01): el usuario modifica sus datos. Para cambiar la
 * contraseña debe escribir la actual y confirmar la nueva.
 */
class PerfilRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['telefono' => $this->filled('telefono') ? trim($this->telefono) : null]);
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:100'],
            'apellido' => ['required', 'string', 'max:100'],
            'telefono' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\- ]{6,20}$/'],
            'password' => ['nullable', 'string', 'min:6', 'max:72'],
            'password_actual' => ['required_with:password', 'nullable', 'string', 'current_password:sanctum'],
            'password_confirmacion' => ['required_with:password', 'nullable', 'same:password'],
        ];
    }

    public function messages(): array
    {
        return [
            'telefono.regex' => 'El teléfono solo puede tener números, espacios, + y guiones (entre 6 y 20).',
            'password_actual.required_with' => 'Escriba su contraseña actual para cambiarla.',
            'password_actual.current_password' => 'La contraseña actual no es correcta.',
            'password_confirmacion.required_with' => 'Repita la contraseña nueva.',
            'password_confirmacion.same' => 'La confirmación no coincide con la contraseña nueva.',
        ];
    }

    public function attributes(): array
    {
        return ['password' => 'contraseña nueva'];
    }
}
