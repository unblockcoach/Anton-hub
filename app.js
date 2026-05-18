// ─────────────────────────────────────────
// ANTON HUB — APP.JS
// ─────────────────────────────────────────

let currentPage='programme',currentWeek=null,modalSession=null;

document.addEventListener('DOMContentLoaded',()=>{
  initTheme();setCurrentWeek();renderProgramme();renderMuscu();renderNage();renderRef();renderJournal();registerSW();
});

function initTheme(){applyTheme(localStorage.getItem('theme')||'dark');}
function toggleTheme(){applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');}
function applyTheme(t){
  document.documentElement.dataset.theme=t;
  document.getElementById('themeBtn').textContent=t==='dark'?'☀️':'🌙';
  const mc=document.querySelector('meta[name="theme-color"]');
  if(mc)mc.content=t==='dark'?'#0C0D0F':'#FFFFFF';
  localStorage.setItem('theme',t);
}

function switchPage(name,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  btn.classList.add('active');
  currentPage=name;window.scrollTo(0,0);
  if(name==='journal')renderJournal();
}

function setCurrentWeek(){
  const today=new Date().toISOString().split('T')[0];
  let found=WEEKS[0].id;
  for(const w of WEEKS){if(w.startDate<=today)found=w.id;}
  currentWeek=found;
}

function renderProgramme(){renderWeekSelector();renderSessionList(currentWeek);}

function renderWeekSelector(){
  document.getElementById('weekSelector').innerHTML=WEEKS.map(w=>`
    <button class="week-chip ${w.id===currentWeek?'active':''}" onclick="selectWeek('${w.id}',this)">
      <span class="week-chip-id">${w.id}</span>
      <span class="week-chip-label">${w.label}</span>
      <span class="week-chip-badge">${w.badge}</span>
    </button>`).join('');
}

function selectWeek(weekId,btn){
  currentWeek=weekId;
  document.querySelectorAll('.week-chip').forEach(c=>c.classList.remove('active'));
  btn.classList.add('active');
  renderSessionList(weekId);
}

function renderSessionList(weekId){
  const container=document.getElementById('sessionList');
  const sessions=SESSIONS.filter(s=>s.week===weekId);
  const today=new Date().toISOString().split('T')[0];
  const todaySessions=sessions.filter(s=>s.date===today);
  const otherSessions=sessions.filter(s=>s.date!==today);
  let html='';
  if(todaySessions.length>0){
    html+=`<div class="today-section"><div class="today-label">📍 Aujourd'hui</div>`;
    todaySessions.forEach(s=>{html+=renderSessionCard(s);});
    html+=`</div>`;
  }
  if(otherSessions.length>0){
    const week=WEEKS.find(w=>w.id===weekId);
    html+=`<div class="week-label-row">${week?week.id+' · '+week.label:weekId}</div><div class="session-list">`;
    otherSessions.forEach(s=>{html+=renderSessionCard(s);});
    html+=`</div>`;
  }
  if(!html)html=`<div class="placeholder"><div class="placeholder-icon">📅</div><div class="placeholder-title">Aucune séance</div></div>`;
  container.innerHTML=html;
}

function renderSessionCard(s){
  const done=isDone(s.id),hasNote=!!getRetour(s.id),isKey=s.title&&s.title.includes('⭐');
  return `<div class="session-card type-${s.type}${done?' is-done':''}${isKey?' key-session':''}" id="card-${s.id}">
    <div class="sc-tap" onclick="openModal('${s.id}')">
      <span class="sc-day">${s.day}</span>
      <span class="sc-badge badge-${s.type}">${badgeLabel(s.type)}</span>
      <div class="sc-info">
        <div class="sc-title">${s.title}</div>
        <div class="sc-meta">${s.duration?s.duration+' min':''}${s.volume?' · '+s.volume:''}</div>
      </div>
      <div class="sc-right">
        ${hasNote?'<div class="sc-has-note"></div>':''}
        <button class="sc-done-btn${done?' done':''}" onclick="event.stopPropagation();toggleDone('${s.id}')">
          ${done?'✅':'○'}
        </button>
      </div>
    </div>
  </div>`;
}

function badgeLabel(type){
  return {'run':'Run','swim':'Nage','bike':'Vélo','muscu-a':'Push · A','muscu-b':'Pull · B','muscu-c':'Legs · C','rest':'Repos','race':'🏁 RACE'}[type]||type;
}

function openModal(sessionId){
  const s=SESSIONS.find(x=>x.id===sessionId);if(!s)return;
  modalSession=s;
  document.getElementById('modalDay').textContent=s.day;
  document.getElementById('modalBadge').className='sc-badge badge-'+s.type;
  document.getElementById('modalBadge').textContent=badgeLabel(s.type);
  document.getElementById('modalTitle').textContent=s.title;
  const body=document.getElementById('modalBody');
  body.innerHTML=buildModalBody(s);
  const saved=getRetour(s.id);
  const ta=document.getElementById('modalRetourArea');
  if(ta&&saved)ta.value=saved;
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('modalDrawer').classList.add('open');
  document.body.style.overflow='hidden';
  setupDrawerSwipe(document.getElementById('modalDrawer'));
}

function closeModal(){
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('modalDrawer').classList.remove('open');
  document.body.style.overflow='';
  modalSession=null;
}

function buildModalBody(s){
  let html='';
  if(s.warmup)html+=`<div class="modal-section"><div class="section-label sl-warm">◆ Échauffement</div><div class="section-text">${esc(s.warmup)}</div></div>`;
  if(s.intervals&&s.intervals.length>0){
    html+=`<div class="modal-section"><div class="section-label sl-main">◆ Corps de séance</div>`;
    if(s.intervals[0].ex!==undefined){
      html+=`<table class="int-table"><tr><th>Exercice</th><th>Séries</th><th>Charge</th><th>RPE</th></tr>`;
      s.intervals.forEach(r=>{html+=`<tr><td>${esc(r.ex)}</td><td>${esc(r.sets)}</td><td>${esc(r.load)}</td><td>${renderRPE(r.rpe)}</td></tr>`;});
      html+=`</table>`;
    } else {
      html+=`<table class="int-table"><tr><th>Rep</th><th>Durée</th><th>Allure</th><th>FC</th><th>Récup</th></tr>`;
      s.intervals.forEach(r=>{html+=`<tr><td>${esc(r.rep||'—')}</td><td>${esc(r.dur||'—')}</td><td><span class="pace-tag">${esc(r.pace||'—')}</span></td><td><span class="fc-tag">${esc(r.fc||'—')}</span></td><td>${esc(r.recup||'—')}</td></tr>`;});
      html+=`</table>`;
    }
    if(s.afterIntervals)html+=`<div class="section-text" style="margin-top:10px">${esc(s.afterIntervals)}</div>`;
    html+=`</div>`;
  }
  if(s.main&&!s.intervals)html+=`<div class="modal-section"><div class="section-label sl-main">◆ Corps de séance</div><div class="section-text">${esc(s.main)}</div></div>`;
  if(s.note)html+=`<div class="modal-section"><div class="note-box">${esc(s.note)}</div></div>`;
  if(s.cooldown)html+=`<div class="modal-section"><div class="section-label sl-cool">◆ Retour au calme</div><div class="section-text">${esc(s.cooldown)}</div></div>`;
  if(s.recup&&s.recup.length>0)html+=`<div class="modal-section"><div class="section-label sl-recup">◆ Récupération</div><div class="recup-tags">${s.recup.map(r=>`<span class="recup-tag">${esc(r)}</span>`).join('')}</div></div>`;
  html+=`<div class="retour-wrap"><div class="retour-label">📝 Mon retour</div><textarea class="retour-area" id="modalRetourArea" placeholder="Sensations, charges tenues, difficultés, progrès..." oninput="autoSaveRetour('${s.id}',this.value)"></textarea><div class="retour-footer"><button class="retour-save-btn" onclick="saveRetour('${s.id}')">Sauvegarder</button><span class="retour-saved" id="modalSaved">✓ Sauvegardé</span></div></div>`;
  return html;
}

function renderRPE(rpe){
  const n=parseInt(rpe)||0;
  let d='<div class="rpe-bar">';
  for(let i=1;i<=10;i++)d+=`<div class="rpe-dot ${i<=n?'rpe-filled':'rpe-empty'}"></div>`;
  return d+`</div> <span style="font-size:10px;color:var(--dim);margin-left:4px">${rpe}/10</span>`;
}

function esc(str){
  if(!str)return'';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

function setupDrawerSwipe(drawer){
  let startY=0;
  drawer.addEventListener('touchstart',e=>{startY=e.touches[0].clientY;},{passive:true});
  drawer.addEventListener('touchmove',e=>{const dy=e.touches[0].clientY-startY;if(dy>0)drawer.style.transform=`translateY(${dy}px)`;},{passive:true});
  drawer.addEventListener('touchend',e=>{const dy=e.changedTouches[0].clientY-startY;drawer.style.transform='';if(dy>80)closeModal();});
}

function toggleDone(id){
  const cur=localStorage.getItem('done_'+id)==='1';
  localStorage.setItem('done_'+id,cur?'0':'1');
  const card=document.getElementById('card-'+id);
  if(card){const s=SESSIONS.find(x=>x.id===id);if(s)card.outerHTML=renderSessionCard(s);}
}

function isDone(id){return localStorage.getItem('done_'+id)==='1';}

function autoSaveRetour(id,val){
  localStorage.setItem('retour_'+id,val);
  localStorage.setItem('retour_ts_'+id,new Date().toLocaleString('fr-FR'));
}

function saveRetour(id){
  const ta=document.getElementById('modalRetourArea');if(!ta)return;
  const val=ta.value.trim();if(!val)return;
  localStorage.setItem('retour_'+id,val);
  localStorage.setItem('retour_ts_'+id,new Date().toLocaleString('fr-FR'));
  const saved=document.getElementById('modalSaved');
  if(saved){saved.classList.add('show');setTimeout(()=>saved.classList.remove('show'),2000);}
}

function getRetour(id){return localStorage.getItem('retour_'+id);}

function renderJournal(){
  const list=document.getElementById('journalList');
  const entries=SESSIONS.map(s=>({s,val:getRetour(s.id),ts:localStorage.getItem('retour_ts_'+s.id)})).filter(e=>e.val&&e.val.trim()).reverse();
  if(!entries.length){list.innerHTML=`<div class="journal-empty">Aucun retour encore.<br>Ouvre une séance et écris ton retour en bas.</div>`;return;}
  list.innerHTML=entries.map(e=>`<div class="journal-entry"><div class="je-meta"><span class="je-date">${e.ts||'—'}</span><span class="je-name">${e.s.week} · ${e.s.day} · ${e.s.title}</span></div><div class="je-text">${esc(e.val)}</div></div>`).join('')+`<button class="journal-clear-btn" onclick="clearJournal()">Effacer tous les retours</button>`;
}

function clearJournal(){
  if(!confirm('Effacer tous les retours ? Irréversible.'))return;
  SESSIONS.forEach(s=>{localStorage.removeItem('retour_'+s.id);localStorage.removeItem('retour_ts_'+s.id);});
  renderJournal();
}

function renderMuscu(){
  const push=[
    {ex:'Développé couché barre',sets:'4×6',load:'75–85kg selon semaine',rpe:7,detail:'~75% de ton 3RM. Zone force-hypertrophie. Coudes à 75° du corps.',transfer:'Pectoraux, deltoïdes antérieurs, triceps'},
    {ex:'Dips lestés ceinture',sets:'3–4×8',load:'+10–20kg selon semaine',rpe:7,detail:'Descente complète, torse légèrement incliné. Amplitude totale.',transfer:'Pectoraux bas, triceps, deltoïdes'},
    {ex:'Élévations latérales DB',sets:'3×12',load:'DB 10–12kg',rpe:6,detail:"Coude légèrement fléchi. Monte jusqu'à épaule uniquement. Contrôle le retour.",transfer:'Deltoïdes médians — largeur épaules'},
    {ex:'Arnold press DB',sets:'3×10',load:'DB 17kg',rpe:7,detail:'Rotation du poignet de prise neutre à pronation. Full ROM.',transfer:'Tous chefs deltoïdes + rotateurs épaule'},
    {ex:'Pompes prises serrées',sets:'3×12–15',load:'Poids corps',rpe:6,detail:'Mains à largeur épaules. Coudes le long du corps. Descente contrôlée 3".',transfer:'Triceps, pectoraux médians'},
    {ex:'Hollow body hold',sets:'3×30–40"',load:'Poids corps',rpe:6,detail:'Bas du dos collé au sol. Jambes tendues à 30cm.',transfer:'Core profond — stabilité tronc en run'},
    {ex:'Ab wheel rollout',sets:'3×8–12',load:'Depuis genoux',rpe:7,detail:"Dérouler jusqu'à plat en gardant le dos plat. Ramener en contractant les abdos.",transfer:'Force excentrique du core'},
  ];
  const pull=[
    {ex:'Tractions pronation',sets:'4×6–8',load:'+5–10kg ceinture',rpe:7,detail:'Prise large en pronation. Full ROM — bras complètement tendus en bas.',transfer:'Grand dorsal, biceps, rhomboïdes — traction aquatique'},
    {ex:'Tirage horizontal TRX',sets:'3×10–12',load:'Corps incliné 35–45°',rpe:6,detail:'Tire vers la poitrine, coudes à 45°. Tête neutre, corps rigide.',transfer:'Rhomboïdes, trapèzes — posture run et crawl'},
    {ex:'Face pull élastique',sets:'3×15',load:'Élastique rouge',rpe:5,detail:'Tire vers le visage en ouvrant les coudes. Coudes à 90° en fin.',transfer:'Rotateurs externes épaule — prévention blessure nage'},
    {ex:'Curl biceps DB',sets:'3×10',load:'DB 17kg',rpe:7,detail:'Supination complète. Pas de balancement du buste.',transfer:'Biceps — esthétique + force traction'},
    {ex:'Rotation externe allongé',sets:'3×15 chaque',load:'DB 5kg',rpe:5,detail:'Couché sur le côté, coude plié 90°, rotation externe. Amplitude maximale.',transfer:'Infra-épineux, petit rond — santé épaule en nage'},
    {ex:'Pallof press',sets:'3×10–12 chaque',load:'Élastique violet',rpe:6,detail:"Debout de côté. Pousser les mains devant soi. Résister à la rotation.",transfer:'Anti-rotation core — stabilité latérale en foulée'},
    {ex:'Crunch bicycle lent',sets:'3×16–20',load:'Poids corps',rpe:6,detail:'Dos au sol, mains derrière la nuque. Mouvement lent 3" par rep.',transfer:'Obliques — rotation spécifique nage crawl'},
  ];
  const legs=[
    {ex:'RDL unilatéral KB',sets:'3–4×8 chaque',load:'KB 24kg',rpe:7,detail:"Debout sur 1 jambe, bascule vers l'avant dos plat. Récup 45\".",transfer:'Ischio-fessiers, stabilisateurs — chaîne postérieure run'},
    {ex:'Step-up KB',sets:'3–4×8–10 chaque',load:'KB 24kg ×2',rpe:7,detail:"Monte sur la box uniquement avec la jambe avant. Pas d'élan.",transfer:"Quadriceps, fessiers — force d'impulsion run"},
    {ex:'Nordic curl',sets:'2–4×6',load:'Poids corps',rpe:8,detail:"Genoux au sol, pieds bloqués. Descends LENTEMENT. Bras pour se recevoir.",transfer:'Ischios excentriques — prévention claquage'},
    {ex:'Mollet excentrique',sets:'3×10–12 chaque',load:'Poids corps → +KB',rpe:7,detail:'Monte 2 pieds, descends 1 pied en 4 secondes. Amplitude complète.',transfer:'Soléaire, gastrocnémien — prévention tendinite Achille'},
    {ex:'Clamshell élastique',sets:'3×15 chaque',load:'Élastique rouge',rpe:5,detail:'Couché sur le côté, genoux fléchis. Ouvrir la hanche comme une coquille.',transfer:'Moyen fessier — stabilité genou en run'},
    {ex:'Relevé jambes suspendu',sets:'3×10–12',load:'Barre + sangles',rpe:7,detail:"Suspendu à la barre. Ramener les genoux à 90°. Pas d'élan.",transfer:'Abdos bas, hip flexors — levée de genou en run'},
    {ex:'Russian twist',sets:'3×16–20',load:'KB 12–16kg',rpe:6,detail:'Assis à 45°. Rotation du buste côté droit puis gauche. Contrôle le retour.',transfer:'Obliques rotatifs — force rotation Hyrox + nage'},
  ];
  const el=document.getElementById('muscuContent');
  el.innerHTML=muscuSection('Routine A — Push','Poitrine · Épaules · Triceps · Core · Semaines impaires','green',push)+muscuSection('Routine B — Pull','Dos · Biceps · Rotateurs épaule · Core · Semaines paires','gold',pull)+muscuSection('Routine C — Legs','Ischios · Quadriceps · Mollets · Core · Lundi 8h30 chaque semaine','purple',legs);
}

function muscuSection(title,sub,color,exercises){
  return `<div class="muscu-section-hdr"><div class="msec-title" style="color:var(--${color})">${title}</div><div class="msec-sub">${sub}</div></div>`+exercises.map(e=>`<div class="exercise-card"><div class="ex-name">${e.ex}</div><div class="ex-sets">${e.sets}</div><div class="ex-load">${e.load} · RPE ${e.rpe}/10</div><div class="ex-detail">${e.detail}</div><div class="ex-transfer">→ ${e.transfer}</div></div>`).join('');
}

function renderNage(){
  document.getElementById('nageContent').innerHTML=SWIM_DRILLS.map(d=>`<div class="drill-card"><div class="drill-num">DRILL ${d.num}</div><div class="drill-name">${d.name}</div><div class="drill-vol">${d.vol}</div><div class="drill-exec">${esc(d.exec)}</div><div class="drill-focus">🎯 ${d.focus}</div><div class="drill-error">⚠️ ${d.error}</div></div>`).join('');
}

function renderRef(){
  document.getElementById('refAllures').innerHTML=ALLURES.map(a=>`<div class="ref-row"><span class="ref-zone">${a.label}</span><span class="ref-val ${a.color}">${a.val}/km</span></div>`).join('');
  document.getElementById('refFC').innerHTML=`<div class="ref-row"><span class="ref-zone">FC repos</span><span class="ref-val green">${ATHLETE.fcRepos} bpm</span></div><div class="ref-row"><span class="ref-zone">FC Z2 foncier</span><span class="ref-val green">128–148 bpm</span></div><div class="ref-row"><span class="ref-zone">FC seuil</span><span class="ref-val gold">155–165 bpm</span></div><div class="ref-row"><span class="ref-zone">FC allure course</span><span class="ref-val orange">162–172 bpm</span></div><div class="ref-row"><span class="ref-zone">FC max</span><span class="ref-val red">${ATHLETE.fcMax} bpm</span></div>`;
  document.getElementById('refObjectifs').innerHTML=`<div class="ref-row"><span class="ref-zone">🏁 10k Estérel</span><span class="ref-val orange">Sub 45:00 · 21 Juin</span></div><div class="ref-row"><span class="ref-zone">🏊 Triathlon S</span><span class="ref-val" style="color:var(--blue)">À l'aise · 19 Sept</span></div><div class="ref-row"><span class="ref-zone">🔥 Hyrox Double</span><span class="ref-val" style="color:var(--green)">PR 1:18 · 28 Oct</span></div>`;
}

function registerSW(){if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});}