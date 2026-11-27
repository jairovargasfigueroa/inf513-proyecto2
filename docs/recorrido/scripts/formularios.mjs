// Abre cada formulario (modal) sin enviarlo y lo captura.
import { chromium } from 'playwright';
import fs from 'node:fs';
const B='http://localhost:8000', OUT=new URL('./form/',import.meta.url).pathname; fs.mkdirSync(OUT,{recursive:true});
const F=[ // [archivo, rol, ruta, botón (texto exacto o regex)]
 ['CU-01__w.frm.Usuario_nuevo','admin','/usuarios','Nuevo usuario'],
 ['CU-01__w.frm.Usuario_editar','admin','/usuarios',/^Editar a Carla/],
 ['CU-01__w.frm.Perfil','jefe.prensa','/perfil','Editar mis datos'],
 ['CU-01__w.frm.Preferencias','jefe.prensa','/perfil','Apariencia'],
 ['CU-01__w.frm.Menu_nuevo','admin','/seguridad/menu','Nueva opción'],
 ['CU-01__w.frm.Menu_editar','admin','/seguridad/menu',/^Editar la opción Reportes/],
 ['CU-01__confirmar_desactivar_usuario','admin','/usuarios',/^Desactivar a Carla/],
 ['CU-02__w.frm.Personal_nuevo','jefe.prensa','/personal','Nueva ficha'],
 ['CU-02__w.frm.Personal_editar','jefe.prensa','/personal',/^Editar la ficha de Carla/],
 ['CU-02__confirmar_desactivar_ficha','jefe.prensa','/personal',/^Desactivar la ficha de Carla/],
 ['CU-02__w.frm.Ausencia','jefe.prensa','/personal/ausencias','Nueva ausencia'],
 ['CU-02__w.frm.Turno','jefe.prensa','/turnos','Nuevo turno'],
 ['CU-03__w.frm.Recurso_nuevo','area.tecnica','/recursos','Nuevo recurso'],
 ['CU-03__w.frm.Recurso_editar','area.tecnica','/recursos',/^Editar CAM-01/],
 ['CU-03__w.frm.Incidencia','area.tecnica','/recursos',/^Reportar incidencia de CAM-01/],
 ['CU-03__confirmar_baja_recurso','area.tecnica','/recursos',/^Dar de baja CAM-01/],
 ['CU-03__w.frm.Prestamo_entrega','area.tecnica','/prestamos','Entregar recurso'],
 ['CU-03__w.frm.Devolucion','area.tecnica','/prestamos','Devolver'],
 ['CU-04__w.frm.Cobertura_nueva','jefe.prensa','/coberturas','Nueva cobertura'],
 ['CU-04__w.frm.Cobertura_reprogramar','jefe.prensa','/coberturas',/^Reprogramar Paro/],
 ['CU-04__confirmar_cancelar_cobertura','jefe.prensa','/coberturas',/^Cancelar Paro/],
 ['CU-04__w.frm.Duplicar','jefe.prensa','/coberturas',/^Duplicar Paro/],
 ['CU-04__w.frm.Asignacion','jefe.prensa','/coberturas/2','Asignar personal'],
 ['CU-04__w.frm.Reserva','jefe.prensa','/coberturas/2','Reservar recurso'],
 ['CU-04__w.frm.Retorno','jefe.prensa','/coberturas/2','Registrar retorno'],
 ['CU-05__w.frm.Nota_nueva','jefe.prensa','/notas','Nueva nota'],
 ['CU-05__w.frm.Nota_editar','jefe.prensa','/notas',/^Editar PARO-TRANSPORTE/],
 ['CU-05__w.frm.Guion','jefe.prensa','/notas/6','Reemplazar guion'],
 ['CU-05__w.frm.Rotulos','jefe.prensa','/notas/6','Rótulos'],
 ['CU-05__w.frm.Observacion','jefe.prensa','/notas/3',/^Observar/],
 ['CU-05__w.frm.Material_registrar','carla.rojas','/notas/6/material',/^Registrar material/],
 ['CU-05__w.frm.Material_estado','patricia.saucedo','/notas/6/material',/estado/i],
 ['CU-06__w.frm.Programa','jefe.prensa','/programas','Nuevo programa'],
 ['CU-06__w.frm.Horario','jefe.prensa','/programas','Nuevo horario'],
 ['CU-06__w.frm.Plantilla_nueva','jefe.prensa','/plantillas','Nueva plantilla'],
 ['CU-06__w.frm.Plantilla_configurar','jefe.prensa','/plantillas','Configurar'],
 ['CU-06__w.frm.Corte','jefe.prensa','/plantillas','Ajustar el corte 1'],
 ['CU-06__w.frm.GenerarEscaleta','jefe.prensa','/escaletas','Generar escaleta'],
 ['CU-06__w.frm.Item_agregar','jefe.prensa','/escaletas/1','Agregar ítem'],
 ['CU-06__w.frm.Item_ajustar','jefe.prensa','/escaletas/1',/^Ajustar Titulares/],
 ['CU-06__lista_de_control_al_cerrar','jefe.prensa','/escaletas/1','Cerrar escaleta'],
];
const b=await chromium.launch({channel:'chrome'}); const ctxs={}; const hechos=[], fallos=[];
async function pagina(rol){ if(ctxs[rol]) return ctxs[rol]; const p=await (await b.newContext({viewport:{width:1366,height:860}})).newPage();
  await p.goto(B+'/login'); await p.fill('input[type=email]',rol+'@canal11.test'); await p.fill('input[type=password]','canal11'); await p.click('button[type=submit]'); await p.waitForURL('**/inicio'); return ctxs[rol]=p; }
for (const [arch,rol,ruta,boton] of F) {
  const p=await pagina(rol); await p.goto(B+ruta); await p.waitForLoadState('networkidle'); await p.waitForTimeout(300);
  try {
    await p.getByRole('button',{name:boton,exact:typeof boton==='string'}).first().click({timeout:4000});
    await p.waitForSelector('[id^=headlessui-dialog-panel]',{timeout:4000}); await p.waitForTimeout(700);
    await p.screenshot({path:OUT+arch+'.png'}); hechos.push(arch);
  } catch(e){ fallos.push(arch+': '+e.message.split('\n')[0]); }
}
await b.close(); console.log(hechos.length,'formularios'); fallos.forEach(f=>console.log('FALLO',f));
