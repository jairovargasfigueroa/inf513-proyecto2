import { Contrast } from 'lucide-react';
import { FUENTE_MAX, FUENTE_MIN, MODOS, TEMAS, useTema } from '../context/ThemeContext';

/**
 * Selector de tema, conmutador día/noche y herramientas de accesibilidad del
 * encabezado (consigna, punto 5): A−, A, A+ (80 % a 150 %) y alto contraste.
 */
export default function ControlAccesibilidad() {
    const { tema, modo, tamano_fuente, alto_contraste, cambiar, ajustarFuente, alternarContraste } = useTema();

    return (
        <div className="flex flex-wrap items-center gap-2" aria-label="Apariencia y accesibilidad" role="group">
            <label className="sr-only" htmlFor="selector-tema">Tema visual</label>
            <select
                id="selector-tema"
                value={tema}
                onChange={(e) => cambiar({ tema: e.target.value })}
                className="campo w-auto py-1 text-sm"
                title="Tema visual"
            >
                {TEMAS.map((t) => <option key={t.valor} value={t.valor}>Tema {t.nombre}</option>)}
            </select>

            <label className="sr-only" htmlFor="selector-modo">Modo día o noche</label>
            <select
                id="selector-modo"
                value={modo}
                onChange={(e) => cambiar({ modo: e.target.value })}
                className="campo w-auto py-1 text-sm"
                title="Modo día o noche"
            >
                {MODOS.map((m) => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
            </select>

            <div className="flex overflow-hidden rounded-tema border border-borde" role="group" aria-label={`Tamaño de letra: ${tamano_fuente} %`}>
                <button type="button" className="boton-icono" onClick={() => ajustarFuente(-1)} disabled={tamano_fuente <= FUENTE_MIN} aria-label="Reducir el tamaño de letra">A−</button>
                <button type="button" className="boton-icono border-x border-borde" onClick={() => ajustarFuente(0)} aria-label="Tamaño de letra normal">A</button>
                <button type="button" className="boton-icono" onClick={() => ajustarFuente(1)} disabled={tamano_fuente >= FUENTE_MAX} aria-label="Aumentar el tamaño de letra">A+</button>
            </div>

            <button
                type="button"
                className="boton-icono rounded-tema border border-borde"
                onClick={alternarContraste}
                aria-pressed={alto_contraste}
                aria-label="Alto contraste"
                title="Alto contraste"
            >
                <Contrast className="h-5 w-5" aria-hidden="true" />
            </button>
        </div>
    );
}
