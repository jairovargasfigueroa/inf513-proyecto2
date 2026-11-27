import { CheckCircle2, SearchCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Cargando from '../../components/ui/Cargando';
import api, { mensajeDeError } from '../../services/api';
import { dinero, fechaHora } from '../../utils/formato';

/**
 * Pago Recibido (pública) «client page» (CU-09): Stripe vuelve aquí con
 * session_id; se confirma el pago (POST /solicitudes/confirmar) y se muestra el
 * código de seguimiento.
 */
export default function PagoRecibido() {
    const [parametros] = useSearchParams();
    const sesion = parametros.get('session_id');
    const [solicitud, setSolicitud] = useState(null);
    const [error, setError] = useState(sesion ? null : 'Falta la referencia del pago.');

    useEffect(() => {
        if (!sesion) return;
        api.post('/solicitudes/confirmar', { session_id: sesion })
            .then(({ data }) => setSolicitud(data.data))
            .catch((e) => setError(mensajeDeError(e)));
    }, [sesion]);

    if (error) return <p className="tarjeta text-peligro" role="alert">{error}</p>;
    if (!solicitud) return <Cargando texto="Confirmando su pago…" />;

    const pagada = solicitud.estado !== 'pendiente_pago';

    return (
        <section className="tarjeta mx-auto max-w-xl space-y-4 text-center">
            {pagada ? (
                <>
                    <CheckCircle2 className="mx-auto h-12 w-12 text-exito" aria-hidden="true" />
                    <h1 className="titulo-pagina">Pago recibido</h1>
                    <p>
                        Su solicitud <strong className="font-mono text-lg">{solicitud.codigo}</strong> fue pagada. El Jefe de
                        Prensa la revisará y usted podrá ver la respuesta con su código y su correo.
                    </p>
                </>
            ) : (
                <>
                    <h1 className="titulo-pagina">Pago en proceso</h1>
                    <p>Todavía no recibimos la confirmación del pago de <strong className="font-mono">{solicitud.codigo}</strong>. Consulte en unos minutos.</p>
                </>
            )}
            <dl className="grid grid-cols-2 gap-2 text-left text-sm">
                <dt className="text-suave">Evento</dt><dd>{solicitud.titulo}</dd>
                <dt className="text-suave">Fecha</dt><dd>{fechaHora(solicitud.fecha_hora_inicio)}</dd>
                <dt className="text-suave">Servicio</dt><dd>{solicitud.servicio}</dd>
                <dt className="text-suave">Monto</dt><dd>{dinero(solicitud.monto, solicitud.moneda)}</dd>
            </dl>
            <p className="text-sm text-suave">Anote su código: lo necesitará para consultar el estado.</p>
            <Link to={`/solicitar/consulta?codigo=${solicitud.codigo}`} className="boton"><SearchCheck className="h-4 w-4" aria-hidden="true" /> Consultar mi solicitud</Link>
        </section>
    );
}
