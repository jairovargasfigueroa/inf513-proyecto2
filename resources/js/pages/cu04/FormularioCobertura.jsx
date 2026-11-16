import { useEffect } from 'react';
import Campo from '../../components/ui/Campo';
import Modal from '../../components/ui/Modal';
import ResumenErrores from '../../components/ui/ResumenErrores';
import useFormulario from '../../hooks/useFormulario';
import api from '../../services/api';
import { PRIORIDADES, TIPOS_COBERTURA, opciones } from '../../utils/etiquetas';
import { hoy } from '../../utils/formato';
import { max, requerido } from '../../validation/reglas';

const aLocal = (v) => (v ? v.replace(' ', 'T').slice(0, 16) : '');
const vacio = (fecha) => ({
    titulo: '', tema: '', tipo: '', inicio: `${fecha}T09:00`, fin: `${fecha}T11:00`, lugar: '', prioridad: 'media', fuente: '', indicaciones: '',
});

// Mismas reglas que CoberturaRequest en Laravel.
const esquema = (d) => ({
    titulo: ['título', [requerido, max(200)]],
    tema: ['tema', [max(255)]],
    tipo: ['tipo', [requerido]],
    inicio: ['inicio', [requerido]],
    fin: ['fin', [requerido, (v) => (d.inicio && v && v <= d.inicio ? 'La cobertura debe terminar después de empezar.' : null)]],
    lugar: ['lugar', [requerido, max(200)]],
    prioridad: ['prioridad', [requerido]],
    fuente: ['fuente o contacto', [max(200)]],
    indicaciones: ['indicaciones', [max(2000)]],
});

/**
 * FormularioCobertura «form» (CU-04): «Nueva / Reprogramar» desde la Agenda;
 * envía POST /coberturas o PUT /coberturas/{id} (201 / 200 / 409 conflicto).
 */
export default function FormularioCobertura({ abierto, cobertura, fecha, alCerrar, alGuardar }) {
    const editando = Boolean(cobertura);
    const { datos, errores, mensaje, enviando, cambiar, reiniciar, enviar } = useFormulario(vacio(fecha ?? hoy()), esquema);

    useEffect(() => {
        if (!abierto) return;
        reiniciar(cobertura
            ? {
                titulo: cobertura.titulo, tema: cobertura.tema ?? '', tipo: cobertura.tipo, lugar: cobertura.lugar,
                inicio: aLocal(cobertura.fecha_hora_inicio), fin: aLocal(cobertura.fecha_hora_fin), prioridad: cobertura.prioridad,
                fuente: cobertura.fuente ?? '', indicaciones: cobertura.indicaciones ?? '',
            }
            : vacio(fecha ?? hoy()));
    }, [abierto, cobertura, fecha, reiniciar]);

    const guardar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => {
            const cuerpo = { ...d, tema: d.tema || null, fuente: d.fuente || null, indicaciones: d.indicaciones || null };
            return editando ? api.put(`/coberturas/${cobertura.id}`, cuerpo) : api.post('/coberturas', cuerpo);
        });
        if (r) alGuardar(r.data);
    };

    return (
        <Modal
            abierto={abierto}
            alCerrar={alCerrar}
            titulo={editando ? 'Reprogramar cobertura' : 'Nueva cobertura'}
            descripcion={editando ? 'Si cambia el horario, se vuelve a validar al personal y los recursos asignados.' : 'Los campos con * son obligatorios.'}
            ancho="max-w-2xl"
        >
            <form onSubmit={guardar} noValidate>
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid gap-4 sm:grid-cols-2">
                    <Campo etiqueta="Título" nombre="titulo" value={datos.titulo} onChange={cambiar} error={errores.titulo} requerido maxLength={200} className="sm:col-span-2" />
                    <Campo etiqueta="Tema" nombre="tema" value={datos.tema} onChange={cambiar} error={errores.tema} maxLength={255} className="sm:col-span-2" />
                    <Campo como="select" etiqueta="Tipo" nombre="tipo" value={datos.tipo} onChange={cambiar} error={errores.tipo} requerido vacio="Elija el tipo" opciones={opciones(TIPOS_COBERTURA)} />
                    <Campo como="select" etiqueta="Prioridad" nombre="prioridad" value={datos.prioridad} onChange={cambiar} error={errores.prioridad} requerido opciones={opciones(PRIORIDADES)} />
                    <Campo etiqueta="Inicio" nombre="inicio" type="datetime-local" value={datos.inicio} onChange={cambiar} error={errores.inicio} requerido />
                    <Campo etiqueta="Fin" nombre="fin" type="datetime-local" value={datos.fin} onChange={cambiar} error={errores.fin} requerido min={datos.inicio || undefined} />
                    <Campo etiqueta="Lugar" nombre="lugar" value={datos.lugar} onChange={cambiar} error={errores.lugar} requerido maxLength={200} />
                    <Campo etiqueta="Fuente o contacto" nombre="fuente" value={datos.fuente} onChange={cambiar} error={errores.fuente} maxLength={200} />
                    <Campo como="textarea" etiqueta="Indicaciones" nombre="indicaciones" value={datos.indicaciones} onChange={cambiar} error={errores.indicaciones} maxLength={2000} className="sm:col-span-2" />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="boton-secundario" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" className="boton" disabled={enviando}>{enviando ? 'Guardando…' : editando ? 'Reprogramar' : 'Planificar'}</button>
                </div>
            </form>
        </Modal>
    );
}
