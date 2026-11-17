#!/usr/bin/env node
// VynTools · AdSense setup. Utiliza exclusivamente el ID público del editor.
import {readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const PROJECT='barras';
const [mode,rawId]=process.argv.slice(2);
if(!['verify','ads','remove'].includes(mode)) throw new Error('Uso: node scripts/configurar-adsense.mjs <verify|ads|remove> [ca-pub-1234567890123456]');
const id=mode==='remove'?'':String(rawId||'').replace(/^pub-/,'ca-pub-');
if(mode!=='remove' && !/^ca-pub-\d{16}$/.test(id)) throw new Error('Introduce el ID ca-pub REAL de 16 dígitos de tu cuenta AdSense.');
const START='<!-- ADSENSE-CONFIG-BEGIN -->', END='<!-- ADSENSE-CONFIG-END -->';
const existing=/\s*<!-- ADSENSE-CONFIG-BEGIN -->[\s\S]*?<!-- ADSENSE-CONFIG-END -->/g;
function walk(dir){
  return readdirSync(dir,{withFileTypes:true}).flatMap(ent=>{
    const p=join(dir,ent.name);
    if(ent.isDirectory())return ent.name.startsWith('.')||ent.name==='node_modules'?[]:walk(p);
    return ent.name.endsWith('.html')?[p]:[];
  });
}
const eligible=p=>{
  const r=relative(ROOT,p).replaceAll('\\','/');
  if(r==='index.html')return true;
  return PROJECT==='portal' && (r.startsWith('herramientas/')||r.startsWith('guias/')) && r.endsWith('/index.html');
};
let updated=0;
for(const file of walk(ROOT)){
  const source=readFileSync(file,'utf8');
  const clean=source.replace(existing,'');
  const add=mode==='ads'?eligible(file):mode==='verify'&&relative(ROOT,file)==='index.html';
  const html=add?[
    START,
    '<meta name="google-adsense-account" content="'+id+'">',
    ...(mode==='ads'?['<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+id+'" crossorigin="anonymous"></script>']:[]),
    END
  ].join('\n'):'';
  const next=html?clean.replace(/<\/head>/i,html+'\n</head>'):clean;
  if(html&&next===clean)throw Error('Falta </head> en '+file);
  if(next!==source){writeFileSync(file,next,'utf8');updated++;}
}
if(PROJECT==='portal'){
  const path=join(ROOT,'ads.txt');
  if(mode==='remove'){if(existsSync(path))unlinkSync(path);}
  else writeFileSync(path,'google.com, '+id.replace('ca-pub-','pub-')+', DIRECT, f08c47fec0942fa0\n','utf8');
}
console.log('Configuración '+mode+' preparada para '+PROJECT+'. HTML modificados: '+updated);
console.log('Debes revisar git diff y hacer commit/push. El comando NO verifica AdSense ni activa anuncios en tu cuenta.');
