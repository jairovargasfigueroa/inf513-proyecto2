import { ArrowLeft, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Campo from '../../components/ui/Campo';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import ResumenErrores from '../../components/ui/ResumenErrores';
import TablaDatos from '../../components/ui/TablaDatos';
import useFormulario from '../../hooks/useFormulario';
import api from '../../services/api';
import { CARGOS, op, texto } from '../../utils/etiquetas';
import { fechaLarga, hoy } from '../../utils/formato';
import { requerido } from '../../validation/reglas';

const ESQUEMA = { fecha: ['fecha', [requerido]], hora: ['hora', [requerido]] };

/**
 * Disponibilidad del Personal «client page» (CU-02): consultar(fecha, hora,
 * cargo) con GET /personal/disponibilidad: quién está en su turno, sin ausencia
 * y sin otra cobertura en ese momento.
 */
export default function DisponibilidadPersonal() {
    const { datos, errores, mensaje, enviando, cambiar, enviar } = useFormulario({ fecha: hoy(), hora: '09:00', cargo: '' }, ESQUEMA);
    const [resultado, setResultado] = useState(null);

    const consultar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => api.get('/personal/disponibilidad', { params: { ...d, cargo: d.cargo || undefined } }));
        if (r) setResultado(r.data);
    };

    const columnas = [
        { titulo: 'Persona', campo: 'nombre' },
        { titulo: 'Cargo', celda: (p) => texto(CARGOS, p.cargo) },
        { titulo: 'Turno', campo: 'turno' },
        { titulo: 'Teléfono', celda: (p) => p.telefono ?? '—' },
    ];

    return (
        <section>
            <EncabezadoPagina titulo="Disponibilidad del Personal" descripcion="Quién puede cubrir una nota en una fecha y hora." casoUso="CU-02">
                <Link to="/personal" className="boton-secundario"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Personal</Link>
            </EncabezadoPagina>

            <form onSubmit={consultar} noValidate className="tarjeta mb-4">
                <ResumenErrores errores={errores} mensaje={mensaje} />
                <div className="grid items-end gap-4 sm:grid-cols-4">
                    <Campo etiqueta="Fecha" nombre="fecha" type="date" value={datos.fecha} onChange={cambiar} error={errores.fecha} requerido />
                    <Campo etiqueta="Hora" nombre="hora" type="time" value={datos.hora} onChange={cambiar} error={errores.hora} requerido />
                    <Campo como="select" etiqueta="Cargo" nombre="cargo" value={datos.cargo} onChange={cambiar} vacio="Todos los cargos" opciones={op.CARGOS} />
                    <button type="submit" className="boton justify-center" disabled={enviando}><Search className="h-4 w-4" aria-hidden="true" /> Consultar</button>
                </div>
            </form>

            {resultado && (
                <div className="tarjeta">
                    <h2 className="mb-3 font-semibold" aria-live="polite">
                        {resultado.data.length} persona{resultado.data.length === 1 ? '' : 's'} disponible{resultado.data.length === 1 ? '' : 's'} el {fechaLarga(resultado.momento)} a las {resultado.momento.slice(11)}
                    </h2>
                    <TablaDatos columnas={columnas} filas={resultado.data} descripcion="Personal disponible" vacio="Nadie está disponible en ese momento." />
                </div>
            )}
        </section>
    );
}
