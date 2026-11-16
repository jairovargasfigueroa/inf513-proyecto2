import { CalendarPlus, ChevronLeft, ChevronRight, Copy, Eye, Pencil, Users, Video, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Puede from '../../components/Puede';
import Campo from '../../components/ui/Campo';
import Cargando from '../../components/ui/Cargando';
import Confirmar from '../../components/ui/Confirmar';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import Insignia from '../../components/ui/Insignia';
import Modal from '../../components/ui/Modal';
import ResumenErrores from '../../components/ui/ResumenErrores';
import { useAvisos } from '../../context/AvisosContext';
import useFormulario from '../../hooks/useFormulario';
import api, { mensajeDeError } from '../../services/api';
import { ESTADOS_COBERTURA, PRIORIDADES, TIPOS_COBERTURA, opciones, texto } from '../../utils/etiquetas';
import { fechaLarga, hora, hoy } from '../../utils/formato';
import { requerido } from '../../validation/reglas';
import FormularioCobertura from './FormularioCobertura';

export const TONO_ESTADO = { planificada: 'acento', en_curso: 'exito', cumplida: 'exito', cancelada: 'neutro', reprogramada: 'neutro' };
const ACTIVAS = ['planificada', 'en_curso'];

const sumarDias = (fecha, dias) => {
    const d = new Date(`${fecha}T00:00:00`);
    d.setDate(d.getDate() + dias);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Agenda de Coberturas «client page» (CU-04): listar(fecha, vista) con
 * GET /coberturas; onNueva / onEditar abren FormularioCobertura, onDuplicar
 * abre FormularioDuplicar, onCancelar envía DELETE y verDetalle abre el Detalle.
 */
export default function AgendaCoberturas() {
    const avisos = useAvisos();
    const [parametros, setParametros] = useSearchParams();
    const fecha = parametros.get('fecha') ?? hoy();
    const vista = parametros.get('vista') ?? 'semana';
    const [filtros, setFiltros] = useState({ estado: '', tipo: '' });
    const [agenda, setAgenda] = useState(null);
    const [error, setError] = useState(null);
    const [formulario, setFormulario] = useState({ abierto: false, cobertura: null });
    const [duplicar, setDuplicar] = useState(null);
    const [cancelar, setCancelar] = useState(null);

    const listar = useCallback(() => {
        setError(null);
        api.get('/coberturas', { params: { fecha, vista, estado: filtros.estado || undefined, tipo: filtros.tipo || undefined } })
            .then(({ data }) => setAgenda(data))
            .catch((e) => setError(mensajeDeError(e)));
    }, [fecha, vista, filtros]);

    useEffect(listar, [listar]);

    const ir = (cambios) => setParametros({ fecha, vista, ...cambios });
    const mover = (sentido) => ir({ fecha: sumarDias(fecha, sentido * (vista === 'semana' ? 7 : 1)) });

    const abrirEdicion = async (c) => {
        try {
            const { data } = await api.get(`/coberturas/${c.id}`);
            setFormulario({ abierto: true, cobertura: data.data });
        } catch (e) {
            avisos.error(mensajeDeError(e));
        }
    };

    const confirmarCancelacion = async () => {
        try {
            const { data } = await api.delete(`/coberturas/${cancelar.id}`);
            avisos.respuesta(data);
            listar();
        } catch (e) {
            avisos.error(mensajeDeError(e));
        } finally {
            setCancelar(null);
        }
    };

    const listo = (data) => {
        avisos.respuesta(data);
        setFormulario({ abierto: false, cobertura: null });
        setDuplicar(null);
        listar();
    };

    const dias = agenda
        ? Array.from({ length: vista === 'semana' ? 7 : 1 }, (_, i) => sumarDias(agenda.desde, i))
        : [];

    const tarjeta = (c) => (
        <article key={c.id} className={`rounded-tema border border-borde bg-fondo p-3 ${ACTIVAS.includes(c.estado) ? '' : 'opacity-70'}`}>
            <p className="text-sm font-semibold text-primario">{hora(c.fecha_hora_inicio)} – {hora(c.fecha_hora_fin)}</p>
            <h3 className="font-semibold leading-snug">
                <Link to={`/coberturas/${c.id}`} className="hover:underline">{c.titulo}</Link>
            </h3>
            <p className="text-sm text-suave">{c.lugar}</p>
            <div className="mt-2 flex flex-wrap gap-1">
                <Insignia tono={TONO_ESTADO[c.estado]}>{texto(ESTADOS_COBERTURA, c.estado)}</Insignia>
                <Insignia tono={c.prioridad === 'alta' ? 'peligro' : 'neutro'}>Prioridad {texto(PRIORIDADES, c.prioridad).toLowerCase()}</Insignia>
            </div>
            <p className="mt-2 flex gap-3 text-xs text-suave">
                <span className="flex items-center gap-1" title="Personal asignado"><Users className="h-3.5 w-3.5" aria-hidden="true" /> {c.personal}<span className="sr-only"> personas</span></span>
                <span className="flex items-center gap-1" title="Recursos reservados"><Video className="h-3.5 w-3.5" aria-hidden="true" /> {c.recursos}<span className="sr-only"> recursos</span></span>
                <span>{texto(TIPOS_COBERTURA, c.tipo)}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
                <Link to={`/coberturas/${c.id}`} className="boton-icono rounded-tema" aria-label={`Ver detalle de ${c.titulo}`} title="Ver detalle"><Eye className="h-4 w-4" aria-hidden="true" /></Link>
                {ACTIVAS.includes(c.estado) && (
                    <>
                        <Puede permiso="coberturas.editar">
                            <button type="button" className="boton-icono rounded-tema" onClick={() => abrirEdicion(c)} aria-label={`Reprogramar ${c.titulo}`} title="Reprogramar"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
                        </Puede>
                        <Puede permiso="coberturas.cancelar">
                            <button type="button" className="boton-icono rounded-tema text-peligro" onClick={() => setCancelar(c)} aria-label={`Cancelar ${c.titulo}`} title="Cancelar"><XCircle className="h-4 w-4" aria-hidden="true" /></button>
                        </Puede>
                    </>
                )}
                <Puede permiso="coberturas.duplicar">
                    <button type="button" className="boton-icono rounded-tema" onClick={() => setDuplicar(c)} aria-label={`Duplicar ${c.titulo}`} title="Duplicar"><Copy className="h-4 w-4" aria-hidden="true" /></button>
                </Puede>
            </div>
        </article>
    );

    return (
        <section>
            <EncabezadoPagina titulo="Agenda de Coberturas" descripcion="Coberturas periodísticas del día o de la semana." casoUso="CU-04">
                <Puede permiso="coberturas.crear">
                    <button type="button" className="boton" onClick={() => setFormulario({ abierto: true, cobertura: null })}><CalendarPlus className="h-4 w-4" aria-hidden="true" /> Nueva cobertura</button>
                </Puede>
            </EncabezadoPagina>

            <div className="tarjeta mb-4 flex flex-wrap items-end gap-3">
                <div className="flex items-end gap-1">
                    <button type="button" className="boton-secundario" onClick={() => mover(-1)} aria-label={vista === 'semana' ? 'Semana anterior' : 'Día anterior'}><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
                    <Campo etiqueta="Fecha" nombre="fecha" type="date" value={fecha} onChange={(e) => e.target.value && ir({ fecha: e.target.value })} />
                    <button type="button" className="boton-secundario" onClick={() => mover(1)} aria-label={vista === 'semana' ? 'Semana siguiente' : 'Día siguiente'}><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
                    <button type="button" className="boton-secundario" onClick={() => ir({ fecha: hoy() })}>Hoy</button>
                </div>
                <div className="flex overflow-hidden rounded-tema border border-borde" role="group" aria-label="Vista">
                    {[['dia', 'Día'], ['semana', 'Semana']].map(([v, t]) => (
                        <button key={v} type="button" className="boton-icono px-3" aria-pressed={vista === v} onClick={() => ir({ vista: v })}>{t}</button>
                    ))}
                </div>
                <Campo como="select" etiqueta="Estado" nombre="estado" value={filtros.estado} onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))} vacio="Todos" opciones={opciones(ESTADOS_COBERTURA)} />
                <Campo como="select" etiqueta="Tipo" nombre="tipo" value={filtros.tipo} onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value }))} vacio="Todos" opciones={opciones(TIPOS_COBERTURA)} />
            </div>

            {error && <p className="text-peligro" role="alert">{error}</p>}
            {!agenda && !error && <Cargando />}
            {agenda && (
                <div className={vista === 'semana' ? 'grid gap-3 md:grid-cols-2 xl:grid-cols-7' : 'grid gap-3'}>
                    {dias.map((dia) => {
                        const delDia = agenda.data.filter((c) => c.fecha_hora_inicio.slice(0, 10) === dia);
                        return (
                            <section key={dia} className={`tarjeta p-3 ${dia === hoy() ? 'border-primario' : ''}`} aria-labelledby={`dia-${dia}`}>
                                <h2 id={`dia-${dia}`} className="mb-2 font-semibold">
                                    {fechaLarga(dia)} {dia === hoy() && <span className="text-sm font-normal text-acento">(hoy)</span>}
                                </h2>
                                <div className={vista === 'semana' ? 'space-y-2' : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'}>
                                    {delDia.length === 0 ? <p className="text-sm text-suave">Sin coberturas.</p> : delDia.map(tarjeta)}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}

            <FormularioCobertura abierto={formulario.abierto} cobertura={formulario.cobertura} fecha={fecha} alCerrar={() => setFormulario({ abierto: false, cobertura: null })} alGuardar={listo} />
            <FormularioDuplicar cobertura={duplicar} alCerrar={() => setDuplicar(null)} alGuardar={listo} />
            <Confirmar
                abierto={Boolean(cancelar)}
                alCerrar={() => setCancelar(null)}
                titulo="Cancelar cobertura"
                mensaje={cancelar && `«${cancelar.titulo}» quedará cancelada y su personal y recursos quedarán libres. No se puede volver a planificar: tendría que crear otra.`}
                textoBoton="Cancelar cobertura"
                alConfirmar={confirmarCancelacion}
            />
        </section>
    );
}

/** FormularioDuplicar «form»: POST /coberturas/{id}/duplicar (copias diarias o semanales). */
function FormularioDuplicar({ cobertura, alCerrar, alGuardar }) {
    const base = cobertura?.fecha_hora_inicio.slice(0, 10) ?? hoy();
    const esquema = (d) => ({
        frecuencia: ['frecuencia', [requerido]],
        hasta: ['hasta', [requerido, (v) => (v && v <= base ? 'La fecha «hasta» debe ser posterior a la de la cobertura.' : null)]],
    });
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario({ frecuencia: 'semanal', hasta: '' }, esquema);

    useEffect(() => {
        if (cobertura) reiniciar({ frecuencia: 'semanal', hasta: sumarDias(base, 28) });
    }, [cobertura, base, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => api.post(`/coberturas/${cobertura.id}/duplicar`, d));
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={Boolean(cobertura)} alCerrar={alCerrar} titulo="Duplicar cobertura recurrente" descripcion={cobertura && `«${cobertura.titulo}», ${fechaLarga(base)} de ${hora(cobertura.fecha_hora_inicio)} a ${hora(cobertura.fecha_hora_fin)}. Las copias no llevan personal ni recursos.`}>
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Campo como="select" etiqueta="Frecuencia" nombre="frecuencia" value={datos.frecuencia} onChange={cambiar} error={errores.frecuencia} requerido opciones={[{ valor: 'diaria', texto: 'Todos los días' }, { valor: 'semanal', texto: 'Cada semana' }]} />
                    <Campo etiqueta="Hasta" nombre="hasta" type="date" value={datos.hasta} onChange={cambiar} error={errores.hasta} requerido min={sumarDias(base, 1)} />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Duplicando…' : 'Duplicar'}</button>
                </div>
            </form>
        </Modal>
    );
}
