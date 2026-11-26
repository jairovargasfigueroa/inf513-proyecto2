import { Pencil, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import Campo, { Casilla } from '../../components/ui/Campo';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import Insignia from '../../components/ui/Insignia';
import Modal from '../../components/ui/Modal';
import ResumenErrores from '../../components/ui/ResumenErrores';
import TablaDatos from '../../components/ui/TablaDatos';
import { useAvisos } from '../../context/AvisosContext';
import useFormulario from '../../hooks/useFormulario';
import api, { mensajeDeError } from '../../services/api';
import { dinero } from '../../utils/formato';
import { max, requerido } from '../../validation/reglas';

/**
 * Tarifas de Servicios «client page» (CU-09, Director): precios de los servicios
 * que el Visitante puede solicitar. Cambiar un precio no altera los pagos hechos.
 */
export default function TarifasServicios() {
    const avisos = useAvisos();
    const [tarifas, setTarifas] = useState(null);
    const [error, setError] = useState(null);
    const [editando, setEditando] = useState(undefined); // undefined: cerrado; null: nueva; objeto: editar

    const listar = useCallback(() => {
        api.get('/tarifas').then(({ data }) => setTarifas(data.data)).catch((e) => setError(mensajeDeError(e)));
    }, []);
    useEffect(listar, [listar]);

    const columnas = [
        { titulo: 'Servicio', celda: (t) => <><span className="block font-medium">{t.servicio}</span>{t.descripcion && <span className="block text-suave">{t.descripcion}</span>}</> },
        { titulo: 'Precio', celda: (t) => dinero(t.monto, t.moneda), alinear: 'derecha' },
        { titulo: 'Estado', celda: (t) => <Insignia tono={t.activa ? 'exito' : 'neutro'}>{t.activa ? 'Activa' : 'Inactiva'}</Insignia> },
        {
            titulo: 'Acciones', oculto: true,
            celda: (t) => <button type="button" className="boton-icono" onClick={() => setEditando(t)} aria-label={`Modificar ${t.servicio}`} title="Modificar"><Pencil className="h-4 w-4" aria-hidden="true" /></button>,
        },
    ];

    return (
        <section>
            <EncabezadoPagina titulo="Tarifas de Servicios" descripcion="Precios de los servicios que el público puede solicitar y pagar en línea." casoUso="CU-09">
                <button type="button" className="boton" onClick={() => setEditando(null)}><Plus className="h-4 w-4" aria-hidden="true" /> Nueva tarifa</button>
            </EncabezadoPagina>
            <div className="tarjeta">
                {error && <p className="mb-3 text-peligro" role="alert">{error}</p>}
                <TablaDatos columnas={columnas} filas={tarifas} cargando={!tarifas && !error} descripcion="Tarifas de servicios" />
                <p className="mt-3 text-sm text-suave">Solo las tarifas activas aparecen en el formulario público. Los pagos guardan el precio del momento en que se hicieron.</p>
            </div>
            <FormularioTarifa
                abierto={editando !== undefined}
                tarifa={editando}
                alCerrar={() => setEditando(undefined)}
                alGuardar={(data) => { avisos.respuesta(data); setEditando(undefined); listar(); }}
            />
        </section>
    );
}

const VACIO = { servicio: '', descripcion: '', monto: '', moneda: 'USD', activa: true };
const ESQUEMA = {
    servicio: ['servicio', [requerido, max(100)]],
    descripcion: ['descripción', [max(255)]],
    monto: ['monto', [requerido, (v) => (v !== '' && Number(v) < 1 ? 'El monto debe ser de al menos 1.' : null)]],
    moneda: ['moneda', [requerido]],
};

/** FormularioTarifa «form»: POST /tarifas → 201 o PUT /tarifas/{id}. */
function FormularioTarifa({ abierto, tarifa, alCerrar, alGuardar }) {
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario(VACIO, ESQUEMA);

    useEffect(() => {
        if (abierto) reiniciar(tarifa ? { ...tarifa, descripcion: tarifa.descripcion ?? '', monto: String(tarifa.monto) } : VACIO);
    }, [abierto, tarifa, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => {
            const cuerpo = { servicio: d.servicio, descripcion: d.descripcion || null, monto: Number(d.monto), moneda: d.moneda, activa: d.activa };
            return tarifa ? api.put(`/tarifas/${tarifa.id}`, cuerpo) : api.post('/tarifas', cuerpo);
        });
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo={tarifa ? 'Modificar tarifa' : 'Nueva tarifa'}>
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Campo etiqueta="Servicio" nombre="servicio" value={datos.servicio} onChange={cambiar} error={errores.servicio} requerido maxLength={100} className="sm:col-span-2" />
                    <Campo etiqueta="Descripción" nombre="descripcion" value={datos.descripcion} onChange={cambiar} error={errores.descripcion} maxLength={255} className="sm:col-span-2" />
                    <Campo etiqueta="Monto" nombre="monto" type="number" min="1" step="0.01" value={datos.monto} onChange={cambiar} error={errores.monto} requerido />
                    <Campo como="select" etiqueta="Moneda" nombre="moneda" value={datos.moneda} onChange={cambiar} error={errores.moneda} requerido opciones={[{ valor: 'USD', texto: 'Dólares (USD)' }, { valor: 'BOB', texto: 'Bolivianos (BOB)' }]} />
                    <div className="sm:col-span-2"><Casilla etiqueta="Activa (aparece en el formulario público)" nombre="activa" checked={datos.activa} onChange={cambiar} /></div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button>
                </div>
            </form>
        </Modal>
    );
}
