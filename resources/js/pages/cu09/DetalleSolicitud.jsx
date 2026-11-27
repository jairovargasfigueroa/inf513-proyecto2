import { ArrowLeft, Ban, CalendarCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
import { CARGOS, ESTADOS_SOLICITUD, PRIORIDADES, TIPOS_COBERTURA, TONO_SOLICITUD, opciones, texto } from '../../utils/etiquetas';
import { dinero, fechaHora } from '../../utils/formato';
import { max, requerido } from '../../validation/reglas';

/**
 * Detalle de Solicitud «client page» (CU-09): datos del evento y del pago, el
 * personal disponible a la hora de inicio, y onAceptar (FormularioAceptacion →
 * crea la cobertura) u onRechazar (FormularioRechazo → devuelve el pago).
 */
export default function DetalleSolicitud() {
    const { id } = useParams();
    const navegar = useNavigate();
    const avisos = useAvisos();
    const [s, setS] = useState(null);
    const [error, setError] = useState(null);
    const [abierto, setAbierto] = useState(null);

    const cargar = useCallback(() => {
        api.get(`/solicitudes/${id}`).then(({ data }) => setS(data.data)).catch((e) => setError(mensajeDeError(e)));
    }, [id]);
    useEffect(cargar, [cargar]);

    if (error) return <p className="tarjeta text-peligro" role="alert">{error}</p>;
    if (!s) return <Cargando />;

    return (
        <section className="space-y-4">
            <EncabezadoPagina titulo={<span className="font-mono">{s.codigo}</span>} descripcion={s.titulo} casoUso="CU-09 · Detalle de Solicitud">
                <Link to="/solicitudes" className="boton-secundario"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Solicitudes</Link>
                {s.cobertura && <Link to={`/coberturas/${s.cobertura.id}`} className="boton-secundario"><CalendarCheck className="h-4 w-4" aria-hidden="true" /> Ver la cobertura</Link>}
            </EncabezadoPagina>

            <div className="tarjeta flex flex-wrap items-center gap-x-6 gap-y-2">
                <Insignia tono={TONO_SOLICITUD[s.estado]}>{texto(ESTADOS_SOLICITUD, s.estado)}</Insignia>
                <span><span className="text-suave">Servicio:</span> {s.servicio}</span>
                <span><span className="text-suave">Monto:</span> <strong>{dinero(s.monto, s.moneda)}</strong></span>
                <span><span className="text-suave">Registrada:</span> {fechaHora(s.creado_en)}</span>
            </div>

            {s.estado === 'pagada' && (
                <div className="flex flex-wrap gap-2">
                    <Puede permiso="solicitudes.gestionar">
                        <button type="button" className="boton" onClick={() => setAbierto('aceptar')}><CalendarCheck className="h-4 w-4" aria-hidden="true" /> Aceptar y crear la cobertura</button>
                        <button type="button" className="boton-peligro" onClick={() => setAbierto('rechazar')}><Ban className="h-4 w-4" aria-hidden="true" /> Rechazar y devolver el pago</button>
                    </Puede>
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
                <article className="tarjeta lg:col-span-2" aria-labelledby="titulo-evento">
                    <h2 id="titulo-evento" className="mb-3 text-lg font-semibold">Evento</h2>
                    <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[10rem_1fr]">
                        <dt className="text-suave">Fecha</dt><dd>{fechaHora(s.fecha_hora_inicio)} a {fechaHora(s.fecha_hora_fin).slice(-5)}</dd>
                        <dt className="text-suave">Lugar</dt><dd>{s.lugar}</dd>
                        <dt className="text-suave">Tipo</dt><dd>{texto(TIPOS_COBERTURA, s.tipo)}</dd>
                        <dt className="text-suave">Descripción</dt><dd className="whitespace-pre-line">{s.descripcion ?? '—'}</dd>
                        <dt className="text-suave">Solicitante</dt><dd>{s.solicitante}{s.institucion && ` · ${s.institucion}`}</dd>
                        <dt className="text-suave">Contacto</dt><dd>{s.correo}{s.telefono && ` · ${s.telefono}`}</dd>
                        {s.motivo_rechazo && <><dt className="text-suave">Motivo del rechazo</dt><dd>{s.motivo_rechazo}</dd></>}
                        {s.atendida_por && <><dt className="text-suave">Atendida por</dt><dd>{s.atendida_por} · {fechaHora(s.fecha_atencion)}</dd></>}
                    </dl>
                </article>

                <div className="space-y-4">
                    <article className="tarjeta" aria-labelledby="titulo-pago">
                        <h2 id="titulo-pago" className="mb-3 text-lg font-semibold">Pago</h2>
                        {!s.pago && <p className="text-suave">Todavía no hay un pago confirmado.</p>}
                        {s.pago && (
                            <dl className="space-y-1 text-sm">
                                <div><dt className="inline text-suave">Pasarela: </dt><dd className="inline">{s.pago.proveedor === 'stripe' ? 'Stripe (modo de prueba)' : 'Datos de prueba'}</dd></div>
                                <div><dt className="inline text-suave">Estado: </dt><dd className="inline">{s.pago.estado === 'reembolsado' ? 'Devuelto' : 'Cobrado'}</dd></div>
                                <div><dt className="inline text-suave">Pagado: </dt><dd className="inline">{fechaHora(s.pago.fecha_pago)}</dd></div>
                                {s.pago.fecha_reembolso && <div><dt className="inline text-suave">Devuelto: </dt><dd className="inline">{fechaHora(s.pago.fecha_reembolso)}</dd></div>}
                                <div><dt className="inline text-suave">Referencia: </dt><dd className="inline break-all font-mono text-xs">{s.pago.referencia}</dd></div>
                            </dl>
                        )}
                    </article>

                    {s.disponibles && (
                        <article className="tarjeta" aria-labelledby="titulo-disponibles">
                            <h2 id="titulo-disponibles" className="mb-1 text-lg font-semibold">Disponibles al inicio</h2>
                            <p className="mb-2 text-sm text-suave">Personal en turno, sin ausencia ni otra cobertura a las {fechaHora(s.fecha_hora_inicio).slice(-5)}.</p>
                            {Object.keys(s.disponibles).length === 0 && <p className="text-peligro">Nadie está disponible a esa hora.</p>}
                            <ul className="space-y-1">
                                {Object.entries(s.disponibles).map(([cargo, n]) => (
                                    <li key={cargo} className="flex justify-between"><span>{texto(CARGOS, cargo)}</span><strong>{n}</strong></li>
                                ))}
                            </ul>
                        </article>
                    )}
                </div>
            </div>

            <FormularioAceptacion
                abierto={abierto === 'aceptar'}
                solicitud={s}
                alCerrar={() => setAbierto(null)}
                alGuardar={(data) => { avisos.respuesta(data); navegar(`/coberturas/${data.data.cobertura_id}`); }}
            />
            <FormularioRechazo
                abierto={abierto === 'rechazar'}
                solicitud={s}
                alCerrar={() => setAbierto(null)}
                alGuardar={(data) => { avisos.respuesta(data); setAbierto(null); cargar(); }}
            />
        </section>
    );
}

/** FormularioAceptacion «form»: POST /solicitudes/{id}/aceptar → crea la cobertura planificada del CU-04. */
function FormularioAceptacion({ abierto, solicitud, alCerrar, alGuardar }) {
    const vacio = { prioridad: 'media', indicaciones: '' };
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario(vacio, {
        prioridad: ['prioridad', [requerido]],
        indicaciones: ['indicaciones', [max(2000)]],
    });
    useEffect(() => { if (abierto) reiniciar({ prioridad: 'media', indicaciones: '' }); }, [abierto, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => api.post(`/solicitudes/${solicitud.id}/aceptar`, { ...d, indicaciones: d.indicaciones || null }));
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo="Aceptar la solicitud" descripcion="Se crea la cobertura planificada con los datos del evento. Después asígnele el personal y los recursos como a cualquier otra.">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4">
                    <Campo como="select" etiqueta="Prioridad" nombre="prioridad" value={datos.prioridad} onChange={cambiar} error={errores.prioridad} requerido opciones={opciones(PRIORIDADES)} />
                    <Campo como="textarea" etiqueta="Indicaciones para el equipo" nombre="indicaciones" value={datos.indicaciones} onChange={cambiar} error={errores.indicaciones} maxLength={2000} />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Creando…' : 'Aceptar y crear la cobertura'}</button>
                </div>
            </form>
        </Modal>
    );
}

/** FormularioRechazo «form»: POST /solicitudes/{id}/rechazar → devuelve el pago por Stripe. */
function FormularioRechazo({ abierto, solicitud, alCerrar, alGuardar }) {
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario({ motivo: '' }, {
        motivo: ['motivo', [requerido, max(500)]],
    });
    useEffect(() => { if (abierto) reiniciar({ motivo: '' }); }, [abierto, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => api.post(`/solicitudes/${solicitud.id}/rechazar`, d));
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo="Rechazar la solicitud" descripcion={`Se devolverá ${dinero(solicitud.monto, solicitud.moneda)} al solicitante y verá el motivo al consultar.`}>
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <Campo como="textarea" etiqueta="Motivo" nombre="motivo" value={datos.motivo} onChange={cambiar} error={errores.motivo} requerido maxLength={500} />
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton-peligro" disabled={enviando}>{enviando ? 'Devolviendo…' : 'Rechazar y devolver'}</button>
                </div>
            </form>
        </Modal>
    );
}
