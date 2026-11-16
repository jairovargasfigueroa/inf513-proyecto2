import { ArrowLeft, CalendarPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Puede from '../../components/Puede';
import Campo, { Casilla } from '../../components/ui/Campo';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import Modal from '../../components/ui/Modal';
import Paginacion from '../../components/ui/Paginacion';
import ResumenErrores from '../../components/ui/ResumenErrores';
import TablaDatos from '../../components/ui/TablaDatos';
import { useAvisos } from '../../context/AvisosContext';
import useFormulario from '../../hooks/useFormulario';
import useListado from '../../hooks/useListado';
import api from '../../services/api';
import { CARGOS, TIPOS_AUSENCIA, op, texto } from '../../utils/etiquetas';
import { fechaHora } from '../../utils/formato';
import { max, requerido } from '../../validation/reglas';

/**
 * Gestión de Ausencias «client page» (CU-02): listar(personalId) con
 * GET /ausencias; onNueva abre FormularioAusencia (POST /ausencias).
 */
export default function GestionAusencias() {
    const avisos = useAvisos();
    const [parametros, setParametros] = useSearchParams();
    const personalId = parametros.get('personal_id') ?? '';
    const [personal, setPersonal] = useState([]);
    const { filas, meta, filtros, cargando, error, filtrar, setPagina, recargar } = useListado('/ausencias', { personal_id: personalId, vigentes: '' });
    const [abierto, setAbierto] = useState(false);

    useEffect(() => {
        api.get('/personal', { params: { todos: 1, estado: 'activo' } }).then(({ data }) => setPersonal(data.data)).catch(() => {});
    }, []);

    const elegirPersona = (id) => {
        filtrar({ personal_id: id });
        setParametros(id ? { personal_id: id } : {});
    };

    const columnas = [
        { titulo: 'Persona', celda: (a) => <><span className="block font-medium">{a.persona}</span><span className="block text-suave">{texto(CARGOS, a.cargo)}</span></> },
        { titulo: 'Tipo', celda: (a) => texto(TIPOS_AUSENCIA, a.tipo) },
        { titulo: 'Desde', celda: (a) => fechaHora(a.inicio) },
        { titulo: 'Hasta', celda: (a) => fechaHora(a.fin) },
        { titulo: 'Motivo', celda: (a) => a.motivo ?? '—' },
    ];

    return (
        <section>
            <EncabezadoPagina titulo="Gestión de Ausencias" descripcion="Permisos, vacaciones, bajas médicas y comisiones." casoUso="CU-02">
                <Link to="/personal" className="boton-secundario"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Personal</Link>
                <Puede permiso="ausencias.crear">
                    <button type="button" className="boton" onClick={() => setAbierto(true)}><CalendarPlus className="h-4 w-4" aria-hidden="true" /> Nueva ausencia</button>
                </Puede>
            </EncabezadoPagina>

            <div className="tarjeta">
                <form className="mb-4 flex flex-wrap items-end gap-4" onSubmit={(e) => e.preventDefault()}>
                    <Campo como="select" etiqueta="Persona" nombre="personal_id" value={filtros.personal_id} onChange={(e) => elegirPersona(e.target.value)} vacio="Todo el personal" opciones={personal.map((p) => ({ valor: String(p.id), texto: p.nombre_completo }))} className="min-w-[16rem]" />
                    <div className="pb-2"><Casilla etiqueta="Solo vigentes y futuras" nombre="vigentes" checked={Boolean(filtros.vigentes)} onChange={(e) => filtrar({ vigentes: e.target.checked ? 1 : '' })} /></div>
                </form>
                {error && <p className="mb-3 text-peligro" role="alert">{error}</p>}
                <TablaDatos columnas={columnas} filas={filas} cargando={cargando} descripcion="Ausencias del personal" vacio="No hay ausencias registradas." />
                <Paginacion meta={meta} alCambiar={setPagina} />
            </div>

            <FormularioAusencia
                abierto={abierto}
                personal={personal}
                personalId={filtros.personal_id}
                alCerrar={() => setAbierto(false)}
                alGuardar={(data) => { avisos.respuesta(data); setAbierto(false); recargar(); }}
            />
        </section>
    );
}

const ESQUEMA = {
    personal_id: ['persona', [requerido]],
    tipo: ['tipo', [requerido]],
    inicio: ['inicio', [requerido]],
    motivo: ['motivo', [max(255)]],
};

/** FormularioAusencia «form»: POST /ausencias → 201 / 422 rango inválido. */
function FormularioAusencia({ abierto, personal, personalId, alCerrar, alGuardar }) {
    const vacio = { personal_id: personalId, tipo: '', inicio: '', fin: '', motivo: '' };
    const esquema = (d) => ({
        ...ESQUEMA,
        fin: ['fin', [requerido, (v) => (d.inicio && v && v <= d.inicio ? 'El fin de la ausencia debe ser posterior a su inicio.' : null)]],
    });
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario(vacio, esquema);

    useEffect(() => {
        if (abierto) reiniciar({ personal_id: personalId, tipo: '', inicio: '', fin: '', motivo: '' });
    }, [abierto, personalId, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => api.post('/ausencias', { ...d, personal_id: Number(d.personal_id), motivo: d.motivo || null }));
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo="Nueva ausencia" descripcion="Si cubre días completos, use de 00:00 del primer día a 00:00 del día siguiente al último.">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Campo como="select" etiqueta="Persona" nombre="personal_id" value={datos.personal_id} onChange={cambiar} error={errores.personal_id} requerido vacio="Elija una persona" opciones={personal.map((p) => ({ valor: String(p.id), texto: p.nombre_completo }))} className="sm:col-span-2" />
                    <Campo como="select" etiqueta="Tipo" nombre="tipo" value={datos.tipo} onChange={cambiar} error={errores.tipo} requerido vacio="Elija el tipo" opciones={op.TIPOS_AUSENCIA} className="sm:col-span-2" />
                    <Campo etiqueta="Inicio" nombre="inicio" type="datetime-local" value={datos.inicio} onChange={cambiar} error={errores.inicio} requerido />
                    <Campo etiqueta="Fin" nombre="fin" type="datetime-local" value={datos.fin} onChange={cambiar} error={errores.fin} requerido min={datos.inicio || undefined} />
                    <Campo como="textarea" etiqueta="Motivo" nombre="motivo" value={datos.motivo} onChange={cambiar} error={errores.motivo} maxLength={255} className="sm:col-span-2" />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Registrar'}</button>
                </div>
            </form>
        </Modal>
    );
}
