<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** FormularioLogin (navegación general): correo y contraseña. */
class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'correo' => ['required', 'string', 'email', 'max:150'],
            'password' => ['required', 'string', 'max:100'],
        ];
    }
}
