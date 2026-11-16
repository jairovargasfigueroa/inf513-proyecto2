import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, CheckCheck, Download, Lock, MonitorPlay, Pause, Pencil, Play, Plus, Radio, Trash2, Unlock } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Puede from '../../components/Puede';
import Campo from '../../components/ui/Campo';
import Cargando from '../../components/ui/Cargando';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import Insignia from '../../components/ui/Insignia';
import Modal from '../../components/ui/Modal';
import ResumenErrores from '../../components/ui/ResumenErrores';
import { useAuth } from '../../context/AuthContext';
import { useAvisos } from '../../context/AvisosContext';
import useFormulario from '../../hooks/useFormulario';
import api, { mensajeDeError } from '../../services/api';
import { ESTADOS_ESCALETA, TIPOS_ITEM, opciones, texto } from '../../utils/etiquetas';
import { duracion, fechaLarga } from '../../utils/formato';
import { entero, entre, max, requerido } from '../../validation/reglas';
import { TONO_ESCALETA } from './Escaletas';

const TONO_BALANCE = { ok: 'exito', exceso: 'peligro', deficit: 'acento' };

/** Descarga el CSV de la escaleta con el token de la sesión (exportar()). */
export async function descargarEscaleta(id, avisos) {
    try {
        const r = await api.get(`/escaletas/${id}/exportar`, { responseType: 'blob' });
        const nombre = /filename="?([^";]+)/.exec(r.headers['content-disposition'] ?? '')?.[1] ?? `escaleta-${id}.csv`;
        const url = URL.createObjectURL(r.data);
        const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        avisos.error(mensajeDeError(e));
    }
}

/**
 * Editor de Escaleta «client page» (CU-06): cargar(id), verTiemposPorBloque(),
 * onAgregarItem, onReordenar, onFlotar, onDarDeBaja, onCambiarEstado y
 * exportar(). Cada cambio devuelve el balance del bloque.
 */
export default function EditorEscaleta() {
    const { id } = useParams();
    const avisos = useAvisos();
    const { puede } = useAuth();
    const [esc, setEsc] = useState(null);
    const [error, setError] = useState(null);
    const [item, setItem] = useState({ abierto: false, datos: null, bloque: 'A' });
    const [emitir, setEmitir] = useState(false);
    const [pendientes, setPendientes] = useState(null);

    const cargar = useCallback(() => {
        api.get(`/escaletas/${id}`).then(({ data }) => setEsc(data)).catch((e) => setError(mensajeDeError(e)));
    }, [id]);
    useEffect(cargar, [cargar]);

    if (error) return <p className="text-peligro" role="alert">{error}</p>;
    if (!esc) return <Cargando />;

    const e = esc.data;
    const editable = e.estado === 'borrador' && puede('escaletas.items');

    const llamar = async (peticion) => {
        try {
            const { data } = await peticion();
            avisos.respuesta(data);
            cargar();
            return true;
        } catch (err) {
            if (err.response?.status === 422 && err.response.data?.pendientes) setPendientes(err.response.data.pendientes);
            else avisos.error(mensajeDeError(err));
            return false;
        }
    };

    const mover = (it, delta, lista) => {
        const visibles = lista.filter((x) => x.tipo !== 'corte' && x.estado !== 'baja');
        const pos = visibles.findIndex((x) => x.id === it.id) + 1 + delta;
        if (pos < 1 || pos > visibles.length) return;
        llamar(() => api.put(`/items/${it.id}`, { bloque: it.bloque, orden: pos, tipo: it.tipo, nota_id: it.nota_id, titulo: it.tipo === 'nota' ? null : it.titulo, presentador_id: it.presentador_id, duracion_estimada: it.duracion_estimada }));
    };

    const cambiarEstado = (estado, extra = {}) => llamar(() => api.put(`/escaletas/${e.id}/estado`, { estado, ...extra }));

    return (
        <section className="space-y-4">
            <EncabezadoPagina titulo={`${e.programa} · ${fechaLarga(e.fecha)}`} descripcion={`${e.hora_inicio} · ${duracion(e.duracion_total)} · plantilla ${e.plantilla} · responsable ${e.responsable}`} casoUso="CU-06 · Editor de Escaleta">
                <Link to="/escaletas" className="boton-secundario"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Escaletas</Link>
                <Puede permiso="escaletas.exportar"><button type="button" className="boton-secundario" onClick={() => descargarEscaleta(e.id, avisos)}><Download className="h-4 w-4" aria-hidden="true" /> Exportar</button></Puede>
                <Puede permiso="escaletas.lectura"><Link to={`/escaletas/${e.id}/presentador`} className="boton-secundario"><MonitorPlay className="h-4 w-4" aria-hidden="true" /> Modo presentador</Link></Puede>
            </EncabezadoPagina>

            <div className="tarjeta flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2">Estado: <Insignia tono={TONO_ESCALETA[e.estado]}>{texto(ESTADOS_ESCALETA, e.estado)}</Insignia>
                    {e.estado === 'emitida' && <span className="text-sm text-suave">salió {e.hora_inicio_real} · duró {duracion(e.duracion_real)}</span>}
                </span>
                <Puede permiso="escaletas.estado">
                    <div className="flex flex-wrap gap-2">
                        {e.estado === 'borrador' && <button type="button" className="boton" onClick={() => cambiarEstado('cerrada')}><Lock className="h-4 w-4" aria-hidden="true" /> Cerrar escaleta</button>}
                        {e.estado === 'cerrada' && (
                            <>
                                <button type="button" className="boton-secundario" onClick={() => cambiarEstado('borrador')}><Unlock className="h-4 w-4" aria-hidden="true" /> Reabrir</button>
                                <button type="button" className="boton" onClick={() => setEmitir(true)}><Radio className="h-4 w-4" aria-hidden="true" /> Registrar emisión</button>
                            </>
                        )}
                    </div>
                </Puede>
            </div>

            {e.estado === 'borrador' && esc.pendientes.length > 0 && (
                <div className="rounded-tema border border-acento p-3 text-sm" role="status">
                    <p className="mb-1 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-acento" aria-hidden="true" /> Lista de control: pendientes para cerrar</p>
                    <ul className="list-disc pl-8">{esc.pendientes.map((p) => <li key={p}>{p}</li>)}</ul>
                </div>
            )}

            {esc.bloques.map((b) => {
                const lista = esc.items.filter((i) => i.bloque === b.bloque);
                return (
                    <section key={b.bloque} className="tarjeta" aria-labelledby={`bloque-${b.bloque}`}>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h2 id={`bloque-${b.bloque}`} className="text-lg font-semibold">Bloque {b.bloque}</h2>
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span>Usado <strong>{duracion(b.tiempo_usado)}</strong> de {duracion(b.tiempo_disponible)}</span>
                                <Insignia tono={TONO_BALANCE[b.alerta]}>{b.alerta === 'ok' ? 'En tiempo' : b.alerta === 'exceso' ? `Exceso ${duracion(b.diferencia)}` : `Faltan ${duracion(-b.diferencia)}`}</Insignia>
                                {editable && <button type="button" className="boton-secundario" onClick={() => setItem({ abierto: true, datos: null, bloque: b.bloque })}><Plus className="h-4 w-4" aria-hidden="true" /> Agregar ítem</button>}
                            </div>
                        </div>
                        <ol className="divide-y divide-borde">
                            {lista.map((it) => (
                                <li key={it.id} className={`flex flex-wrap items-center gap-3 py-2 ${it.estado === 'baja' ? 'opacity-50 line-through' : it.estado === 'flotado' ? 'opacity-70' : ''} ${it.tipo === 'corte' ? 'bg-fondo px-2' : ''}`}>
                                    <span className="w-16 font-mono font-semibold">{it.pagina ?? '—'}</span>
                                    <span className="min-w-[12rem] flex-1">
                                        <span className="block font-medium">{it.slug ? <span className="font-mono">{it.slug}</span> : null} {it.titulo}</span>
                                        <span className="block text-sm text-suave">
                                            {texto(TIPOS_ITEM, it.tipo)}{it.presentador && ` · ${it.presentador}`}
                                            {it.estado === 'flotado' && ' · flotado (no suma tiempo)'}
                                        </span>
                                        <span className="flex flex-wrap gap-1">
                                            {it.nota_id && it.estado_nota !== 'aprobada' && it.estado_nota !== 'emitida' && <Insignia tono="peligro">Nota {it.estado_nota?.replace('_', ' ')}</Insignia>}
                                            {it.material_pendiente && <Insignia tono="acento">Material sin terminar</Insignia>}
                                        </span>
                                    </span>
                                    <span className="w-24 text-right text-sm">{it.duracion != null ? duracion(it.duracion) : '—'}<span className="block text-suave">{it.hora_salida ?? ''}</span></span>
                                    {editable && it.tipo !== 'corte' && it.estado !== 'baja' && (
                                        <span className="flex gap-1">
                                            <button type="button" className="boton-icono rounded-tema" onClick={() => mover(it, -1, lista)} aria-label={`Subir ${it.titulo}`} title="Subir"><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
                                            <button type="button" className="boton-icono rounded-tema" onClick={() => mover(it, 1, lista)} aria-label={`Bajar ${it.titulo}`} title="Bajar"><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
                                            <button type="button" className="boton-icono rounded-tema" onClick={() => setItem({ abierto: true, datos: it, bloque: it.bloque })} aria-label={`Ajustar ${it.titulo}`} title="Ajustar"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
                                            <button type="button" className="boton-icono rounded-tema" onClick={() => llamar(() => api.post(`/items/${it.id}/flotar`))} aria-label={it.estado === 'flotado' ? `Programar ${it.titulo}` : `Flotar ${it.titulo}`} title={it.estado === 'flotado' ? 'Volver a programar' : 'Flotar'}>
                                                {it.estado === 'flotado' ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
                                            </button>
                                            <button type="button" className="boton-icono rounded-tema text-peligro" onClick={() => llamar(() => api.delete(`/items/${it.id}`))} aria-label={`Dar de baja ${it.titulo}`} title="Dar de baja"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </section>
                );
            })}

            <FormularioItem abierto={item.abierto} item={item.datos} bloque={item.bloque} escaleta={e} alCerrar={() => setItem({ abierto: false, datos: null, bloque: 'A' })} alGuardar={(data) => { avisos.respuesta(data); setItem({ abierto: false, datos: null, bloque: 'A' }); cargar(); }} />
            <FormularioEmision abierto={emitir} escaleta={e} alCerrar={() => setEmitir(false)} alEnviar={async (d) => { if (await cambiarEstado('emitida', d)) setEmitir(false); }} />
            <Modal abierto={Boolean(pendientes)} alCerrar={() => setPendientes(null)} titulo="No se puede cerrar la escaleta" descripcion="La lista de control está incompleta:">
                <ul className="list-disc space-y-1 pl-6">{pendientes?.map((p) => <li key={p}>{p}</li>)}</ul>
                <div className="mt-6 flex justify-end"><button type="button" className="boton" onClick={() => setPendientes(null)}><CheckCheck className="h-4 w-4" aria-hidden="true" /> Entendido</button></div>
            </Modal>
        </section>
    );
}

/** FormularioItem «form»: POST /escaletas/{id}/items | PUT /items/{id} → 200 + balance del bloque. */
function FormularioItem({ abierto, item, bloque, escaleta, alCerrar, alGuardar }) {
    const editando = Boolean(item);
    const [notas, setNotas] = useState([]);
    const [presentadores, setPresentadores] = useState([]);
    const bloques = Array.from({ length: escaleta.cantidad_bloques }, (_, i) => String.fromCharCode(65 + i));
    const esquema = (d) => ({
        bloque: ['bloque', [requerido]],
        tipo: ['tipo', [requerido]],
        nota_id: ['nota', d.tipo === 'nota' ? [requerido] : []],
        titulo: ['título', d.tipo === 'nota' ? [] : [requerido, max(200)]],
        duracion_estimada: ['duración estimada', d.tipo === 'nota' ? [] : [requerido, entero, entre(0, 3600)]],
        orden: ['posición', [entero, entre(1, 998)]],
    });
    const vacio = { bloque, orden: '', tipo: 'nota', nota_id: '', titulo: '', presentador_id: '', duracion_estimada: '30' };
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario(vacio, esquema);

    useEffect(() => {
        if (!abierto) return;
        reiniciar(item
            ? { bloque: item.bloque, orden: String(item.orden), tipo: item.tipo, nota_id: item.nota_id ? String(item.nota_id) : '', titulo: item.tipo === 'nota' ? '' : item.titulo ?? '', presentador_id: item.presentador_id ? String(item.presentador_id) : '', duracion_estimada: String(item.duracion_estimada ?? 0) }
            : { ...vacio, bloque });
        api.get('/notas', { params: { estado: 'aprobada', todos: 1 } }).then(({ data }) => setNotas(data.data)).catch(() => setNotas([]));
        api.get('/personal', { params: { todos: 1, estado: 'activo' } }).then(({ data }) => setPresentadores(data.data.filter((p) => ['presentador', 'conductor'].includes(p.cargo)))).catch(() => setPresentadores([]));
    }, [abierto, item, bloque, reiniciar]);

    const guardar = async (ev) => {
        ev.preventDefault();
        const r = await enviar((d) => {
            const cuerpo = {
                bloque: d.bloque, orden: d.orden ? Number(d.orden) : null, tipo: d.tipo,
                nota_id: d.tipo === 'nota' ? Number(d.nota_id) : null, titulo: d.tipo === 'nota' ? null : d.titulo,
                presentador_id: d.presentador_id ? Number(d.presentador_id) : null,
                duracion_estimada: d.tipo === 'nota' ? null : Number(d.duracion_estimada),
            };
            return editando ? api.put(`/items/${item.id}`, cuerpo) : api.post(`/escaletas/${escaleta.id}/items`, cuerpo);
        });
        if (r) alGuardar(r.data);
    };

    const tiposItem = Object.fromEntries(Object.entries(TIPOS_ITEM).filter(([k]) => k !== 'corte'));
    const notasElegibles = notas.filter((n) => n.estado === 'aprobada' || String(n.id) === datos.nota_id);

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo={editando ? 'Ajustar ítem' : 'Agregar ítem'} descripcion="Solo entran notas aprobadas; la duración de una nota se calcula de su guion y su video." ancho="max-w-2xl">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4 sm:grid-cols-3">
                    <Campo como="select" etiqueta="Bloque" nombre="bloque" value={datos.bloque} onChange={cambiar} error={errores.bloque} requerido opciones={bloques.map((b) => ({ valor: b, texto: `Bloque ${b}` }))} />
                    <Campo etiqueta="Posición" nombre="orden" type="number" min={1} value={datos.orden} onChange={cambiar} error={errores.orden} ayuda="Vacío: al final del bloque." />
                    <Campo como="select" etiqueta="Tipo" nombre="tipo" value={datos.tipo} onChange={cambiar} error={errores.tipo} requerido opciones={opciones(tiposItem)} />
                    {datos.tipo === 'nota' ? (
                        <Campo como="select" etiqueta="Nota aprobada" nombre="nota_id" value={datos.nota_id} onChange={cambiar} error={errores.nota_id} requerido vacio={notasElegibles.length ? 'Elija la nota' : 'No hay notas aprobadas'} opciones={notasElegibles.map((n) => ({ valor: String(n.id), texto: `${n.slug} · ${n.titulo} (${duracion(n.duracion_total)})` }))} className="sm:col-span-3" />
                    ) : (
                        <>
                            <Campo etiqueta="Título" nombre="titulo" value={datos.titulo} onChange={cambiar} error={errores.titulo} requerido maxLength={200} className="sm:col-span-2" />
                            <Campo etiqueta="Duración (s)" nombre="duracion_estimada" type="number" min={0} max={3600} value={datos.duracion_estimada} onChange={cambiar} error={errores.duracion_estimada} requerido />
                        </>
                    )}
                    <Campo como="select" etiqueta="Presentador" nombre="presentador_id" value={datos.presentador_id} onChange={cambiar} error={errores.presentador_id} vacio="Sin presentador" opciones={presentadores.map((p) => ({ valor: String(p.id), texto: p.nombre_completo }))} className="sm:col-span-3" />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button>
                </div>
            </form>
        </Modal>
    );
}

/** Registra la emisión real (cerrada → emitida). */
function FormularioEmision({ abierto, escaleta, alCerrar, alEnviar }) {
    const { datos, errores, cambiar, reiniciar, enviar } = useFormulario(
        { hora_inicio_real: escaleta.hora_inicio, minutos: String(Math.round(escaleta.duracion_total / 60)) },
        { hora_inicio_real: ['hora de inicio real', [requerido]], minutos: ['duración real', [requerido, entero, entre(1, 240)]] },
    );
    useEffect(() => { if (abierto) reiniciar({ hora_inicio_real: escaleta.hora_inicio, minutos: String(Math.round(escaleta.duracion_total / 60)) }); }, [abierto, escaleta, reiniciar]);

    const guardar = (ev) => {
        ev.preventDefault();
        enviar((d) => alEnviar({ hora_inicio_real: d.hora_inicio_real, duracion_real: Number(d.minutos) * 60 }));
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo="Registrar emisión" descripcion="La escaleta queda como historial y sus notas pasan a emitidas.">
            <form onSubmit={guardar} noValidate className="space-y-4">
                <ResumenErrores errores={errores} />
                <Campo etiqueta="Hora real de salida al aire" nombre="hora_inicio_real" type="time" value={datos.hora_inicio_real} onChange={cambiar} error={errores.hora_inicio_real} requerido />
                <Campo etiqueta="Duración real (minutos)" nombre="minutos" type="number" min={1} value={datos.minutos} onChange={cambiar} error={errores.minutos} requerido />
                <div className="flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton">Registrar emisión</button>
                </div>
            </form>
        </Modal>
    );
}
