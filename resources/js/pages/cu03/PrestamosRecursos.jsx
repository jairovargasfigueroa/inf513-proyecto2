import { PackageCheck, PackagePlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import Puede from '../../components/Puede';
import Campo, { Casilla } from '../../components/ui/Campo';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import Insignia from '../../components/ui/Insignia';
import Modal from '../../components/ui/Modal';
import Paginacion from '../../components/ui/Paginacion';
import ResumenErrores from '../../components/ui/ResumenErrores';
import TablaDatos from '../../components/ui/TablaDatos';
import { useAvisos } from '../../context/AvisosContext';
import useFormulario from '../../hooks/useFormulario';
import useListado from '../../hooks/useListado';
import api from '../../services/api';
import { fechaHora, hoy } from '../../utils/formato';
import { max, requerido } from '../../validation/reglas';

/**
 * Préstamos de Recursos «client page» (CU-03): listar(abiertos) con GET /prestamos;
 * onEntregar abre FormularioEntrega y onDevolver abre FormularioDevolucion.
 */
export default function PrestamosRecursos() {
    const avisos = useAvisos();
    const { filas, meta, filtros, cargando, error, filtrar, setPagina, recargar } = useListado('/prestamos', { abiertos: 1, buscar: '' });
    const [entregar, setEntregar] = useState(false);
    const [devolver, setDevolver] = useState(null);

    const listo = (data) => {
        avisos.respuesta(data);
        setEntregar(false);
        setDevolver(null);
        recargar();
    };

    const columnas = [
        { titulo: 'Recurso', celda: (p) => <><span className="block font-mono font-semibold">{p.codigo}</span><span className="block text-suave">{p.tipo} · {p.equipo}</span></> },
        { titulo: 'Responsable', campo: 'responsable' },
        { titulo: 'Cobertura', celda: (p) => p.cobertura ?? '—' },
        { titulo: 'Entrega', celda: (p) => <>{fechaHora(p.fecha_entrega)}{p.observacion_entrega && <span className="block text-suave">{p.observacion_entrega}</span>}</> },
        {
            titulo: 'Devolución',
            celda: (p) => (p.fecha_devolucion
                ? <>{fechaHora(p.fecha_devolucion)}{p.observacion_devolucion && <span className="block text-suave">{p.observacion_devolucion}</span>}</>
                : <Insignia tono="acento">Sin devolver</Insignia>),
        },
        {
            titulo: 'Acciones', oculto: true, alinear: 'derecha',
            celda: (p) => !p.fecha_devolucion && (
                <Puede permiso="prestamos.devolver">
                    <button type="button" className="boton-secundario" onClick={() => setDevolver(p)}><PackageCheck className="h-4 w-4" aria-hidden="true" /> Devolver</button>
                </Puede>
            ),
        },
    ];

    return (
        <section>
            <EncabezadoPagina titulo="Préstamos de Recursos" descripcion="Entrega y devolución de equipos con su responsable." casoUso="CU-03">
                <Puede permiso="prestamos.crear">
                    <button type="button" className="boton" onClick={() => setEntregar(true)}><PackagePlus className="h-4 w-4" aria-hidden="true" /> Entregar recurso</button>
                </Puede>
            </EncabezadoPagina>

            <div className="tarjeta">
                <form className="mb-4 flex flex-wrap items-end gap-4" role="search" onSubmit={(e) => e.preventDefault()}>
                    <Campo etiqueta="Buscar" nombre="buscar" type="search" placeholder="Código o responsable" value={filtros.buscar} onChange={(e) => filtrar({ buscar: e.target.value })} />
                    <div className="pb-2"><Casilla etiqueta="Solo sin devolver" nombre="abiertos" checked={Boolean(filtros.abiertos)} onChange={(e) => filtrar({ abiertos: e.target.checked ? 1 : '' })} /></div>
                </form>
                {error && <p className="mb-3 text-peligro" role="alert">{error}</p>}
                <TablaDatos columnas={columnas} filas={filas} cargando={cargando} descripcion="Préstamos de recursos" vacio="No hay préstamos con esos filtros." />
                <Paginacion meta={meta} alCambiar={setPagina} />
            </div>

            <FormularioEntrega abierto={entregar} alCerrar={() => setEntregar(false)} alGuardar={listo} />
            <FormularioDevolucion prestamo={devolver} alCerrar={() => setDevolver(null)} alGuardar={listo} />
        </section>
    );
}

const VACIO = { recurso_id: '', responsable_id: '', cobertura_id: '', observaciones: '' };

/** FormularioEntrega «form»: POST /prestamos → 201 / 409 recurso no disponible. */
function FormularioEntrega({ abierto, alCerrar, alGuardar }) {
    const [listas, setListas] = useState({ recursos: [], personal: [], coberturas: [] });
    const esquema = { recurso_id: ['recurso', [requerido]], responsable_id: ['responsable', [requerido]], observaciones: ['observaciones', [max(255)]] };
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario(VACIO, esquema);

    useEffect(() => {
        if (!abierto) return;
        reiniciar(VACIO);
        Promise.allSettled([
            api.get('/recursos', { params: { todos: 1, estado: 'operativo' } }),
            api.get('/personal', { params: { todos: 1, estado: 'activo' } }),
            api.get('/coberturas', { params: { fecha: hoy(), vista: 'semana' } }),
        ]).then(([r, p, c]) => setListas({
            recursos: r.value?.data.data.filter((x) => !x.prestado) ?? [],
            personal: p.value?.data.data ?? [],
            coberturas: c.value?.data.data.filter((x) => ['planificada', 'en_curso'].includes(x.estado)) ?? [],
        }));
    }, [abierto, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => api.post('/prestamos', {
            recurso_id: Number(d.recurso_id), responsable_id: Number(d.responsable_id),
            cobertura_id: d.cobertura_id ? Number(d.cobertura_id) : null, observaciones: d.observaciones || null,
        }));
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo="Entregar recurso" descripcion="Solo se listan los recursos operativos que no están entregados.">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4">
                    <Campo como="select" etiqueta="Recurso" nombre="recurso_id" value={datos.recurso_id} onChange={cambiar} error={errores.recurso_id} requerido vacio="Elija un recurso" opciones={listas.recursos.map((r) => ({ valor: String(r.id), texto: `${r.codigo} · ${r.tipo} ${r.marca} ${r.modelo}` }))} />
                    <Campo como="select" etiqueta="Responsable" nombre="responsable_id" value={datos.responsable_id} onChange={cambiar} error={errores.responsable_id} requerido vacio="Elija al responsable" opciones={listas.personal.map((p) => ({ valor: String(p.id), texto: p.nombre_completo }))} />
                    <Campo como="select" etiqueta="Cobertura (opcional)" nombre="cobertura_id" value={datos.cobertura_id} onChange={cambiar} error={errores.cobertura_id} vacio="Sin cobertura" opciones={listas.coberturas.map((c) => ({ valor: String(c.id), texto: `${c.titulo} · ${fechaHora(c.fecha_hora_inicio)}` }))} />
                    <Campo como="textarea" etiqueta="Observaciones" nombre="observaciones" value={datos.observaciones} onChange={cambiar} error={errores.observaciones} maxLength={255} />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Entregar'}</button>
                </div>
            </form>
        </Modal>
    );
}

const ahora = () => {
    const d = new Date();
    return `${hoy()}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** FormularioDevolucion «form»: PUT /prestamos/{id}/devolucion → 200. */
function FormularioDevolucion({ prestamo, alCerrar, alGuardar }) {
    const esquema = { fecha_devolucion: ['fecha de devolución', [requerido]], observaciones: ['observaciones', [max(255)]] };
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario({ fecha_devolucion: ahora(), observaciones: '' }, esquema);

    useEffect(() => {
        if (prestamo) reiniciar({ fecha_devolucion: ahora(), observaciones: '' });
    }, [prestamo, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => api.put(`/prestamos/${prestamo.id}/devolucion`, { ...d, observaciones: d.observaciones || null }));
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={Boolean(prestamo)} alCerrar={alCerrar} titulo={`Devolución de ${prestamo?.codigo ?? ''}`} descripcion={prestamo && `Entregado a ${prestamo.responsable} el ${fechaHora(prestamo.fecha_entrega)}.`}>
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4">
                    <Campo etiqueta="Fecha y hora de devolución" nombre="fecha_devolucion" type="datetime-local" value={datos.fecha_devolucion} onChange={cambiar} error={errores.fecha_devolucion} requerido max={ahora()} />
                    <Campo como="textarea" etiqueta="Observaciones" nombre="observaciones" value={datos.observaciones} onChange={cambiar} error={errores.observaciones} maxLength={255} ayuda="Estado en que vuelve el equipo. Si está dañado, reporte una incidencia en el inventario." />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Registrar devolución'}</button>
                </div>
            </form>
        </Modal>
    );
}
