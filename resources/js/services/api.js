import axios from 'axios';

// Subcarpeta donde está publicado el sistema ('' en local,
// '/inf513/grupo14sa/proyecto2' en tecnoweb). La pone Laravel en app.blade.php.
export const basePath = document.querySelector('meta[name="base-path"]')?.content ?? '';

// Cliente HTTP de la capa de presentación: es la única vía hacia la API.
const api = axios.create({
    baseURL: `${basePath}/api/v1`,
    headers: { Accept: 'application/json' },
});

export default api;
