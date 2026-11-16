import { useEffect, useState } from 'react';
import {
    Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useTema } from '../../context/ThemeContext';

/*
 * Gráficos del Panel Analítico (consigna, punto 8) con Recharts. Marcas finas,
 * una sola escala, leyenda con 2 o más series, tooltip al pasar el mouse y la
 * tabla de datos debajo para lectores de pantalla y para quien la prefiera.
 */

/** Lee los colores del tema activo (cambian con el tema, el modo y el contraste). */
export function useColores() {
    const { tema, modoEfectivo, alto_contraste } = useTema();
    const [c, setC] = useState(null);

    useEffect(() => {
        // Se lee en el cuadro siguiente: el ThemeProvider (padre) aplica el tema después de este efecto.
        const cuadro = requestAnimationFrame(() => {
            const s = getComputedStyle(document.documentElement);
            const rgb = (n) => `rgb(${s.getPropertyValue(`--c-${n}`).trim().split(/\s+/).join(',')})`;
            setC({
                series: [1, 2, 3, 4].map((n) => s.getPropertyValue(`--serie-${n}`).trim()),
                texto: rgb('texto'), suave: rgb('suave'), borde: rgb('borde'), superficie: rgb('superficie'),
            });
        });
        return () => cancelAnimationFrame(cuadro);
    }, [tema, modoEfectivo, alto_contraste]);

    return c;
}

/** Indicador grande (hero number) con su contexto. */
export function Indicador({ titulo, valor, detalle, icono: Icono }) {
    return (
        <div className="tarjeta">
            <p className="flex items-center gap-2 text-sm font-medium text-suave">{Icono && <Icono className="h-4 w-4" aria-hidden="true" />}{titulo}</p>
            <p className="mt-1 text-3xl font-bold">{valor ?? '—'}</p>
            {detalle && <p className="mt-1 text-sm text-suave">{detalle}</p>}
        </div>
    );
}

/** Marco de un gráfico: título, el gráfico y «Ver los datos» en tabla. */
export function Marco({ titulo, descripcion, columnas, filas, children, alto = 260 }) {
    return (
        <figure className="tarjeta min-w-0">
            <figcaption className="mb-2">
                <span className="block font-semibold">{titulo}</span>
                {descripcion && <span className="block text-sm text-suave">{descripcion}</span>}
            </figcaption>
            {filas.length === 0 ? <p className="py-8 text-center text-suave">No hay datos para el período indicado.</p> : (
                <>
                    <div className="w-full min-w-0" style={{ height: alto }} aria-hidden="true">{children}</div>
                    <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-primario">Ver los datos en una tabla</summary>
                        <div className="mt-2 overflow-x-auto">
                            <table className="tabla">
                                <caption className="sr-only">{titulo}</caption>
                                <thead><tr>{columnas.map((c) => <th key={c.clave} scope="col">{c.titulo}</th>)}</tr></thead>
                                <tbody>{filas.map((f, i) => <tr key={i}>{columnas.map((c) => <td key={c.clave}>{c.formato ? c.formato(f[c.clave]) : f[c.clave]}</td>)}</tr>)}</tbody>
                            </table>
                        </div>
                    </details>
                </>
            )}
        </figure>
    );
}

const ejes = (c) => ({
    tick: { fill: c.suave, fontSize: 12 },
    axisLine: { stroke: c.borde },
    tickLine: false,
});

const tooltip = (c) => ({
    contentStyle: { background: c.superficie, border: `1px solid ${c.borde}`, borderRadius: 8, color: c.texto },
    labelStyle: { color: c.texto, fontWeight: 600 },
    itemStyle: { color: c.texto },
    cursor: { fill: c.borde, fillOpacity: 0.3 },
});

/**
 * Barras (verticales u horizontales, apiladas si hay varias series).
 * series: [{ clave, nombre }] en orden fijo: la serie 1 siempre tiene el mismo color.
 */
export function Barras({ datos, categoria, series, horizontal = false, formatoCategoria = (v) => v }) {
    const c = useColores();
    if (!c) return null;
    const apiladas = series.length > 1;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 4, right: 12, bottom: 4, left: horizontal ? 8 : -12 }} barCategoryGap="25%">
                <CartesianGrid stroke={c.borde} strokeDasharray="3 3" horizontal={!horizontal} vertical={horizontal} />
                {horizontal ? (
                    <>
                        <XAxis type="number" allowDecimals={false} {...ejes(c)} />
                        <YAxis type="category" dataKey={categoria} width={130} tickFormatter={formatoCategoria} {...ejes(c)} />
                    </>
                ) : (
                    <>
                        <XAxis dataKey={categoria} tickFormatter={formatoCategoria} {...ejes(c)} />
                        <YAxis allowDecimals={false} {...ejes(c)} />
                    </>
                )}
                <Tooltip {...tooltip(c)} labelFormatter={formatoCategoria} />
                {apiladas && <Legend wrapperStyle={{ fontSize: 13 }} formatter={(v) => <span style={{ color: c.texto }}>{v}</span>} />}
                {series.map((s, i) => (
                    <Bar
                        key={s.clave}
                        dataKey={s.clave}
                        name={s.nombre}
                        stackId={apiladas ? 'pila' : undefined}
                        fill={c.series[i]}
                        stroke={c.superficie}
                        strokeWidth={apiladas ? 2 : 0}
                        radius={i === series.length - 1 ? (horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]) : 0}
                        maxBarSize={36}
                    />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}

/** Línea de una o dos series en la misma escala. */
export function Lineas({ datos, categoria, series, formatoCategoria = (v) => v }) {
    const c = useColores();
    if (!c) return null;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datos} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
                <CartesianGrid stroke={c.borde} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey={categoria} tickFormatter={formatoCategoria} minTickGap={24} {...ejes(c)} />
                <YAxis allowDecimals={false} {...ejes(c)} />
                <Tooltip {...tooltip(c)} labelFormatter={formatoCategoria} cursor={{ stroke: c.suave, strokeDasharray: '3 3' }} />
                {series.length > 1 && <Legend wrapperStyle={{ fontSize: 13 }} formatter={(v) => <span style={{ color: c.texto }}>{v}</span>} />}
                {series.map((s, i) => (
                    <Line key={s.clave} type="monotone" dataKey={s.clave} name={s.nombre} stroke={c.series[i]} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: c.superficie, strokeWidth: 2 }} />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
