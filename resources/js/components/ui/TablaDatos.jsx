import Cargando from './Cargando';

/**
 * Tabla de datos con encabezados accesibles, estado de carga y mensaje cuando
 * no hay filas. Cada columna: { titulo, campo } o { titulo, celda: (fila) => … }.
 */
export default function TablaDatos({ columnas, filas, cargando, vacio = 'No hay registros.', descripcion, clave = 'id' }) {
    if (cargando && !filas) return <Cargando />;

    return (
        <div className="overflow-x-auto">
            <table className="tabla">
                {descripcion && <caption className="sr-only">{descripcion}</caption>}
                <thead>
                    <tr>
                        {columnas.map((c) => (
                            <th key={c.titulo} scope="col" className={c.alinear === 'derecha' ? 'text-right' : ''}>
                                {c.oculto ? <span className="sr-only">{c.titulo}</span> : c.titulo}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className={cargando ? 'opacity-60' : ''}>
                    {filas?.length === 0 && (
                        <tr>
                            <td colSpan={columnas.length} className="py-6 text-center text-suave">{vacio}</td>
                        </tr>
                    )}
                    {filas?.map((fila) => (
                        <tr key={fila[clave]}>
                            {columnas.map((c) => (
                                <td key={c.titulo} className={c.alinear === 'derecha' ? 'text-right' : ''}>
                                    {c.celda ? c.celda(fila) : fila[c.campo]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
