// Interfata panoului: o singura pagina, fara dependente. Continutul emailurilor se afiseaza DOAR ca text (textContent), niciodata ca HTML.
const CSS = `:root{--bg:#f6f8f8;--fg:#10211f;--card:#fff;--mut:#5b6b69;--acc:#0f766e;--bd:#dbe4e2;--rosu:#b91c1c}
@media(prefers-color-scheme:dark){:root{--bg:#0d1514;--fg:#e6f0ee;--card:#142120;--mut:#9bb0ad;--acc:#2dd4bf;--bd:#243735;--rosu:#f87171}}
[hidden]{display:none!important}*{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui,Segoe UI,Arial,sans-serif;background:var(--bg);color:var(--fg)}
header{display:flex;gap:12px;align-items:center;flex-wrap:wrap;max-width:1000px;margin:0 auto;padding:14px 16px}header b{font-size:1.2rem;margin-right:auto}
.mut{color:var(--mut)}main{max-width:1000px;margin:0 auto;padding:0 16px 40px}
nav{display:flex;gap:8px;flex-wrap:wrap;max-width:1000px;margin:0 auto;padding:0 16px 12px}
button,.tab{font:inherit;border:1px solid var(--bd);background:var(--card);color:var(--fg);padding:8px 14px;border-radius:8px;cursor:pointer}
.tab[aria-selected=true],button.pri{background:var(--acc);color:#fff;border-color:var(--acc)}button.pericol{color:var(--rosu)}
.lista{display:flex;flex-direction:column;gap:8px}.rand{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:10px 14px;cursor:pointer;display:grid;gap:2px}
.rand.necitit{border-left:4px solid var(--acc);font-weight:600}.rand small{color:var(--mut);font-weight:400}
.mesaj{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:14px}.corp{white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0}
label{display:block;margin:10px 0 4px;color:var(--mut)}input,textarea{width:100%;font:inherit;padding:9px 11px;border:1px solid var(--bd);border-radius:8px;background:var(--card);color:var(--fg)}
textarea{min-height:200px}.msg{margin:10px 0;padding:9px 12px;border-radius:8px;background:var(--card);border:1px solid var(--bd)}.err{color:var(--rosu)}
table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:6px 8px;border-bottom:1px solid var(--bd)}.kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0}.kpi div{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:10px 14px}.kpi b{display:block;font-size:1.6rem}.kpi span{color:var(--mut);font-size:.9rem}.perioada{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.tabel{overflow-x:auto}.badge{background:var(--acc);color:#fff;border-radius:99px;padding:0 8px;font-size:.8rem}`;

const JS = `
const $=(s)=>document.querySelector(s);let tab='inbox',deschis=null,zileStat=7;
const KEY='pretino-panou-key';const ls={g:()=>{try{return localStorage.getItem(KEY)}catch{return null}},s:(v)=>{try{localStorage.setItem(KEY,v)}catch{}},d:()=>{try{localStorage.removeItem(KEY)}catch{}}};
const api=async(u,o={})=>{const k=ls.g();const h={...(o.headers||{})};if(k)h.Authorization='Bearer '+k;const r=await fetch(u,{...o,headers:h});const j=await r.json().catch(()=>({}));
 if(r.status===401){ls.d();login();const e=new Error(j.eroare||'Autentificare necesara.');e.login=true;throw e;}if(!r.ok)throw new Error(j.eroare||('Eroare '+r.status));return j;};
const el=(t,a,...c)=>{const e=document.createElement(t);for(const[k,v]of Object.entries(a||{})){if(k==='class')e.className=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else e.setAttribute(k,v);}for(const x of c)e.append(x);return e;};
const data=(t)=>new Date(t).toLocaleString('ro-RO');
const msg=(t,err)=>{const m=$('#m');m.textContent=t||'';m.className=t?('msg'+(err?' err':'')):'';};
function login(){document.querySelector('nav').hidden=true;const v=$('#v');v.replaceChildren();const p=el('input',{type:'password',id:'pw',autocomplete:'current-password'});
 v.append(el('form',{onsubmit:async(e)=>{e.preventDefault();ls.s(p.value);try{await api('/api/ping');msg('');document.querySelector('nav').hidden=false;setTab('inbox');}catch(x){msg(x.message,true);}}},el('h2',{},'Autentificare'),el('label',{},'Parola panoului'),p,el('p',{},el('button',{class:'pri',type:'submit'},'Intră'))));}
function iesi(){ls.d();msg('');login();}
function setTab(t){tab=t;deschis=null;document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.t===t)));msg('');randeaza();}
async function randeaza(){const v=$('#v');v.replaceChildren();try{
 if(tab==='inbox'||tab==='sent'){
  if(deschis){const{mesaj:m}=await api('/api/messages/'+deschis);v.append(el('div',{class:'mesaj'},
   el('button',{onclick:()=>{deschis=null;randeaza();}},'← Înapoi'),el('h2',{},m.subject||'(fără subiect)'),
   el('div',{class:'mut'},(m.folder==='sent'?'Către: ':'De la: ')+(m.folder==='sent'?m.to_addr:((m.from_name?m.from_name+' ':'')+'<'+m.from_addr+'>'))+' · '+data(m.date)+(m.attachments?' · '+m.attachments+' atașament(e) neafișate (se văd în copia de pe Gmail)':'')),
   el('div',{class:'corp'},m.body||''),
   m.folder==='inbox'?el('button',{class:'pri',onclick:()=>raspunde(m)},'Răspunde'):'',' ',
   el('button',{class:'pericol',onclick:async()=>{if(!confirm('Ștergi definitiv mesajul din panou?'))return;await api('/api/messages/'+m.id,{method:'DELETE'});deschis=null;randeaza();}},'Șterge')));return;}
  const{mesaje,necitite}=await api('/api/messages?folder='+tab);$('#nec').textContent=necitite?String(necitite):'';$('#nec').hidden=!necitite;
  if(!mesaje.length){v.append(el('p',{class:'mut'},tab==='inbox'?'Niciun email primit încă.':'Niciun email trimis încă.'));return;}
  const l=el('div',{class:'lista'});for(const m of mesaje)l.append(el('div',{class:'rand'+(tab==='inbox'&&!m.read?' necitit':''),onclick:()=>{deschis=m.id;randeaza();}},
   el('span',{},m.subject||'(fără subiect)'),el('small',{},(tab==='sent'?'Către '+m.to_addr:(m.from_name||m.from_addr))+' · '+data(m.date))));v.append(l);
 }else if(tab==='write'){formular('', '', '', null);
 }else if(tab==='status'){const{status,versiune}=await api('/api/status');
  if(!status){v.append(el('p',{class:'err'},'Nu pot citi /status.json de pe site. Publică o versiune nouă a site-ului (PUBLICĂ LIVE), apoi reîncarcă.'));}
  else{const t=el('table',{});const rd=(a,b)=>t.append(el('tr',{},el('th',{},a),el('td',{},String(b))));
   rd('Oferte în catalog',status.total);rd('Catalog generat',data(status.generat));if(versiune?.built)rd('Ultima publicare',data(versiune.built));if(versiune?.sha)rd('Versiune (git)',versiune.sha.slice(0,7));
   v.append(t,el('h3',{},'Pe magazine'));const t2=el('table',{});for(const[k,n]of Object.entries(status.magazine||{}))t2.append(el('tr',{},el('td',{},k),el('td',{},String(n))));v.append(t2,el('h3',{},'Pe categorii'));
   const t3=el('table',{});for(const[k,n]of Object.entries(status.categorii||{}))t3.append(el('tr',{},el('td',{},k),el('td',{},String(n))));v.append(t3);}
 }else if(tab==='stats'){const o=el('div',{class:'perioada'});for(const[z,n]of[[1,'Azi'],[7,'7 zile'],[30,'30 zile'],[90,'90 zile']])o.append(el('button',{class:z===zileStat?'pri':'',onclick:()=>{zileStat=z;randeaza();}},n));
  const s=await api('/api/stats?zile='+zileStat);const dur=(x)=>{x=Math.round(x||0);return x<60?x+' s':Math.floor(x/60)+' min '+String(x%60).padStart(2,'0')+' s';};const nr=(x)=>Number(x).toLocaleString('ro-RO');
  const t=s.total,medie=t.vizite?t.sec/t.vizite:0,pePag=t.vizualizari?t.sec/t.vizualizari:0;
  const kpi=el('div',{class:'kpi'});for(const[a,b]of[['Vizite',nr(t.vizite)],['Vizitatori',nr(t.vizitatori)],['Pagini vizualizate',nr(t.vizualizari)],['Timp mediu / vizită',dur(medie)],['Timp mediu / pagină',dur(pePag)],['Pagini / vizită',t.vizite?(t.vizualizari/t.vizite).toFixed(1).replace('.',','):'0']])kpi.append(el('div',{},el('b',{},b),el('span',{},a)));
  kpi.append(el('div',{},el('b',{},nr(s.clickuri_total)),el('span',{},'Click-uri spre magazine')),el('div',{},el('b',{},nr(s.acum)),el('span',{},'Pe site acum (5 min)')));
  v.append(o,kpi);
  const tz=el('table',{});tz.append(el('tr',{},...['Ziua','Vizite','Vizitatori','Pagini','Timp mediu / vizită'].map(x=>el('th',{},x))));
  for(const r of[...s.pe_zi].reverse())tz.append(el('tr',{},el('td',{},r.zi),el('td',{},nr(r.vizite)),el('td',{},nr(r.vizitatori)),el('td',{},nr(r.vizualizari)),el('td',{},r.vizite?dur(r.sec/r.vizite):'–')));
  v.append(el('h3',{},'Pe zile'),el('div',{class:'tabel'},tz));
  if(s.pagini.length){const tp=el('table',{});tp.append(el('tr',{},...['Pagina','Vizualizări','Timp mediu'].map(x=>el('th',{},x))));for(const r of s.pagini)tp.append(el('tr',{},el('td',{},r.cale),el('td',{},nr(r.n)),el('td',{},r.medie==null?'–':dur(r.medie))));v.append(el('h3',{},'Cele mai vizitate pagini'),el('div',{class:'tabel'},tp));}
  if(s.clickuri.length){const tc=el('table',{});tc.append(el('tr',{},...['Magazin','Click-uri','Click-uri / 100 vizite'].map(x=>el('th',{},x))));for(const r of s.clickuri)tc.append(el('tr',{},el('td',{},r.mag),el('td',{},nr(r.n)),el('td',{},t.vizite?(r.n*100/t.vizite).toFixed(1).replace('.',','):'–')));v.append(el('h3',{},'Click-uri spre magazine (potențial de comision)'),tc);}
  {const d=s.dispozitive,tot=(d.m||0)+(d.d||0)+(d.t||0);if(tot){const pc=(x)=>Math.round((x||0)*100/tot)+'%';v.append(el('h3',{},'Dispozitive (pagini vizualizate)'),el('p',{},'Telefon '+pc(d.m)+' · Calculator '+pc(d.d)+' · Tabletă '+pc(d.t)));}}
  if(s.surse.length){const ts=el('table',{});for(const r of s.surse)ts.append(el('tr',{},el('td',{},r.ref),el('td',{},nr(r.n))));v.append(el('h3',{},'De unde vin (site-uri care trimit vizitatori)'),ts);}
  v.append(el('p',{class:'mut'},'Măsurare anonimă, fără cookie-uri și fără adresa IP. Un vizitator este un cod care se schimbă zilnic, deci pe mai multe zile „Vizitatori” este suma vizitatorilor din fiecare zi (aceeași persoană care revine în zile diferite se numără de mai multe ori). O vizită = paginile văzute de același vizitator, cu pauze de cel mult 30 de minute. Nu includ roboții, vizitele cu „Do Not Track” sau dispozitivele excluse. Datele se păstrează 400 de zile.'));
 }}catch(e){if(!e.login)v.append(el('p',{class:'err'},e.message));}}
function raspunde(m){tab='write';document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.t==='write')));const s=m.subject||'';
 const v=$('#v');v.replaceChildren();formular(m.from_addr,/^re:/i.test(s)?s:'Re: '+s,'\\n\\n— Răspuns la mesajul din '+data(m.date)+':\\n'+(m.body||'').split('\\n').slice(0,30).map(x=>'> '+x).join('\\n'),m.message_id);}
function formular(to,sub,txt,inReplyTo){const v=$('#v');v.replaceChildren();const a=el('input',{type:'text',id:'to',value:to,placeholder:'adresa@exemplu.ro (mai multe, separate prin virgula)'}),cc=el('input',{type:'text',id:'cc'}),bcc=el('input',{type:'text',id:'bcc'}),b=el('input',{id:'sub',value:sub,maxlength:'200'}),c=el('textarea',{id:'txt'});c.value=txt;
 const extra=el('div',{hidden:''},el('label',{},'Cc'),cc,el('label',{},'Bcc'),bcc);
 v.append(el('label',{},'Către'),a,el('p',{},el('button',{type:'button',onclick:()=>{extra.hidden=!extra.hidden;}},'+ Cc / Bcc')),extra,el('label',{},'Subiect'),b,el('label',{},'Mesaj (text simplu)'),c,el('p',{},el('button',{class:'pri',onclick:async(ev)=>{ev.target.disabled=true;msg('Se trimite…');
  try{await api('/api/send',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({to:a.value,cc:cc.value,bcc:bcc.value,subject:b.value,text:c.value,inReplyTo})});msg('Emailul a fost trimis.');setTimeout(()=>setTab('sent'),700);}catch(e){if(!e.login)msg(e.message,true);ev.target.disabled=false;}}},'Trimite')));}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.t)));document.getElementById('rel').addEventListener('click',()=>randeaza());document.getElementById('out').addEventListener('click',iesi);setTab('inbox');`;

export function pagina(nonce) {
  const html = `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Panou Pretino</title>
<style nonce="${nonce}">${CSS}</style></head><body>
<header><b>Panou Pretino</b><span class="mut">contact@pretino.ro</span><button id="rel" type="button">Reîncarcă</button><button id="out" type="button">Ieși</button></header>
<nav><button class="tab" data-t="inbox" aria-selected="true">Primite <span id="nec" class="badge" hidden></span></button><button class="tab" data-t="sent" aria-selected="false">Trimise</button><button class="tab" data-t="write" aria-selected="false">Scrie</button><button class="tab" data-t="status" aria-selected="false">Stare site</button><button class="tab" data-t="stats" aria-selected="false">Statistici</button></nav>
<main><div id="m"></div><div id="v"></div></main>
<script nonce="${nonce}">${JS}</script></body></html>`;
  return new Response(html, { headers: {
    "content-type": "text/html; charset=utf-8", "cache-control": "no-store",
    "content-security-policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
    "x-content-type-options": "nosniff", "referrer-policy": "no-referrer",
  } });
}
