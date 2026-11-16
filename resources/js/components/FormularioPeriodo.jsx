import { Search } from 'lucide-react';
import useFormulario from '../hooks/useFormulario';
import Campo from './ui/Campo';
import ResumenErrores from './ui/ResumenErrores';
import { requerido } from '../validation/reglas';

/** Fecha AAAA-MM-DD de hace n días. */
export const haceDias = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ATAJOS = [['7 días', 6], ['30 días', 29], ['90 días', 89]];

/**
 * FormularioPeriodo «form» (CU-07, también el período de FiltroReporte en el
 * CU-08): desde y hasta, con atajos. Las mismas reglas que PeriodoRequest.
 */
export default function FormularioPeriodo({ inicial, alEnviar, children, textoBoton = 'Consultar' }) {
    const esquema = (d) => ({
        desde: ['desde', [requerido]],
        hasta: ['hasta', [requerido, (v) => (v && d.desde && v < d.desde ? 'Período inválido: la fecha final es anterior a la inicial.' : null)]],
    });
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario(inicial, esquema);

    const consultar = (e) => {
        e?.preventDefault();
        enviar((d) => alEnviar(d));
    };

    const atajo = (dias) => {
        const nuevos = { ...datos, desde: haceDias(dias), hasta: haceDias(0) };
        reiniciar(nuevos);
        alEnviar(nuevos);
    };

    return (
        <form onSubmit={consultar} noValidate className="tarjeta">
            <ResumenErrores errores={errores} mensaje={mensaje} />
            <div className="flex flex-wrap items-end gap-3">
                {children?.(datos, cambiar)}
                <Campo etiqueta="Desde" nombre="desde" type="date" value={datos.desde} onChange={cambiar} error={errores.desde} requerido />
                <Campo etiqueta="Hasta" nombre="hasta" type="date" value={datos.hasta} onChange={cambiar} error={errores.hasta} requerido />
                <button type="submit" className="boton" disabled={enviando}><Search className="h-4 w-4" aria-hidden="true" /> {textoBoton}</button>
                <div className="flex gap-1" role="group" aria-label="Períodos rápidos">
                    {ATAJOS.map(([t, d]) => <button key={t} type="button" className="boton-secundario" onClick={() => atajo(d)}>Últimos {t}</button>)}
                </div>
            </div>
        </form>
    );
}
