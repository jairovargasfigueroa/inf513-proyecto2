/**
 * Pantalla provisional de una opción del menú cuyo caso de uso todavía no se
 * implementa. Se reemplaza por la pantalla real de cada CU.
 */
export default function Pendiente({ titulo, casoUso }) {
    return (
        <section className="tarjeta" aria-labelledby="titulo-pendiente">
            <p className="text-sm font-semibold text-acento">{casoUso}</p>
            <h1 id="titulo-pendiente" className="titulo-pagina">{titulo}</h1>
            <p className="mt-2 text-suave">Esta pantalla se habilita en la siguiente etapa del desarrollo.</p>
        </section>
    );
}
