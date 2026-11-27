import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { haceDias } from '../../components/FormularioPeriodo';
import Campo from '../../components/ui/Campo';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import Insignia from '../../components/ui/Insignia';
import Paginacion from '../../components/ui/Paginacion';
import TablaDatos from '../../components/ui/TablaDatos';
import { useAuth } from '../../context/AuthContext';
import useListado from '../../hooks/useListado';
import { fechaHora } from '../../utils/formato';

/**
 * Bitácora de Comandos (correo) «client page» (CU-08): listar(filtros) con
 * GET /bitacora-comandos: los correos que procesó el sistema vía correo.
 */
export default function BitacoraComandos() {
    const { puede } = useAuth();
    const { filas, meta, filtros, cargando, error, filtrar, setPagina } = useListado('/bitacora-comandos', {
        desde: haceDias(29), hasta: haceDias(0), remitente: '', comando: '', resultado: '',
    });

    return (
        <section>
            <EncabezadoPagina titulo="Bitácora de Comandos" descripcion="Correos recibidos por el sistema vía correo (Proyecto 1) y su resultado." casoUso="CU-08">
                {/* El Administrador llega desde el menú y no tiene permiso de Reportes. */}
                {(puede('reportes.ver') || puede('reportes.mantenimiento')) && (
                    <Link to="/reportes" className="boton-secundario"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Reportes</Link>
                )}
            </EncabezadoPagina>
            <div className="tarjeta">
                <form className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5" role="search" onSubmit={(e) => e.preventDefault()}>
                    <Campo etiqueta="Desde" nombre="desde" type="date" value={filtros.desde} onChange={(e) => filtrar({ desde: e.target.value })} />
                    <Campo etiqueta="Hasta" nombre="hasta" type="date" value={filtros.hasta} onChange={(e) => filtrar({ hasta: e.target.value })} />
                    <Campo etiqueta="Remitente" nombre="remitente" type="search" value={filtros.remitente} onChange={(e) => filtrar({ remitente: e.target.value })} />
                    <Campo etiqueta="Comando" nombre="comando" value={filtros.comando} onChange={(e) => filtrar({ comando: e.target.value })} maxLength={10} placeholder="INSCOB" className="[&_input]:uppercase" />
                    <Campo como="select" etiqueta="Resultado" nombre="resultado" value={filtros.resultado} onChange={(e) => filtrar({ resultado: e.target.value })} vacio="Todos" opciones={[{ valor: 'exito', texto: 'Éxito' }, { valor: 'error', texto: 'Error' }]} />
                </form>
                {error && <p className="mb-3 text-peligro" role="alert">{error}</p>}
                <TablaDatos
                    filas={filas}
                    cargando={cargando}
                    descripcion="Bitácora de comandos"
                    vacio="No hay correos con esos filtros."
                    columnas={[
                        { titulo: 'Fecha', celda: (b) => fechaHora(b.fecha_hora) },
                        { titulo: 'Remitente', celda: (b) => <>{b.remitente}{b.usuario && <span className="block text-suave">{b.usuario}</span>}</> },
                        { titulo: 'Comando', celda: (b) => <code>{b.comando ?? '—'}</code> },
                        { titulo: 'Asunto', celda: (b) => <span className="block max-w-md truncate" title={b.asunto}>{b.asunto}</span> },
                        { titulo: 'Resultado', celda: (b) => <Insignia tono={b.resultado === 'exito' ? 'exito' : 'peligro'}>{b.resultado === 'exito' ? 'Éxito' : 'Error'}</Insignia> },
                    ]}
                />
                <Paginacion meta={meta} alCambiar={setPagina} />
            </div>
        </section>
    );
}
