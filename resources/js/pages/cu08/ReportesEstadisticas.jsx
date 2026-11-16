import { FileBarChart, ScrollText, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { haceDias } from '../../components/FormularioPeriodo';
import Campo from '../../components/ui/Campo';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import ResumenErrores from '../../components/ui/ResumenErrores';
import { useAuth } from '../../context/AuthContext';
import useFormulario from '../../hooks/useFormulario';
import { requerido } from '../../validation/reglas';

export const REPORTES = [
    { tipo: 'coberturas', nombre: 'Coberturas por periodista', descripcion: 'Cumplidas, canceladas, reprogramadas y pendientes de cada periodista.', permiso: 'reportes.ver' },
    { tipo: 'recursos', nombre: 'Uso de equipos y unidades móviles', descripcion: 'Coberturas y horas de uso de cada recurso.', permiso: 'reportes.ver' },
    { tipo: 'mantenimiento', nombre: 'Equipos en mantenimiento', descripcion: 'Incidencias, altas y bajas de los equipos.', permiso: 'reportes.mantenimiento' },
    { tipo: 'notas', nombre: 'Notas emitidas, observadas y flotadas', descripcion: 'Producción de notas y su recorrido por periodista.', permiso: 'reportes.ver' },
];

/**
 * Reportes y Estadísticas «client page» (CU-08): elegirReporte(tipo) con
 * FiltroReporte (tipo, desde, hasta, formato) → Vista del Reporte; enlaces a
 * las bitácoras de comandos y de accesos según el rol.
 */
export default function ReportesEstadisticas() {
    const { puede } = useAuth();
    const navegar = useNavigate();
    const disponibles = REPORTES.filter((r) => puede(r.permiso));

    const esquema = (d) => ({
        tipo: ['reporte', [requerido]],
        desde: ['desde', [requerido]],
        hasta: ['hasta', [requerido, (v) => (v && d.desde && v < d.desde ? 'Período inválido: la fecha final es anterior a la inicial.' : null)]],
        formato: ['formato', [requerido]],
    });
    const { datos, errores, mensaje, cambiar, asignar, enviar } = useFormulario(
        { tipo: disponibles[0]?.tipo ?? '', desde: haceDias(29), hasta: haceDias(0), formato: 'pantalla' }, esquema,
    );

    // FiltroReporte «form»: la Vista del Reporte hace GET /reportes/{tipo}?desde&hasta.
    const generar = (e) => {
        e.preventDefault();
        enviar((d) => navegar(`/reportes/ver?${new URLSearchParams(d)}`));
    };

    return (
        <section className="space-y-4">
            <EncabezadoPagina titulo="Reportes y Estadísticas" descripcion="Reportes por período, exportables, y las bitácoras del sistema." casoUso="CU-08" />

            <form onSubmit={generar} noValidate className="tarjeta space-y-4">
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <fieldset>
                    <legend className="mb-2 font-semibold">Elija el reporte</legend>
                    <div className="grid gap-2 md:grid-cols-2">
                        {disponibles.map((r) => (
                            <label key={r.tipo} className={`flex cursor-pointer gap-3 rounded-tema border p-3 ${datos.tipo === r.tipo ? 'border-primario bg-fondo' : 'border-borde'}`}>
                                <input type="radio" name="tipo" value={r.tipo} checked={datos.tipo === r.tipo} onChange={() => asignar('tipo', r.tipo)} className="mt-1 accent-[rgb(var(--c-primario))]" />
                                <span><span className="block font-medium">{r.nombre}</span><span className="block text-sm text-suave">{r.descripcion}</span></span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                <div className="flex flex-wrap items-end gap-3">
                    <Campo etiqueta="Desde" nombre="desde" type="date" value={datos.desde} onChange={cambiar} error={errores.desde} requerido />
                    <Campo etiqueta="Hasta" nombre="hasta" type="date" value={datos.hasta} onChange={cambiar} error={errores.hasta} requerido />
                    <Campo como="select" etiqueta="Formato" nombre="formato" value={datos.formato} onChange={cambiar} error={errores.formato} opciones={[{ valor: 'pantalla', texto: 'Ver en pantalla' }, { valor: 'csv', texto: 'Ver y descargar CSV (Excel)' }]} />
                    <button type="submit" className="boton" disabled={!disponibles.length}><FileBarChart className="h-4 w-4" aria-hidden="true" /> Generar reporte</button>
                </div>
            </form>

            {(puede('bitacora.ver')) && (
                <div className="grid gap-3 md:grid-cols-2">
                    <Link to="/reportes/bitacora-comandos" className="tarjeta flex items-center gap-3 hover:border-primario">
                        <ScrollText className="h-6 w-6 text-primario" aria-hidden="true" />
                        <span><span className="block font-semibold">Bitácora de comandos</span><span className="block text-sm text-suave">Correos procesados por el sistema vía correo.</span></span>
                    </Link>
                    <Link to="/seguridad/bitacora" className="tarjeta flex items-center gap-3 hover:border-primario">
                        <ShieldCheck className="h-6 w-6 text-primario" aria-hidden="true" />
                        <span><span className="block font-semibold">Bitácora de accesos</span><span className="block text-sm text-suave">Inicios de sesión, IP, recursos más usados y visitas.</span></span>
                    </Link>
                </div>
            )}
        </section>
    );
}
