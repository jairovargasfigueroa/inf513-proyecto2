/*
 * Textos para mostrar los valores que la base guarda en minúsculas y sin tildes
 * (convención del sistema vía correo), y las opciones de las listas.
 */

const opciones = (mapa) => Object.entries(mapa).map(([valor, texto]) => ({ valor, texto }));

export const CARGOS = {
    periodista: 'Periodista',
    camarografo: 'Camarógrafo',
    editor: 'Editor de video',
    presentador: 'Presentador',
    conductor: 'Conductor',
    jefe_prensa: 'Jefe de Prensa',
};

export const CONDICIONES = { planta: 'Planta', contrato: 'Contrato', practicante: 'Practicante' };

export const TIPOS_AUSENCIA = { permiso: 'Permiso', vacacion: 'Vacación', baja_medica: 'Baja médica', comision: 'Comisión' };

export const DIAS = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom' };

export const TIPOS_COBERTURA = {
    conferencia: 'Conferencia',
    hecho_noticioso: 'Hecho noticioso',
    deportes: 'Deportes',
    acto_institucional: 'Acto institucional',
    entrevista: 'Entrevista',
};

export const PRIORIDADES = { alta: 'Alta', media: 'Media', baja: 'Baja' };

export const ESTADOS_COBERTURA = {
    planificada: 'Planificada',
    en_curso: 'En curso',
    cumplida: 'Cumplida',
    cancelada: 'Cancelada',
    reprogramada: 'Reprogramada',
};

export const FUNCIONES = { periodista: 'Periodista', camarografo: 'Camarógrafo', conductor: 'Conductor' };

export const ESTADOS_RECURSO = { operativo: 'Operativo', mantenimiento: 'En mantenimiento', baja: 'De baja' };

export const op = { CARGOS: opciones(CARGOS), CONDICIONES: opciones(CONDICIONES), TIPOS_AUSENCIA: opciones(TIPOS_AUSENCIA) };
export { opciones };

/** Texto de un valor, o el valor tal cual si no está en el mapa. */
export const texto = (mapa, valor) => mapa[valor] ?? valor ?? '—';

/** '1,2,3,4,5' → 'Lun a Vie'; '1,3,5' → 'Lun, Mié, Vie'. */
export function diasTexto(dias) {
    const lista = String(dias).split(',').map(Number);
    const seguidos = lista.every((d, i) => i === 0 || d === lista[i - 1] + 1);
    if (lista.length > 2 && seguidos) return `${DIAS[lista[0]]} a ${DIAS[lista.at(-1)]}`;
    return lista.map((d) => DIAS[d]).join(', ');
}

export const TIPOS_PIEZA = {
    lectura: 'Lectura', vo: 'VO', vo_sot: 'VO + SOT', nota_completa: 'Nota completa', enlace_vivo: 'Enlace en vivo', entrevista_estudio: 'Entrevista en estudio',
};

export const ESTADOS_NOTA = {
    borrador: 'Borrador', en_revision: 'En revisión', observada: 'Observada', aprobada: 'Aprobada', emitida: 'Emitida', baja: 'De baja',
};

export const TONO_NOTA = { borrador: 'neutro', en_revision: 'acento', observada: 'peligro', aprobada: 'exito', emitida: 'exito', baja: 'neutro' };

export const TIPOS_MATERIAL = { video: 'Video', sot: 'SOT', grafico: 'Gráfico', foto: 'Foto', audio: 'Audio' };

export const ESTADOS_MATERIAL = { pendiente: 'Pendiente', ingestado: 'Ingestado', en_edicion: 'En edición', listo: 'Listo para emitir' };

export const TIPOS_PROGRAMA = { noticiero: 'Noticiero', especial: 'Especial', otro: 'Otro (solo referencia)' };

export const DIAS_LARGOS = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo' };

export const ESTADOS_ESCALETA = { borrador: 'Borrador', cerrada: 'Cerrada', emitida: 'Emitida' };

export const TIPOS_ITEM = {
    apertura: 'Apertura', titulares: 'Titulares', nota: 'Nota', enlace_vivo: 'Enlace en vivo', entrevista: 'Entrevista', despedida: 'Despedida', otro: 'Otro', corte: 'Corte comercial',
};
