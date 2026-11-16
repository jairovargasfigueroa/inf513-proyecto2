<?php

namespace App\Services;

use App\Models\Usuario;
use Illuminate\Support\Facades\DB;

/**
 * Búsqueda global (consigna, punto 9): busca el texto en coberturas, notas,
 * recursos, personal y programas, solo en lo que el rol puede ver. El visitante
 * sin sesión solo ve los programas, que son públicos como la grilla.
 */
class Buscador
{
    public function buscar(string $texto, ?Usuario $usuario, int $limite): array
    {
        $patron = '%'.addcslashes($texto, '%_\\').'%';
        $puede = fn (string $permiso) => $usuario?->tienePermiso($permiso) ?? false;
        $grupos = [];

        if ($puede('coberturas.listar')) {
            $grupos[] = $this->grupo('coberturas', 'Coberturas', DB::table('cobertura')
                ->where(fn ($q) => $q->where('titulo', 'ilike', $patron)
                    ->orWhere('tema', 'ilike', $patron)
                    ->orWhere('lugar', 'ilike', $patron))
                ->orderByDesc('fecha_hora_inicio')
                ->limit($limite)
                ->get(['id', 'titulo', 'lugar', 'fecha_hora_inicio', 'estado'])
                ->map(fn ($c) => [
                    'id' => $c->id,
                    'titulo' => $c->titulo,
                    'detalle' => substr($c->fecha_hora_inicio, 0, 16)." · {$c->lugar} · {$c->estado}",
                    'ruta' => "/coberturas/{$c->id}",
                ]));
        }

        if ($puede('notas.listar')) {
            $grupos[] = $this->grupo('notas', 'Notas', DB::table('nota')
                ->where('estado', '<>', 'baja')
                ->where(fn ($q) => $q->where('titulo', 'ilike', $patron)->orWhere('slug', 'ilike', $patron))
                ->orderByDesc('fecha')
                ->limit($limite)
                ->get(['id', 'slug', 'titulo', 'fecha', 'estado'])
                ->map(fn ($n) => [
                    'id' => $n->id,
                    'titulo' => $n->titulo,
                    'detalle' => "{$n->slug} · {$n->fecha} · {$n->estado}",
                    'ruta' => "/notas/{$n->id}",
                ]));
        }

        if ($puede('recursos.listar')) {
            $grupos[] = $this->grupo('recursos', 'Recursos', DB::table('recurso')
                ->join('tipo_recurso', 'tipo_recurso.id', '=', 'recurso.tipo_recurso_id')
                ->where(fn ($q) => $q->where('recurso.codigo', 'ilike', $patron)
                    ->orWhere('recurso.marca', 'ilike', $patron)
                    ->orWhere('recurso.modelo', 'ilike', $patron)
                    ->orWhere('tipo_recurso.nombre', 'ilike', $patron))
                ->orderBy('recurso.codigo')
                ->limit($limite)
                ->get(['recurso.id', 'recurso.codigo', 'recurso.marca', 'recurso.modelo', 'recurso.estado', 'tipo_recurso.nombre as tipo'])
                ->map(fn ($r) => [
                    'id' => $r->id,
                    'titulo' => "{$r->codigo} - {$r->marca} {$r->modelo}",
                    'detalle' => "{$r->tipo} · {$r->estado}",
                    'ruta' => '/recursos?buscar='.urlencode($r->codigo),
                ]));
        }

        if ($puede('personal.listar')) {
            $grupos[] = $this->grupo('personal', 'Personal', DB::table('personal')
                ->join('usuario', 'usuario.id', '=', 'personal.usuario_id')
                ->where(fn ($q) => $q->whereRaw("usuario.nombre || ' ' || usuario.apellido ilike ?", [$patron])
                    ->orWhere('personal.cargo', 'ilike', $patron))
                ->orderBy('usuario.apellido')
                ->limit($limite)
                ->get(['personal.id', 'usuario.nombre', 'usuario.apellido', 'personal.cargo', 'personal.estado'])
                ->map(fn ($p) => [
                    'id' => $p->id,
                    'titulo' => "{$p->nombre} {$p->apellido}",
                    'detalle' => "{$p->cargo} · {$p->estado}",
                    'ruta' => '/personal?buscar='.urlencode($p->apellido),
                ]));
        }

        $grupos[] = $this->grupo('programas', 'Programas', DB::table('programa')
            ->when(! $puede('programas.listar'), fn ($q) => $q->where('estado', 'activo'))
            ->where(fn ($q) => $q->where('nombre', 'ilike', $patron)->orWhere('descripcion', 'ilike', $patron))
            ->orderBy('nombre')
            ->limit($limite)
            ->get(['id', 'nombre', 'tipo', 'descripcion'])
            ->map(fn ($p) => [
                'id' => $p->id,
                'titulo' => $p->nombre,
                'detalle' => $p->descripcion ?: $p->tipo,
                'ruta' => $puede('programas.listar') ? '/programas' : '/',
            ]));

        return array_values(array_filter($grupos, fn ($g) => count($g['resultados']) > 0));
    }

    private function grupo(string $tipo, string $titulo, $resultados): array
    {
        return ['tipo' => $tipo, 'titulo' => $titulo, 'resultados' => $resultados->values()->all()];
    }
}
