import { Eye } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Campo from '../../components/ui/Campo';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import Insignia from '../../components/ui/Insignia';
import TablaDatos from '../../components/ui/TablaDatos';
import api, { mensajeDeError } from '../../services/api';
import { ESTADOS_SOLICITUD, TONO_SOLICITUD, opciones, texto } from '../../utils/etiquetas';
import { dinero, fechaHora } from '../../utils/formato';

/**
 * Solicitudes de Cobertura «client page» (CU-09): listar() con GET /solicitudes;
 * primero las pagadas por atender, con el resumen de ingresos del período.
 */
export default function SolicitudesCobertura() {
    const [filtros, setFiltros] = useState({ estado: '', desde: '', hasta: '' });
    const [respuesta, setRespuesta] = useState(null);
    const [error, setError] = useState(null);
    const [cargando, setCargando] = useState(true);

    const listar = useCallback(() => {
        setCargando(true);
        const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
        api.get('/solicitudes', { params })
            .then(({ data }) => { setRespuesta(data); setError(null); })
            .catch((e) => setError(mensajeDeError(e)))
            .finally(() => setCargando(false));
    }, [filtros]);
    useEffect(listar, [listar]);

    const cambiar = (e) => setFiltros((f) => ({ ...f, [e.target.name]: e.target.value }));
    const r = respuesta?.resumen;

    const columnas = [
        { titulo: 'Código', celda: (s) => <span className="whitespace-nowrap font-mono font-semibold">{s.codigo}</span> },
        { titulo: 'Evento', celda: (s) => <><span className="block font-medium">{s.titulo}</span><span className="block text-suave">{s.lugar}</span></> },
        { titulo: 'Fecha del evento', celda: (s) => fechaHora(s.fecha_hora_inicio) },
        { titulo: 'Solicitante', celda: (s) => <><span className="block">{s.solicitante}</span>{s.institucion && <span className="block text-suave">{s.institucion}</span>}</> },
        { titulo: 'Servicio', celda: (s) => <><span className="block">{s.servicio}</span><span className="block text-suave">{dinero(s.monto, s.moneda)}</span></> },
        { titulo: 'Estado', celda: (s) => <Insignia tono={TONO_SOLICITUD[s.estado]}>{texto(ESTADOS_SOLICITUD, s.estado)}</Insignia> },
        {
            titulo: 'Acciones', oculto: true,
            celda: (s) => <Link to={`/solicitudes/${s.id}`} className="boton-icono" aria-label={`Ver la solicitud ${s.codigo}`} title="Ver detalle"><Eye className="h-4 w-4" aria-hidden="true" /></Link>,
        },
    ];

    return (
        <section className="space-y-4">
            <EncabezadoPagina titulo="Solicitudes de Cobertura" descripcion="Pedidos de cobertura de personas e instituciones externas, pagados en línea." casoUso="CU-09" />

            {r && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Indicador titulo="Por atender" valor={r.por_atender} destacado={r.por_atender > 0} />
                    <Indicador titulo="Aceptadas" valor={r.aceptadas} />
                    <Indicador titulo="Rechazadas" valor={r.rechazadas} />
                    <Indicador titulo="Ingresos" valor={r.ingresos.length ? r.ingresos.map((i) => dinero(i.total, i.moneda)).join(' · ') : dinero(0, 'USD')} />
                </div>
            )}

            <div className="tarjeta space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                    <Campo como="select" etiqueta="Estado" nombre="estado" value={filtros.estado} onChange={cambiar} vacio="Todos" opciones={opciones(ESTADOS_SOLICITUD)} />
                    <Campo etiqueta="Registradas desde" nombre="desde" type="date" value={filtros.desde} onChange={cambiar} />
                    <Campo etiqueta="Hasta" nombre="hasta" type="date" value={filtros.hasta} onChange={cambiar} min={filtros.desde || undefined} />
                </div>
                {error && <p className="text-peligro" role="alert">{error}</p>}
                <TablaDatos columnas={columnas} filas={respuesta?.data} cargando={cargando} descripcion="Solicitudes de cobertura" vacio="No hay solicitudes con esos filtros." />
                <p className="text-sm text-suave">Los ingresos suman las solicitudes pagadas y aceptadas del período; las rechazadas se devolvieron.</p>
            </div>
        </section>
    );
}

function Indicador({ titulo, valor, destacado }) {
    return (
        <div className={`tarjeta ${destacado ? 'border-acento' : ''}`}>
            <p className="text-sm text-suave">{titulo}</p>
            <p className={`text-2xl font-bold ${destacado ? 'text-acento' : ''}`}>{valor}</p>
        </div>
    );
}
