// @ai-native-solutions/fallbuild-sdk
// Sovereign no-code app builder — programmatic core
// Extracted from fallbuild single-file tool. MIT.

export const VERSION = '1.0.0';

// ---------- Widget definitions ----------
export const WIDGETS = {
  text:      { label: 'Text',      icon: 'T', defaultProps: { content: '# Heading\nParagraph text here.' }, defaultSize: { w: 280, h: 80 } },
  form:      { label: 'Form',      icon: 'F', defaultProps: { dataSource: '', title: 'New record', submitLabel: 'Save' }, defaultSize: { w: 280, h: 240 } },
  table:     { label: 'Table',     icon: 'T', defaultProps: { dataSource: '', columns: '', sortable: true, rowAction: 'none', rowTarget: '' }, defaultSize: { w: 480, h: 240 } },
  chart:     { label: 'Chart',     icon: 'C', defaultProps: { dataSource: '', chartType: 'bar', xField: '', yField: '' }, defaultSize: { w: 360, h: 220 } },
  button:    { label: 'Button',    icon: 'B', defaultProps: { label: 'Click me', action: 'navigate', target: '', code: '' }, defaultSize: { w: 140, h: 40 } },
  image:     { label: 'Image',     icon: 'I', defaultProps: { src: '', alt: '' }, defaultSize: { w: 200, h: 160 } },
  container: { label: 'Container', icon: 'X', defaultProps: { layout: 'flex', bg: '' }, defaultSize: { w: 320, h: 200 } },
  filter:    { label: 'Filter',    icon: 'S', defaultProps: { placeholder: 'search...', target: '' }, defaultSize: { w: 240, h: 48 } }
};

// ---------- Demo data (for template previews) ----------
export const DEMO_DATA = {
  customers: [
    { id: 1, name: 'Alice Chen', email: 'alice@acme.io', company: 'Acme', tier: 'gold', value: 12400 },
    { id: 2, name: 'Ben Ortiz', email: 'ben@globex.co', company: 'Globex', tier: 'silver', value: 3200 },
    { id: 3, name: 'Cara Singh', email: 'cara@initech.net', company: 'Initech', tier: 'gold', value: 18900 },
    { id: 4, name: 'Dan Wu', email: 'dan@umbrella.org', company: 'Umbrella', tier: 'bronze', value: 540 },
    { id: 5, name: 'Eva Park', email: 'eva@stark.com', company: 'Stark', tier: 'silver', value: 7100 }
  ],
  orders: [
    { id: 101, customer: 'Acme', total: 1200, status: 'paid', date: '2026-05-12' },
    { id: 102, customer: 'Globex', total: 340, status: 'pending', date: '2026-05-14' },
    { id: 103, customer: 'Initech', total: 2890, status: 'paid', date: '2026-05-15' },
    { id: 104, customer: 'Stark', total: 540, status: 'refunded', date: '2026-05-18' },
    { id: 105, customer: 'Acme', total: 780, status: 'paid', date: '2026-05-20' }
  ],
  products: [
    { id: 'p1', name: 'Widget A', price: 29, stock: 120, category: 'core' },
    { id: 'p2', name: 'Widget B', price: 49, stock: 34, category: 'pro' },
    { id: 'p3', name: 'Service plan', price: 199, stock: 9999, category: 'service' },
    { id: 'p4', name: 'Add-on pack', price: 12, stock: 540, category: 'core' }
  ]
};

// ---------- Template keyword classifier ----------
export const T0_KEYWORDS = [
  { kw: /crud|list.*form|customer/i, name: 'CRUD app' },
  { kw: /dashboard|chart|metric/i,   name: 'Dashboard' },
  { kw: /lead|signup|capture|contact/i, name: 'Lead capture' },
  { kw: /pric|calc|quote/i,          name: 'Pricing calculator' },
  { kw: /internal|sidebar|tool|admin/i, name: 'Internal tool' }
];

export const TEMPLATES = ['CRUD app', 'Dashboard', 'Lead capture', 'Pricing calculator', 'Internal tool'];

// ---------- ID helpers ----------
const rand = () => Math.random().toString(36).slice(2, 9);
export const newAppId  = () => 'app_' + Date.now().toString(36);
export const newPageId = () => 'p_'  + Date.now().toString(36) + rand().slice(0, 3);
export const newWidgetId = () => 'w_' + Date.now().toString(36) + rand().slice(0, 3);

// ---------- Widget factory ----------
export function mkW(type, x, y, w, h, props = {}) {
  const def = WIDGETS[type];
  if (!def) throw new Error(`unknown widget type: ${type}`);
  return {
    id: newWidgetId(),
    type,
    x, y, w, h,
    props: Object.assign(JSON.parse(JSON.stringify(def.defaultProps)), props)
  };
}

// ---------- App factory ----------
export function newApp(name = 'untitled app') {
  return {
    id: newAppId(),
    name,
    pages: [{ id: newPageId(), name: 'home', widgets: [] }],
    dataSources: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

// ---------- Template classifier ----------
export function classifyPrompt(text) {
  for (const r of T0_KEYWORDS) if (r.kw.test(text)) return r.name;
  return null;
}

// ---------- Template builder ----------
export function buildTemplate(name) {
  const base = {
    id: newAppId(),
    name: name.toLowerCase(),
    pages: [],
    dataSources: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  if (name === 'CRUD app') {
    base.dataSources = [{ name: 'customers', type: 'demo', demo: 'customers' }];
    base.pages = [
      { id: 'p1', name: 'list', widgets: [
        mkW('text',   20,  20, 500,  40, { content: '# Customers' }),
        mkW('button', 20,  70, 140,  36, { label: '+ New customer', action: 'navigate', target: 'new' }),
        mkW('filter', 180, 70, 200,  36, { placeholder: 'search...' }),
        mkW('table',  20, 120, 720, 360, { dataSource: 'customers', columns: 'name,email,company,tier,value', sortable: true, rowAction: 'navigate', rowTarget: 'edit' })
      ] },
      { id: 'p2', name: 'new', widgets: [
        mkW('text',   20,  20, 500,  40, { content: '# New customer' }),
        mkW('form',   20,  70, 400, 320, { dataSource: 'customers', title: 'Add customer', submitLabel: 'Save' }),
        mkW('button', 20, 400, 120,  36, { label: '<- back', action: 'navigate', target: 'list' })
      ] },
      { id: 'p3', name: 'edit', widgets: [
        mkW('text',   20,  20, 500,  40, { content: '# Edit customer' }),
        mkW('form',   20,  70, 400, 320, { dataSource: 'customers', title: 'Edit', submitLabel: 'Update' }),
        mkW('button', 20, 400, 120,  36, { label: '<- back', action: 'navigate', target: 'list' })
      ] }
    ];
  } else if (name === 'Dashboard') {
    base.dataSources = [
      { name: 'orders',    type: 'demo', demo: 'orders' },
      { name: 'customers', type: 'demo', demo: 'customers' }
    ];
    base.pages = [{ id: 'p1', name: 'dashboard', widgets: [
      mkW('text',   20,  20, 800,  40, { content: '# Dashboard' }),
      mkW('filter', 20,  70, 300,  36, { placeholder: 'filter...' }),
      mkW('chart',  20, 120, 360, 240, { dataSource: 'orders',    chartType: 'bar',  xField: 'customer', yField: 'total' }),
      mkW('chart', 400, 120, 360, 240, { dataSource: 'customers', chartType: 'pie',  xField: 'tier',     yField: 'value' }),
      mkW('chart',  20, 380, 740, 240, { dataSource: 'orders',    chartType: 'line', xField: 'date',     yField: 'total' })
    ] }];
  } else if (name === 'Lead capture') {
    base.dataSources = [{ name: 'leads', type: 'inline', json: '[]' }];
    base.pages = [
      { id: 'p1', name: 'capture', widgets: [
        mkW('text', 20,  20, 500,  80, { content: '# Get a demo\nLeave your details and we will be in touch.' }),
        mkW('form', 20, 120, 400, 260, { dataSource: 'leads', title: 'Your details', submitLabel: 'Request demo' })
      ] },
      { id: 'p2', name: 'success', widgets: [
        mkW('text', 20, 20, 500, 120, { content: '# Thank you\nWe got your details.' })
      ] }
    ];
  } else if (name === 'Pricing calculator') {
    base.dataSources = [{ name: 'quotes', type: 'inline', json: '[]' }];
    base.pages = [{ id: 'p1', name: 'calc', widgets: [
      mkW('text',   20,  20, 600,  80, { content: '# Pricing calculator' }),
      mkW('form',   20, 120, 400, 260, { dataSource: 'quotes', title: 'Inputs', submitLabel: 'Calculate' }),
      mkW('text',  440, 120, 300, 140, { content: '## Result\nFill the form to calculate.' }),
      mkW('button', 20, 400, 200,  40, { label: 'custom calc', action: 'custom', code: 'alert("custom calc result: $" + Math.floor(Math.random()*1000))' })
    ] }];
  } else if (name === 'Internal tool') {
    base.dataSources = [
      { name: 'customers', type: 'demo', demo: 'customers' },
      { name: 'orders',    type: 'demo', demo: 'orders' },
      { name: 'products',  type: 'demo', demo: 'products' }
    ];
    base.pages = [
      { id: 'p1', name: 'customers', widgets: [
        mkW('text',  20, 20, 400,  40, { content: '# Customers' }),
        mkW('table', 20, 70, 760, 360, { dataSource: 'customers', columns: 'name,email,company,tier', sortable: true })
      ] },
      { id: 'p2', name: 'orders', widgets: [
        mkW('text',  20, 20, 400,  40, { content: '# Orders' }),
        mkW('table', 20, 70, 760, 360, { dataSource: 'orders', sortable: true })
      ] },
      { id: 'p3', name: 'products', widgets: [
        mkW('text',  20, 20, 400,  40, { content: '# Products' }),
        mkW('table', 20, 70, 760, 360, { dataSource: 'products', sortable: true })
      ] }
    ];
  } else {
    throw new Error(`unknown template: ${name}. Known: ${TEMPLATES.join(', ')}`);
  }
  return base;
}

// ---------- Validation ----------
export function validateApp(app) {
  const errors = [];
  if (!app || typeof app !== 'object') return { ok: false, errors: ['app must be an object'] };
  if (!app.name) errors.push('missing name');
  if (!Array.isArray(app.pages) || !app.pages.length) errors.push('app must have at least one page');
  if (!Array.isArray(app.dataSources)) errors.push('dataSources must be an array');
  (app.pages || []).forEach((p, i) => {
    if (!p.name) errors.push(`page[${i}] missing name`);
    if (!Array.isArray(p.widgets)) errors.push(`page[${i}] widgets must be an array`);
    (p.widgets || []).forEach((w, j) => {
      if (!WIDGETS[w.type]) errors.push(`page[${i}].widget[${j}] unknown type: ${w.type}`);
      ['x','y','w','h'].forEach(k => { if (typeof w[k] !== 'number') errors.push(`page[${i}].widget[${j}].${k} must be a number`); });
    });
  });
  return { ok: errors.length === 0, errors };
}

// ---------- Data-source resolver ----------
export function getRows(app, sourceName) {
  if (!app || !sourceName) return [];
  const ds = (app.dataSources || []).find(d => d.name === sourceName);
  if (!ds) return [];
  if (ds.type === 'demo') return DEMO_DATA[ds.demo] || [];
  if (ds.type === 'inline') { try { return JSON.parse(ds.json || '[]'); } catch (e) { return []; } }
  if (ds.type === 'fallbase') return ds.cache || [];
  return [];
}

// ---------- Markdown (tiny subset) ----------
export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
export function mdToHtml(s) {
  s = esc(s);
  s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^## (.+)$/gm,  '<h2>$1</h2>');
  s = s.replace(/^# (.+)$/gm,   '<h1>$1</h1>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g,     '<em>$1</em>');
  s = s.replace(/`(.+?)`/g,       '<code>$1</code>');
  s = s.split(/\n\n+/).map(p => /^<h\d/.test(p) ? p : '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
  return s;
}

// ---------- LLM planner prompt ----------
export const PLANNER_SYSTEM_PROMPT =
  `You are FallBuild's app planner. Return ONLY valid JSON matching this schema (no prose, no fences):
{"name":"app name","pages":[{"name":"page name","widgets":[{"type":"text|form|table|chart|button|image|container|filter","x":0,"y":0,"w":300,"h":100,"props":{}}]}],"dataSources":[{"name":"customers","type":"demo","demo":"customers|orders|products"}]}
Widget props: text:{content}; form:{dataSource,title,submitLabel}; table:{dataSource,columns,rowAction}; chart:{dataSource,chartType:"bar|line|pie",xField,yField}; button:{label,action:"navigate|submit|custom",target}; image:{src,alt}; container:{layout:"flex|grid"}; filter:{placeholder}. Layout in pixels on a 1200x800 canvas.`;

// ---------- Parse & normalise LLM JSON output ----------
export function parseLLMApp(rawText) {
  if (!rawText) throw new Error('empty LLM output');
  let txt = String(rawText).trim().replace(/^```json\s*|```$/g, '').replace(/^```\s*|```$/g, '');
  const m = txt.match(/\{[\s\S]*\}/);
  if (m) txt = m[0];
  const app = JSON.parse(txt);
  app.id = newAppId();
  app.pages = app.pages || [];
  app.pages.forEach(p => {
    p.id = p.id || newPageId();
    p.widgets = (p.widgets || []).map(w =>
      mkW(w.type || 'text', w.x || 20, w.y || 20, w.w || 300, w.h || 100, w.props || {})
    );
  });
  app.dataSources = app.dataSources || [];
  app.createdAt = app.createdAt || Date.now();
  app.updatedAt = Date.now();
  return app;
}

// ---------- Standalone HTML export ----------
const RUNTIME_SRC = `
'use strict';
(function(){
const APP=window.__FALLBUILD_APP__;
const DS_DATA=window.__FALLBUILD_DATA__||{};
let pageIdx=0;
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])}
function mdToHtml(s){s=esc(s);s=s.replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^# (.+)$/gm,'<h1>$1</h1>').replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>').replace(/\\*(.+?)\\*/g,'<em>$1</em>');return s.split(/\\n\\n+/).map(p=>/^<h\\d/.test(p)?p:'<p>'+p.replace(/\\n/g,'<br>')+'</p>').join('')}
function getRows(name){if(!name)return [];if(DS_DATA[name])return DS_DATA[name];const ds=APP.dataSources.find(d=>d.name===name);if(!ds)return [];if(ds.type==='inline'){try{return JSON.parse(ds.json||'[]')}catch(e){return[]}}return []}
function render(){
  const root=document.getElementById('app');root.innerHTML='';
  const page=APP.pages[pageIdx];if(!page){root.innerHTML='<p>page not found</p>';return}
  if(APP.pages.length>1){const nav=document.createElement('nav');nav.className='fb-nav';APP.pages.forEach((p,i)=>{const a=document.createElement('a');a.textContent=p.name;a.className=i===pageIdx?'on':'';a.onclick=()=>{pageIdx=i;render()};nav.appendChild(a)});root.appendChild(nav)}
  const surface=document.createElement('div');surface.className='fb-surface';root.appendChild(surface);
  page.widgets.forEach(w=>{const el=document.createElement('div');el.className='fb-widget fb-'+w.type;el.style.cssText='position:absolute;left:'+w.x+'px;top:'+w.y+'px;width:'+w.w+'px;height:'+w.h+'px';surface.appendChild(el);bind(el,w);});
}
function bind(el,w){
  const p=w.props||{};
  if(w.type==='text'){el.innerHTML=mdToHtml(p.content||'')}
  else if(w.type==='form'){const rows=getRows(p.dataSource),keys=rows.length?Object.keys(rows[0]).filter(k=>k!=='id'):['field1','field2'];el.innerHTML='<h3>'+esc(p.title||'Form')+'</h3>'+keys.map(k=>'<label>'+esc(k)+'<input data-f="'+esc(k)+'"></label>').join('')+'<button class="fb-btn">'+esc(p.submitLabel||'Save')+'</button>';el.querySelector('button').onclick=()=>{const obj={};el.querySelectorAll('input[data-f]').forEach(i=>obj[i.dataset.f]=i.value);if(p.dataSource){if(!DS_DATA[p.dataSource])DS_DATA[p.dataSource]=getRows(p.dataSource).slice();DS_DATA[p.dataSource].push({id:Date.now(),...obj})}el.querySelectorAll('input').forEach(i=>i.value='');alert('saved');render()};}
  else if(w.type==='table'){const rows=getRows(p.dataSource);if(!rows.length){el.innerHTML='<em>no data</em>';return}const cols=(p.columns||'').split(',').map(s=>s.trim()).filter(Boolean);const keys=cols.length?cols:Object.keys(rows[0]);let h='<table><thead><tr>'+keys.map(k=>'<th>'+esc(k)+'</th>').join('')+'</tr></thead><tbody>';rows.forEach((r,i)=>{h+='<tr data-i="'+i+'">'+keys.map(k=>'<td>'+esc(r[k]??'')+'</td>').join('')+'</tr>'});h+='</tbody></table>';el.innerHTML=h;if(p.rowAction!=='none')el.querySelectorAll('tr[data-i]').forEach(tr=>{tr.style.cursor='pointer';tr.onclick=()=>{if(p.rowAction==='navigate'&&p.rowTarget){const i=APP.pages.findIndex(pg=>pg.name===p.rowTarget);if(i>=0){pageIdx=i;render()}}}});}
  else if(w.type==='chart'){el.innerHTML='<canvas></canvas>';drawChart(el.querySelector('canvas'),w)}
  else if(w.type==='button'){el.innerHTML='<button class="fb-btn" style="width:100%;height:100%">'+esc(p.label||'Button')+'</button>';el.querySelector('button').onclick=()=>{if(p.action==='navigate'&&p.target){const i=APP.pages.findIndex(pg=>pg.name===p.target||pg.id===p.target);if(i>=0){pageIdx=i;render()}}else if(p.action==='custom'&&p.code){try{new Function(p.code)()}catch(e){alert(e.message)}}};}
  else if(w.type==='image'){el.innerHTML=p.src?'<img src="'+p.src+'" alt="'+esc(p.alt||'')+'" style="width:100%;height:100%;object-fit:cover">':'<em>image</em>'}
  else if(w.type==='container'){el.innerHTML='<div style="display:'+(p.layout==='grid'?'grid':'flex')+';gap:8px;width:100%;height:100%"></div>'}
  else if(w.type==='filter'){el.innerHTML='<input placeholder="'+esc(p.placeholder||'search')+'" style="width:100%">';el.querySelector('input').oninput=e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('.fb-table tr[data-i]').forEach(tr=>{tr.style.display=tr.textContent.toLowerCase().includes(q)?'':'none'})}}
}
function drawChart(cv,w){const rows=getRows(w.props.dataSource);if(!rows.length)return;const xF=w.props.xField||Object.keys(rows[0])[0];const yF=w.props.yField||Object.keys(rows[0]).find(k=>typeof rows[0][k]==='number')||Object.keys(rows[0])[1];const dpr=window.devicePixelRatio||1;const W=cv.clientWidth,H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;const ctx=cv.getContext('2d');ctx.scale(dpr,dpr);const data=rows.map(r=>({x:String(r[xF]),y:Number(r[yF])||0}));const max=Math.max(...data.map(d=>d.y),1);const pad=24,cw=W-pad*2,ch=H-pad*2;ctx.strokeStyle='#2a2934';ctx.beginPath();ctx.moveTo(pad,pad);ctx.lineTo(pad,H-pad);ctx.lineTo(W-pad,H-pad);ctx.stroke();if(w.props.chartType==='bar'){const bw=cw/data.length*.7,gap=cw/data.length*.3;data.forEach((d,i)=>{const x=pad+i*(bw+gap)+gap/2,bh=d.y/max*ch,y=H-pad-bh;ctx.fillStyle='#b8974a';ctx.fillRect(x,y,bw,bh);ctx.fillStyle='#a8a395';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText(d.x.slice(0,8),x+bw/2,H-pad+10)})}else if(w.props.chartType==='line'){ctx.strokeStyle='#ff8c00';ctx.lineWidth=2;ctx.beginPath();data.forEach((d,i)=>{const x=pad+i*(cw/(data.length-1||1)),y=H-pad-d.y/max*ch;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke()}else if(w.props.chartType==='pie'){const total=data.reduce((a,d)=>a+d.y,0)||1;const cx=W/2,cy=H/2,r=Math.min(W,H)/2-pad;let a=-Math.PI/2;const cols=['#b8974a','#ff8c00','#8b1a1a','#4ade80','#60a5fa','#fbbf24'];data.forEach((d,i)=>{const a2=a+d.y/total*Math.PI*2;ctx.fillStyle=cols[i%cols.length];ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,a,a2);ctx.closePath();ctx.fill();a=a2})}}
render();
})();
`;

const STANDALONE_CSS = `:root{--void:#0b0a0f;--ink:#1a1922;--line:#2a2934;--cream:#e6e1d6;--brass:#b8974a;--amber:#ff8c00}
*{box-sizing:border-box}
body{margin:0;background:var(--void);color:var(--cream);font-family:system-ui,sans-serif;font-size:14px}
#app{position:relative;min-height:100vh;padding:0}
.fb-nav{display:flex;gap:6px;padding:10px 16px;border-bottom:1px solid var(--line);background:#13121a}
.fb-nav a{padding:6px 12px;border:1px solid var(--line);border-radius:3px;cursor:pointer;font-size:12px}
.fb-nav a.on{background:var(--brass);color:var(--void);border-color:var(--brass)}
.fb-surface{position:relative;min-height:80vh}
.fb-widget{padding:8px;overflow:hidden}
.fb-widget h1,h2,h3{font-family:Georgia,serif;margin:0 0 6px;color:var(--cream)}
.fb-widget label{display:block;font-size:11px;color:#a8a395;text-transform:uppercase;margin-bottom:6px}
.fb-widget input{display:block;width:100%;background:var(--ink);border:1px solid var(--line);color:var(--cream);padding:6px 8px;border-radius:3px;margin-top:3px}
.fb-btn{background:var(--brass);color:var(--void);border:none;padding:8px 14px;border-radius:3px;cursor:pointer;font-weight:600}
.fb-btn:hover{background:var(--amber)}
.fb-table table{width:100%;border-collapse:collapse;font-size:12px}
.fb-table th,.fb-table td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left}
.fb-table th{color:#a8a395;text-transform:uppercase;font-size:10px}
canvas{display:block;width:100%;height:100%}`;

export function exportStandaloneHTML(app) {
  const v = validateApp(app);
  if (!v.ok) throw new Error('invalid app: ' + v.errors.join('; '));
  const dataBaked = {};
  (app.dataSources || []).forEach(ds => {
    if (ds.type === 'demo') dataBaked[ds.name] = DEMO_DATA[ds.demo] || [];
  });
  const appJson = JSON.parse(JSON.stringify(app));
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(app.name || 'app')}</title>
<style>
${STANDALONE_CSS}
</style>
</head>
<body>
<div id="app"></div>
<script>
window.__FALLBUILD_APP__=${JSON.stringify(appJson)};
window.__FALLBUILD_DATA__=${JSON.stringify(dataBaked)};
${RUNTIME_SRC}
</` + `script>
</body>
</html>`;
}

// ---------- Convenience: generate from prompt (keyword tier) ----------
export function generateFromPrompt(text) {
  const tmpl = classifyPrompt(text);
  if (tmpl) return { tier: 'T0', app: buildTemplate(tmpl), template: tmpl };
  return { tier: 'T0', app: null, template: null, hint: 'no template match. Try: ' + TEMPLATES.join(', ') };
}

export default {
  VERSION, WIDGETS, DEMO_DATA, TEMPLATES, T0_KEYWORDS, PLANNER_SYSTEM_PROMPT,
  newApp, newAppId, newPageId, newWidgetId, mkW,
  buildTemplate, classifyPrompt, generateFromPrompt,
  validateApp, getRows, exportStandaloneHTML, parseLLMApp,
  mdToHtml, esc
};
