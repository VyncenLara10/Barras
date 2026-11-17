'use strict';
(() => {
  const KEY = 'barras-studio-inventario-v1', $ = id => document.getElementById(id);
  const today = () => new Date().toISOString();
  const clean = value => String(value ?? '').trim();
  const html = value => clean(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const id = () => (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
  const empty = () => ({ version:1, products:[], movements:[], sales:[] });
  let state = empty();
  function toast(message, error = false) { const t=$('toast'); t.textContent=message; t.className='toast show'+(error?' error':''); clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.className='toast',4200); }
  function load() { try { const data=JSON.parse(localStorage.getItem(KEY)); if (data && data.version===1 && Array.isArray(data.products) && Array.isArray(data.movements)) state={...data,sales:Array.isArray(data.sales)?data.sales:[]}; } catch (err) { console.warn('No se pudo leer el almacenamiento',err); toast('Error al leer el inventario de este navegador.',true); } }
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
    if(typeof renderSales === 'function') renderSales();
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
      tr.innerHTML=`<td>${html(p.name)}${p.category?`<br><small>${html(p.category)}</small>`:''}</td><td><code>${html(p.code)}</code></td><td><span class="badge ${p.stock===0?'none':p.stock<=5?'low':''}">${p.stock}</span></td><td><button class="row-button label-row-button" data-label="${html(p.code)}">Etiqueta</button> <button class="row-button" data-remove="${html(p.code)}" aria-label="Eliminar ${html(p.name)}">Eliminar</button></td>`;
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
    const label=e.target.closest('button[data-label]');if(label){const p=state.products.find(p=>p.code===label.dataset.label);if(p)toGenerator([p]);return;}const b=e.target.closest('button[data-remove]');if(!b)return;
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
      if(save({version:1,products,movements:restored.movements.filter(m=>m&&typeof m==='object').slice(0,5000),sales:Array.isArray(restored.sales)?restored.sales.filter(s=>s&&typeof s==='object').slice(0,3000):[]}))toast('Respaldo restaurado correctamente.');
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
  function toGenerator(items){
    if(!items.length){toast('Agrega productos antes de generar etiquetas.',true);return;}
    try{sessionStorage.setItem('barras-generator-import',JSON.stringify(items));window.location.href='index.html#generator';}
    catch(err){toast('No se pudo pasar el inventario: exporta CSV y cárgalo en el generador.',true);}
  }
  $('labelsButton').addEventListener('click',()=>toGenerator(state.products));
  $('resetAll').addEventListener('click',()=>{
    if(!confirm('Esto eliminará los productos, movimientos y ventas de ESTE navegador. ¿Ya descargaste el respaldo JSON?'))return;
    if(!confirm('Confirmación final: ¿borrar definitivamente el inventario local?'))return;
    if(save(empty())){toast('Inventario local borrado.');$('scanFeedback').className='feedback';$('scanFeedback').textContent='Inventario vacío. Importa productos para comenzar.';}
  });
  // Caja de venta: escanear agrega al carrito; solo confirmar modifica las existencias.
  let cart=[];
  const money = cents => 'Q '+(Math.max(0,Number(cents)||0)/100).toLocaleString('es-GT',{minimumFractionDigits:2,maximumFractionDigits:2});
  function priceCents(raw){
    const source=clean(raw).replace(/[^\d.,-]/g,'');
    if(!source)return null;
    let number=source; const dot=number.lastIndexOf('.'),comma=number.lastIndexOf(',');
    if(dot>=0&&comma>=0){number=dot>comma?number.replaceAll(',',''):number.replaceAll('.','').replace(',','.');}
    else if(comma>=0){number=number.includes(',')&&number.split(',').pop().length===3?number.replaceAll(',',''):number.replace(',','.');}
    else if(dot>=0&&number.split('.').pop().length===3&&number.split('.').length===2){number=number.replace('.','');}
    const n=Number(number);return Number.isFinite(n)&&n>=0&&n<=1e9?Math.round(n*100):null;
  }
  function cartTotal(){return cart.reduce((sum,line)=>sum+line.unitCents*line.qty,0);}
  function renderCart(){
    const tbody=$('cartBody');tbody.replaceChildren();let units=0;
    if(!cart.length)tbody.innerHTML='<tr><td colspan="5" class="empty">Escanea un producto para comenzar.</td></tr>';
    for(const item of cart){
      units+=item.qty;const tr=document.createElement('tr');
      tr.innerHTML=`<td>${html(item.name)}<br><small>${html(item.code)}</small></td><td>${item.qty}</td><td>${money(item.unitCents)}</td><td>${money(item.unitCents*item.qty)}</td><td><button type="button" data-cart-remove="${html(item.code)}" aria-label="Quitar ${html(item.name)}">×</button></td>`;
      tbody.appendChild(tr);
    }
    $('cartCount').textContent=`(${units})`;
    $('cartTotal').textContent=money(cartTotal());
    $('completeSale').disabled=!cart.length;
  }
  function feedback(message, bad=false){const e=$('posFeedback');e.textContent=message;e.className='pos-feedback '+(bad?'bad':'ok');}
  function addCart(code,qty){
    const p=state.products.find(p=>p.code===code);
    if(!p){feedback(`No existe el código «${code}». Primero regístralo en el inventario.`,true);return false;}
    const existing=cart.find(line=>line.code===code),newQty=(existing?.qty||0)+qty;
    if(newQty>p.stock){feedback(`No hay stock suficiente de ${p.name}. Disponibles: ${p.stock}; solicitados: ${newQty}.`,true);return false;}
    const cents=priceCents(p.price);
    if(existing){existing.qty=newQty;existing.name=p.name;existing.unitCents=cents??0;}
    else cart.push({code:p.code,name:p.name,unitCents:cents??0,priceMissing:cents===null,qty});
    renderCart(); feedback(`✓ ${qty} × ${p.name} agregado al carrito. Todavía no se ha descontado del inventario.`);
    $('saleMessage').textContent='';return true;
  }
  $('posForm').addEventListener('submit',e=>{
    e.preventDefault();const code=clean($('posScan').value),qty=Number($('posQty').value);
    if(!code||!Number.isInteger(qty)||qty<1||qty>9999){feedback('Ingresa un SKU y una cantidad entera válida.',true);return;}
    if(addCart(code,qty)){$('posScan').value='';$('posQty').value='1';}
    $('posScan').focus();
  });
  $('cartBody').addEventListener('click',e=>{
    const btn=e.target.closest('button[data-cart-remove]');if(!btn)return;
    cart=cart.filter(line=>line.code!==btn.dataset.cartRemove);renderCart();feedback('Producto eliminado del carrito.');
  });
  $('clearCart').addEventListener('click',()=>{
    if(!cart.length)return;
    if(!confirm('¿Vaciar el carrito sin registrar la venta?'))return;
    cart=[];renderCart();feedback('Carrito vacío. No se modificó el inventario.');
  });
  const STORE_KEY='barras-studio-store-name';
  try{$('storeName').value=localStorage.getItem(STORE_KEY)||'';}catch{}
  $('storeName').addEventListener('change',()=>{try{localStorage.setItem(STORE_KEY,clean($('storeName').value).slice(0,90));}catch{toast('No se pudo guardar el nombre de la tienda.',true)}});
  $('completeSale').addEventListener('click',()=>{
    if(!cart.length)return;
    // Tomar el estado más reciente de almacenamiento para reducir ventas sobre datos obsoletos.
    load();const snapshot=clone();const current=new Map(snapshot.products.map(p=>[p.code,p]));
    for(const line of cart){const p=current.get(line.code);
      if(!p||p.stock<line.qty){feedback(`Stock insuficiente o producto eliminado: ${line.name}. Actualiza el carrito.`,true);return;}
    }
    const noPrice=cart.filter(line=>line.priceMissing);
    const total=cartTotal();
    const detail=noPrice.length?`\nAviso: ${noPrice.length} artículo(s) no tenían precio y se contabilizan en Q 0.00.`:'';
    if(!confirm(`Confirmar venta de ${cart.reduce((n,l)=>n+l.qty,0)} unidad(es) por ${money(total)}?\n\nEsto DESCONTARÁ el stock y guardará el ticket.${detail}`))return;
    const now=today(),saleId='VTA-'+now.slice(0,10).replaceAll('-','')+'-'+id().slice(0,8).toUpperCase();
    const sale={id:saleId,date:now,store:clean($('storeName').value).slice(0,90)||'Mi tienda',items:cart.map(line=>({code:line.code,name:line.name,quantity:line.qty,unitCents:line.unitCents,subtotalCents:line.unitCents*line.qty})),totalCents:total};
    for(const line of cart){const p=current.get(line.code);p.stock-=line.qty;
      snapshot.movements.unshift({id:id(),date:now,code:p.code,name:p.name,type:'venta',quantity:line.qty,stock:p.stock,saleId});
    }
    snapshot.movements=snapshot.movements.slice(0,5000);
    if(!Array.isArray(snapshot.sales))snapshot.sales=[];
    snapshot.sales.unshift(sale);snapshot.sales=snapshot.sales.slice(0,3000);
    if(save(snapshot)){
      cart=[];renderCart();
      feedback(`✓ Venta ${saleId} confirmada. Stock actualizado.`);
      $('saleMessage').textContent=`Venta registrada: ${money(total)}. Guarda el respaldo JSON al cierre.`;
      $('lastReceipt').href='ticket.html?venta='+encodeURIComponent(saleId);
      $('lastReceipt').hidden=false;
      toast('Venta confirmada y descontada del inventario.');
    }
  });
  function renderSales(){
    const rows=$('salesBody'); rows.replaceChildren();
    const sales=Array.isArray(state.sales)?state.sales:[];
    if(!sales.length){rows.innerHTML='<tr><td colspan="5" class="empty">Aún no tienes ventas registradas.</td></tr>';return;}
    for(const sale of sales.slice(0,80)){
      if(!sale||!Array.isArray(sale.items))continue;
      const tr=document.createElement('tr'),date=new Date(sale.date);
      const dateText=Number.isFinite(date.getTime())?date.toLocaleString('es-GT',{dateStyle:'short',timeStyle:'short'}):'—';
      const count=sale.items.reduce((n,item)=>n+(Number(item.quantity)||0),0);
      const link='ticket.html?venta='+encodeURIComponent(sale.id);
      tr.innerHTML=`<td>${html(dateText)}</td><td><code>${html(sale.id)}</code></td><td>${count}</td><td>${money(sale.totalCents)}</td><td><a class="receipt-link" href="${link}">Ver ticket</a></td>`;
      rows.appendChild(tr);
    }
  }
  $('exportSales').addEventListener('click',()=>{
    const rows=[['Fecha','ID de venta','Codigo / SKU','Producto','Unidades','Precio unitario Q','Subtotal Q','Total de venta Q']];
    for(const sale of state.sales||[]){if(!Array.isArray(sale.items))continue;
      for(const item of sale.items)rows.push([sale.date,sale.id,item.code,item.name,item.quantity,(item.unitCents/100).toFixed(2),(item.subtotalCents/100).toFixed(2),(sale.totalCents/100).toFixed(2)]);
    }
    saveCSV(rows,'ventas-barras-studio.csv');toast('Historial de ventas descargado.');
  });
  // Recepción explícita de códigos generados en la página pública.
  function receiveGenerated(){
    let data;try{const payload=sessionStorage.getItem('barras-inventory-newproducts-v1');if(!payload)return;sessionStorage.removeItem('barras-inventory-newproducts-v1');data=JSON.parse(payload);}catch{return;}
    if(!Array.isArray(data)||!data.length){toast('No se recibieron productos válidos del generador.',true);return;}
    const unique=new Map();
    for(const row of data.slice(0,10000)){
      const code=clean(row.code).slice(0,160),name=clean(row.name).slice(0,120),qty=Math.floor(Number(row.qty)||1);
      if(!code||!name||unique.has(code))continue;
      unique.set(code,{code,name,price:clean(row.price).slice(0,40),stock:Math.max(0,Math.min(qty,999999)),category:''});
    }
    const known=new Set(state.products.map(p=>p.code));const fresh=[...unique.values()].filter(p=>!known.has(p.code));
    const existing=unique.size-fresh.length;
    if(!fresh.length){toast(`${existing} códigos ya existen: no se modificó ningún stock.`);return;}
    if(!confirm(`Recibidos ${unique.size} códigos del generador.\n\nSe registrarán ${fresh.length} productos NUEVOS con la cantidad de cada fila como stock inicial. ${existing} código(s) existente(s) mantendrán sus existencias actuales.\n\n¿Registrar productos?`))return;
    const next=clone(); for(const p of fresh){next.products.push(p);next.movements.unshift({id:id(),date:today(),code:p.code,name:p.name,type:'alta',quantity:p.stock,stock:p.stock});}
    next.movements=next.movements.slice(0,5000);
    if(save(next)){toast(`✓ ${fresh.length} nuevos productos registrados. Ya puedes venderlos.`);location.hash='ventas';}
  }

  window.addEventListener('storage',event=>{if(event.key===KEY){load();render();toast('Inventario actualizado desde otra pestaña.')} });
  load();render();renderCart();receiveGenerated();
})();
