import { ArrowLeft, CheckCircle2, Film, History, MessageSquareWarning, Plus, Send, Tags, TextCursorInput, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Puede from '../../components/Puede';
import Campo from '../../components/ui/Campo';
import Cargando from '../../components/ui/Cargando';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import Insignia from '../../components/ui/Insignia';
import Modal from '../../components/ui/Modal';
import ResumenErrores from '../../components/ui/ResumenErrores';
import { useAvisos } from '../../context/AvisosContext';
import useFormulario from '../../hooks/useFormulario';
import api, { mensajeDeError } from '../../services/api';
import { ESTADOS_NOTA, TIPOS_PIEZA, TONO_NOTA, texto } from '../../utils/etiquetas';
import { duracion, fechaHora, fechaLarga } from '../../utils/formato';
import { max, min, requerido } from '../../validation/reglas';
import { contarPalabras } from './GestionNotas';

const ACCIONES = { envio: 'Enviada a revisión', aprobacion: 'Aprobada', observacion: 'Observada' };

/**
 * Detalle de Nota «client page» (CU-05): cargar(id) con GET /notas/{id}; los
 * botones aparecen según el estado de la nota y el rol (RF-11): reemplazar
 * guion, rótulos, enviar a revisión, aprobar, observar, historial y material.
 */
export default function DetalleNota() {
    const { id } = useParams();
    const avisos = useAvisos();
    const [nota, setNota] = useState(null);
    const [error, setError] = useState(null);
    const [abierto, setAbierto] = useState(null); // 'guion' | 'rotulos' | 'observacion'
    const [ocupado, setOcupado] = useState(false);

    const cargar = useCallback(() => {
        api.get(`/notas/${id}`).then(({ data }) => setNota(data)).catch((e) => setError(mensajeDeError(e)));
    }, [id]);
    useEffect(cargar, [cargar]);

    if (error) return <p className="text-peligro" role="alert">{error}</p>;
    if (!nota) return <Cargando />;

    const n = nota.data;
    const editable = n.puede_modificar;

    const accion = async (ruta) => {
        setOcupado(true);
        try {
            const { data } = await api.post(`/notas/${n.id}/${ruta}`);
            avisos.respuesta(data);
            cargar();
        } catch (e) {
            avisos.error(mensajeDeError(e));
        } finally {
            setOcupado(false);
        }
    };

    const listo = (data) => {
        avisos.respuesta(data);
        setAbierto(null);
        cargar();
    };

    return (
        <section className="space-y-4">
            <EncabezadoPagina titulo={<span className="font-mono">{n.slug}</span>} descripcion={n.titulo} casoUso="CU-05 · Detalle de Nota">
                <Link to="/notas" className="boton-secundario"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Notas</Link>
                <Link to={`/notas/${n.id}/historial`} className="boton-secundario"><History className="h-4 w-4" aria-hidden="true" /> Historial del guion</Link>
                <Puede permiso="material.listar"><Link to={`/notas/${n.id}/material`} className="boton-secundario"><Film className="h-4 w-4" aria-hidden="true" /> Material</Link></Puede>
            </EncabezadoPagina>

            <div className="tarjeta flex flex-wrap items-center gap-x-6 gap-y-2">
                <Insignia tono={TONO_NOTA[n.estado]}>{texto(ESTADOS_NOTA, n.estado)}</Insignia>
                <span><span className="text-suave">Emisión:</span> {fechaLarga(n.fecha)}</span>
                <span><span className="text-suave">Pieza:</span> {texto(TIPOS_PIEZA, n.tipo_pieza)}</span>
                <span><span className="text-suave">Autor:</span> {n.autor}</span>
                {n.cobertura && <span><span className="text-suave">Cobertura:</span> {n.cobertura}</span>}
                <span title="Lectura del guion + video y SOT"><span className="text-suave">Duración:</span> <strong>{duracion(n.duracion.total)}</strong> <span className="text-suave">({duracion(n.duracion.lectura)} lectura + {duracion(n.duracion.video)} video)</span></span>
            </div>

            <div className="flex flex-wrap gap-2">
                {editable && ['borrador', 'observada'].includes(n.estado) && (
                    <Puede permiso="notas.enviar"><button type="button" className="boton" disabled={ocupado} onClick={() => accion('enviar')}><Send className="h-4 w-4" aria-hidden="true" /> Enviar a revisión</button></Puede>
                )}
                {n.estado === 'en_revision' && (
                    <>
                        <Puede permiso="notas.aprobar"><button type="button" className="boton" disabled={ocupado} onClick={() => accion('aprobar')}><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Aprobar</button></Puede>
                        <Puede permiso="notas.observar"><button type="button" className="boton-peligro" onClick={() => setAbierto('observacion')}><MessageSquareWarning className="h-4 w-4" aria-hidden="true" /> Observar</button></Puede>
                    </>
                )}
                {editable && (
                    <>
                        <Puede permiso="notas.guion"><button type="button" className="boton-secundario" onClick={() => setAbierto('guion')}><TextCursorInput className="h-4 w-4" aria-hidden="true" /> Reemplazar guion</button></Puede>
                        <Puede permiso="notas.rotulos"><button type="button" className="boton-secundario" onClick={() => setAbierto('rotulos')}><Tags className="h-4 w-4" aria-hidden="true" /> Rótulos</button></Puede>
                    </>
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <article className="tarjeta lg:col-span-2" aria-labelledby="titulo-guion">
                    <h2 id="titulo-guion" className="mb-2 text-lg font-semibold">Guion <span className="text-sm font-normal text-suave">· {n.palabras} palabras</span></h2>
                    {n.guion ? <p className="whitespace-pre-line text-lg leading-relaxed">{n.guion}</p> : <p className="text-suave">La nota todavía no tiene guion.</p>}
                </article>

                <div className="space-y-4">
                    <section className="tarjeta" aria-labelledby="titulo-rotulos">
                        <h2 id="titulo-rotulos" className="mb-2 text-lg font-semibold">Rótulos</h2>
                        {nota.rotulos.length === 0 ? <p className="text-sm text-suave">Sin rótulos.</p> : (
                            <ol className="space-y-1 text-sm">
                                {nota.rotulos.map((r) => <li key={r.orden}><strong>{r.orden}. {r.nombre}</strong>{r.cargo && <span className="block text-suave">{r.cargo}</span>}</li>)}
                            </ol>
                        )}
                    </section>
                    <section className="tarjeta" aria-labelledby="titulo-revisiones">
                        <h2 id="titulo-revisiones" className="mb-2 text-lg font-semibold">Revisiones</h2>
                        {nota.revisiones.length === 0 ? <p className="text-sm text-suave">Todavía no se envió a revisión.</p> : (
                            <ul className="space-y-2 text-sm">
                                {nota.revisiones.map((r, i) => (
                                    <li key={i} className="border-l-2 border-borde pl-2">
                                        <strong>{ACCIONES[r.accion]}</strong> · {r.usuario}
                                        <span className="block text-suave">{fechaHora(r.fecha_hora)}</span>
                                        {r.motivo && <span className="block text-peligro">«{r.motivo}»</span>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>

            <FormularioGuion abierto={abierto === 'guion'} nota={n} alCerrar={() => setAbierto(null)} alGuardar={listo} />
            <FormularioRotulos abierto={abierto === 'rotulos'} nota={n} rotulos={nota.rotulos} alCerrar={() => setAbierto(null)} alGuardar={listo} />
            <FormularioObservacion abierto={abierto === 'observacion'} nota={n} alCerrar={() => setAbierto(null)} alGuardar={listo} />
        </section>
    );
}

/** FormularioGuion «form»: PUT /notas/{id}/guion → versión nueva (si estaba aprobada, vuelve a revisión). */
function FormularioGuion({ abierto, nota, alCerrar, alGuardar }) {
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario({ guion: '' }, { guion: ['guion', [requerido, max(20000)]] });

    useEffect(() => {
        if (abierto) reiniciar({ guion: nota.guion ?? '' });
    }, [abierto, nota, reiniciar]);

    const palabras = contarPalabras(datos.guion);
    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => api.put(`/notas/${nota.id}/guion`, d));
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo="Reemplazar guion" descripcion={nota.estado === 'aprobada' ? 'La nota está aprobada: al guardar vuelve a revisión.' : 'Se guarda como una versión nueva; las anteriores quedan en el historial.'} ancho="max-w-3xl">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <Campo como="textarea" etiqueta="Guion" nombre="guion" value={datos.guion} onChange={cambiar} error={errores.guion} requerido rows={14} maxLength={20000} ayuda={`${palabras} palabra${palabras === 1 ? '' : 's'} · lectura estimada ${duracion(Math.ceil((palabras * 60) / 150))}`} />
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar versión'}</button>
                </div>
            </form>
        </Modal>
    );
}

/** FormularioRotulos «form»: PUT /notas/{id}/rotulos con la lista {orden, nombre, cargo}. */
function FormularioRotulos({ abierto, nota, rotulos, alCerrar, alGuardar }) {
    const [lista, setLista] = useState([]);
    const [errores, setErrores] = useState({});
    const [enviando, setEnviando] = useState(false);
    const [mensaje, setMensaje] = useState(null);

    useEffect(() => {
        if (abierto) {
            setLista(rotulos.length ? rotulos.map((r) => ({ nombre: r.nombre, cargo: r.cargo ?? '' })) : [{ nombre: '', cargo: '' }]);
            setErrores({});
            setMensaje(null);
        }
    }, [abierto, rotulos]);

    const cambiar = (i, campo, valor) => setLista((l) => l.map((r, j) => (j === i ? { ...r, [campo]: valor } : r)));

    const guardar = async (e) => {
        e.preventDefault();
        const encontrados = {};
        lista.forEach((r, i) => {
            if (!r.nombre.trim()) encontrados[`n${i}`] = `El rótulo ${i + 1} necesita el nombre de la persona.`;
            else if (r.nombre.length > 100) encontrados[`n${i}`] = `El nombre del rótulo ${i + 1} no debe tener más de 100 caracteres.`;
        });
        setErrores(encontrados);
        if (Object.keys(encontrados).length) return;
        setEnviando(true);
        try {
            const { data } = await api.put(`/notas/${nota.id}/rotulos`, { rotulos: lista.map((r, i) => ({ orden: i + 1, nombre: r.nombre.trim(), cargo: r.cargo.trim() || null })) });
            alGuardar(data);
        } catch (err) {
            setMensaje(mensajeDeError(err));
        } finally {
            setEnviando(false);
        }
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo="Rótulos de la nota" descripcion="Nombre y cargo de cada persona que aparece en pantalla, en el orden en que sale." ancho="max-w-2xl">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <ol className="space-y-3">
                    {lista.map((r, i) => (
                        <li key={i} className="grid items-end gap-2 sm:grid-cols-[2rem_1fr_1fr_auto]">
                            <span className="pb-2 font-semibold text-suave">{i + 1}.</span>
                            <Campo etiqueta="Nombre" nombre={`nombre-${i}`} value={r.nombre} onChange={(e) => cambiar(i, 'nombre', e.target.value)} error={errores[`n${i}`]} requerido maxLength={100} />
                            <Campo etiqueta="Cargo" nombre={`cargo-${i}`} value={r.cargo} onChange={(e) => cambiar(i, 'cargo', e.target.value)} maxLength={150} />
                            <button type="button" className="boton-icono mb-1 rounded-tema text-peligro" onClick={() => setLista((l) => l.filter((_, j) => j !== i))} aria-label={`Quitar el rótulo ${i + 1}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                        </li>
                    ))}
                </ol>
                <button type="button" className="boton-secundario mt-3" onClick={() => setLista((l) => [...l, { nombre: '', cargo: '' }])} disabled={lista.length >= 15}><Plus className="h-4 w-4" aria-hidden="true" /> Agregar rótulo</button>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar rótulos'}</button>
                </div>
            </form>
        </Modal>
    );
}

/** FormularioObservacion «form»: POST /notas/{id}/observar con el motivo. */
function FormularioObservacion({ abierto, nota, alCerrar, alGuardar }) {
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario({ motivo: '' }, { motivo: ['motivo de la observación', [requerido, min(5), max(255)]] });

    useEffect(() => {
        if (abierto) reiniciar({ motivo: '' });
    }, [abierto, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => api.post(`/notas/${nota.id}/observar`, d));
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo={`Observar ${nota.slug}`} descripcion="La nota vuelve al autor con este motivo.">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <Campo como="textarea" etiqueta="Motivo" nombre="motivo" value={datos.motivo} onChange={cambiar} error={errores.motivo} requerido maxLength={255} />
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton-peligro" disabled={enviando}>{enviando ? 'Enviando…' : 'Observar'}</button>
                </div>
            </form>
        </Modal>
    );
}
