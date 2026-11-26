import { LogIn, Megaphone, Tv } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Cargando from '../components/ui/Cargando';
import { useAuth } from '../context/AuthContext';
import api, { mensajeDeError } from '../services/api';

const hora = (h) => h.slice(0, 5);

/**
 * Inicio (pública) «client page»: grilla del día (verGrillaDelDia), buscador
 * global en el encabezado, ingreso al sistema (irALogin) y, desde el CU-09,
 * solicitar o consultar una cobertura pagada (irASolicitar, irAConsultar).
 */
export default function Inicio() {
    const { autenticado } = useAuth();
    const [grilla, setGrilla] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.get('/grilla')
            .then(({ data }) => setGrilla(data))
            .catch((e) => setError(mensajeDeError(e)));
    }, []);

    const fecha = grilla && new Date(`${grilla.fecha}T00:00:00`).toLocaleDateString('es-BO', {
        weekday: 'long', day: 'numeric', month: 'long',
    });

    return (
        <div className="space-y-6">
            <section className="tarjeta">
                <p className="text-sm font-semibold uppercase tracking-wide text-acento">Televisión Universitaria UAGRM</p>
                <h1 className="mt-1 text-3xl font-bold">Canal 11 - Gestión de Operaciones y Noticias</h1>
                <p className="mt-2 max-w-2xl text-suave">
                    Planificación de coberturas, redacción de notas, escaleta del noticiero y administración del
                    personal y los equipos del área de prensa.
                </p>
                {!autenticado && (
                    <Link to="/login" className="boton mt-4">
                        <LogIn className="h-4 w-4" aria-hidden="true" />
                        Iniciar sesión
                    </Link>
                )}
            </section>

            <section className="tarjeta flex flex-wrap items-center justify-between gap-4" aria-labelledby="titulo-solicitar">
                <div>
                    <h2 id="titulo-solicitar" className="flex items-center gap-2 text-xl font-semibold">
                        <Megaphone className="h-5 w-5" aria-hidden="true" />
                        ¿Quiere que el canal cubra su evento?
                    </h2>
                    <p className="mt-1 max-w-2xl text-suave">
                        Solicite la cobertura o la transmisión en vivo de su evento y pague en línea. Le confirmaremos si el
                        equipo puede atenderlo.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link to="/solicitar" className="boton">Solicitar cobertura</Link>
                    <Link to="/solicitar/consulta" className="boton-secundario">Consultar mi solicitud</Link>
                </div>
            </section>

            <section className="tarjeta" aria-labelledby="titulo-grilla">
                <h2 id="titulo-grilla" className="flex items-center gap-2 text-xl font-semibold">
                    <Tv className="h-5 w-5" aria-hidden="true" />
                    Programación de hoy {fecha && <span className="font-normal text-suave">· {fecha}</span>}
                </h2>

                {error && <p className="mt-3 text-peligro" role="alert">{error}</p>}
                {!grilla && !error && <Cargando texto="Cargando la programación…" />}
                {grilla?.data.length === 0 && <p className="mt-3 text-suave">No hay programas en la grilla de hoy.</p>}

                {grilla?.data.length > 0 && (
                    <div className="mt-3 overflow-x-auto">
                        <table className="tabla">
                            <caption className="sr-only">Grilla de programación del día</caption>
                            <thead>
                                <tr>
                                    <th scope="col">Horario</th>
                                    <th scope="col">Programa</th>
                                    <th scope="col">Descripción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grilla.data.map((p) => (
                                    <tr key={p.id}>
                                        <td className="whitespace-nowrap font-medium">{hora(p.hora_inicio)} – {hora(p.hora_fin)}</td>
                                        <td>{p.programa}</td>
                                        <td className="text-suave">{p.descripcion ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
