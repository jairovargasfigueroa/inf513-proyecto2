import { Pencil, Plus, Settings2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import Puede from '../../components/Puede';
import Campo from '../../components/ui/Campo';
import Cargando from '../../components/ui/Cargando';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import Insignia from '../../components/ui/Insignia';
import Modal from '../../components/ui/Modal';
import ResumenErrores from '../../components/ui/ResumenErrores';
import { useAvisos } from '../../context/AvisosContext';
import useFormulario from '../../hooks/useFormulario';
import api, { mensajeDeError } from '../../services/api';
import { duracion } from '../../utils/formato';
import { entero, entre, max, requerido } from '../../validation/reglas';

/**
 * Plantillas de Emisión «client page» (CU-06): listar() con GET /plantillas;
 * onNueva / onConfigurar abren FormularioPlantilla y onAgregarCorte /
 * onAjustarCorte abren FormularioCorte. Cada respuesta trae el tiempo neto.
 */
export default function PlantillasEmision() {
    const avisos = useAvisos();
    const [plantillas, setPlantillas] = useState(null);
    const [programas, setProgramas] = useState([]);
    const [error, setError] = useState(null);
    const [plantilla, setPlantilla] = useState({ abierto: false, datos: null });
    const [corte, setCorte] = useState(null); // { plantilla, corte }

    const listar = useCallback(() => {
        api.get('/plantillas').then(({ data }) => setPlantillas(data.data)).catch((e) => setError(mensajeDeError(e)));
    }, []);
    useEffect(() => {
        listar();
        api.get('/programas').then(({ data }) => setProgramas(data.data)).catch(() => {});
    }, [listar]);

    const listo = (data) => { avisos.respuesta(data); setPlantilla({ abierto: false, datos: null }); setCorte(null); listar(); };

    if (error) return <p className="text-peligro" role="alert">{error}</p>;
    if (!plantillas) return <Cargando />;

    return (
        <section className="space-y-4">
            <EncabezadoPagina titulo="Plantillas de Emisión" descripcion="Duración, bloques y cortes comerciales de cada noticiero." casoUso="CU-06">
                <Puede permiso="plantillas.crear"><button type="button" className="boton" onClick={() => setPlantilla({ abierto: true, datos: null })}><Plus className="h-4 w-4" aria-hidden="true" /> Nueva plantilla</button></Puede>
            </EncabezadoPagina>

            <div className="grid gap-4 xl:grid-cols-2">
                {plantillas.map((p) => (
                    <article key={p.id} className="tarjeta" aria-labelledby={`plantilla-${p.id}`}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <h2 id={`plantilla-${p.id}`} className="text-lg font-semibold">{p.nombre}</h2>
                                <p className="text-sm text-suave">{p.programa} · {duracion(p.duracion_total)} · {p.cantidad_bloques} bloques · {p.palabras_por_minuto} palabras/min</p>
                            </div>
                            <Insignia tono={p.control === 'ok' ? 'exito' : 'peligro'}>{p.control === 'ok' ? 'Lista' : p.control}</Insignia>
                        </div>
                        <p className="mt-2 text-sm">Tiempo comercial <strong>{duracion(p.tiempo_comercial)}</strong> · Tiempo neto <strong>{duracion(p.tiempo_neto)}</strong></p>

                        <ol className="mt-3 flex flex-wrap gap-2 text-sm" aria-label="Bloques y cortes">
                            {p.bloques.map((b, i) => {
                                const c = p.cortes.find((x) => x.numero === i + 1);
                                return (
                                    <li key={b.bloque} className="flex items-center gap-2">
                                        <span className="rounded-tema bg-primario px-2 py-1 text-sobre-primario">Bloque {b.bloque} · {b.tiempo_disponible !== null ? duracion(b.tiempo_disponible) : '—'}</span>
                                        {c && (
                                            <span className="flex items-center gap-1 rounded-tema border border-borde px-2 py-1">
                                                Corte {c.numero}: min {c.minuto_inicio} · {duracion(c.duracion)}
                                                <Puede permiso="plantillas.editar"><button type="button" className="text-primario" onClick={() => setCorte({ plantilla: p, corte: c })} aria-label={`Ajustar el corte ${c.numero}`}><Pencil className="h-3.5 w-3.5" aria-hidden="true" /></button></Puede>
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>

                        <Puede permiso="plantillas.editar">
                            <div className="mt-4 flex flex-wrap gap-2">
                                <button type="button" className="boton-secundario" onClick={() => setPlantilla({ abierto: true, datos: p })}><Settings2 className="h-4 w-4" aria-hidden="true" /> Configurar</button>
                                {p.cortes.length < p.cantidad_bloques - 1 && <button type="button" className="boton-secundario" onClick={() => setCorte({ plantilla: p, corte: null })}><Plus className="h-4 w-4" aria-hidden="true" /> Agregar corte</button>}
                            </div>
                        </Puede>
                    </article>
                ))}
            </div>

            <FormularioPlantilla abierto={plantilla.abierto} plantilla={plantilla.datos} programas={programas} alCerrar={() => setPlantilla({ abierto: false, datos: null })} alGuardar={listo} />
            <FormularioCorte datos={corte} alCerrar={() => setCorte(null)} alGuardar={listo} />
        </section>
    );
}

const VACIA = { programa_id: '', nombre: '', minutos: '60', cantidad_bloques: '4', palabras_por_minuto: '150' };
const ESQUEMA = {
    programa_id: ['programa', [requerido]],
    nombre: ['nombre', [requerido, max(100)]],
    minutos: ['duración total', [requerido, entero, entre(1, 240)]],
    cantidad_bloques: ['cantidad de bloques', [requerido, entero, entre(1, 10)]],
    palabras_por_minuto: ['ritmo estándar', [requerido, entero, entre(80, 250)]],
};

/** FormularioPlantilla «form»: POST /plantillas | PUT /plantillas/{id} → 201 / 200 + tiempo neto. */
function FormularioPlantilla({ abierto, plantilla, programas, alCerrar, alGuardar }) {
    const editando = Boolean(plantilla);
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario(VACIA, ESQUEMA);

    useEffect(() => {
        if (abierto) {
            reiniciar(plantilla
                ? { programa_id: String(plantilla.programa_id), nombre: plantilla.nombre, minutos: String(plantilla.duracion_total / 60), cantidad_bloques: String(plantilla.cantidad_bloques), palabras_por_minuto: String(plantilla.palabras_por_minuto) }
                : VACIA);
        }
    }, [abierto, plantilla, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => {
            const cuerpo = { programa_id: Number(d.programa_id), nombre: d.nombre, duracion_total: Number(d.minutos) * 60, cantidad_bloques: Number(d.cantidad_bloques), palabras_por_minuto: Number(d.palabras_por_minuto) };
            return editando ? api.put(`/plantillas/${plantilla.id}`, cuerpo) : api.post('/plantillas', cuerpo);
        });
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo={editando ? `Configurar ${plantilla.nombre}` : 'Nueva plantilla'} descripcion="Con N bloques la plantilla lleva N − 1 cortes comerciales.">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Campo como="select" etiqueta="Programa" nombre="programa_id" value={datos.programa_id} onChange={cambiar} error={errores.programa_id} requerido vacio="Elija el programa" opciones={programas.map((p) => ({ valor: String(p.id), texto: p.nombre }))} className="sm:col-span-2" />
                    <Campo etiqueta="Nombre" nombre="nombre" value={datos.nombre} onChange={cambiar} error={errores.nombre} requerido maxLength={100} className="sm:col-span-2" />
                    <Campo etiqueta="Duración total (minutos)" nombre="minutos" type="number" min={1} max={240} value={datos.minutos} onChange={cambiar} error={errores.minutos} requerido />
                    <Campo etiqueta="Cantidad de bloques" nombre="cantidad_bloques" type="number" min={1} max={10} value={datos.cantidad_bloques} onChange={cambiar} error={errores.cantidad_bloques} requerido />
                    <Campo etiqueta="Ritmo estándar (palabras por minuto)" nombre="palabras_por_minuto" type="number" min={80} max={250} value={datos.palabras_por_minuto} onChange={cambiar} error={errores.palabras_por_minuto} requerido className="sm:col-span-2" />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button>
                </div>
            </form>
        </Modal>
    );
}

/** FormularioCorte «form»: POST /plantillas/{id}/cortes | PUT /cortes/{id} → 201 / 200 + tiempo neto. */
function FormularioCorte({ datos: contexto, alCerrar, alGuardar }) {
    const p = contexto?.plantilla;
    const c = contexto?.corte;
    const esquema = {
        numero: ['número', [requerido, entero, entre(1, Math.max(1, (p?.cantidad_bloques ?? 2) - 1))]],
        minuto_inicio: ['minuto de inicio', [requerido, entero, entre(1, Math.floor((p?.duracion_total ?? 3600) / 60))]],
        duracion: ['duración (segundos)', [requerido, entero, entre(1, 1800)]],
    };
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario({ numero: '', minuto_inicio: '', duracion: '' }, esquema);

    useEffect(() => {
        if (contexto) reiniciar(c ? { numero: String(c.numero), minuto_inicio: String(c.minuto_inicio), duracion: String(c.duracion) } : { numero: String(p.cortes.length + 1), minuto_inicio: '', duracion: '180' });
    }, [contexto, c, p, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => {
            const cuerpo = { numero: Number(d.numero), minuto_inicio: Number(d.minuto_inicio), duracion: Number(d.duracion) };
            return c ? api.put(`/cortes/${c.id}`, cuerpo) : api.post(`/plantillas/${p.id}/cortes`, cuerpo);
        });
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={Boolean(contexto)} alCerrar={alCerrar} titulo={c ? `Ajustar corte ${c.numero}` : 'Agregar corte comercial'} descripcion={p && `${p.nombre}: el corte n cierra el bloque n y el último bloque termina con el programa.`}>
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4 sm:grid-cols-3">
                    <Campo etiqueta="Número" nombre="numero" type="number" min={1} value={datos.numero} onChange={cambiar} error={errores.numero} requerido />
                    <Campo etiqueta="Minuto de inicio" nombre="minuto_inicio" type="number" min={1} value={datos.minuto_inicio} onChange={cambiar} error={errores.minuto_inicio} requerido />
                    <Campo etiqueta="Duración (s)" nombre="duracion" type="number" min={1} value={datos.duracion} onChange={cambiar} error={errores.duracion} requerido />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button>
                </div>
            </form>
        </Modal>
    );
}
