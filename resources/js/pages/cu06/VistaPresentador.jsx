import { ArrowLeft, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Cargando from '../../components/ui/Cargando';
import api, { mensajeDeError } from '../../services/api';
import { TIPOS_ITEM, texto } from '../../utils/etiquetas';
import { duracion } from '../../utils/formato';

/**
 * Vista del Presentador (teleprompter) «client page» (CU-06): cargar(escaletaId)
 * con GET /escaletas/{id}/lectura; iniciarAvance(), pausar(), ajustarVelocidad(v)
 * y ajustarFuente(p). Espacio inicia o pausa; las flechas cambian la velocidad.
 */
export default function VistaPresentador() {
    const { id } = useParams();
    const [lectura, setLectura] = useState(null);
    const [error, setError] = useState(null);
    const [avanzando, setAvanzando] = useState(false);
    const [velocidad, setVelocidad] = useState(3); // 1 a 10
    const [fuente, setFuente] = useState(44); // px
    const pantalla = useRef(null);

    useEffect(() => {
        api.get(`/escaletas/${id}/lectura`).then(({ data }) => setLectura(data)).catch((e) => setError(mensajeDeError(e)));
    }, [id]);

    // Avance continuo del texto.
    useEffect(() => {
        if (!avanzando) return undefined;
        let ultimo = performance.now();
        let cuadro;
        const paso = (t) => {
            const el = pantalla.current;
            if (el) {
                el.scrollTop += ((t - ultimo) / 1000) * velocidad * 12;
                if (el.scrollTop + el.clientHeight >= el.scrollHeight) setAvanzando(false);
            }
            ultimo = t;
            cuadro = requestAnimationFrame(paso);
        };
        cuadro = requestAnimationFrame(paso);
        return () => cancelAnimationFrame(cuadro);
    }, [avanzando, velocidad]);

    // Atajos de teclado.
    useEffect(() => {
        const teclas = (e) => {
            if (e.target.closest('input, select, textarea, button, a')) return;
            if (e.code === 'Space') { e.preventDefault(); setAvanzando((a) => !a); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setVelocidad((v) => Math.min(10, v + 1)); }
            if (e.key === 'ArrowDown') { e.preventDefault(); setVelocidad((v) => Math.max(1, v - 1)); }
        };
        window.addEventListener('keydown', teclas);
        return () => window.removeEventListener('keydown', teclas);
    }, []);

    if (error) return <p className="text-peligro" role="alert">{error}</p>;
    if (!lectura) return <Cargando />;

    const e = lectura.data;

    return (
        <section className="space-y-3">
            <div className="tarjeta flex flex-wrap items-center gap-2">
                <Link to={`/escaletas/${id}`} className="boton-secundario"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Escaleta</Link>
                <span className="mr-auto font-semibold">{e.programa} · {e.hora_inicio}</span>
                <button type="button" className="boton" onClick={() => setAvanzando((a) => !a)} aria-pressed={avanzando}>
                    {avanzando ? <><Pause className="h-4 w-4" aria-hidden="true" /> Pausar</> : <><Play className="h-4 w-4" aria-hidden="true" /> Iniciar</>}
                </button>
                <button type="button" className="boton-secundario" onClick={() => { setAvanzando(false); pantalla.current?.scrollTo({ top: 0 }); }} aria-label="Volver al inicio"><RotateCcw className="h-4 w-4" aria-hidden="true" /></button>
                <span className="flex items-center gap-1" role="group" aria-label={`Velocidad ${velocidad}`}>
                    <button type="button" className="boton-icono rounded-tema border border-borde" onClick={() => setVelocidad((v) => Math.max(1, v - 1))} aria-label="Más lento"><Minus className="h-4 w-4" aria-hidden="true" /></button>
                    <span className="w-24 text-center text-sm">Velocidad {velocidad}</span>
                    <button type="button" className="boton-icono rounded-tema border border-borde" onClick={() => setVelocidad((v) => Math.min(10, v + 1))} aria-label="Más rápido"><Plus className="h-4 w-4" aria-hidden="true" /></button>
                </span>
                <span className="flex items-center gap-1" role="group" aria-label={`Letra ${fuente} píxeles`}>
                    <button type="button" className="boton-icono rounded-tema border border-borde" onClick={() => setFuente((f) => Math.max(24, f - 4))} aria-label="Letra más chica">A−</button>
                    <button type="button" className="boton-icono rounded-tema border border-borde" onClick={() => setFuente((f) => Math.min(96, f + 4))} aria-label="Letra más grande">A+</button>
                </span>
            </div>

            <div ref={pantalla} className="h-[70vh] overflow-y-auto rounded-tema bg-black px-6 py-[30vh] text-white sm:px-16" style={{ fontSize: fuente, lineHeight: 1.4 }} tabIndex={0} aria-label="Texto del teleprompter">
                {lectura.items.map((it, i) => (
                    <article key={i} className="mb-[1.5em]">
                        <p className="mb-2 text-[0.45em] font-semibold uppercase tracking-wide text-yellow-300">
                            {it.pagina} · {texto(TIPOS_ITEM, it.tipo)}{it.slug && ` · ${it.slug}`} · {duracion(it.duracion)}{it.presentador && ` · ${it.presentador}`}
                        </p>
                        {it.tipo === 'corte'
                            ? <p className="text-[0.6em] text-gray-400">— {it.titulo} —</p>
                            : <p className="whitespace-pre-line">{it.guion || it.titulo}</p>}
                    </article>
                ))}
                <p className="text-center text-[0.5em] text-gray-400">— Fin de la escaleta —</p>
            </div>
        </section>
    );
}
