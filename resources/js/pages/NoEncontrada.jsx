import { Link } from 'react-router-dom';

export default function NoEncontrada() {
    return (
        <section className="tarjeta" aria-labelledby="titulo-404">
            <h1 id="titulo-404" className="titulo-pagina">Página no encontrada</h1>
            <p className="mt-2 text-suave">La dirección que abrió no existe en el sistema.</p>
            <Link to="/" className="boton mt-4">Volver al inicio</Link>
        </section>
    );
}
