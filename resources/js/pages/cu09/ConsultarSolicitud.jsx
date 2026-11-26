import { CreditCard, Search } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Campo from '../../components/ui/Campo';
import Insignia from '../../components/ui/Insignia';
import ResumenErrores from '../../components/ui/ResumenErrores';
import useFormulario from '../../hooks/useFormulario';
import api, { mensajeDeError } from '../../services/api';
import { ESTADOS_SOLICITUD, TONO_SOLICITUD, texto } from '../../utils/etiquetas';
import { dinero, fechaHora } from '../../utils/formato';
import { correo, max, requerido } from '../../validation/reglas';

const ESQUEMA = {
    codigo: ['código', [requerido, max(12)]],
    correo: ['correo', [requerido, correo, max(150)]],
};

/**
 * Consultar Solicitud (pública) «client page» (CU-09): con FormularioConsulta
 * (código y correo) el Visitante ve el estado; si quedó sin pagar, puede volver a pagar.
 */
export default function ConsultarSolicitud() {
    const [parametros] = useSearchParams();
    const cancelado = parametros.get('cancelado') === '1';
    const { datos, errores, mensaje, enviando, cambiar, enviar } = useFormulario({ codigo: parametros.get('codigo') ?? '', correo: '' }, ESQUEMA);
    const [solicitud, setSolicitud] = useState(null);
    const [errorPago, setErrorPago] = useState(null);
    const [pagando, setPagando] = useState(false);

    const consultar = async (e) => {
        e.preventDefault();
        setSolicitud(null);
        const r = await enviar((d) => api.get('/solicitudes/consulta', { params: d }));
        if (r) setSolicitud(r.data.data);
    };

    const pagar = async () => {
        setPagando(true);
        setErrorPago(null);
        try {
            const { data } = await api.post('/solicitudes/pago', datos);
            window.location.assign(data.data.url_pago);
        } catch (e) {
            setErrorPago(mensajeDeError(e));
            setPagando(false);
        }
    };

    return (
        <section className="mx-auto max-w-2xl space-y-4">
            <div>
                <p className="text-sm font-semibold text-acento">CU-09 · Servicios del canal</p>
                <h1 className="titulo-pagina">Consultar mi solicitud</h1>
                <p className="mt-1 text-suave">Escriba el código que recibió (por ejemplo SOL-0007) y el correo con el que la registró.</p>
            </div>

            {cancelado && (
                <p className="tarjeta border-acento" role="status">
                    El pago se canceló y su solicitud quedó pendiente de pago. Escriba su correo para consultarla y volver a pagar.
                </p>
            )}

            <form onSubmit={consultar} noValidate className="tarjeta">
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Campo etiqueta="Código" nombre="codigo" value={datos.codigo} onChange={cambiar} error={errores.codigo} requerido maxLength={12} className="font-mono" />
                    <Campo etiqueta="Correo" nombre="correo" type="email" value={datos.correo} onChange={cambiar} error={errores.correo} requerido maxLength={150} autoComplete="email" />
                </div>
                <div className="mt-4 flex justify-end">
                    <button type="submit" className="boton" disabled={enviando}><Search className="h-4 w-4" aria-hidden="true" /> {enviando ? 'Buscando…' : 'Consultar'}</button>
                </div>
            </form>

            {solicitud && (
                <article className="tarjeta space-y-3" aria-live="polite">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="font-mono text-xl font-bold">{solicitud.codigo}</h2>
                        <Insignia tono={TONO_SOLICITUD[solicitud.estado]}>{texto(ESTADOS_SOLICITUD, solicitud.estado)}</Insignia>
                    </div>
                    <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[10rem_1fr]">
                        <dt className="text-suave">Evento</dt><dd>{solicitud.titulo}</dd>
                        <dt className="text-suave">Fecha</dt><dd>{fechaHora(solicitud.fecha_hora_inicio)} a {fechaHora(solicitud.fecha_hora_fin).slice(-5)}</dd>
                        <dt className="text-suave">Lugar</dt><dd>{solicitud.lugar}</dd>
                        <dt className="text-suave">Servicio</dt><dd>{solicitud.servicio} · {dinero(solicitud.monto, solicitud.moneda)}</dd>
                    </dl>
                    {solicitud.estado === 'pagada' && <p>Recibimos su pago. El Jefe de Prensa está revisando la disponibilidad del equipo.</p>}
                    {solicitud.estado === 'aceptada' && <p className="font-medium text-exito">El canal cubrirá su evento en la fecha indicada.</p>}
                    {solicitud.estado === 'rechazada' && (
                        <p>No pudimos atender su solicitud: <em>{solicitud.motivo_rechazo}</em>. El pago se devolvió a su tarjeta.</p>
                    )}
                    {solicitud.estado === 'pendiente_pago' && (
                        <div className="space-y-2">
                            <p>La solicitud todavía no está pagada.</p>
                            {errorPago && <p className="text-peligro" role="alert">{errorPago}</p>}
                            <button type="button" className="boton" onClick={pagar} disabled={pagando}><CreditCard className="h-4 w-4" aria-hidden="true" /> {pagando ? 'Preparando el pago…' : 'Pagar ahora'}</button>
                        </div>
                    )}
                </article>
            )}
        </section>
    );
}
