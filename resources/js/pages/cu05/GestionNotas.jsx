import { Eye, FilePlus2, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Puede from '../../components/Puede';
import Campo, { Casilla } from '../../components/ui/Campo';
import Confirmar from '../../components/ui/Confirmar';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import Insignia from '../../components/ui/Insignia';
import Modal from '../../components/ui/Modal';
import Paginacion from '../../components/ui/Paginacion';
import ResumenErrores from '../../components/ui/ResumenErrores';
import TablaDatos from '../../components/ui/TablaDatos';
import { useAuth } from '../../context/AuthContext';
import { useAvisos } from '../../context/AvisosContext';
import useFormulario from '../../hooks/useFormulario';
import useListado from '../../hooks/useListado';
import api, { mensajeDeError } from '../../services/api';
import { ESTADOS_NOTA, TIPOS_PIEZA, TONO_NOTA, opciones, texto } from '../../utils/etiquetas';
import { duracion, fechaCorta, fechaHora, hoy } from '../../utils/formato';
import { formato, max, requerido } from '../../validation/reglas';

/** Palabras del guion, igual que el servidor (R14). */
export const contarPalabras = (t) => (t.trim() ? t.trim().split(/\s+/u).length : 0);

/**
 * Gestión de Notas «client page» (CU-05): listar(filtros) con GET /notas;
 * onNueva / onEditar abren FormularioNota; onDarDeBaja envía DELETE; verDetalle
 * abre el Detalle de Nota.
 */
export default function GestionNotas() {
    const avisos = useAvisos();
    const { usuario } = useAuth();
    const { filas, meta, filtros, cargando, error, filtrar, setPagina, recargar } = useListado('/notas', { buscar: '', estado: '', fecha: '', mias: '' });
    const [formulario, setFormulario] = useState({ abierto: false, nota: null });
    const [baja, setBaja] = useState(null);

    const darDeBaja = async () => {
        try {
            const { data } = await api.delete(`/notas/${baja.id}`);
            avisos.respuesta(data);
            recargar();
        } catch (e) {
            avisos.error(mensajeDeError(e));
        } finally {
            setBaja(null);
        }
    };

    const editar = async (n) => {
        try {
            const { data } = await api.get(`/notas/${n.id}`);
            setFormulario({ abierto: true, nota: data.data });
        } catch (e) {
            avisos.error(mensajeDeError(e));
        }
    };

    const columnas = [
        { titulo: 'Nota', celda: (n) => <><Link to={`/notas/${n.id}`} className="block font-mono font-semibold hover:underline">{n.slug}</Link><span className="block text-suave">{n.titulo}</span></> },
        { titulo: 'Fecha', celda: (n) => fechaCorta(n.fecha) },
        { titulo: 'Pieza', celda: (n) => texto(TIPOS_PIEZA, n.tipo_pieza) },
        { titulo: 'Autor', campo: 'autor' },
        { titulo: 'Duración', celda: (n) => <span title={`${n.palabras} palabras`}>{duracion(n.duracion_total)}</span> },
        { titulo: 'Estado', celda: (n) => <Insignia tono={TONO_NOTA[n.estado]}>{texto(ESTADOS_NOTA, n.estado)}</Insignia> },
        {
            titulo: 'Acciones', oculto: true, alinear: 'derecha',
            celda: (n) => (
                <div className="flex justify-end gap-1">
                    <Link to={`/notas/${n.id}`} className="boton-icono rounded-tema" aria-label={`Ver la nota ${n.slug}`} title="Ver detalle"><Eye className="h-4 w-4" aria-hidden="true" /></Link>
                    {['borrador', 'observada', 'en_revision', 'aprobada'].includes(n.estado) && (
                        <>
                            <Puede permiso="notas.editar"><button type="button" className="boton-icono rounded-tema" onClick={() => editar(n)} aria-label={`Editar ${n.slug}`} title="Editar"><Pencil className="h-4 w-4" aria-hidden="true" /></button></Puede>
                            <Puede permiso="notas.baja"><button type="button" className="boton-icono rounded-tema text-peligro" onClick={() => setBaja(n)} aria-label={`Dar de baja ${n.slug}`} title="Dar de baja"><Trash2 className="h-4 w-4" aria-hidden="true" /></button></Puede>
                        </>
                    )}
                </div>
            ),
        },
    ];

    return (
        <section>
            <EncabezadoPagina titulo="Gestión de Notas" descripcion="Notas del noticiero, su guion y su estado de aprobación." casoUso="CU-05">
                <Puede permiso="notas.crear">
                    <button type="button" className="boton" onClick={() => setFormulario({ abierto: true, nota: null })}><FilePlus2 className="h-4 w-4" aria-hidden="true" /> Nueva nota</button>
                </Puede>
            </EncabezadoPagina>

            <div className="tarjeta">
                <form className="mb-4 grid items-end gap-3 sm:grid-cols-4" role="search" onSubmit={(e) => e.preventDefault()}>
                    <Campo etiqueta="Buscar" nombre="buscar" type="search" placeholder="Slug o título" value={filtros.buscar} onChange={(e) => filtrar({ buscar: e.target.value })} />
                    <Campo como="select" etiqueta="Estado" nombre="estado" value={filtros.estado} onChange={(e) => filtrar({ estado: e.target.value })} vacio="Todas (sin las de baja)" opciones={opciones(ESTADOS_NOTA)} />
                    <Campo etiqueta="Fecha de emisión" nombre="fecha" type="date" value={filtros.fecha} onChange={(e) => filtrar({ fecha: e.target.value })} />
                    {usuario && <div className="pb-2"><Casilla etiqueta="Solo mis notas" nombre="mias" checked={Boolean(filtros.mias)} onChange={(e) => filtrar({ mias: e.target.checked ? 1 : '' })} /></div>}
                </form>
                {error && <p className="mb-3 text-peligro" role="alert">{error}</p>}
                <TablaDatos columnas={columnas} filas={filas} cargando={cargando} descripcion="Notas periodísticas" vacio="No hay notas con esos filtros." />
                <Paginacion meta={meta} alCambiar={setPagina} />
            </div>

            <FormularioNota abierto={formulario.abierto} nota={formulario.nota} alCerrar={() => setFormulario({ abierto: false, nota: null })} alGuardar={(data) => { avisos.respuesta(data); setFormulario({ abierto: false, nota: null }); recargar(); }} />
            <Confirmar abierto={Boolean(baja)} alCerrar={() => setBaja(null)} titulo="Dar de baja la nota" mensaje={baja && `${baja.slug} dejará de estar disponible para la escaleta. Sus versiones y revisiones se conservan.`} textoBoton="Dar de baja" alConfirmar={darDeBaja} />
        </section>
    );
}

const VACIO = { slug: '', titulo: '', tipo_pieza: '', fecha: hoy(), cobertura_id: '', guion: '' };

/** FormularioNota «form»: contarPalabras() mientras se escribe; POST /notas o PUT /notas/{id}. */
function FormularioNota({ abierto, nota, alCerrar, alGuardar }) {
    const navegar = useNavigate();
    const editando = Boolean(nota);
    const [coberturas, setCoberturas] = useState([]);
    const esquema = {
        slug: ['slug', [requerido, max(40), formato(/^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/, 'El slug lleva letras, números y guiones, por ejemplo PARO-TRANSPORTE.')]],
        titulo: ['título', [requerido, max(200)]],
        tipo_pieza: ['tipo de pieza', [requerido]],
        fecha: ['fecha', [requerido]],
        guion: ['guion', [max(20000)]],
    };
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario(VACIO, esquema);

    useEffect(() => {
        if (!abierto) return;
        reiniciar(nota ? { ...VACIO, ...nota, cobertura_id: nota.cobertura_id ? String(nota.cobertura_id) : '', guion: '' } : VACIO);
        api.get('/coberturas', { params: { fecha: nota?.fecha ?? hoy(), vista: 'semana' } }).then(({ data }) => setCoberturas(data.data)).catch(() => setCoberturas([]));
    }, [abierto, nota, reiniciar]);

    const palabras = contarPalabras(datos.guion);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => {
            const cuerpo = { slug: d.slug, titulo: d.titulo, tipo_pieza: d.tipo_pieza, fecha: d.fecha, cobertura_id: d.cobertura_id ? Number(d.cobertura_id) : null };
            return editando ? api.put(`/notas/${nota.id}`, cuerpo) : api.post('/notas', { ...cuerpo, guion: d.guion || null });
        });
        if (r) {
            alGuardar(r.data);
            if (!editando) navegar(`/notas/${r.data.data.id}`);
        }
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo={editando ? `Editar ${nota.slug}` : 'Nueva nota'} descripcion={editando ? 'El guion se cambia desde el detalle con «Reemplazar guion».' : 'El slug identifica la nota en la escaleta, por ejemplo PARO-TRANSPORTE.'} ancho="max-w-3xl">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Campo etiqueta="Slug" nombre="slug" value={datos.slug} onChange={cambiar} error={errores.slug} requerido maxLength={40} className="[&_input]:font-mono [&_input]:uppercase" />
                    <Campo etiqueta="Fecha de emisión" nombre="fecha" type="date" value={datos.fecha} onChange={cambiar} error={errores.fecha} requerido />
                    <Campo etiqueta="Título" nombre="titulo" value={datos.titulo} onChange={cambiar} error={errores.titulo} requerido maxLength={200} className="sm:col-span-2" />
                    <Campo como="select" etiqueta="Tipo de pieza" nombre="tipo_pieza" value={datos.tipo_pieza} onChange={cambiar} error={errores.tipo_pieza} requerido vacio="Elija el tipo" opciones={opciones(TIPOS_PIEZA)} />
                    <Campo como="select" etiqueta="Cobertura (opcional)" nombre="cobertura_id" value={datos.cobertura_id} onChange={cambiar} error={errores.cobertura_id} vacio="Sin cobertura" opciones={coberturas.map((c) => ({ valor: String(c.id), texto: `${c.titulo} · ${fechaHora(c.fecha_hora_inicio)}` }))} />
                    {!editando && (
                        <Campo
                            como="textarea" etiqueta="Guion" nombre="guion" value={datos.guion} onChange={cambiar} error={errores.guion} rows={8} maxLength={20000} className="sm:col-span-2"
                            ayuda={`${palabras} palabra${palabras === 1 ? '' : 's'} · lectura estimada ${duracion(Math.ceil((palabras * 60) / 150))} a 150 palabras por minuto`}
                        />
                    )}
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button>
                </div>
            </form>
        </Modal>
    );
}
