import { AlertTriangle, ArrowLeft, ClipboardCheck, FileText, Trash2, UserPlus, Video } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Puede from '../../components/Puede';
import Campo from '../../components/ui/Campo';
import Cargando from '../../components/ui/Cargando';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import Insignia from '../../components/ui/Insignia';
import Modal from '../../components/ui/Modal';
import ResumenErrores from '../../components/ui/ResumenErrores';
import TablaDatos from '../../components/ui/TablaDatos';
import { useAuth } from '../../context/AuthContext';
import { useAvisos } from '../../context/AvisosContext';
import useFormulario from '../../hooks/useFormulario';
import api, { mensajeDeError } from '../../services/api';
import { CARGOS, ESTADOS_COBERTURA, ESTADOS_RECURSO, FUNCIONES, PRIORIDADES, TIPOS_COBERTURA, opciones, texto } from '../../utils/etiquetas';
import { fechaHora, fechaLarga, hora, hoy } from '../../utils/formato';
import { max, requerido, requeridoSi } from '../../validation/reglas';
import { TONO_ESTADO } from './AgendaCoberturas';

/** Funciones que puede cumplir cada cargo (L6, igual que el servidor). */
const FUNCION_DEL_CARGO = { periodista: 'periodista', jefe_prensa: 'periodista', camarografo: 'camarografo', conductor: 'conductor', presentador: 'conductor' };

/**
 * Detalle de Cobertura «client page» (CU-04): cargar(id) con GET /coberturas/{id};
 * asignar y quitar personal, reservar y liberar recursos, ver la hoja y
 * registrar el retorno. Las respuestas 201 / 409 conflicto vuelven aquí.
 */
export default function DetalleCobertura() {
    const { id } = useParams();
    const avisos = useAvisos();
    const { puede } = useAuth();
    const [detalle, setDetalle] = useState(null);
    const [error, setError] = useState(null);
    const [abierto, setAbierto] = useState(null); // 'asignacion' | 'reserva' | 'retorno'

    const cargar = useCallback(() => {
        api.get(`/coberturas/${id}`).then(({ data }) => setDetalle(data)).catch((e) => setError(mensajeDeError(e)));
    }, [id]);
    useEffect(cargar, [cargar]);

    if (error) return <p className="text-peligro" role="alert">{error}</p>;
    if (!detalle) return <Cargando />;

    const c = detalle.data;
    const activa = ['planificada', 'en_curso'].includes(c.estado);

    const quitar = async (url) => {
        try {
            const { data } = await api.delete(url);
            avisos.respuesta(data);
            cargar();
        } catch (e) {
            avisos.error(mensajeDeError(e));
        }
    };

    const listo = (data) => {
        avisos.respuesta(data);
        setAbierto(null);
        cargar();
    };

    const filas = [
        ['Fecha', `${fechaLarga(c.fecha_hora_inicio)}, ${hora(c.fecha_hora_inicio)} a ${hora(c.fecha_hora_fin)}`],
        ['Lugar', c.lugar], ['Tipo', texto(TIPOS_COBERTURA, c.tipo)], ['Prioridad', texto(PRIORIDADES, c.prioridad)],
        ['Tema', c.tema ?? '—'], ['Fuente o contacto', c.fuente ?? '—'], ['Indicaciones', c.indicaciones ?? '—'], ['Planificada por', c.creado_por ?? '—'],
    ];

    return (
        <section className="space-y-4">
            <EncabezadoPagina titulo={c.titulo} descripcion={<Insignia tono={TONO_ESTADO[c.estado]}>{texto(ESTADOS_COBERTURA, c.estado)}</Insignia>} casoUso="CU-04 · Detalle de Cobertura">
                <Link to={`/coberturas?fecha=${c.fecha_hora_inicio.slice(0, 10)}`} className="boton-secundario"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Agenda</Link>
                <Puede permiso="coberturas.hoja"><Link to={`/coberturas/${c.id}/hoja`} className="boton-secundario"><FileText className="h-4 w-4" aria-hidden="true" /> Hoja de asignación</Link></Puede>
                {activa && <Puede permiso="coberturas.retorno"><button type="button" className="boton" onClick={() => setAbierto('retorno')}><ClipboardCheck className="h-4 w-4" aria-hidden="true" /> Registrar retorno</button></Puede>}
            </EncabezadoPagina>

            {detalle.advertencias.length > 0 && (
                <div className="rounded-tema border border-acento p-3 text-sm" role="status">
                    {detalle.advertencias.map((a) => <p key={a} className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-acento" aria-hidden="true" /> {a}</p>)}
                </div>
            )}

            <dl className="tarjeta grid gap-x-6 gap-y-2 sm:grid-cols-[11rem_1fr]">
                {filas.map(([e, v]) => <div key={e} className="contents"><dt className="font-medium text-suave">{e}</dt><dd className="whitespace-pre-line">{v}</dd></div>)}
            </dl>

            {c.fecha_hora_retorno && (
                <div className="tarjeta">
                    <h2 className="text-lg font-semibold">Retorno</h2>
                    <p className="text-sm text-suave">Registrado el {fechaHora(c.fecha_hora_retorno)}</p>
                    <p className="mt-2 whitespace-pre-line">{c.parte_retorno ?? 'Sin parte.'}</p>
                    {c.incidencias_retorno && <p className="mt-2 whitespace-pre-line text-peligro">Incidencias: {c.incidencias_retorno}</p>}
                </div>
            )}

            <div className="tarjeta">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">Equipo humano</h2>
                    {activa && <Puede permiso="coberturas.asignar"><button type="button" className="boton-secundario" onClick={() => setAbierto('asignacion')}><UserPlus className="h-4 w-4" aria-hidden="true" /> Asignar personal</button></Puede>}
                </div>
                <TablaDatos
                    clave="personal_id"
                    filas={detalle.equipo}
                    vacio="Todavía no hay personal asignado."
                    columnas={[
                        { titulo: 'Persona', campo: 'nombre' },
                        { titulo: 'Función', celda: (p) => texto(FUNCIONES, p.funcion) },
                        { titulo: 'Cargo', celda: (p) => texto(CARGOS, p.cargo) },
                        { titulo: 'Teléfono', celda: (p) => p.telefono ?? '—' },
                        ...(activa && puede('coberturas.asignar') ? [{
                            titulo: 'Quitar', oculto: true, alinear: 'derecha',
                            celda: (p) => <button type="button" className="boton-icono rounded-tema text-peligro" onClick={() => quitar(`/coberturas/${c.id}/personal/${p.personal_id}`)} aria-label={`Quitar a ${p.nombre}`} title="Quitar"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>,
                        }] : []),
                    ]}
                />
            </div>

            <div className="tarjeta">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">Equipos y unidad móvil</h2>
                    {activa && <Puede permiso="coberturas.reservar"><button type="button" className="boton-secundario" onClick={() => setAbierto('reserva')}><Video className="h-4 w-4" aria-hidden="true" /> Reservar recurso</button></Puede>}
                </div>
                <TablaDatos
                    filas={detalle.recursos}
                    vacio="Todavía no hay recursos reservados."
                    columnas={[
                        { titulo: 'Código', celda: (r) => <span className="font-mono font-semibold">{r.codigo}</span> },
                        { titulo: 'Equipo', celda: (r) => `${r.tipo} · ${r.equipo}${r.placa ? ` · ${r.placa}` : ''}` },
                        { titulo: 'Estado', celda: (r) => texto(ESTADOS_RECURSO, r.estado) },
                        ...(activa && puede('coberturas.reservar') ? [{
                            titulo: 'Liberar', oculto: true, alinear: 'derecha',
                            celda: (r) => <button type="button" className="boton-icono rounded-tema text-peligro" onClick={() => quitar(`/coberturas/${c.id}/recursos/${r.id}`)} aria-label={`Liberar ${r.codigo}`} title="Liberar"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>,
                        }] : []),
                    ]}
                />
            </div>

            <FormularioAsignacion abierto={abierto === 'asignacion'} cobertura={c} asignados={detalle.equipo.map((p) => p.personal_id)} alCerrar={() => setAbierto(null)} alGuardar={listo} />
            <FormularioReserva abierto={abierto === 'reserva'} cobertura={c} reservados={detalle.recursos.map((r) => r.id)} alCerrar={() => setAbierto(null)} alGuardar={listo} />
            <FormularioRetorno abierto={abierto === 'retorno'} cobertura={c} alCerrar={() => setAbierto(null)} alGuardar={listo} />
        </section>
    );
}

/** FormularioAsignacion «form»: POST /coberturas/{id}/personal → 201 / 409 conflicto. */
function FormularioAsignacion({ abierto, cobertura, asignados, alCerrar, alGuardar }) {
    const { puede } = useAuth();
    const [personal, setPersonal] = useState([]);
    const [libres, setLibres] = useState(null);
    const { datos, errores, mensaje, enviando, cambiar, asignar, reiniciar, enviar } = useFormulario(
        { personal_id: '', funcion: '' },
        { personal_id: ['persona', [requerido]], funcion: ['función', [requerido]] },
    );

    useEffect(() => {
        if (!abierto) return;
        reiniciar({ personal_id: '', funcion: '' });
        api.get('/personal', { params: { todos: 1, estado: 'activo' } }).then(({ data }) => setPersonal(data.data)).catch(() => {});
        if (puede('personal.disponibilidad')) {
            const [fecha, h] = cobertura.fecha_hora_inicio.split(' ');
            api.get('/personal/disponibilidad', { params: { fecha, hora: h } }).then(({ data }) => setLibres(new Set(data.data.map((p) => p.id)))).catch(() => {});
        }
    }, [abierto, cobertura, puede, reiniciar]);

    const candidatos = personal.filter((p) => FUNCION_DEL_CARGO[p.cargo] && !asignados.includes(p.id));

    const elegir = (e) => {
        cambiar(e);
        const p = personal.find((x) => String(x.id) === e.target.value);
        if (p) asignar('funcion', FUNCION_DEL_CARGO[p.cargo]);
    };

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => api.post(`/coberturas/${cobertura.id}/personal`, { personal_id: Number(d.personal_id), funcion: d.funcion }));
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo="Asignar personal" descripcion="Se rechaza a quien tenga una ausencia u otra cobertura en ese horario.">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4">
                    <Campo
                        como="select" etiqueta="Persona" nombre="personal_id" value={datos.personal_id} onChange={elegir} error={errores.personal_id} requerido vacio="Elija una persona"
                        opciones={candidatos.map((p) => ({ valor: String(p.id), texto: `${p.nombre_completo} · ${texto(CARGOS, p.cargo)}${libres ? (libres.has(p.id) ? ' · disponible' : ' · no disponible al inicio') : ''}` }))}
                        ayuda={libres ? '«Disponible» = en su turno, sin ausencia ni otra cobertura a la hora de inicio.' : undefined}
                    />
                    <Campo como="select" etiqueta="Función" nombre="funcion" value={datos.funcion} onChange={cambiar} error={errores.funcion} requerido vacio="Elija la función" opciones={opciones(FUNCIONES)} ayuda="Conductor: también un presentador. Periodista: también el Jefe de Prensa." />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Asignando…' : 'Asignar'}</button>
                </div>
            </form>
        </Modal>
    );
}

/** FormularioReserva «form»: POST /coberturas/{id}/recursos → 201 / 409 conflicto. */
function FormularioReserva({ abierto, cobertura, reservados, alCerrar, alGuardar }) {
    const [recursos, setRecursos] = useState([]);
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario({ recurso_id: '' }, { recurso_id: ['recurso', [requerido]] });

    useEffect(() => {
        if (!abierto) return;
        reiniciar({ recurso_id: '' });
        api.get('/recursos', { params: { todos: 1, estado: 'operativo' } }).then(({ data }) => setRecursos(data.data)).catch(() => {});
    }, [abierto, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => api.post(`/coberturas/${cobertura.id}/recursos`, { recurso_id: Number(d.recurso_id) }));
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo="Reservar recurso" descripcion="Se rechaza un recurso reservado para otra cobertura en ese horario.">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <Campo como="select" etiqueta="Recurso operativo" nombre="recurso_id" value={datos.recurso_id} onChange={cambiar} error={errores.recurso_id} requerido vacio="Elija un recurso" opciones={recursos.filter((r) => !reservados.includes(r.id)).map((r) => ({ valor: String(r.id), texto: `${r.codigo} · ${r.tipo} ${r.marca} ${r.modelo}` }))} />
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Reservando…' : 'Reservar'}</button>
                </div>
            </form>
        </Modal>
    );
}

const ahora = () => {
    const d = new Date();
    return `${hoy()}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** FormularioRetorno «form»: POST /coberturas/{id}/retorno → 200 retorno registrado y recursos liberados. */
function FormularioRetorno({ abierto, cobertura, alCerrar, alGuardar }) {
    const esquema = (d) => ({
        estado: ['resultado', [requerido]],
        parte: ['parte de la cobertura', [requeridoSi(d.estado === 'cumplida', 'Describa el resultado de la cobertura cumplida.'), max(2000)]],
        incidencias: ['incidencias', [max(2000)]],
        fecha_retorno: ['fecha de retorno', [requerido]],
    });
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario({ estado: 'cumplida', parte: '', incidencias: '', fecha_retorno: ahora() }, esquema);

    useEffect(() => {
        if (abierto) reiniciar({ estado: 'cumplida', parte: '', incidencias: '', fecha_retorno: ahora() });
    }, [abierto, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => api.post(`/coberturas/${cobertura.id}/retorno`, { ...d, parte: d.parte || null, incidencias: d.incidencias || null }));
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo="Registrar retorno" descripcion="Con cualquier resultado, el personal y los recursos quedan libres y se cierran las entregas de esta cobertura.">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Campo como="select" etiqueta="Resultado" nombre="estado" value={datos.estado} onChange={cambiar} error={errores.estado} requerido opciones={opciones({ cumplida: 'Cumplida', cancelada: 'Cancelada', reprogramada: 'Reprogramada' })} />
                    <Campo etiqueta="Fecha y hora de retorno" nombre="fecha_retorno" type="datetime-local" value={datos.fecha_retorno} onChange={cambiar} error={errores.fecha_retorno} requerido max={ahora()} />
                    <Campo como="textarea" etiqueta="Parte de la cobertura" nombre="parte" value={datos.parte} onChange={cambiar} error={errores.parte} requerido={datos.estado === 'cumplida'} maxLength={2000} className="sm:col-span-2" />
                    <Campo como="textarea" etiqueta="Incidencias" nombre="incidencias" value={datos.incidencias} onChange={cambiar} error={errores.incidencias} maxLength={2000} className="sm:col-span-2" ayuda="Problemas en el lugar, con el equipo o con la fuente." />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Registrar retorno'}</button>
                </div>
            </form>
        </Modal>
    );
}
