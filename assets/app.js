'use strict';
const $ = id => document.getElementById(id);
let products = [], rawRows = [], fileName = '', imageCache = new Map();
const MAX_FILE = 10 * 1024 * 1024, MAX_LABELS = 3000;
const strip = s => String(s ?? '').trim();
const escapeHtml = s => strip(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
function alertUser(message, error=false){const t=$('toast');t.textContent=message;t.className='show'+(error?' error':'');clearTimeout(alertUser.timer);alertUser.timer=setTimeout(()=>t.className='',4200)}
function downloadable(text,name,mime){const url=URL.createObjectURL(new Blob([text],{type:mime}));const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function downloadTemplateCSV(){
  const rows=[['Nombre del producto','Codigo / SKU','Precio','Cantidad','Categoria','Descripcion'],['Café de especialidad 500g','PROD-00124','Q 85.00',12,'Alimentos','Paquete de 500 g'],['Mouse inalámbrico','TEC-00035','Q 125.00',8,'Tecnología','USB inalámbrico'],['Libreta profesional','ESC-01120','Q 28.00',30,'Oficina','Tamaño carta']];
  const cell=v=>{const text=String(v);return /[",\r\n]/.test(text)?'"'+text.replaceAll('"','""')+'"':text};
  downloadable('\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n','plantilla-productos.csv','text/csv;charset=utf-8');
}
function downloadTemplateExcel(){
  const a=document.createElement('a');a.href='assets/plantilla-productos.xlsx';a.download='plantilla-productos.xlsx';document.body.appendChild(a);a.click();a.remove();
}
$('topTemplate').addEventListener('click',downloadTemplateExcel);
$('templateCSV').addEventListener('click',downloadTemplateCSV);
$('templateExcel').addEventListener('click',downloadTemplateExcel);
const drop=$('drop'), file=$('file');drop.addEventListener('click',()=>file.click());drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();file.click()}});['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('drag')}));['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('drag')}));drop.addEventListener('drop',e=>{const f=e.dataTransfer?.files?.[0];if(f)processFile(f)});file.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)processFile(f);file.value='' });
async function processFile(f){try{if(!/\.(csv|xls|xlsx)$/i.test(f.name))throw Error('Formato no permitido: usa .csv, .xls o .xlsx.');if(f.size>MAX_FILE)throw Error('El archivo supera el límite de 10 MB.');if(!window.XLSX)throw Error('No se pudo cargar el lector Excel. Revisa tu conexión y vuelve a intentar.');const data=await f.arrayBuffer();const wb=XLSX.read(data,{type:'array',raw:false,cellText:true});if(!wb.SheetNames.length)throw Error('El archivo no tiene hojas.');const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:'',blankrows:false,raw:false});if(!rows.length)throw Error('No hay filas en el archivo.');rawRows=rows.map(r=>Array.isArray(r)?r.map(strip):[]);fileName=f.name;setupMapping();$('fileStatus').textContent='✓ '+f.name+' · '+Math.max(0,rows.length-1)+' filas detectadas';$('fileStatus').hidden=false;$('mapping').hidden=false;alertUser('Archivo leído. Confirma las columnas para importar.')}catch(e){alertUser(e.message,true)}}
const columnNames=()=>{const max=Math.max(1,...rawRows.slice(0,100).map(r=>r.length));return Array.from({length:Math.min(max,100)},(_,i)=>i)};
function guessColumn(keys,fallback){const first=(rawRows[0]||[]).map(x=>strip(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''));const at=first.findIndex(x=>keys.some(k=>x.includes(k)));return at>=0?String(at):fallback}
function setupMapping(){const columns=columnNames();for(const id of ['mapName','mapCode','mapPrice','mapQty']){$(id).replaceChildren();if(id==='mapPrice'||id==='mapQty')$(''+id).add(new Option('No importar',''));for(const i of columns){const label=strip(rawRows[0]?.[i]);$(id).add(new Option(`${String.fromCharCode(65+i%26)} — ${label.slice(0,32)||'Columna '+(i+1)}`,String(i)))}}$('mapName').value=guessColumn(['nombre','producto','articulo','descripcion','name'],'0');$('mapCode').value=guessColumn(['codigo','sku','code','barcode','ean','id'],columns.length>1?'1':'0');$('mapPrice').value=guessColumn(['precio','price','costo'],'');$('mapQty').value=guessColumn(['cantidad','qty','quantity','unidades'],'')}
$('hasHeader').addEventListener('change',setupMapping);
$('import').addEventListener('click',()=>{const n=Number($('mapName').value),c=Number($('mapCode').value),p=$('mapPrice').value,q=$('mapQty').value;const start=$('hasHeader').checked?1:0;let invalid=0;const added=[];for(const row of rawRows.slice(start)){const name=strip(row[n]),code=strip(row[c]);if(!name&&!code)continue;if(!name||!code){invalid++;continue}const qty=q===''?1:Number(strip(row[Number(q)]).replace(',','.'))||1;added.push({name:name.slice(0,120),code:code.slice(0,160),price:p===''?'':strip(row[Number(p)]).slice(0,50),qty:Math.min(999,Math.max(1,Math.floor(qty))),id:cryptoId()})}if(!added.length){alertUser('No hay artículos válidos: comprueba las columnas de nombre y código.',true);return}products=products.concat(added).slice(0,10000);$('mapping').hidden=true;render();alertUser(`✓ Importados ${added.length} artículos${invalid?' · '+invalid+' filas incompletas omitidas':''}.`)});
function cryptoId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,9)}
$('manual').addEventListener('submit',e=>{e.preventDefault();const name=strip($('name').value),code=strip($('code').value),price=strip($('price').value);if(!name){alertUser('Escribe el nombre del artículo.',true);return}if(!code){alertUser('Escribe el código o SKU para que el escáner pueda identificar el artículo.',true);$('code').focus();return}products.push({name,code,price,qty:1,id:cryptoId()});e.target.reset();render();alertUser('Artículo añadido correctamente.')});
$('demo').addEventListener('click',()=>{products=[['Café de especialidad 500g','PROD-00124','Q 85.00'],['Mouse inalámbrico','TEC-00035','Q 125.00'],['Libreta profesional','ESC-01120','Q 28.00'],['Botella térmica 750ml','HOG-00218','Q 149.00']].map(x=>({name:x[0],code:x[1],price:x[2],qty:1,id:cryptoId()}));render();alertUser('Ejemplo cargado. ¡Puedes descargarlo en PDF!')});
$('clear').addEventListener('click',()=>{if(!products.length)return;if(!confirm('¿Eliminar todos los artículos de esta sesión?'))return;products=[];rawRows=[];fileName='';$('mapping').hidden=true;$('fileStatus').hidden=true;imageCache.clear();render()});
$('rows').addEventListener('click',e=>{const btn=e.target.closest('button[data-id]');if(!btn)return;products=products.filter(p=>p.id!==btn.dataset.id);render()});$('search').addEventListener('input',renderTable);
for(const id of ['paper','layout','showName','showCode','showPrice','repeatQty'])$(id).addEventListener('change',render);
for(const radio of document.querySelectorAll('input[name="format"]'))radio.addEventListener('change',()=>{$('extraFormat').value='';imageCache.clear();render()});$('extraFormat').addEventListener('change',()=>{imageCache.clear();render()});
function activeFormat(){return $('extraFormat').value||document.querySelector('input[name="format"]:checked').value}
function layout(){const [cols,rows]=$('layout').value.split('x').map(Number);return{cols,rows,perPage:cols*rows}}
function expandLabels(){if(!$('repeatQty').checked)return products.slice(0,MAX_LABELS);const labels=[];for(const p of products){for(let i=0;i<p.qty&&labels.length<MAX_LABELS;i++)labels.push(p);if(labels.length>=MAX_LABELS)break}return labels}
function checkBarcode(code,fmt){if(!code)return 'Código vacío';if(fmt==='QR'){if(new TextEncoder().encode(code).length>200)return 'QR demasiado largo (máximo 200 bytes para asegurar lectura)';return ''}if(fmt==='CODE128'){if(/[\x00-\x1F\x7F-\xFF]/.test(code))return 'Code 128 requiere caracteres ASCII imprimibles';return ''}if(fmt==='CODE39'&&!/^[0-9A-Z .\-$/+%]+$/.test(code))return 'Code 39 permite A-Z, 0-9 y - . espacio $ / + %';if(fmt==='EAN13'){if(!/^\d{12,13}$/.test(code))return 'EAN-13 requiere 12 o 13 dígitos';if(code.length===13){const digits=code.split('').map(Number),sum=digits.slice(0,12).reduce((acc,x,i)=>acc+x*(i%2?3:1),0);if((10-sum%10)%10!==digits[12])return 'Dígito de control EAN-13 incorrecto'}}return ''}
function generatedImage(code,fmt){const key=fmt+'|'+code;if(imageCache.has(key))return imageCache.get(key);const error=checkBarcode(code,fmt);if(error)throw Error(error);let src;if(fmt==='QR'){if(!window.QRCode)throw Error('La biblioteca QR no se cargó.');const el=document.createElement('div');new QRCode(el,{text:code,width:320,height:320,correctLevel:QRCode.CorrectLevel.M});src=el.querySelector('canvas')?.toDataURL('image/png')||el.querySelector('img')?.src;if(!src)throw Error('No se pudo generar el QR')}else{if(!window.JsBarcode)throw Error('La biblioteca de barras no se cargó.');const canvas=document.createElement('canvas');JsBarcode(canvas,code,{format:fmt,width:3,height:120,margin:14,displayValue:false,background:'#ffffff',lineColor:'#102936'});src=canvas.toDataURL('image/png')}imageCache.set(key,src);return src}
function render(){const labels=expandLabels(),cfg=layout(),fmt=activeFormat();$('countProducts').textContent=products.length.toLocaleString('es-GT');$('countLabels').textContent=labels.length.toLocaleString('es-GT');$('countPages').textContent=Math.ceil(labels.length/cfg.perPage).toLocaleString('es-GT');$('fmtBadge').textContent=fmt==='EAN13'?'EAN-13':fmt==='CODE128'?'CODE 128':fmt==='CODE39'?'CODE 39':'QR';$('paperCaption').textContent=$('paper').value.toUpperCase();$('pdf').disabled=!products.length;$('paperFrame').classList.toggle('letter',$('paper').value==='letter');const sheet=$('sheet');sheet.style.setProperty('--cols',cfg.cols);sheet.style.setProperty('--rows',cfg.rows);sheet.replaceChildren();if(!labels.length){sheet.innerHTML='<div class="empty"><span>▥</span><strong>Tus etiquetas aparecerán aquí</strong><p>Importa un archivo, agrega un producto o carga el ejemplo.</p><button id="demo" class="btn soft">Ver ejemplo con 4 productos</button></div>';sheet.querySelector('#demo').addEventListener('click',()=>{products=[['Café de especialidad 500g','PROD-00124','Q 85.00'],['Mouse inalámbrico','TEC-00035','Q 125.00'],['Libreta profesional','ESC-01120','Q 28.00'],['Botella térmica 750ml','HOG-00218','Q 149.00']].map(x=>({name:x[0],code:x[1],price:x[2],qty:1,id:cryptoId()}));render();alertUser('Ejemplo cargado.')});renderTable();return}for(const p of labels.slice(0,cfg.perPage)){const cell=document.createElement('div');cell.className='mini-label'+(fmt==='QR'?' qr':'');const err=checkBarcode(p.code,fmt);if(err){cell.classList.add('bad');cell.innerHTML='<small>'+escapeHtml(err)+'</small>'}else{if($('showName').checked){const title=document.createElement('div');title.className='label-title';title.textContent=p.name;cell.appendChild(title)}try{const img=document.createElement('img');img.alt='Código '+p.code;img.src=generatedImage(p.code,fmt);cell.appendChild(img)}catch(e){cell.classList.add('bad');cell.textContent=e.message}if($('showCode').checked){const el=document.createElement('div');el.className='label-code';el.textContent=p.code;cell.appendChild(el)}if($('showPrice').checked&&p.price){const el=document.createElement('div');el.className='label-price';el.textContent=p.price;cell.appendChild(el)}}sheet.appendChild(cell)}renderTable()}
function renderTable(){const query=$('search').value.toLowerCase(),data=products.filter(p=>(p.name+' '+p.code).toLowerCase().includes(query));$('rows').replaceChildren();if(!data.length){$('rows').innerHTML='<tr><td colspan="3">'+(products.length?'Sin resultados.':'Todavía no has añadido artículos.')+'</td></tr>'}else for(const p of data.slice(0,200)){const tr=document.createElement('tr');tr.innerHTML=`<td>${escapeHtml(p.name)}</td><td><code>${escapeHtml(p.code)}</code></td><td><button class="remove" data-id="${escapeHtml(p.id)}" aria-label="Eliminar artículo">Eliminar</button></td>`;$('rows').appendChild(tr)}$('listStatus').textContent=`${data.length} de ${products.length} artículos${data.length>200?' · mostrando los primeros 200':''}`}
$('scanForm').addEventListener('submit',e=>{e.preventDefault();const code=strip($('scanInput').value);const match=products.find(p=>p.code===code);const result=$('scanResult');result.className='scan-result '+(match?'good':'bad');result.textContent=match?`✓ Encontrado: ${match.name} · ${match.code}`:code?'No existe coincidencia exacta en el inventario actual.':'Escanea o escribe un código primero.';$('scanInput').select()});
$('printHelp').addEventListener('click',()=>$('helpDialog').showModal());for(const id of ['closeDialog','closeDialog2'])$(id).addEventListener('click',()=>$('helpDialog').close());
$('pdf').addEventListener('click',async()=>{
  const btn=$('pdf'), original=btn.textContent;
  btn.disabled=true;btn.textContent='Preparando documento...';
  try{
    if(!window.BarrasPdf)throw Error('No se cargó el módulo PDF local. Actualiza la página para cargar los archivos nuevos.');
    const labels=expandLabels();
    if(!labels.length)throw Error('Agrega productos primero.');
    const fmt=activeFormat();
    const invalid=labels.filter(p=>checkBarcode(p.code,fmt));
    if(invalid.length)throw Error(`${invalid.length} etiquetas no pueden generarse en ${fmt}. Ejemplo: ${invalid[0].code} (${checkBarcode(invalid[0].code,fmt)}).`);
    if($('repeatQty').checked&&products.reduce((a,p)=>a+p.qty,0)>MAX_LABELS)throw Error(`El límite por descarga es ${MAX_LABELS} etiquetas. Reduce las cantidades.`);
    const result=await BarrasPdf.create({
      labels,format:fmt,paper:$('paper').value,...layout(),
      showName:$('showName').checked,showCode:$('showCode').checked,showPrice:$('showPrice').checked,
      getImage:generatedImage,
      onProgress:(done,total)=>{btn.textContent=`Generando PDF · página ${done} de ${total}...`;}
    });
    alertUser(`✓ PDF descargado: ${labels.length} etiquetas en ${result.pages} página(s).`);
  }catch(err){console.error(err);alertUser(err.message||'No se pudo crear el PDF.',true)}
  finally{btn.disabled=!products.length;btn.textContent=original}
});
// Transferencia temporal del inventario al generador. Se elimina inmediatamente:
// no se guarda ninguna fila en el generador después de usarla.
try{
  const transferred=sessionStorage.getItem('barras-generator-import');
  if(transferred){
    sessionStorage.removeItem('barras-generator-import');
    const incoming=JSON.parse(transferred);
    if(Array.isArray(incoming)){
      products=incoming.slice(0,10000).filter(p=>p&&p.name&&p.code).map(p=>({id:cryptoId(),name:strip(p.name).slice(0,120),code:strip(p.code).slice(0,160),price:strip(p.price).slice(0,50),qty:Math.max(1,Math.min(999,Number(p.stock)||1))}));
    }
  }
}catch(err){console.warn('No se pudo transferir la sesión del inventario',err)}
render();
