<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Datos de un usuario que muestra la API (nunca la contraseña). */
class UsuarioResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'apellido' => $this->apellido,
            'nombre_completo' => $this->nombre_completo,
            'ci' => $this->ci,
            'correo' => $this->correo,
            'telefono' => $this->telefono,
            'estado' => $this->estado,
            'rol' => $this->whenLoaded('rol', fn () => ['id' => $this->rol->id, 'nombre' => $this->rol->nombre]),
            'creado_en' => $this->creado_en?->toDateTimeString(),
        ];
    }
}
