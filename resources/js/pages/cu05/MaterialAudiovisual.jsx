import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Puede from '../../components/Puede';
import Campo from '../../components/ui/Campo';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import Insignia from '../../components/ui/Insignia';
import Modal from '../../components/ui/Modal';
import ResumenErrores from '../../components/ui/ResumenErrores';
import TablaDatos from '../../components/ui/TablaDatos';
import { useAvisos } from '../../context/AvisosContext';
import useFormulario from '../../hooks/useFormulario';
import api, { mensajeDeError } from '../../services/api';
import { ESTADOS_MATERIAL, TIPOS_MATERIAL, opciones, texto } from '../../utils/etiquetas';
import { duracion, fechaHora } from '../../utils/formato';
import { formato, max, requerido } from '../../validation/reglas';

const TONO = { pendiente: 'neutro', ingestado: 'acento', en_edicion: 'acento', listo: 'exito' };

/**
 * Material Audiovisual «client page» (CU-05): listar(notaId) con GET
 * /notas/{id}/material; onRegistrar y onCambiarEstado abren FormularioMaterial (RF-10).
 */
export default function MaterialAudiovisual() {
    const { id } = useParams();
    const avisos = useAvisos();
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState(null);
    const [formulario, setFormulario] = useState({ abierto: false, material: null });

    const listar = useCallback(() => {
        api.get(`/notas/${id}/material`).then(({ data }) => setDatos(data)).catch((e) => setError(mensajeDeError(e)));
    }, [id]);
    useEffect(listar, [listar]);

    const columnas = [
        { titulo: 'Material', celda: (m) => <><span className="block font-medium">{m.descripcion}</span>{m.ubicacion && <code className="block text-xs text-suave">{m.ubicacion}</code>}</> },
        { titulo: 'Tipo', celda: (m) => texto(TIPOS_MATERIAL, m.tipo) },
        { titulo: 'Duración', celda: (m) => duracion(m.duracion) },
        { titulo: 'Estado', celda: (m) => <Insignia tono={TONO[m.estado]}>{texto(ESTADOS_MATERIAL, m.estado)}</Insignia> },
        { titulo: 'Editor', celda: (m) => (m.editor ? <>{m.editor}<span className="block text-xs text-suave">{fechaHora(m.actualizado)}</span></> : '—') },
        {
            titulo: 'Acciones', oculto: true, alinear: 'derecha',
            celda: (m) => <Puede permiso="material.editar"><button type="button" className="boton-icono rounded-tema" onClick={() => setFormulario({ abierto: true, material: m })} aria-label={`Cambiar estado de ${m.descripcion}`} title="Cambiar estado"><Pencil className="h-4 w-4" aria-hidden="true" /></button></Puede>,
        },
    ];

    return (
        <section>
            <EncabezadoPagina titulo="Material Audiovisual" descripcion={datos ? `${datos.nota.slug} · ${datos.nota.titulo}` : ''} casoUso="CU-05">
                <Link to={`/notas/${id}`} className="boton-secundario"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Nota</Link>
                <Puede permiso="material.crear"><button type="button" className="boton" onClick={() => setFormulario({ abierto: true, material: null })}><Plus className="h-4 w-4" aria-hidden="true" /> Registrar material</button></Puede>
            </EncabezadoPagina>
            <div className="tarjeta">
                {error && <p className="mb-3 text-peligro" role="alert">{error}</p>}
                <TablaDatos columnas={columnas} filas={datos?.data} cargando={!datos && !error} descripcion="Material audiovisual de la nota" vacio="La nota todavía no tiene material." />
            </div>
            <FormularioMaterial notaId={id} abierto={formulario.abierto} material={formulario.material} alCerrar={() => setFormulario({ abierto: false, material: null })} alGuardar={(data) => { avisos.respuesta(data); setFormulario({ abierto: false, material: null }); listar(); }} />
        </section>
    );
}

const VACIO = { descripcion: '', tipo: '', duracion: '0:00', ubicacion: '', estado: 'pendiente' };
const aSegundos = (t) => {
    const [m, s] = String(t).split(':').map(Number);
    return m * 60 + (s || 0);
};
const ESQUEMA = {
    descripcion: ['descripción', [requerido, max(200)]],
    tipo: ['tipo', [requerido]],
    duracion: ['duración', [requerido, formato(/^\d{1,3}:[0-5]\d$/, 'Escriba la duración como minutos:segundos, por ejemplo 1:30.')]],
    ubicacion: ['ubicación', [max(255)]],
    estado: ['estado', [requerido]],
};

/** FormularioMaterial «form»: POST /notas/{id}/material o PUT /material/{id}. */
function FormularioMaterial({ notaId, abierto, material, alCerrar, alGuardar }) {
    const editando = Boolean(material);
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario(VACIO, ESQUEMA);

    useEffect(() => {
        if (abierto) reiniciar(material ? { ...material, duracion: duracion(material.duracion), ubicacion: material.ubicacion ?? '' } : VACIO);
    }, [abierto, material, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => {
            const cuerpo = { descripcion: d.descripcion, tipo: d.tipo, duracion: aSegundos(d.duracion), ubicacion: d.ubicacion || null, estado: d.estado };
            return editando ? api.put(`/material/${material.id}`, cuerpo) : api.post(`/notas/${notaId}/material`, cuerpo);
        });
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo={editando ? 'Cambiar estado del material' : 'Registrar material'} descripcion="La duración del video y del SOT se suma a la de la nota.">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Campo etiqueta="Descripción" nombre="descripcion" value={datos.descripcion} onChange={cambiar} error={errores.descripcion} requerido maxLength={200} className="sm:col-span-2" />
                    <Campo como="select" etiqueta="Tipo" nombre="tipo" value={datos.tipo} onChange={cambiar} error={errores.tipo} requerido vacio="Elija el tipo" opciones={opciones(TIPOS_MATERIAL)} />
                    <Campo etiqueta="Duración (min:seg)" nombre="duracion" value={datos.duracion} onChange={cambiar} error={errores.duracion} requerido inputMode="numeric" placeholder="1:30" />
                    <Campo etiqueta="Ubicación del archivo" nombre="ubicacion" value={datos.ubicacion} onChange={cambiar} error={errores.ubicacion} maxLength={255} className="sm:col-span-2" ayuda="Ruta en el servidor de edición." />
                    <Campo como="select" etiqueta="Estado" nombre="estado" value={datos.estado} onChange={cambiar} error={errores.estado} requerido opciones={opciones(ESTADOS_MATERIAL)} />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button>
                </div>
            </form>
        </Modal>
    );
}
