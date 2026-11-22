// Captura cada pantalla del sistema web por rol (Playwright + Chrome instalado).
import { chromium } from 'playwright';
import fs from 'node:fs';

const B = 'http://localhost:8000';
const OUT = new URL('./img/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const ID = { cob: 2, nota: 6, esc: 1 };
const RUTAS = [ // [ruta, permiso(s)]
    ['/inicio', null], ['/panel', 'dashboard.ver'], ['/analitica', 'analitica.ver'],
    ['/reportes', ['reportes.ver', 'reportes.mantenimiento']], ['/reportes/bitacora-comandos', 'bitacora.ver'],
    ['/coberturas', 'coberturas.listar'], [`/coberturas/${ID.cob}`, 'coberturas.listar'], [`/coberturas/${ID.cob}/hoja`, 'coberturas.hoja'],
    ['/notas', 'notas.listar'], [`/notas/${ID.nota}`, 'notas.listar'], [`/notas/${ID.nota}/historial`, 'notas.listar'], [`/notas/${ID.nota}/material`, 'material.listar'],
    ['/programas', 'programas.listar'], ['/plantillas', 'plantillas.listar'], ['/escaletas', 'escaletas.listar'],
    [`/escaletas/${ID.esc}`, 'escaletas.listar'], [`/escaletas/${ID.esc}/presentador`, 'escaletas.lectura'],
    ['/personal', 'personal.listar'], ['/personal/ausencias', 'ausencias.listar'], ['/personal/disponibilidad', 'personal.disponibilidad'], ['/turnos', 'turnos.listar'],
    ['/recursos', 'recursos.listar'], ['/prestamos', 'prestamos.listar'],
    ['/usuarios', 'usuarios.listar'], ['/seguridad/matriz', 'seguridad.matriz.ver'], ['/seguridad/menu', 'seguridad.menu'], ['/seguridad/bitacora', 'bitacora.ver'],
    ['/perfil', null],
];
const ROLES = ['admin', 'director', 'jefe.prensa', 'area.tecnica', 'carla.rojas', 'jorge.mendoza', 'patricia.saucedo', 'mariana.terceros'];
const nombre = (rol, ruta) => `${rol}__${ruta.replace(/^\//, '').replace(/[/:]/g, '_') || 'raiz'}.png`;

const browser = await chromium.launch({ channel: 'chrome' });
const indice = [];
const errores = [];

async function pagina(ctx) {
    const p = await ctx.newPage();
    p.on('console', (m) => m.type() === 'error' && errores.push([p.url(), m.text().slice(0, 200)]));
    p.on('pageerror', (e) => errores.push([p.url(), e.message.slice(0, 200)]));
    return p;
}
async function foto(p, archivo, grupo, titulo) {
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(500);
    await p.screenshot({ path: OUT + archivo, fullPage: true });
    indice.push({ archivo, grupo, titulo, url: p.url().replace(B, '') });
}

// Público
{
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
    const p = await pagina(ctx);
    await p.goto(B + '/'); await foto(p, 'publico__inicio.png', 'Público', 'Bienvenida');
    await p.goto(B + '/login'); await foto(p, 'publico__login.png', 'Público', 'Iniciar sesión');
    await p.fill('input[type=email]', 'jefe.prensa@canal11.test'); await p.fill('input[type=password]', 'mala');
    await p.click('button[type=submit]'); await p.waitForTimeout(800); await foto(p, 'publico__login_error.png', 'Público', 'Login con error (A1)');
    await p.goto(B + '/no-existe'); await foto(p, 'publico__404.png', 'Público', 'Página no encontrada');
    await ctx.close();
}

for (const rol of ROLES) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
    const p = await pagina(ctx);
    const login = p.waitForResponse((r) => r.url().includes('/api/v1/auth/login'));
    await p.goto(B + '/login');
    await p.fill('input[type=email]', `${rol}@canal11.test`);
    await p.fill('input[type=password]', 'canal11');
    await p.click('button[type=submit]');
    const permisos = (await (await login).json()).permisos ?? [];
    await p.waitForURL('**/inicio');
    for (const [ruta, perm] of RUTAS) {
        const ok = perm === null || [].concat(perm).some((x) => permisos.includes(x));
        if (!ok) continue;
        await p.goto(B + ruta);
        await foto(p, nombre(rol, ruta), rol, ruta);
    }
    // Una ruta sin permiso, para ver el 403 en pantalla
    const prohibida = RUTAS.find(([, perm]) => perm && ![].concat(perm).some((x) => permisos.includes(x)));
    if (prohibida) { await p.goto(B + prohibida[0]); await foto(p, nombre(rol, 'SIN_PERMISO' + prohibida[0]), rol, `sin permiso: ${prohibida[0]}`); }
    await ctx.close();
}

// Temas y accesibilidad (Jefe de Prensa, preferencias del lado del cliente)
const TEMAS = [
    ['ninos', 'claro'], ['ninos', 'oscuro'], ['jovenes', 'claro'], ['jovenes', 'oscuro'], ['adultos', 'oscuro'],
];
{
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
    const p = await pagina(ctx);
    await p.goto(B + '/login');
    await p.fill('input[type=email]', 'jefe.prensa@canal11.test'); await p.fill('input[type=password]', 'canal11');
    await p.click('button[type=submit]'); await p.waitForURL('**/inicio');
    for (const [tema, modo] of TEMAS) {
        const selects = await p.$$('header select');
        const opTema = await selects[0].$$eval('option', (o, t) => o.find((x) => x.value.toLowerCase().includes(t) || x.textContent.toLowerCase().includes(t))?.value, tema);
        const opModo = await selects[1].$$eval('option', (o, m) => o.find((x) => x.value.toLowerCase().includes(m === 'claro' ? 'd' : 'noche') || x.textContent.toLowerCase().includes(m === 'claro' ? 'día' : 'noche'))?.value, modo);
        if (opTema) await selects[0].selectOption(opTema);
        if (opModo) await selects[1].selectOption(opModo);
        await p.goto(B + '/coberturas');
        await foto(p, `tema__${tema}_${modo}.png`, 'Temas', `Tema ${tema} · ${modo}`);
    }
    await p.click('header button:has-text("A+")').catch(() => {}); await p.click('header button:has-text("A+")').catch(() => {});
    await p.goto(B + '/notas'); await foto(p, 'tema__letra_grande.png', 'Temas', 'Letra A+ ×2');
    await p.click('header button[aria-label*="contraste" i], header button[title*="contraste" i]').catch(() => {});
    await p.goto(B + '/notas'); await foto(p, 'tema__alto_contraste.png', 'Temas', 'Alto contraste');
    // Buscador global
    await p.fill('header input[type=search], header input[placeholder*="Busc"]', 'elec').catch(() => {});
    await p.waitForTimeout(900); await foto(p, 'tema__buscador.png', 'Temas', 'Buscador predictivo «elec»');
    await ctx.close();
}

// Móvil
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const p = await pagina(ctx);
    await p.goto(B + '/login');
    await p.fill('input[type=email]', 'jefe.prensa@canal11.test'); await p.fill('input[type=password]', 'canal11');
    await p.click('button[type=submit]'); await p.waitForURL('**/inicio');
    for (const r of ['/inicio', '/coberturas', `/coberturas/${ID.cob}/hoja`, `/escaletas/${ID.esc}`, '/notas', '/panel']) {
        await p.goto(B + r); await foto(p, `movil__${r.replace(/\//g, '_')}.png`, 'Móvil (390 px)', r);
    }
    await ctx.close();
}

await browser.close();
fs.writeFileSync(OUT + '../indice.json', JSON.stringify({ indice, errores }, null, 1));
console.log(indice.length, 'capturas;', errores.length, 'errores de consola');
for (const e of errores) console.log(' ', e.join(' → '));
