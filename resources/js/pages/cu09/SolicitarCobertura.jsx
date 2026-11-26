import { CreditCard, SearchCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Campo from '../../components/ui/Campo';
import Cargando from '../../components/ui/Cargando';
import ResumenErrores from '../../components/ui/ResumenErrores';
import useFormulario from '../../hooks/useFormulario';
import api, { mensajeDeError } from '../../services/api';
import { TIPOS_COBERTURA, opciones } from '../../utils/etiquetas';
import { dinero, hoy } from '../../utils/formato';
import { correo, formato, max, requerido } from '../../validation/reglas';

const DIAS_ANTICIPACION = 2;
const primerDia = () => hoy(DIAS_ANTICIPACION);
const vacio = () => ({
    tarifa_id: '', solicitante: '', institucion: '', correo: '', telefono: '', titulo: '', descripcion: '',
    tipo: 'acto_institucional', lugar: '', inicio: `${primerDia()}T10:00`, fin: `${primerDia()}T12:00`,
});

// Mismas reglas que SolicitudRequest en Laravel.
const esquema = (d) => ({
    tarifa_id: ['servicio', [requerido]],
    solicitante: ['nombre', [requerido, max(150)]],
    institucion: ['institución', [max(150)]],
    correo: ['correo', [requerido, correo, max(150)]],
    telefono: ['teléfono', [formato(/^[0-9+\-\s]{6,20}$/, 'Escriba un teléfono válido (solo números, espacios, + o -).')]],
    titulo: ['título', [requerido, max(200)]],
    descripcion: ['descripción', [max(1000)]],
    tipo: ['tipo de evento', [requerido]],
    lugar: ['lugar', [requerido, max(200)]],
    inicio: ['inicio', [requerido, (v) => (v && v.slice(0, 10) < primerDia() ? `Solicite la cobertura con al menos ${DIAS_ANTICIPACION} días de anticipación.` : null)]],
    fin: ['fin', [requerido, (v) => (d.inicio && v && v <= d.inicio ? 'El evento debe terminar después de empezar.' : null)]],
});

/**
 * Solicitar Cobertura (pública) «client page» (CU-09): el Visitante llena
 * FormularioSolicitud, ve el precio de la tarifa elegida y va a pagar a Stripe.
 */
export default function SolicitarCobertura() {
    const [servicios, setServicios] = useState(null);
    const [error, setError] = useState(null);
    const { datos, errores, mensaje, enviando, cambiar, enviar } = useFormulario(vacio(), esquema);

    useEffect(() => {
        api.get('/servicios').then(({ data }) => setServicios(data.data)).catch((e) => setError(mensajeDeError(e)));
    }, []);

    const elegido = servicios?.find((s) => String(s.id) === String(datos.tarifa_id));

    const pagar = async (e) => {
        e.preventDefault();
        const r = await enviar((d) => api.post('/solicitudes', {
            ...d, institucion: d.institucion || null, telefono: d.telefono || null, descripcion: d.descripcion || null,
        }));
        if (r) window.location.assign(r.data.data.url_pago); // página de pago de Stripe
    };

    return (
        <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-acento">CU-09 · Servicios del canal</p>
                    <h1 className="titulo-pagina">Solicitar cobertura</h1>
                    <p className="mt-1 max-w-2xl text-suave">
                        Pida que Canal 11 cubra o transmita su evento. Pague en línea y el Jefe de Prensa confirmará la
                        cobertura; si no puede atenderla, se le devuelve el pago.
                    </p>
                </div>
                <Link to="/solicitar/consulta" className="boton-secundario"><SearchCheck className="h-4 w-4" aria-hidden="true" /> Consultar mi solicitud</Link>
            </div>

            {error && <p className="tarjeta text-peligro" role="alert">{error}</p>}
            {!servicios && !error && <Cargando texto="Cargando los servicios…" />}

            {servicios && (
                <form onSubmit={pagar} noValidate className="grid gap-4 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-2">
                        <ResumenErrores errores={errores} mensaje={mensaje} />

                        <fieldset className="tarjeta">
                            <legend className="px-1 text-lg font-semibold">1. Servicio</legend>
                            {servicios.length === 0 && <p className="text-suave">Por ahora no hay servicios disponibles.</p>}
                            <div className="grid gap-3 sm:grid-cols-2">
                                {servicios.map((s) => (
                                    <label
                                        key={s.id}
                                        className={`cursor-pointer rounded-tema border p-3 ${String(datos.tarifa_id) === String(s.id) ? 'border-primario ring-2 ring-primario' : 'border-borde'}`}
                                    >
                                        <input type="radio" name="tarifa_id" value={s.id} checked={String(datos.tarifa_id) === String(s.id)} onChange={cambiar} className="sr-only" />
                                        <span className="flex items-baseline justify-between gap-2">
                                            <span className="font-semibold">{s.servicio}</span>
                                            <span className="whitespace-nowrap font-bold">{dinero(s.monto, s.moneda)}</span>
                                        </span>
                                        {s.descripcion && <span className="mt-1 block text-sm text-suave">{s.descripcion}</span>}
                                    </label>
                                ))}
                            </div>
                            {errores.tarifa_id && <p className="mt-2 text-sm font-medium text-peligro">{errores.tarifa_id}</p>}
                        </fieldset>

                        <fieldset className="tarjeta">
                            <legend className="px-1 text-lg font-semibold">2. Evento</legend>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Campo etiqueta="Título del evento" nombre="titulo" value={datos.titulo} onChange={cambiar} error={errores.titulo} requerido maxLength={200} className="sm:col-span-2" />
                                <Campo como="select" etiqueta="Tipo de evento" nombre="tipo" value={datos.tipo} onChange={cambiar} error={errores.tipo} requerido opciones={opciones(TIPOS_COBERTURA)} />
                                <Campo etiqueta="Lugar" nombre="lugar" value={datos.lugar} onChange={cambiar} error={errores.lugar} requerido maxLength={200} />
                                <Campo etiqueta="Inicio" nombre="inicio" type="datetime-local" min={`${primerDia()}T00:00`} value={datos.inicio} onChange={cambiar} error={errores.inicio} requerido ayuda={`Con al menos ${DIAS_ANTICIPACION} días de anticipación.`} />
                                <Campo etiqueta="Fin" nombre="fin" type="datetime-local" min={datos.inicio} value={datos.fin} onChange={cambiar} error={errores.fin} requerido ayuda="Como máximo 12 horas." />
                                <Campo como="textarea" etiqueta="Descripción" nombre="descripcion" value={datos.descripcion} onChange={cambiar} error={errores.descripcion} maxLength={1000} className="sm:col-span-2" ayuda="Qué se hará, quiénes participan y cualquier dato útil para el equipo." />
                            </div>
                        </fieldset>

                        <fieldset className="tarjeta">
                            <legend className="px-1 text-lg font-semibold">3. Sus datos</legend>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Campo etiqueta="Nombre completo" nombre="solicitante" value={datos.solicitante} onChange={cambiar} error={errores.solicitante} requerido maxLength={150} autoComplete="name" />
                                <Campo etiqueta="Institución" nombre="institucion" value={datos.institucion} onChange={cambiar} error={errores.institucion} maxLength={150} autoComplete="organization" />
                                <Campo etiqueta="Correo" nombre="correo" type="email" value={datos.correo} onChange={cambiar} error={errores.correo} requerido maxLength={150} autoComplete="email" ayuda="Lo necesitará con su código para consultar la solicitud." />
                                <Campo etiqueta="Teléfono" nombre="telefono" type="tel" value={datos.telefono} onChange={cambiar} error={errores.telefono} maxLength={20} autoComplete="tel" />
                            </div>
                        </fieldset>
                    </div>

                    <aside className="tarjeta h-fit space-y-3 lg:sticky lg:top-20" aria-labelledby="titulo-resumen">
                        <h2 id="titulo-resumen" className="text-lg font-semibold">Resumen</h2>
                        <p className="flex justify-between gap-2"><span className="text-suave">Servicio</span><span className="text-right">{elegido?.servicio ?? '—'}</span></p>
                        <p className="flex justify-between gap-2 text-xl font-bold"><span>Total</span><span>{elegido ? dinero(elegido.monto, elegido.moneda) : '—'}</span></p>
                        <button type="submit" className="boton w-full justify-center" disabled={enviando || servicios.length === 0}>
                            <CreditCard className="h-4 w-4" aria-hidden="true" /> {enviando ? 'Preparando el pago…' : 'Pagar con Stripe'}
                        </button>
                        <p className="text-sm text-suave">
                            Pagará en la página segura de Stripe con tarjeta o escaneando un QR con su celular. Es un entorno
                            de prueba: use la tarjeta 4242 4242 4242 4242, cualquier fecha futura y cualquier CVC.
                        </p>
                    </aside>
                </form>
            )}
        </section>
    );
}
