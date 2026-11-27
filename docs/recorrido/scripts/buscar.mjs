import { chromium } from 'playwright';
const b=await chromium.launch({channel:'chrome'}); const p=await (await b.newContext({viewport:{width:1366,height:860}})).newPage();
await p.goto('http://localhost:8000/login'); await p.fill('input[type=email]','jefe.prensa@canal11.test'); await p.fill('input[type=password]','canal11'); await p.click('button[type=submit]'); await p.waitForURL('**/inicio');
await p.goto('http://localhost:8000/buscar?q=paro'); await p.waitForLoadState('networkidle'); await p.waitForTimeout(600);
await p.screenshot({path:new URL('./img/jefe.prensa__buscar.png',import.meta.url).pathname,fullPage:true}); await b.close();
