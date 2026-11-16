import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import Puede from '../../components/Puede';
import Campo from '../../components/ui/Campo';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import Modal from '../../components/ui/Modal';
import ResumenErrores from '../../components/ui/ResumenErrores';
import TablaDatos from '../../components/ui/TablaDatos';
import { useAvisos } from '../../context/AvisosContext';
import useFormulario from '../../hooks/useFormulario';
import api, { mensajeDeError } from '../../services/api';
import { DIAS, diasTexto } from '../../utils/etiquetas';
import { max, requerido } from '../../validation/reglas';

/** Gestión de Turnos «client page» (CU-02): listar() con GET /turnos; onNuevo abre FormularioTurno. */
export default function GestionTurnos() {
    const avisos = useAvisos();
    const [turnos, setTurnos] = useState(null);
    const [error, setError] = useState(null);
    const [abierto, setAbierto] = useState(false);

    const listar = useCallback(() => {
        api.get('/turnos').then(({ data }) => setTurnos(data.data)).catch((e) => setError(mensajeDeError(e)));
    }, []);
    useEffect(listar, [listar]);

    const columnas = [
        { titulo: 'Turno', celda: (t) => <><span className="block font-medium">{t.nombre}</span>{t.descripcion && <span className="block text-suave">{t.descripcion}</span>}</> },
        { titulo: 'Horario', celda: (t) => `${t.hora_inicio} – ${t.hora_fin}${t.hora_fin < t.hora_inicio ? ' (día siguiente)' : ''}` },
        { titulo: 'Días', celda: (t) => diasTexto(t.dias) },
        { titulo: 'Personal activo', campo: 'personal_activo', alinear: 'derecha' },
    ];

    return (
        <section>
            <EncabezadoPagina titulo="Gestión de Turnos" descripcion="Turnos de trabajo del personal." casoUso="CU-02">
                <Puede permiso="turnos.crear">
                    <button type="button" className="boton" onClick={() => setAbierto(true)}><Plus className="h-4 w-4" aria-hidden="true" /> Nuevo turno</button>
                </Puede>
            </EncabezadoPagina>
            <div className="tarjeta">
                {error && <p className="mb-3 text-peligro" role="alert">{error}</p>}
                <TablaDatos columnas={columnas} filas={turnos} cargando={!turnos && !error} descripcion="Turnos de trabajo" />
            </div>
            <FormularioTurno abierto={abierto} alCerrar={() => setAbierto(false)} alGuardar={(data) => { avisos.respuesta(data); setAbierto(false); listar(); }} />
        </section>
    );
}

const VACIO = { nombre: '', hora_inicio: '08:00', hora_fin: '16:00', dias: ['1', '2', '3', '4', '5'], descripcion: '' };
const ESQUEMA = {
    nombre: ['nombre', [requerido, max(50)]],
    hora_inicio: ['hora de inicio', [requerido]],
    hora_fin: ['hora de fin', [requerido]],
    dias: ['días', [(v) => (v.length === 0 ? 'Elija al menos un día de la semana.' : null)]],
    descripcion: ['descripción', [max(150)]],
};

/** FormularioTurno «form»: POST /turnos → 201. */
function FormularioTurno({ abierto, alCerrar, alGuardar }) {
    const esquema = (d) => ({
        ...ESQUEMA,
        hora_fin: ['hora de fin', [requerido, (v) => (v === d.hora_inicio ? 'La hora de fin debe ser distinta de la de inicio.' : null)]],
    });
    const { datos, errores, mensaje, enviando, cambiar, asignar, reiniciar, enviar } = useFormulario(VACIO, esquema);

    useEffect(() => {
        if (abierto) reiniciar(VACIO);
    }, [abierto, reiniciar]);

    const alternarDia = (d) => asignar('dias', datos.dias.includes(d) ? datos.dias.filter((x) => x !== d) : [...datos.dias, d].sort());

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => api.post('/turnos', { ...d, dias: d.dias.join(','), descripcion: d.descripcion || null }));
        if (r) alGuardar(r.data);
    };

    return (
        <Modal abierto={abierto} alCerrar={alCerrar} titulo="Nuevo turno" descripcion="Si la hora de fin es menor que la de inicio, el turno termina al día siguiente.">
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Campo etiqueta="Nombre" nombre="nombre" value={datos.nombre} onChange={cambiar} error={errores.nombre} requerido maxLength={50} className="sm:col-span-2" />
                    <Campo etiqueta="Hora de inicio" nombre="hora_inicio" type="time" value={datos.hora_inicio} onChange={cambiar} error={errores.hora_inicio} requerido />
                    <Campo etiqueta="Hora de fin" nombre="hora_fin" type="time" value={datos.hora_fin} onChange={cambiar} error={errores.hora_fin} requerido />
                    <fieldset className="sm:col-span-2">
                        <legend className="mb-1 text-sm font-medium">Días <span className="text-peligro" aria-hidden="true">*</span></legend>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(DIAS).map(([n, nombre]) => (
                                <label key={n} className={`cursor-pointer rounded-tema border px-3 py-1 text-sm ${datos.dias.includes(n) ? 'border-primario bg-primario text-sobre-primario' : 'border-borde'}`}>
                                    <input type="checkbox" className="sr-only" checked={datos.dias.includes(n)} onChange={() => alternarDia(n)} />
                                    {nombre}
                                </label>
                            ))}
                        </div>
                        {errores.dias && <p className="mt-1 text-sm font-medium text-peligro">{errores.dias}</p>}
                    </fieldset>
                    <Campo etiqueta="Descripción" nombre="descripcion" value={datos.descripcion} onChange={cambiar} error={errores.descripcion} maxLength={150} className="sm:col-span-2" />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : 'Registrar'}</button>
                </div>
            </form>
        </Modal>
    );
}
