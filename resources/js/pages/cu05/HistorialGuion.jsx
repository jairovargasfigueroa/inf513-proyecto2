import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Campo from '../../components/ui/Campo';
import Cargando from '../../components/ui/Cargando';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import api, { mensajeDeError } from '../../services/api';
import { fechaHora } from '../../utils/formato';

/**
 * Diferencias palabra por palabra entre dos textos (subsecuencia común más
 * larga). Devuelve [{ texto, tipo: 'igual' | 'quitado' | 'agregado' }].
 */
function diferencias(a, b) {
    const x = a.split(/(\s+)/u);
    const y = b.split(/(\s+)/u);
    const n = x.length;
    const m = y.length;
    const lcs = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            lcs[i][j] = x[i] === y[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
        }
    }
    const salida = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
        if (x[i] === y[j]) { salida.push({ texto: x[i], tipo: 'igual' }); i++; j++; }
        else if (lcs[i + 1][j] >= lcs[i][j + 1]) { salida.push({ texto: x[i], tipo: 'quitado' }); i++; }
        else { salida.push({ texto: y[j], tipo: 'agregado' }); j++; }
    }
    while (i < n) salida.push({ texto: x[i++], tipo: 'quitado' });
    while (j < m) salida.push({ texto: y[j++], tipo: 'agregado' });
    return salida;
}

/**
 * Historial del Guion «client page» (CU-05): cargar(notaId) con GET
 * /notas/{id}/versiones; elegirVersiones(a, b) y mostrarDiferencias() lado a
 * lado (lo quitado en rojo tachado, lo agregado en verde subrayado).
 */
export default function HistorialGuion() {
    const { id } = useParams();
    const [versiones, setVersiones] = useState(null);
    const [error, setError] = useState(null);
    const [a, setA] = useState('');
    const [b, setB] = useState('');

    useEffect(() => {
        api.get(`/notas/${id}/versiones`).then(({ data }) => {
            setVersiones(data.data);
            if (data.data.length) {
                setB(String(data.data[0].numero));
                setA(String(data.data[Math.min(1, data.data.length - 1)].numero));
            }
        }).catch((e) => setError(mensajeDeError(e)));
    }, [id]);

    const va = versiones?.find((v) => String(v.numero) === a);
    const vb = versiones?.find((v) => String(v.numero) === b);
    const partes = useMemo(() => (va && vb ? diferencias(va.guion, vb.guion) : []), [va, vb]);

    if (error) return <p className="text-peligro" role="alert">{error}</p>;
    if (!versiones) return <Cargando />;

    const opcionesVersion = versiones.map((v) => ({ valor: String(v.numero), texto: `Versión ${v.numero} · ${fechaHora(v.fecha_hora)} · ${v.autor}` }));
    const columna = (version, tipoVisible, titulo) => (
        <section className="tarjeta" aria-label={titulo}>
            <h2 className="mb-1 font-semibold">{titulo}</h2>
            <p className="mb-3 text-sm text-suave">{version.palabras} palabras · {version.autor} · {fechaHora(version.fecha_hora)}</p>
            <p className="whitespace-pre-line leading-relaxed">
                {partes.filter((p) => p.tipo === 'igual' || p.tipo === tipoVisible).map((p, i) => (
                    p.tipo === 'igual' ? <span key={i}>{p.texto}</span>
                        : p.tipo === 'quitado'
                            ? <del key={i} className="rounded bg-peligro/15 text-peligro">{p.texto}</del>
                            : <ins key={i} className="rounded bg-exito/15 text-exito">{p.texto}</ins>
                ))}
            </p>
        </section>
    );

    return (
        <section className="space-y-4">
            <EncabezadoPagina titulo="Historial del Guion" descripcion="Compare dos versiones lado a lado." casoUso="CU-05">
                <Link to={`/notas/${id}`} className="boton-secundario"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Nota</Link>
            </EncabezadoPagina>

            {versiones.length === 0 ? <p className="tarjeta text-suave">La nota todavía no tiene versiones del guion.</p> : (
                <>
                    <div className="tarjeta grid gap-3 sm:grid-cols-2">
                        <Campo como="select" etiqueta="Versión anterior" nombre="a" value={a} onChange={(e) => setA(e.target.value)} opciones={opcionesVersion} />
                        <Campo como="select" etiqueta="Versión nueva" nombre="b" value={b} onChange={(e) => setB(e.target.value)} opciones={opcionesVersion} />
                    </div>
                    <p className="text-sm text-suave">
                        <del className="text-peligro">Tachado</del>: lo que se quitó · <ins className="text-exito">Subrayado</ins>: lo que se agregó.
                    </p>
                    {va && vb && (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {columna(va, 'quitado', `Versión ${va.numero}`)}
                            {columna(vb, 'agregado', `Versión ${vb.numero}`)}
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
