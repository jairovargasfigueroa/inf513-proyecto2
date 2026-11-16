import { ArrowLeft, Download, Printer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Cargando from '../../components/ui/Cargando';
import api, { mensajeDeError } from '../../services/api';
import { descargarCsv } from '../../utils/csv';
import { fechaCorta } from '../../utils/formato';

/**
 * Vista del Reporte «client page» (CU-08): mostrar(tabla) con la respuesta 200
 * de ReporteController, exportar(formato) en CSV e imprimir() (o guardar en PDF).
 */
export default function VistaReporte() {
    const [parametros] = useSearchParams();
    const tipo = parametros.get('tipo');
    const desde = parametros.get('desde');
    const hasta = parametros.get('hasta');
    const [reporte, setReporte] = useState(null);
    const [error, setError] = useState(null);
    const descargado = useRef(false);

    const exportar = (r = reporte) => descargarCsv(`reporte-${tipo}-${desde}-a-${hasta}.csv`, r.columnas, r.filas, r.totales);

    useEffect(() => {
        api.get(`/reportes/${tipo}`, { params: { desde, hasta } })
            .then(({ data }) => {
                setReporte(data);
                if (parametros.get('formato') === 'csv' && !descargado.current && data.filas.length) {
                    descargado.current = true;
                    exportar(data);
                }
            })
            .catch((e) => setError(mensajeDeError(e)));
    }, [tipo, desde, hasta]);

    if (error) return <p className="text-peligro" role="alert">{error}</p>;
    if (!reporte) return <Cargando texto="Generando el reporte…" />;

    const valor = (c, v) => (c.tipo === 'numero' && typeof v === 'number' ? v.toLocaleString('es-BO') : v ?? '—');

    return (
        <article className="space-y-4">
            <div className="flex flex-wrap gap-2 print:hidden">
                <Link to="/reportes" className="boton-secundario"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Reportes</Link>
                <button type="button" className="boton-secundario" onClick={() => exportar()} disabled={!reporte.filas.length}><Download className="h-4 w-4" aria-hidden="true" /> Descargar CSV</button>
                <button type="button" className="boton" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Imprimir o guardar en PDF</button>
            </div>

            <header className="tarjeta">
                <p className="text-sm font-semibold uppercase tracking-wide text-acento">Canal 11 · Reporte</p>
                <h1 className="titulo-pagina">{reporte.titulo}</h1>
                <p className="text-suave">Del {fechaCorta(reporte.periodo.desde)} al {fechaCorta(reporte.periodo.hasta)}</p>
            </header>

            <div className="tarjeta overflow-x-auto">
                {reporte.filas.length > 0 && (
                    <table className="tabla">
                        <caption className="sr-only">{reporte.titulo}</caption>
                        <thead><tr>{reporte.columnas.map((c) => <th key={c.clave} scope="col" className={c.tipo === 'numero' ? 'text-right' : ''}>{c.titulo}</th>)}</tr></thead>
                        <tbody>
                            {reporte.filas.map((f, i) => (
                                <tr key={i}>{reporte.columnas.map((c) => <td key={c.clave} className={c.tipo === 'numero' ? 'text-right' : ''}>{valor(c, f[c.clave])}</td>)}</tr>
                            ))}
                        </tbody>
                        {reporte.totales && (
                            <tfoot><tr className="font-semibold">{reporte.columnas.map((c) => <td key={c.clave} className={`border-t-2 border-borde px-3 py-2 ${c.tipo === 'numero' ? 'text-right' : ''}`}>{valor(c, reporte.totales[c.clave])}</td>)}</tr></tfoot>
                        )}
                    </table>
                )}
                {reporte.nota && <p className="mt-3 text-sm text-suave">{reporte.nota}</p>}
            </div>
        </article>
    );
}
