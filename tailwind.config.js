/** @type {import('tailwindcss').Config} */

// Los colores salen de variables CSS (design tokens) que cambia cada tema
// (data-tema), el modo día/noche (data-modo) y el alto contraste (data-contraste).
const token = (nombre) => `rgb(var(--c-${nombre}) / <alpha-value>)`;

export default {
    content: ['./resources/views/**/*.blade.php', './resources/js/**/*.{js,jsx}'],
    darkMode: ['selector', '[data-modo="noche"]'],
    theme: {
        extend: {
            colors: {
                fondo: token('fondo'),
                superficie: token('superficie'),
                texto: token('texto'),
                suave: token('suave'),
                borde: token('borde'),
                primario: token('primario'),
                'sobre-primario': token('sobre-primario'),
                acento: token('acento'),
                peligro: token('peligro'),
                exito: token('exito'),
            },
            borderRadius: {
                tema: 'var(--radio)',
            },
        },
    },
    plugins: [],
};
