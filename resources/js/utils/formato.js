/** Formatos de fecha y hora para Bolivia (es-BO). */

const fecha = (valor) => new Date(String(valor).replace(' ', 'T'));

export const fechaCorta = (valor) => (valor ? fecha(valor).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

export const fechaLarga = (valor) => (valor ? fecha(valor).toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' }) : '—');

export const fechaHora = (valor) => (valor ? `${fechaCorta(valor)} ${String(valor).replace('T', ' ').slice(11, 16)}` : '—');

export const hora = (valor) => (valor ? String(valor).replace('T', ' ').slice(11, 16) || String(valor).slice(0, 5) : '—');

/** Fecha de hoy en formato AAAA-MM-DD (hora local). */
export function hoy(desplazamientoDias = 0) {
    const d = new Date();
    d.setDate(d.getDate() + desplazamientoDias);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Duración en segundos → '2:05' o '1:02:05'. */
export function duracion(segundos) {
    const s = Math.abs(Math.round(segundos ?? 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = String(s % 60).padStart(2, '0');
    const signo = (segundos ?? 0) < 0 ? '−' : '';
    return h ? `${signo}${h}:${String(m).padStart(2, '0')}:${r}` : `${signo}${m}:${r}`;
}
