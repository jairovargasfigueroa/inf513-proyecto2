<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ReglaNegocioException;
use App\Http\Controllers\Controller;
use App\Http\Requests\NotaRequest;
use App\Models\Nota;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * NotaController «server page» (CU-05): Gestión de Notas, Detalle de Nota e
 * Historial del Guion. Las transiciones inválidas del flujo de aprobación
 * responden 422 (diagrama: «200 / 422 transición inválida»).
 */
class NotaController extends Controller
{
    /** GET /api/v1/notas?buscar=&estado=&fecha=&mias=1 (notas.listar). */
    public function index(Request $request): JsonResponse
    {
        $f = $request->validate([
            'buscar' => ['nullable', 'string', 'max:100'],
            'estado' => ['nullable', 'in:borrador,en_revision,observada,aprobada,emitida,baja'],
            'fecha' => ['nullable', 'date_format:Y-m-d'],
            'mias' => ['nullable', 'boolean'],
            'todos' => ['nullable', 'boolean'],
        ]);

        $consulta = DB::table('nota as n')
            ->join('personal as p', 'p.id', '=', 'n.autor_id')
            ->join('usuario as u', 'u.id', '=', 'p.usuario_id')
            ->join('v_nota_duracion as d', 'd.nota_id', '=', 'n.id')
            ->when($f['buscar'] ?? null, function ($q, $t) {
                $patron = '%'.addcslashes($t, '%_\\').'%';
                $q->where(fn ($w) => $w->where('n.slug', 'ilike', $patron)->orWhere('n.titulo', 'ilike', $patron));
            })
            ->when($f['estado'] ?? null, fn ($q, $e) => $q->where('n.estado', $e), fn ($q) => $q->where('n.estado', '<>', 'baja'))
            ->when($f['fecha'] ?? null, fn ($q, $fecha) => $q->where('n.fecha', $fecha))
            ->when($request->boolean('mias'), fn ($q) => $q->where('n.autor_id', $request->user()->personal?->id ?? 0))
            ->orderByDesc('n.fecha')
            ->orderBy('n.slug')
            ->select('n.id', 'n.slug', 'n.titulo', 'n.tipo_pieza', 'n.fecha', 'n.estado', 'n.palabras', 'n.autor_id',
                DB::raw("u.nombre || ' ' || u.apellido AS autor"), 'd.duracion_total',
                DB::raw('(SELECT COUNT(*) FROM material_audiovisual m WHERE m.nota_id = n.id) AS material'));

        if ($request->boolean('todos')) {
            return response()->json(['data' => $consulta->limit(200)->get()]);
        }

        $pagina = $consulta->paginate(15);

        return response()->json([
            'data' => $pagina->items(),
            'meta' => ['current_page' => $pagina->currentPage(), 'last_page' => $pagina->lastPage(), 'total' => $pagina->total()],
        ]);
    }

    /** GET /api/v1/notas/{id} (notas.listar): nota completa con guion, rótulos, revisiones y duración. */
    public function show(Request $request, Nota $nota): JsonResponse
    {
        return response()->json($this->detalle($nota, $request->user()));
    }

    /** POST /api/v1/notas (notas.crear) → 201. El autor es el usuario, que necesita ficha de personal. */
    public function store(NotaRequest $request): JsonResponse
    {
        $autor = $request->user()->personal;
        if (! $autor || $autor->estado !== 'activo') {
            throw new ReglaNegocioException('Para redactar notas necesita una ficha de personal activa.');
        }

        $nota = DB::transaction(function () use ($request, $autor) {
            $guion = (string) $request->guion;
            $nota = Nota::create([
                ...$request->safe()->except('guion'),
                'guion' => $guion,
                'palabras' => Nota::contarPalabras($guion),
                'autor_id' => $autor->id,
            ]);
            if (trim($guion) !== '') {
                $this->guardarVersion($nota, $request->user()->id);
            }

            return $nota;
        });

        return response()->json(['message' => "Nota {$nota->slug} redactada.", 'data' => $this->detalle($nota, $request->user())['data']], 201);
    }

    /** PUT /api/v1/notas/{id} (notas.editar): datos de la nota (el guion va por PUT …/guion). */
    public function update(NotaRequest $request, Nota $nota): JsonResponse
    {
        $this->exigirEditable($request->user(), $nota);
        $nota->update($request->validated());

        return response()->json(['message' => "Nota {$nota->slug} modificada.", 'data' => $this->detalle($nota, $request->user())['data']]);
    }

    /** DELETE /api/v1/notas/{id} (notas.baja): baja lógica, salvo que esté en una escaleta. */
    public function destroy(Request $request, Nota $nota): JsonResponse
    {
        $this->exigirEditable($request->user(), $nota);

        $escaleta = DB::table('item_escaleta')->where('nota_id', $nota->id)->whereIn('estado', ['programado', 'flotado'])->value('escaleta_id');
        if ($escaleta) {
            throw new ReglaNegocioException("La nota está en la escaleta $escaleta: quítela de la escaleta antes de darla de baja.");
        }

        $nota->update(['estado' => 'baja']);

        return response()->json(['message' => "Nota {$nota->slug} dada de baja."]);
    }

    /** PUT /api/v1/notas/{id}/guion (notas.guion): versión nueva; si estaba aprobada vuelve a revisión (R14). */
    public function guion(Request $request, Nota $nota): JsonResponse
    {
        $this->exigirEditable($request->user(), $nota);
        $d = $request->validate(['guion' => ['required', 'string', 'max:20000']], [], ['guion' => 'guion']);

        $volvio = DB::transaction(function () use ($request, $nota, $d) {
            $volvio = $nota->estado === 'aprobada';
            $nota->update([
                'guion' => $d['guion'],
                'palabras' => Nota::contarPalabras($d['guion']),
                'estado' => $volvio ? 'en_revision' : $nota->estado,
            ]);
            $this->guardarVersion($nota, $request->user()->id);

            return $volvio;
        });

        return response()->json([
            'message' => 'Guion guardado como versión nueva.',
            'avisos' => $volvio ? ['La nota estaba aprobada: vuelve a revisión.'] : [],
            'data' => $this->detalle($nota, $request->user())['data'],
        ]);
    }

    /** GET /api/v1/notas/{id}/versiones (notas.listar): historial del guion. */
    public function versiones(Nota $nota): JsonResponse
    {
        return response()->json(['data' => DB::select(
            "SELECT v.numero, v.guion, v.palabras, u.nombre || ' ' || u.apellido AS autor,
                    to_char(v.fecha_hora, 'YYYY-MM-DD HH24:MI') AS fecha_hora
             FROM nota_version v JOIN usuario u ON u.id = v.usuario_id
             WHERE v.nota_id = ? ORDER BY v.numero DESC",
            [$nota->id],
        )]);
    }

    /** POST /api/v1/notas/{id}/enviar (notas.enviar): borrador u observada → en revisión (R15). */
    public function enviar(Request $request, Nota $nota): JsonResponse
    {
        $this->exigirEditable($request->user(), $nota);
        if (! in_array($nota->estado, ['borrador', 'observada'], true)) {
            abort(422, 'Solo se envía a revisión una nota en borrador u observada.');
        }
        if (trim($nota->guion) === '') {
            abort(422, 'La nota no tiene guion: cárguelo antes de enviarla a revisión.');
        }

        return $this->transicion($request, $nota, 'en_revision', 'envio', null, 'Nota enviada a revisión.');
    }

    /** POST /api/v1/notas/{id}/aprobar (notas.aprobar): solo una nota en revisión. */
    public function aprobar(Request $request, Nota $nota): JsonResponse
    {
        $this->exigirEnRevision($nota);

        return $this->transicion($request, $nota, 'aprobada', 'aprobacion', null, 'Nota aprobada.');
    }

    /** POST /api/v1/notas/{id}/observar (notas.observar): vuelve al autor con el motivo. */
    public function observar(Request $request, Nota $nota): JsonResponse
    {
        $d = $request->validate(['motivo' => ['required', 'string', 'min:5', 'max:255']], [], ['motivo' => 'motivo de la observación']);
        $this->exigirEnRevision($nota);

        return $this->transicion($request, $nota, 'observada', 'observacion', $d['motivo'], 'Nota observada: vuelve al autor.');
    }

    // ── Ayudas ────────────────────────────────────────────────────────────

    private function transicion(Request $request, Nota $nota, string $estado, string $accion, ?string $motivo, string $mensaje): JsonResponse
    {
        DB::transaction(function () use ($request, $nota, $estado, $accion, $motivo) {
            $nota->update(['estado' => $estado]);
            DB::table('revision_nota')->insert(['nota_id' => $nota->id, 'usuario_id' => $request->user()->id, 'accion' => $accion, 'motivo' => $motivo]);
        });

        return response()->json(['message' => $mensaje, 'data' => $this->detalle($nota, $request->user())['data']]);
    }

    private function exigirEnRevision(Nota $nota): void
    {
        if ($nota->estado !== 'en_revision') {
            abort(422, 'La nota no está en revisión.');
        }
    }

    /** A5: solo el autor o el Jefe de Prensa la modifican, y solo si no fue emitida ni dada de baja. */
    private function exigirEditable(Usuario $usuario, Nota $nota): void
    {
        if (! in_array($nota->estado, Nota::EDITABLES, true)) {
            throw new ReglaNegocioException("La nota está {$nota->estado}: ya no se modifica.");
        }
        if (! $this->puedeModificar($usuario, $nota)) {
            throw new ReglaNegocioException('Solo el autor o el Jefe de Prensa pueden modificar esta nota.');
        }
    }

    private function puedeModificar(Usuario $usuario, Nota $nota): bool
    {
        return $usuario->tienePermiso('notas.aprobar') || $usuario->personal?->id === $nota->autor_id;
    }

    private function guardarVersion(Nota $nota, int $usuarioId): void
    {
        DB::insert(
            'INSERT INTO nota_version (nota_id, numero, guion, palabras, usuario_id)
             SELECT ?, COALESCE(MAX(numero), 0) + 1, ?, ?, ? FROM nota_version WHERE nota_id = ?',
            [$nota->id, $nota->guion, $nota->palabras, $usuarioId, $nota->id],
        );
    }

    private function detalle(Nota $nota, Usuario $usuario): array
    {
        $nota->refresh();
        $fila = DB::selectOne(
            "SELECT u.nombre || ' ' || u.apellido AS autor, c.titulo AS cobertura, d.duracion_lectura, d.duracion_video, d.duracion_total
             FROM nota n JOIN personal p ON p.id = n.autor_id JOIN usuario u ON u.id = p.usuario_id
             JOIN v_nota_duracion d ON d.nota_id = n.id LEFT JOIN cobertura c ON c.id = n.cobertura_id
             WHERE n.id = ?",
            [$nota->id],
        );

        return [
            'data' => [
                ...$nota->only(['id', 'slug', 'titulo', 'tipo_pieza', 'guion', 'palabras', 'estado', 'cobertura_id', 'autor_id']),
                'fecha' => $nota->fecha->format('Y-m-d'),
                'autor' => $fila->autor,
                'cobertura' => $fila->cobertura,
                'duracion' => ['lectura' => $fila->duracion_lectura, 'video' => $fila->duracion_video, 'total' => $fila->duracion_total],
                'puede_modificar' => in_array($nota->estado, Nota::EDITABLES, true) && $this->puedeModificar($usuario, $nota),
            ],
            'rotulos' => DB::table('nota_rotulo')->where('nota_id', $nota->id)->orderBy('orden')->get(['orden', 'nombre', 'cargo']),
            'revisiones' => DB::select(
                "SELECT r.accion, r.motivo, u.nombre || ' ' || u.apellido AS usuario, to_char(r.fecha_hora, 'YYYY-MM-DD HH24:MI') AS fecha_hora
                 FROM revision_nota r JOIN usuario u ON u.id = r.usuario_id WHERE r.nota_id = ? ORDER BY r.fecha_hora DESC, r.id DESC",
                [$nota->id],
            ),
        ];
    }
}
