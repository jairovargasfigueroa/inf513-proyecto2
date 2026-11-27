<?php

namespace App\Http\Requests;

use App\Models\Cobertura;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * FormularioSolicitud (CU-09, Visitante). El evento se pide con al menos dos
 * días de anticipación y dura como máximo 12 horas.
 */
class SolicitudRequest extends FormRequest
{
    public const DIAS_ANTICIPACION = 2;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tarifa_id' => ['required', 'integer', Rule::exists('tarifa', 'id')->where('activa', true)],
            'solicitante' => ['required', 'string', 'max:150'],
            'institucion' => ['nullable', 'string', 'max:150'],
            'correo' => ['required', 'email', 'max:150'],
            'telefono' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s]{6,20}$/'],
            'titulo' => ['required', 'string', 'max:200'],
            'descripcion' => ['nullable', 'string', 'max:1000'],
            'tipo' => ['required', Rule::in(Cobertura::TIPOS)],
            'lugar' => ['required', 'string', 'max:200'],
            'inicio' => ['required', 'date_format:Y-m-d\TH:i'],
            'fin' => ['required', 'date_format:Y-m-d\TH:i', 'after:inicio'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $v) {
            if ($v->errors()->hasAny(['inicio', 'fin'])) {
                return;
            }
            $inicio = strtotime(str_replace('T', ' ', $this->input('inicio')));
            $fin = strtotime(str_replace('T', ' ', $this->input('fin')));
            if ($inicio < now()->startOfDay()->addDays(self::DIAS_ANTICIPACION)->getTimestamp()) {
                $v->errors()->add('inicio', 'Solicite la cobertura con al menos '.self::DIAS_ANTICIPACION.' días de anticipación.');
            }
            if ($fin - $inicio > 12 * 3600) {
                $v->errors()->add('fin', 'El evento puede durar como máximo 12 horas.');
            }
        }];
    }

    public function messages(): array
    {
        return [
            'tarifa_id.exists' => 'Elija un servicio disponible.',
            'fin.after' => 'El evento debe terminar después de empezar.',
            'telefono.regex' => 'Escriba un teléfono válido (solo números, espacios, + o -).',
        ];
    }

    public function attributes(): array
    {
        return [
            'tarifa_id' => 'servicio', 'institucion' => 'institución', 'telefono' => 'teléfono', 'titulo' => 'título',
            'descripcion' => 'descripción',
        ];
    }

    /** Datos listos para la tabla solicitud_cobertura. */
    public function datos(): array
    {
        $d = $this->validated();

        return [
            'tarifa_id' => $d['tarifa_id'], 'solicitante' => $d['solicitante'], 'institucion' => $d['institucion'] ?? null,
            'correo' => mb_strtolower($d['correo']), 'telefono' => $d['telefono'] ?? null, 'titulo' => $d['titulo'],
            'descripcion' => $d['descripcion'] ?? null, 'tipo' => $d['tipo'], 'lugar' => $d['lugar'],
            'fecha_hora_inicio' => str_replace('T', ' ', $d['inicio']), 'fecha_hora_fin' => str_replace('T', ' ', $d['fin']),
        ];
    }
}
