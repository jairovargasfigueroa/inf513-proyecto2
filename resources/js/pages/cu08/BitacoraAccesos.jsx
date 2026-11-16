import { useEffect, useState } from 'react';
import { haceDias } from '../../components/FormularioPeriodo';
import Puede from '../../components/Puede';
import { Barras, Marco } from '../../components/graficos/Graficos';
import Campo from '../../components/ui/Campo';
import EncabezadoPagina from '../../components/ui/EncabezadoPagina';
import Insignia from '../../components/ui/Insignia';
import Paginacion from '../../components/ui/Paginacion';
import TablaDatos from '../../components/ui/TablaDatos';
import { useAuth } from '../../context/AuthContext';
import useListado from '../../hooks/useListado';
import api from '../../services/api';
import { fechaHora } from '../../utils/formato';

const EVENTOS = {
    login_exitoso: ['Inicio de sesión', 'exito'], login_fallido: ['Intento fallido', 'peligro'], logout: ['Cierre de sesión', 'neutro'],
    acceso: ['Acceso', 'neutro'], acceso_denegado: ['Acceso denegado', 'peligro'], error: ['Error', 'peligro'],
};

/**
 * Bitácora de Accesos «client page» (CU-08; consigna, punto 4): listar(tipo,
 * desde, hasta, ip), verIntentosFallidos(), verRecursosMasAccedidos() y verVisitas().
 */
export default function BitacoraAccesos() {
    const { puede } = useAuth();
    const [pestana, setPestana] = useState('registros');
    const pestanas = [
        ['registros', 'Registros'],
        ...(puede('bitacora.fallidos') ? [['fallidos', 'Intentos fallidos por IP']] : []),
        ['recursos', 'Recursos más accedidos'],
        ['visitas', 'Visitas por página'],
    ];

    return (
        <section>
            <EncabezadoPagina titulo="Bitácora de Accesos" descripcion="Inicios de sesión, intentos fallidos, direcciones IP y recursos más usados." casoUso="CU-08" />
            <div className="mb-4 flex flex-wrap gap-1 border-b border-borde" role="tablist" aria-label="Secciones de la bitácora">
                {pestanas.map(([clave, nombre]) => (
                    <button key={clave} type="button" role="tab" aria-selected={pestana === clave} onClick={() => setPestana(clave)}
                        className={`-mb-px rounded-t-tema border-b-2 px-4 py-2 text-sm font-medium ${pestana === clave ? 'border-primario text-primario' : 'border-transparent text-suave hover:text-texto'}`}>
                        {nombre}
                    </button>
                ))}
            </div>
            <div role="tabpanel">
                {pestana === 'registros' && <Registros />}
                {pestana === 'fallidos' && <Puede permiso="bitacora.fallidos"><Agrupado ruta="/bitacora/intentos-fallidos" /></Puede>}
                {pestana === 'recursos' && <Agrupado ruta="/bitacora/recursos-top" />}
                {pestana === 'visitas' && <Visitas />}
            </div>
        </section>
    );
}

function Registros() {
    const { filas, meta, filtros, cargando, error, filtrar, setPagina } = useListado('/bitacora', { desde: haceDias(6), hasta: haceDias(0), tipo: '', ip: '', buscar: '' });

    return (
        <div className="tarjeta">
            <form className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5" role="search" onSubmit={(e) => e.preventDefault()}>
                <Campo etiqueta="Desde" nombre="desde" type="date" value={filtros.desde} onChange={(e) => filtrar({ desde: e.target.value })} />
                <Campo etiqueta="Hasta" nombre="hasta" type="date" value={filtros.hasta} onChange={(e) => filtrar({ hasta: e.target.value })} />
                <Campo como="select" etiqueta="Evento" nombre="tipo" value={filtros.tipo} onChange={(e) => filtrar({ tipo: e.target.value })} vacio="Todos" opciones={Object.entries(EVENTOS).map(([v, [t]]) => ({ valor: v, texto: t }))} />
                <Campo etiqueta="IP" nombre="ip" value={filtros.ip} onChange={(e) => filtrar({ ip: e.target.value })} maxLength={45} />
                <Campo etiqueta="Buscar" nombre="buscar" type="search" placeholder="Usuario, correo o recurso" value={filtros.buscar} onChange={(e) => filtrar({ buscar: e.target.value })} />
            </form>
            {error && <p className="mb-3 text-peligro" role="alert">{error}</p>}
            <TablaDatos
                filas={filas}
                cargando={cargando}
                descripcion="Registros de la bitácora de accesos"
                vacio="No hay registros con esos filtros."
                columnas={[
                    { titulo: 'Fecha y hora', celda: (b) => <span className="whitespace-nowrap">{fechaHora(b.fecha_hora)}{b.fecha_hora.slice(16)}</span> },
                    { titulo: 'Evento', celda: (b) => <Insignia tono={EVENTOS[b.tipo_evento][1]}>{EVENTOS[b.tipo_evento][0]}</Insignia> },
                    { titulo: 'Usuario', celda: (b) => b.usuario ?? (b.correo_intentado ? <span className="text-suave">{b.correo_intentado}</span> : '—') },
                    { titulo: 'Recurso', celda: (b) => <code className="text-xs">{b.metodo_http} {b.recurso}</code> },
                    { titulo: 'Código', campo: 'codigo_estado', alinear: 'derecha' },
                    { titulo: 'IP', celda: (b) => <code className="text-xs">{b.ip}</code> },
                ]}
            />
            <Paginacion meta={meta} alCambiar={setPagina} />
        </div>
    );
}

/** Intentos fallidos por IP o recursos más accedidos (mismo filtro de período). */
function Agrupado({ ruta }) {
    const fallidos = ruta.endsWith('intentos-fallidos');
    const { filas, filtros, cargando, error, filtrar } = useListado(ruta, { desde: haceDias(29), hasta: haceDias(0) });

    const columnas = fallidos
        ? [
            { titulo: 'IP', celda: (f) => <code>{f.ip}</code> },
            { titulo: 'Intentos', campo: 'intentos', alinear: 'derecha' },
            { titulo: 'Correos distintos', campo: 'correos', alinear: 'derecha' },
            { titulo: 'Correos intentados', celda: (f) => <span className="text-sm">{f.correos_intentados}</span> },
            { titulo: 'Último intento', celda: (f) => fechaHora(f.ultimo) },
        ]
        : [
            { titulo: 'Recurso', celda: (f) => <code className="text-xs">{f.recurso}</code> },
            { titulo: 'Accesos', campo: 'accesos', alinear: 'derecha' },
            { titulo: 'Usuarios', campo: 'usuarios', alinear: 'derecha' },
            { titulo: 'Rechazos (4xx/5xx)', campo: 'rechazos', alinear: 'derecha' },
        ];

    return (
        <div className="space-y-4">
            <div className="tarjeta flex flex-wrap gap-3">
                <Campo etiqueta="Desde" nombre="desde" type="date" value={filtros.desde} onChange={(e) => filtrar({ desde: e.target.value })} />
                <Campo etiqueta="Hasta" nombre="hasta" type="date" value={filtros.hasta} onChange={(e) => filtrar({ hasta: e.target.value })} />
            </div>
            {error && <p className="text-peligro" role="alert">{error}</p>}
            {!fallidos && filas?.length > 0 && (
                <Marco titulo="Recursos con mayor índice de acceso" filas={filas} columnas={[{ clave: 'recurso', titulo: 'Recurso' }, { clave: 'accesos', titulo: 'Accesos' }]} alto={Math.max(200, filas.length * 34)}>
                    <Barras datos={filas} categoria="recurso" horizontal series={[{ clave: 'accesos', nombre: 'Accesos' }]} />
                </Marco>
            )}
            <div className="tarjeta">
                <TablaDatos clave={fallidos ? 'ip' : 'recurso'} filas={filas} cargando={cargando} columnas={columnas} descripcion={fallidos ? 'Intentos fallidos por IP' : 'Recursos más accedidos'} vacio={fallidos ? 'No hubo intentos fallidos en el período.' : 'No hay accesos en el período.'} />
            </div>
        </div>
    );
}

/** Contador de visitas por página (GET /visitas). */
function Visitas() {
    const [filas, setFilas] = useState(null);
    useEffect(() => {
        api.get('/visitas').then(({ data }) => setFilas(data.data)).catch(() => setFilas([]));
    }, []);

    return (
        <div className="tarjeta">
            <TablaDatos
                clave="pagina"
                filas={filas}
                cargando={!filas}
                descripcion="Visitas acumuladas por página"
                vacio="Todavía no hay visitas registradas."
                columnas={[
                    { titulo: 'Página', celda: (v) => <code>{v.pagina}</code> },
                    { titulo: 'Visitas', campo: 'cantidad', alinear: 'derecha' },
                    { titulo: 'Última visita', celda: (v) => fechaHora(v.ultima_visita) },
                ]}
            />
        </div>
    );
}
