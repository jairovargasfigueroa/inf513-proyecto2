import { ArrowLeft, MapPin, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Cargando from '../../components/ui/Cargando';
import api, { mensajeDeError } from '../../services/api';
import { ESTADOS_COBERTURA, FUNCIONES, PRIORIDADES, TIPOS_COBERTURA, texto } from '../../utils/etiquetas';
import { fechaLarga, hora } from '../../utils/formato';

/**
 * Hoja de Asignación «client page» (CU-04): cargar(id) con GET
 * /coberturas/{id}/hoja; abrirMapa() e imprimir(). Pensada para el celular y
 * para imprimir (RF-07).
 */
export default function HojaAsignacion() {
    const { id } = useParams();
    const [hoja, setHoja] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.get(`/coberturas/${id}/hoja`).then(({ data }) => setHoja(data)).catch((e) => setError(mensajeDeError(e)));
    }, [id]);

    if (error) return <p className="text-peligro" role="alert">{error}</p>;
    if (!hoja) return <Cargando />;

    const c = hoja.data;
    const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.lugar}, Santa Cruz de la Sierra, Bolivia`)}`;

    return (
        <article className="mx-auto max-w-3xl space-y-4">
            <div className="flex flex-wrap gap-2 print:hidden">
                <Link to={`/coberturas/${c.id}`} className="boton-secundario"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Detalle</Link>
                <a href={mapa} target="_blank" rel="noopener noreferrer" className="boton-secundario"><MapPin className="h-4 w-4" aria-hidden="true" /> Ver el lugar en el mapa</a>
                <button type="button" className="boton" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Imprimir</button>
            </div>

            <header className="tarjeta">
                <p className="text-sm font-semibold uppercase tracking-wide text-acento">Canal 11 · Hoja de asignación</p>
                <h1 className="mt-1 text-2xl font-bold">{c.titulo}</h1>
                <p className="mt-1 text-lg">{fechaLarga(c.fecha_hora_inicio)} · {hora(c.fecha_hora_inicio)} a {hora(c.fecha_hora_fin)}</p>
                <p className="mt-1 flex items-center gap-1 text-lg"><MapPin className="h-5 w-5 text-primario" aria-hidden="true" /> {c.lugar}</p>
                <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[9rem_1fr]">
                    <dt className="text-suave">Tipo</dt><dd>{texto(TIPOS_COBERTURA, c.tipo)}</dd>
                    <dt className="text-suave">Prioridad</dt><dd>{texto(PRIORIDADES, c.prioridad)}</dd>
                    <dt className="text-suave">Estado</dt><dd>{texto(ESTADOS_COBERTURA, c.estado)}</dd>
                    <dt className="text-suave">Tema</dt><dd>{c.tema ?? '—'}</dd>
                    <dt className="text-suave">Fuente / contacto</dt><dd>{c.fuente ?? '—'}</dd>
                </dl>
                {c.indicaciones && <p className="mt-3 whitespace-pre-line rounded-tema border border-borde p-3"><strong>Indicaciones:</strong> {c.indicaciones}</p>}
            </header>

            <section className="tarjeta" aria-labelledby="hoja-equipo">
                <h2 id="hoja-equipo" className="mb-2 text-lg font-semibold">Equipo humano</h2>
                {hoja.equipo.length === 0 ? <p className="text-suave">Todavía no hay personal asignado.</p> : (
                    <ul className="divide-y divide-borde">
                        {hoja.equipo.map((p) => (
                            <li key={p.personal_id} className="flex flex-wrap justify-between gap-2 py-2">
                                <span><strong>{p.nombre}</strong> <span className="text-suave">· {texto(FUNCIONES, p.funcion)}</span></span>
                                {p.telefono && <a href={`tel:${p.telefono}`} className="text-primario underline">{p.telefono}</a>}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="tarjeta" aria-labelledby="hoja-recursos">
                <h2 id="hoja-recursos" className="mb-2 text-lg font-semibold">Equipos y unidad móvil</h2>
                {hoja.recursos.length === 0 ? <p className="text-suave">Todavía no hay recursos reservados.</p> : (
                    <ul className="divide-y divide-borde">
                        {hoja.recursos.map((r) => <li key={r.id} className="py-2"><strong className="font-mono">{r.codigo}</strong> · {r.tipo} {r.equipo}{r.placa ? ` · Placa ${r.placa}` : ''}</li>)}
                    </ul>
                )}
            </section>
        </article>
    );
}
