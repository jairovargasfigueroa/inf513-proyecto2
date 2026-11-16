<?php

namespace App\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/** FormularioUsuario (CU-01): registrar (POST) o modificar (PUT) un usuario. */
class UsuarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'correo' => is_string($this->correo) ? mb_strtolower(trim($this->correo)) : $this->correo,
            'ci' => is_string($this->ci) ? trim($this->ci) : $this->ci,
            'telefono' => $this->filled('telefono') ? trim($this->telefono) : null,
        ]);
    }

    public function rules(): array
    {
        $id = $this->route('usuario')?->id;
        $editando = $id !== null;

        return [
            'nombre' => ['required', 'string', 'max:100'],
            'apellido' => ['required', 'string', 'max:100'],
            'ci' => ['required', 'string', 'max:20', 'regex:/^[0-9A-Za-z\-]+$/', Rule::unique('usuario', 'ci')->ignore($id)],
            'correo' => ['required', 'string', 'email', 'max:150', $this->correoLibre($id)],
            'telefono' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\- ]{6,20}$/'],
            'password' => [$editando ? 'nullable' : 'required', 'string', 'min:6', 'max:72'],
            'rol_id' => ['required', 'integer', 'exists:rol,id'],
            'estado' => [$editando ? 'sometimes' : 'prohibited', 'in:activo,inactivo'],
        ];
    }

    public function messages(): array
    {
        return [
            'ci.regex' => 'El carnet de identidad solo puede tener números, letras y guiones.',
            'telefono.regex' => 'El teléfono solo puede tener números, espacios, + y guiones (entre 6 y 20).',
        ];
    }

    /** El correo identifica al usuario también en el sistema vía correo: único sin importar mayúsculas. */
    private function correoLibre(?int $id): Closure
    {
        return function (string $atributo, mixed $valor, Closure $falla) use ($id) {
            $ocupado = DB::table('usuario')
                ->whereRaw('lower(correo) = ?', [mb_strtolower((string) $valor)])
                ->when($id, fn ($q) => $q->where('id', '<>', $id))
                ->exists();

            if ($ocupado) {
                $falla('El correo ya está registrado.');
            }
        };
    }
}
