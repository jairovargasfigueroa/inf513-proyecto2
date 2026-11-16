/**
 * Descarga una tabla como CSV para Excel: separado por punto y coma y con BOM
 * para que se vean las tildes.
 */
export function descargarCsv(nombre, columnas, filas, totales = null) {
    const celda = (v) => {
        const t = v === null || v === undefined ? '' : String(v);
        return /[";\n]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t;
    };
    const lineas = [
        columnas.map((c) => celda(c.titulo)).join(';'),
        ...filas.map((f) => columnas.map((c) => celda(f[c.clave])).join(';')),
        ...(totales ? [columnas.map((c) => celda(totales[c.clave])).join(';')] : []),
    ];
    const blob = new Blob([`﻿${lineas.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: nombre }).click();
    URL.revokeObjectURL(url);
}
