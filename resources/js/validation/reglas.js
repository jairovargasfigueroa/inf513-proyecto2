/*
 * Validación en el cliente (consigna, punto 6): las mismas reglas que el
 * FormRequest de Laravel y los mismos mensajes en español, para que el usuario
 * vea el error antes de enviar. El servidor vuelve a validar siempre.
 *
 * Uso:
 *   const errores = validar(datos, {
 *       correo: ['correo', [requerido, correo, max(150)]],
 *   });
 */

const vacio = (v) => v === undefined || v === null || String(v).trim() === '';

export const requerido = (v, nombre) => (vacio(v) ? `El campo ${nombre} es obligatorio.` : null);

export const correo = (v, nombre) =>
    vacio(v) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim())
        ? null
        : `El campo ${nombre} debe ser una dirección de correo válida.`;

export const max = (n) => (v, nombre) =>
    vacio(v) || String(v).length <= n ? null : `El campo ${nombre} no debe tener más de ${n} caracteres.`;

export const min = (n) => (v, nombre) =>
    vacio(v) || String(v).trim().length >= n ? null : `El campo ${nombre} debe tener al menos ${n} caracteres.`;

export const entero = (v, nombre) =>
    vacio(v) || /^-?\d+$/.test(String(v)) ? null : `El campo ${nombre} debe ser un número entero.`;

export const entre = (a, b) => (v, nombre) =>
    vacio(v) || (Number(v) >= a && Number(v) <= b) ? null : `El campo ${nombre} debe estar entre ${a} y ${b}.`;

/** Devuelve { campo: 'mensaje' } con el primer error de cada campo. */
export function validar(datos, esquema) {
    const errores = {};
    for (const [campo, [nombre, reglas]] of Object.entries(esquema)) {
        for (const regla of reglas) {
            const error = regla(datos[campo], nombre);
            if (error) {
                errores[campo] = error;
                break;
            }
        }
    }
    return errores;
}
