'use strict';
(() => {
  const KEY = 'barras-studio-inventario-v1', $ = id => document.getElementById(id);
  const today = () => new Date().toISOString();
  const clean = value => String(value ?? '').trim();
  const html = value => clean(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const id = () => (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
  const empty = () => ({ version:1, products:[], movements:[] });
  let state = empty();
  function toast(message, error = false) { const t=$('toast'); t.textContent=message; t.className='toast show'+(error?' error':''); clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.className='toast',4200); }
  function load() { try { const data=JSON.parse(localStorage.getItem(KEY)); if (data && data.version===1 && Array.isArray(data.products) && Array.isArray(data.movements)) state=data; } catch (err) { console.warn('No se pudo leer el almacenamiento',err); toast('Error al leer el inventario de este navegador.',true); } }
  function save(next) { try { localStorage.setItem(KEY,JSON.stringify(next));state=next;render();return true; } catch (err) { console.error(err);toast('No se pudo guardar. Almacenamiento lleno o bloqueado: exporta un respaldo.',true);return false; } }
  function clone() { return JSON.parse(JSON.stringify(state)); }
  function change(code, qty, operation) {
    const next=clone(), p=next.products.find(item=>item.code===code);
    const result=$('scanFeedback');
    if (!p) { result.className='feedback bad'; result.textContent=`Código ${code} no encontrado. Importa el inventario o registra este producto primero.`;return; }
    if(operation==='consulta'){result.className='feedback ok';result.textContent=`${p.name} · Código ${p.code} · Existencia actual: ${p.stock} unidad(es).`;return;}
    const delta=operation==='salida'?-qty:qty;
    if(p.stock+delta<0){result.className='feedback bad';result.textContent=`Stock insuficiente: ${p.name} tiene ${p.stock} unidades y estás intentando retirar ${qty}.`;return;}
    p.stock+=delta;
    next.movements.unshift({id:id(),date:today(),code:p.code,name:p.name,type:operation,quantity:qty,stock:p.stock});
    if(next.movements.length>5000)next.movements.length=5000;
    if(save(next)){result.className='feedback ok';result.textContent=`✓ ${operation==='salida'?'Salida':'Entrada'} de ${qty} unidad(es) · ${p.name} · Stock disponible: ${p.stock}.`;}
  }
  function render() {
    const total=state.products.reduce((a,p)=>a+p.stock,0);
    $('metricProducts').textContent=state.products.length.toLocaleString('es-GT');
    $('metricUnits').textContent=total.toLocaleString('es-GT');
    $('metricLow').textContent=state.products.filter(p=>p.stock<=5).length.toLocaleString('es-GT');
    $('metricMoves').textContent=state.movements.length.toLocaleString('es-GT');
    const q=clean($('filter').value).toLowerCase();
    const rows=state.products.filter(p=>(p.name+' '+p.code+' '+(p.category||'')).toLowerCase().includes(q));
    $('listCount').textContent=`${rows.length} de ${state.products.length} productos`; const tbody=$('productsBody');tbody.replaceChildren();
    if(!rows.length)tbody.innerHTML='<tr><td colspan="4" class="empty">No hay productos que mostrar.</td></tr>';
    for(const p of rows.slice(0,300)){
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${html(p.name)}${p.category?`<br><small>${html(p.category)}</small>`:''}</td><td><code>${html(p.code)}</code></td><td><span class="badge ${p.stock===0?'none':p.stock<=5?'low':''}">${p.stock}</span></td><td><button class="row-button" data-remove="${html(p.code)}" aria-label="Eliminar ${html(p.name)}">Eliminar</button></td>`;
      tbody.appendChild(tr);
    }
    const moves=$('movementsBody');moves.replaceChildren();
    if(!state.movements.length)moves.innerHTML='<tr><td colspan="4" class="empty">Sin movimientos todavía.</td></tr>';
    for(const m of state.movements.slice(0,90)){
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${html(new Date(m.date).toLocaleString('es-GT',{dateStyle:'short',timeStyle:'short'}))}</td><td>${html(m.name)}</td><td>${html(m.type)}</td><td>${m.type==='salida'?'-':m.type==='entrada'?'+':''}${Number(m.quantity)||0}</td>`;
      moves.appendChild(tr);
    }
  }
  $('scanForm').addEventListener('submit', e=>{
    e.preventDefault(); const code=clean($('scanCode').value), qty=Number($('scanQty').value);
    if(!code){toast('Escanea un código primero.',true);return;}
    if(!Number.isInteger(qty)||qty<1||qty>100000){toast('Cantidad inválida: usa un entero entre 1 y 100000.',true);return;}
    change(code,qty,document.querySelector('input[name="operation"]:checked').value);
    $('scanCode').value='';$('scanCode').focus();
  });
  document.querySelectorAll('input[name="operation"]').forEach(el=>el.addEventListener('change',()=>{
    const action=document.querySelector('input[name="operation"]:checked').value;
    $('scanButton').textContent=action==='consulta'?'Consultar →':action==='salida'?'Registrar salida →':'Registrar entrada →';
    $('scanCode').focus();
  }));
  $('newProduct').addEventListener('submit',e=>{
    e.preventDefault();const data=new FormData(e.currentTarget);
    const p={name:clean(data.get('name')),code:clean(data.get('code')),stock:Number(data.get('stock')),price:clean(data.get('price')),category:clean(data.get('category'))};
    if(!p.name||!p.code||!Number.isInteger(p.stock)||p.stock<0||p.stock>999999){toast('Completa nombre, código y cantidad inicial válida.',true);return;}
    if(state.products.some(item=>item.code===p.code)){toast('Ese código ya existe. Usa Entrada o Salida para ajustar el stock.',true);return;}
    const next=clone();next.products.push(p);next.movements.unshift({id:id(),date:today(),code:p.code,name:p.name,type:'alta',quantity:p.stock,stock:p.stock});
    if(save(next)){e.currentTarget.reset();toast('Producto registrado. Ya puedes escanearlo.');}
  });
  $('filter').addEventListener('input',render);
  $('productsBody').addEventListener('click',e=>{
    const b=e.target.closest('button[data-remove]');if(!b)return;
    const code=b.dataset.remove,p=state.products.find(p=>p.code===code);if(!p)return;
    if(!confirm(`¿Eliminar ${p.name} (${p.code}) del inventario? Su historial se conservará.`))return;
    const next=clone();next.products=next.products.filter(p=>p.code!==code);
    if(save(next))toast('Producto eliminado.');
  });
  function csvCell(value) { const text=String(value??''); const safe=/^[=+@\-\t\r]/.test(text)?'\''+text:text; return /[",\r\n]/.test(safe)?'"'+safe.replaceAll('"','""')+'"':safe; }
  function download(data,name,type) {const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  function saveCSV(rows,filename){download('\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n',filename,'text/csv;charset=utf-8');}
  $('exportCSV').addEventListener('click',()=>{
    saveCSV([['Nombre del producto','Codigo / SKU','Precio','Cantidad','Categoria'],...state.products.map(p=>[p.name,p.code,p.price||'',p.stock,p.category||''])],'inventario-actual.csv');toast('Inventario CSV descargado.');
  });
  $('exportMoves').addEventListener('click',()=>{
    saveCSV([['Fecha','Codigo / SKU','Producto','Tipo','Cantidad','Existencia posterior'],...state.movements.map(m=>[m.date,m.code,m.name,m.type,m.quantity,m.stock])],'historial-movimientos.csv');toast('Historial descargado.');
  });
  $('exportBackup').addEventListener('click',()=>{
    download(JSON.stringify({...state,exportedAt:today()},null,2),'respaldo-barras-'+new Date().toISOString().slice(0,10)+'.json','application/json');toast('Respaldo JSON descargado.');
  });
  $('restoreFile').addEventListener('change',async e=>{
    const file=e.target.files[0];e.target.value='';if(!file)return;
    try{
      if(file.size>10*1024*1024)throw Error('El archivo es demasiado grande.');
      const restored=JSON.parse(await file.text());
      if(restored.version!==1||!Array.isArray(restored.products)||!Array.isArray(restored.movements))throw Error('No es un respaldo compatible con Barras Studio.');
      const codes=new Set();const products=restored.products.map(p=>({name:clean(p.name).slice(0,120),code:clean(p.code).slice(0,160),stock:Number(p.stock),price:clean(p.price).slice(0,40),category:clean(p.category).slice(0,70)}));
      for(const p of products){if(!p.name||!p.code||codes.has(p.code)||!Number.isInteger(p.stock)||p.stock<0||p.stock>999999)throw Error('El respaldo tiene productos duplicados o datos inválidos.');codes.add(p.code)}
      if(!confirm(`Se reemplazará TODO el inventario local por ${products.length} artículos del respaldo. ¿Continuar?`))return;
      if(save({version:1,products,movements:restored.movements.filter(m=>m&&typeof m==='object').slice(0,5000)}))toast('Respaldo restaurado correctamente.');
    }catch(err){toast('No se pudo restaurar: '+err.message,true)}
  });
  function parseCSV(text){
    const rows=[];let row=[],field='',inQuote=false;
    for(let i=0;i<text.length;i++){const c=text[i];if(inQuote){if(c==='"'&&text[i+1]==='"'){field+='"';i++}else if(c==='"')inQuote=false;else field+=c;}
    else if(c==='"')inQuote=true;else if(c===','||c===';'||c==='\t'){row.push(field);field='';}
    else if(c==='\n'){row.push(field.replace(/\r$/,''));field='';if(row.some(clean))rows.push(row);row=[];}else field+=c;}
    if(inQuote)throw Error('El CSV tiene comillas sin cerrar.');row.push(field.replace(/\r$/,''));if(row.some(clean))rows.push(row);return rows;
  }
  const normalize=s=>clean(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  function rowsToProducts(rows){
    if(rows.length<2)throw Error('El archivo necesita encabezados y al menos una fila.');
    const head=rows[0].map(normalize);
    const col=(keys)=>head.findIndex(h=>keys.some(k=>h.includes(k)));
    const n=col(['nombre','articulo','producto','name']),c=col(['codigo','sku','code','barcode']),q=col(['cantidad','stock','existencia','unidades']),p=col(['precio','price']),cat=col(['categoria','category']);
    if(n<0||c<0)throw Error('No encuentro las columnas Nombre del producto y Codigo / SKU. Usa la plantilla descargable.');
    const parsed=[];let skipped=0;
    for(const row of rows.slice(1)){
      const name=clean(row[n]).slice(0,120),code=clean(row[c]).slice(0,160);
      if(!name&&!code)continue;
      let qty=clean(row[q]);if(q<0||qty==='')qty='0';
      const stock=Number(qty.replace(',','.'));
      if(!name||!code||!Number.isInteger(stock)||stock<0||stock>999999){skipped++;continue;}
      parsed.push({name,code,stock,price:p>=0?clean(row[p]).slice(0,40):'',category:cat>=0?clean(row[cat]).slice(0,70):''});
    }
    return{parsed,skipped};
  }
  $('inventoryFile').addEventListener('change',async e=>{
    const file=e.target.files[0];e.target.value='';if(!file)return;
    try{
      if(file.size>10*1024*1024)throw Error('El archivo supera 10 MB.');
      let rows;
      if(/\.csv$/i.test(file.name)){rows=parseCSV((await file.text()).replace(/^\ufeff/,''));}
      else if(/\.xlsx?$/i.test(file.name)||/\.xls$/i.test(file.name)){
        if(!window.XLSX)throw Error('No se cargó el lector Excel. Convierte el archivo a CSV o revisa tu conexión.');
        const book=XLSX.read(await file.arrayBuffer(),{type:'array',raw:false});
        rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,defval:'',raw:false});
      }else throw Error('Formato no compatible.');
      const {parsed,skipped}=rowsToProducts(rows);
      if(!parsed.length)throw Error('No se encontraron productos válidos.');
      if(!confirm(`Se importarán ${parsed.length} filas. Los códigos existentes actualizarán sus cantidades con las del archivo. ${skipped?skipped+' filas inválidas serán omitidas.':''} ¿Continuar?`))return;
      const next=clone(), index=new Map(next.products.map((p,i)=>[p.code,i]));
      for(const p of parsed){const found=index.get(p.code);
        if(found!==undefined){const old=next.products[found];if(old.stock!==p.stock)next.movements.unshift({id:id(),date:today(),code:p.code,name:p.name,type:'ajuste',quantity:p.stock-old.stock,stock:p.stock});next.products[found]={...old,...p};}
        else{index.set(p.code,next.products.length);next.products.push(p);next.movements.unshift({id:id(),date:today(),code:p.code,name:p.name,type:'alta',quantity:p.stock,stock:p.stock});}
      }
      next.movements=next.movements.slice(0,5000);
      if(save(next))toast(`${parsed.length} filas importadas correctamente${skipped?'; '+skipped+' omitidas':''}.`);
    }catch(err){console.error(err);toast('Error de importación: '+err.message,true)}
  });
  $('labelsButton').addEventListener('click',()=>{
    if(!state.products.length){toast('Agrega productos antes de generar etiquetas.',true);return;}
    try{sessionStorage.setItem('barras-generator-import',JSON.stringify(state.products));window.location.href='index.html#generator';}
    catch(err){toast('No se pudo pasar el inventario: exporta CSV y cárgalo en el generador.',true);}
  });
  $('resetAll').addEventListener('click',()=>{
    if(!confirm('Esto eliminará los productos y movimientos de ESTE navegador. ¿Ya descargaste el respaldo JSON?'))return;
    if(!confirm('Confirmación final: ¿borrar definitivamente el inventario local?'))return;
    if(save(empty())){toast('Inventario local borrado.');$('scanFeedback').className='feedback';$('scanFeedback').textContent='Inventario vacío. Importa productos para comenzar.';}
  });
  window.addEventListener('storage',event=>{if(event.key===KEY){load();render();toast('Inventario actualizado desde otra pestaña.')} });
  load();render();
})();
