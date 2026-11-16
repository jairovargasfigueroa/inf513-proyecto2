<?php

namespace App\Http\Requests;

use App\Models\Cobertura;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** FormularioCobertura (CU-04): planificar (POST) o reprogramar (PUT) una cobertura. */
class CoberturaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'titulo' => ['required', 'string', 'max:200'],
            'tema' => ['nullable', 'string', 'max:255'],
            'tipo' => ['required', Rule::in(Cobertura::TIPOS)],
            'inicio' => ['required', 'date_format:Y-m-d\TH:i'],
            'fin' => ['required', 'date_format:Y-m-d\TH:i', 'after:inicio'],
            'lugar' => ['required', 'string', 'max:200'],
            'prioridad' => ['required', 'in:alta,media,baja'],
            'fuente' => ['nullable', 'string', 'max:200'],
            'indicaciones' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return ['fin.after' => 'La cobertura debe terminar después de empezar.'];
    }

    public function attributes(): array
    {
        return ['titulo' => 'título', 'inicio' => 'inicio', 'fin' => 'fin', 'fuente' => 'fuente o contacto'];
    }

    /** Datos listos para la tabla cobertura. */
    public function datos(): array
    {
        $d = $this->validated();

        return [
            'titulo' => $d['titulo'], 'tema' => $d['tema'] ?? null, 'tipo' => $d['tipo'],
            'fecha_hora_inicio' => str_replace('T', ' ', $d['inicio']), 'fecha_hora_fin' => str_replace('T', ' ', $d['fin']),
            'lugar' => $d['lugar'], 'prioridad' => $d['prioridad'], 'fuente' => $d['fuente'] ?? null, 'indicaciones' => $d['indicaciones'] ?? null,
        ];
    }
}
