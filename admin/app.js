/* =========================================================================
   WriteAble Admin — app.js
   Hash-based router with live screening data from the WriteAble backend.
   Patient and screening records shown in the operational UI come from the
   WriteAble backend. No synthetic patient records are created at runtime.
   CSV/JSON export use real Blob downloads; "PDF" export uses the browser's
   native print-to-PDF via a dedicated print stylesheet.
   ========================================================================= */
(function(){
  "use strict";
  const $  = (sel, ctx) => (ctx||document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx||document).querySelectorAll(sel));
  const fmtPct = v => (v*100).toFixed(1)+'%';
  const timeAgo = (d) => {
    if(!d || isNaN(new Date(d).getTime())) return '—';
    const mins = Math.round((new Date() - new Date(d))/60000);
    if(mins<1) return 'just now';
    if(mins<60) return mins+' minute'+(mins===1?'':'s')+' ago';
    const hrs = Math.round(mins/60);
    if(hrs<24) return hrs+' hour'+(hrs===1?'':'s')+' ago';
    const days = Math.round(hrs/24);
    return days+' day'+(days===1?'':'s')+' ago';
  };

  function escapeHtml(value){
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }


  // Real-data store only. The old prototype generator has been removed from the runtime.
  const DB = {
    patients: [],
    screenings: [],
    alerts: [],
    auditLog: [],
    research: [],
    dataQuality: {}
  };

  /* ---------------------------------------------------------------------
     LIVE BACKEND SCREENINGS — Phase B
  --------------------------------------------------------------------- */
  const ADMIN_API_BASE_URL =
  window.WRITEABLE_API_BASE_URL || 'http://localhost:5001/api';
  let liveScreeningsLoaded = false;
  let dashboardRefreshTimer = null;

  function getStoredUser(){
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch(_) {
    return null;
  }
}

async function authenticatedFetch(url, options = {}){
  const token = getAuthToken();

  if(!token){
    throw new Error('Authentication required. Please sign in again.');
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if(response.status === 401){
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    STATE.authenticated = false;
    STATE.user = null;

    throw new Error(
      'Your session has expired. Please sign in again.'
    );
  }

  return response;
}

  async function loadLiveScreenings(force=false){
    if(liveScreeningsLoaded && !force) return DB.screenings;

    const token = getAuthToken();
    if(!token) throw new Error('Authentication required. Please sign in again.');

   const response = await authenticatedFetch(
  `${ADMIN_API_BASE_URL}/screenings`,
  {
    method: 'GET'
  }
);

    if(!response.ok){
      let detail='';
      try { detail=await response.text(); } catch(_) {}
      throw new Error(`Failed to load screenings (${response.status}). ${detail}`.trim());
    }

    const payload=await response.json();
    if(!payload.success || !Array.isArray(payload.data)){
      throw new Error(payload.message || 'Invalid screening response from the server.');
    }

    DB.screenings=payload.data.map(normalizeLiveScreening);
    liveScreeningsLoaded=true;
    return DB.screenings;
  }

  async function loadLivePatients() {

    const response = await authenticatedFetch(
        `${ADMIN_API_BASE_URL}/patients`
    );

    if (!response.ok) {

        throw new Error(
            `Failed to load patients (${response.status})`
        );

    }


    const payload = await response.json();


    if (!payload.success) {

        throw new Error(
            payload.message || "Failed to load patients"
        );

    }


    DB.patients = (payload.data || []).map(
        normalizeLivePatient
    );


    return DB.patients;
}
async function loadLivePatient(patientId) {

    const response =
        await authenticatedFetch(
            `${ADMIN_API_BASE_URL}/patients/${patientId}`
        );


    if (!response.ok) {

        throw new Error(
            `Failed to load patient (${response.status})`
        );

    }


    const payload =
        await response.json();


    if (!payload.success) {

        throw new Error(
            payload.message ||
            'Failed to load patient'
        );

    }


    return payload.data;
}
function normalizeLivePatient(patient) {

    const firstName =
        patient.first_name || "";

    const lastName =
        patient.last_name || "";

    const fullName =
        `${firstName} ${lastName}`.trim();


    const screeningCount =
        Number(patient.screening_count || 0);


    let indicator =
        patient.latest_indicator || null;


    let indicatorLabel =
        "No screening";


    if (indicator === "higher") {

        indicatorLabel =
            "Higher";

    } else if (indicator === "moderate") {

        indicatorLabel =
            "Moderate";

    } else if (indicator === "low") {

        indicatorLabel =
            "Low";

    } else if (indicator === "inconclusive") {

        indicatorLabel =
            "Inconclusive";

    }


    let status =
        patient.latest_screening_status ||
        "not_screened";


    let statusLabel =
        "Not screened";


    if (status === "completed") {

        statusLabel =
            "Completed";

    } else if (status === "in_progress") {

        statusLabel =
            "In progress";

    } else if (status === "pending") {

        statusLabel =
            "Pending";

    }


    return {

        // Real database identity
        id: patient.id,

        patientCode:
            patient.patient_code,

        name:
            fullName || patient.patient_code,

        firstName:
            firstName,

        lastName:
            lastName,

        age:
            patient.age,

        grade:
            patient.grade,

        dominantHand:
            patient.dominant_hand,

        dateOfBirth:
            patient.date_of_birth,

        createdAt:
            patient.created_at,


        // Real screening information
        screeningsCount:
            screeningCount,

        lastScreeningAt:
            patient.last_screening_at,

        lastScreeningLabel:
            patient.last_screening_at
                ? formatAdminDate(patient.last_screening_at)
                : "No screening",

        indicator:
            indicatorLabel,

        indicatorRaw:
            indicator,

        status:
            statusLabel,

        statusRaw:
            status,


        // These deliberately remain neutral.
        // We are NOT generating clinical/progress data.
        progressTrend:
            screeningCount > 0
                ? "Insufficient data"
                : "No data",

        followUp:
            indicator === "higher"
                ? "Review required"
                : "—"
    };
}
function formatAdminDate(value) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (Number.isNaN(date.getTime())) {
        return "—";
    }


    return date.toLocaleDateString(
        undefined,
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
}

  async function loadLiveDashboard(force=false){
    if(STATE.dashboardData && !force) return STATE.dashboardData;

    const response = await authenticatedFetch(
      `${ADMIN_API_BASE_URL}/admin/dashboard`,
      { method: 'GET' }
    );

    if(!response.ok){
      throw new Error(`Failed to load dashboard (${response.status}).`);
    }

    const payload = await response.json();

    if(!payload.success || !payload.data){
      throw new Error(payload.message || 'Invalid dashboard response from the server.');
    }

    STATE.dashboardData = payload.data;
    return STATE.dashboardData;
  }

  function normalizeLiveScreening(s){
  const timestamp = s.started_at || s.created_at || null;

  const date = timestamp
    ? new Date(timestamp)
    : null;

  const validDate =
    date && !isNaN(date.getTime())
      ? date
      : null;

  return {
    // Database identifiers
    id: String(s.id),

    participationId:
      s.participation_id || null,

    patientId:
      s.patient_id ?? s.patientId ?? s.patient?.id ?? null,

    screeningCode:
      s.screening_code || null,

    // Real screening state
    status:
      s.status || 'started',

    startedAt:
      s.started_at || null,

    completedAt:
      s.completed_at || null,

    createdAt:
      s.created_at || null,

    // Real screening result
    overallIndicator:
      s.overall_indicator || null,

    indicatorScore:
      s.indicator_score ?? null,

    modelVersion:
      s.model_version || null,

    // Date helpers for the UI
    date: validDate,

    dateLabel: validDate
      ? fmtDate(validDate)
      : '—',

    dateTimeLabel: validDate
      ? validDate.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })
      : '—',

    daysAgo: validDate
      ? Math.max(
          0,
          (Date.now() - validDate.getTime()) /
            86400000
        )
      : null,

    // Compatibility fields used by older dashboard components.
    // These are deliberately null rather than fabricated.
    type: 'Screening',

    durationMinutes: null,

    completionStatus:
      s.status === 'completed'
        ? 'Completed'
        : 'Incomplete',

    indicator:
      s.overall_indicator || null,

    overallScore:
      s.indicator_score ?? null,

    algorithmVersion:
      s.model_version || null,

    reviewer: null,

    tasks: {},

    followUp: null
  };
}

  const STATE = {
    authenticated:false,
    role:'admin',
    theme:'light',
    sidebarCollapsed:false,
    route:'dashboard',
    routeParam:null,
    failCount:0,
    locked:false,
    dateRange:'30d',
    tableStates:{}, // per-table {page,pageSize,sort,dir,search,filters}
    compareSel:{ patientId:null, a:null, b:null },
    reportPreview:null,
    user:null,
    dashboardData:null,
  };
  const charts = {}; // canvas id -> Chart instance

  function destroyChart(id){ if(charts[id]){ charts[id].destroy(); delete charts[id]; } }
  function makeChart(id, config){ destroyChart(id); const c = $('#'+id); if(!c||!window.Chart) return null; charts[id]=new Chart(c, config); return charts[id]; }

  /* ---------------------------------------------------------------------
     Toasts / Modal / Tooltip
  --------------------------------------------------------------------- */
  function toast(msg, type){
    const stack = $('#toast-stack');
    const t = document.createElement('div');
    t.className = 'toast' + (type?(' '+type):'');
    t.innerHTML = `${icon(type==='error'?'warning':'checkCircle',16)}<span>${msg}</span>`;
    stack.appendChild(t);
    setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity .2s ease'; setTimeout(()=>t.remove(),200); }, 3200);
  }
  function openModal(html){
    $('#modal-content').innerHTML = html;
    $('#modal-overlay').classList.add('is-open');
  }
  function closeModal(){ $('#modal-overlay').classList.remove('is-open'); $('#modal-content').innerHTML=''; }
  document.addEventListener('DOMContentLoaded', () => {
    $('#modal-overlay').addEventListener('click', e => { if(e.target.id==='modal-overlay') closeModal(); });
    document.addEventListener('keydown', e => { if(e.key==='Escape') closeModal(); });
  });
  function confirmAction(title, body, confirmLabel, onConfirm){
    openModal(`
      <div class="modal-head"><h3>${title}</h3><button class="icon-btn" data-close>${icon('close',16)}</button></div>
      <div class="modal-body"><p class="muted" style="margin:0;">${body}</p></div>
      <div class="modal-foot"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="confirm-yes">${confirmLabel}</button></div>`);
    $$('[data-close]').forEach(b=>b.addEventListener('click', closeModal));
    $('#confirm-yes').addEventListener('click', () => { closeModal(); onConfirm(); });
  }

  /* ---------------------------------------------------------------------
     RBAC
  --------------------------------------------------------------------- */
  const PAGE_ACCESS = {
    research: ['superadmin','admin','researcher'],
  };
  function canAccess(routeKey){
    const allowed = PAGE_ACCESS[routeKey];
    return !allowed || allowed.includes(STATE.role);
  }
  function unauthorizedState(){
    return `<div class="card"><div class="state-empty">
      ${icon('lock',44)}
      <h4>You don't have access to this section</h4>
      <p>Your current demo role (<b>${ROLES[STATE.role].label}</b>) doesn't include this permission. Switch roles from the profile menu to preview different access levels.</p>
    </div></div>`;
  }

  /* ---------------------------------------------------------------------
     Badges / small renderers
  --------------------------------------------------------------------- */
  function indicatorBadge(ind){
    const map = { Lower:['badge-lower','Lower indicator'], Moderate:['badge-moderate','Moderate indicator'], Higher:['badge-higher','Higher indicator'], Incomplete:['badge-incomplete','Incomplete'] };
    const [cls,label] = map[ind]||['badge-incomplete',ind];
    return `<span class="badge ${cls}"><span class="dot"></span>${label}</span>`;
  }
  function statusBadge(status){
    const map = { Active:'badge-active', Inactive:'badge-inactive', Pending:'badge-pending' };
    return `<span class="badge ${map[status]||'badge-inactive'}"><span class="dot"></span>${status}</span>`;
  }
  function trendBadge(trend){
    const map = { Improving:['up','trendUp'], Stable:['flat','trendFlat'], 'Needs review':['down','trendDown'], 'Insufficient data':['flat','trendFlat'] };
    const [cls,ic] = map[trend]||['flat','trendFlat'];
    return `<span class="trend ${cls}">${icon(ic,13)}${trend}</span>`;
  }
  function followUpBadge(f){
    const map = { Required:'badge-higher', Overdue:'badge-higher', Scheduled:'badge-moderate', 'Not required':'badge-lower' };
    return `<span class="badge ${map[f]||'badge-incomplete'}"><span class="dot"></span>${f}</span>`;
  }
  function tooltip(text){ return `<span class="tooltip-wrap"><span class="info-dot">i</span><span class="tooltip">${text}</span></span>`; }

  /* ---------------------------------------------------------------------
     KPI card
  --------------------------------------------------------------------- */
  function kpiCard({icon:ic, iconBg, iconColor, num, label, sub, subClass, tip}){
    return `<div class="kpi-card">
      <div class="kpi-top">
        <div class="kpi-icon" style="background:${iconBg}; color:${iconColor};">${icon(ic,18)}</div>
        ${tip?tooltip(tip):''}
      </div>
      <div class="kpi-num">${num}</div>
      <div class="kpi-label">${label}</div>
      ${sub?`<div class="kpi-sub ${subClass||''}">${sub}</div>`:''}
    </div>`;
  }

  /* ---------------------------------------------------------------------
     Generic data table
  --------------------------------------------------------------------- */
  function dataTable(opts){
    // opts: {id, columns:[{key,label,sortable,render}], rows, searchKeys, onRowClick, rowActions, emptyTitle, emptyBody, pageSize}
    const key = opts.id;
    if(!STATE.tableStates[key]) STATE.tableStates[key] = { page:1, pageSize:opts.pageSize||10, sort:opts.defaultSort||null, dir:'asc', search:'' };
    const ts = STATE.tableStates[key];

    function getRows(){
      let rows = opts.rows.slice();
      if(ts.search){
        const q = ts.search.toLowerCase();
        rows = rows.filter(r => (opts.searchKeys||[]).some(k => String(r[k]||'').toLowerCase().includes(q)));
      }
      if(opts.applyFilters) rows = opts.applyFilters(rows);
      if(ts.sort){
        rows.sort((a,b)=>{
          let av=a[ts.sort], bv=b[ts.sort];
          if(av instanceof Date) { av=av.getTime(); bv=bv.getTime(); }
          if(typeof av==='string') return ts.dir==='asc' ? av.localeCompare(bv) : bv.localeCompare(av);
          return ts.dir==='asc' ? (av-bv) : (bv-av);
        });
      }
      return rows;
    }

    function render(){
      const container = $('#'+key+'-mount');
      if(!container) return;
      const allRows = getRows();
      const total = allRows.length;
      const pages = Math.max(1, Math.ceil(total/ts.pageSize));
      ts.page = Math.min(ts.page, pages);
      const start = (ts.page-1)*ts.pageSize;
      const pageRows = allRows.slice(start, start+ts.pageSize);

      if(total===0){
        container.innerHTML = `<div class="state-empty">${icon('search',44)}<h4>${opts.emptyTitle||'No results found'}</h4><p>${opts.emptyBody||'Try adjusting your search or filters.'}</p></div>`;
        return;
      }
      container.innerHTML = `
        <div class="table-wrap"><table class="data-table">
          <thead><tr>${opts.columns.map(c=>`
            <th class="${c.sortable?'':'no-sort'}" data-key="${c.key}">${c.label}${ts.sort===c.key?`<span class="arrow">${ts.dir==='asc'?'↑':'↓'}</span>`:''}</th>`).join('')}
            ${opts.rowActions?'<th class="no-sort">Actions</th>':''}
          </tr></thead>
          <tbody>${pageRows.map(r => `
            <tr data-id="${r.id||r.anonId}">${opts.columns.map(c=>`<td>${c.render?c.render(r):(r[c.key]!=null?r[c.key]:'—')}</td>`).join('')}
            ${opts.rowActions?`<td><div class="row-actions">${opts.rowActions(r)}</div></td>`:''}
            </tr>`).join('')}
          </tbody>
        </table></div>
        <div class="pagination">
          <span>Showing ${total?start+1:0}–${Math.min(start+ts.pageSize,total)} of ${total}</span>
          <div class="pagination-btns">
            <button data-pg="prev" ${ts.page===1?'disabled':''}>${icon('chevronLeft',14)}</button>
            <span style="padding:0 10px; display:flex; align-items:center;">Page ${ts.page} of ${pages}</span>
            <button data-pg="next" ${ts.page===pages?'disabled':''}>${icon('chevronRight',14)}</button>
          </div>
        </div>`;
      $$('th[data-key]', container).forEach(th => th.addEventListener('click', () => {
        const k = th.dataset.key; const col = opts.columns.find(c=>c.key===k);
        if(!col || !col.sortable) return;
        if(ts.sort===k) ts.dir = ts.dir==='asc'?'desc':'asc'; else { ts.sort=k; ts.dir='asc'; }
        render();
      }));
      $$('button[data-pg]', container).forEach(b => b.addEventListener('click', () => { ts.page += b.dataset.pg==='next'?1:-1; render(); }));
      if(opts.onRowClick){
        $$('tbody tr', container).forEach(tr => tr.addEventListener('click', (e) => {
          if(e.target.closest('[data-noRowClick]')) return;
          opts.onRowClick(tr.dataset.id);
        }));
      }
      if(opts.wireActions) opts.wireActions(container, render);
    }
    return { mountHtml:`<div id="${key}-mount"></div>`, render, tableState:ts };
  }

  /* ---------------------------------------------------------------------
     Router
  --------------------------------------------------------------------- */
  const ROUTES = {
    dashboard:  () => pageDashboard(),
    patients:   (id) => id ? pagePatientProfile(id) : pagePatients(),
    screenings: (id) => id ? pageScreeningDetail(id) : pageScreenings(),
    progress:   () => pageProgress(),
    analytics:  (tab) => pageAnalytics(tab||'trends'),
    alerts:     () => pageAlerts(),
    reports:    () => pageReports(),
    research:   () => pageResearch(),
    settings:   (tab) => pageSettings(tab||'account'),
  };
  const TITLES = { dashboard:'Dashboard', patients:'Patients', screenings:'Screenings', progress:'Progress Monitoring', analytics:'Analytics', alerts:'Alerts', reports:'Reports', research:'Research Data', settings:'Settings' };

  function parseHash(){
    const h = (location.hash||'#/dashboard').replace(/^#\//,'');
    const parts = h.split('/').filter(Boolean);
    return { section: parts[0]||'dashboard', param: parts[1]||null };
  }
  function navigate(hash){ location.hash = hash; }
  window.navigate = navigate;

  function renderRoute(){ return renderRoute2(); }
  function notFound(){ return `<div class="state-empty">${icon('warning',44)}<h4>Page not found</h4><p>That section doesn't exist in this prototype yet.</p></div>`; }
  function skeletonPage(){
    return `<div class="grid grid-4" style="margin-bottom:20px;">${[1,2,3,4].map(()=>`<div class="skeleton" style="height:96px; border-radius:12px;"></div>`).join('')}</div>
      <div class="skeleton" style="height:320px; border-radius:12px;"></div>`;
  }
  function wireGlobalTooltipsAndCharts(){ /* placeholder for future global wiring */ }

  /* ---------------------------------------------------------------------
     DASHBOARD
  --------------------------------------------------------------------- */
  function rangeDays(){ return { today:1, '7d':7, '30d':30, '3m':90 }[STATE.dateRange] || 30; }
  function inRange(daysAgoVal){ return daysAgoVal <= rangeDays(); }

  function pageDashboard(){
    const dashboard = STATE.dashboardData || { kpis:{}, recentScreenings:[] };
    const kpis = dashboard.kpis || {};
    const totalPatients = Number(kpis.totalPatients || 0);
    const totalScreenings = Number(kpis.totalScreenings || 0);
    const now = new Date();
    const screeningsThisMonth = Number(kpis.screeningsThisMonth || 0);
    const followUps = Number(kpis.followUpsRequired || 0);
    const higherRisk = Number(kpis.higherIndicatorResults || 0);
    const completed = Number(kpis.completedScreenings || 0);
    const recent = Array.isArray(dashboard.recentScreenings)
      ? dashboard.recentScreenings.slice(0,4)
      : [];

    return `
      <div class="page-header">
        <div><h1>Good morning, Administrator</h1><p class="muted">Here's an overview of screening activity and patient progress.</p></div>
        <div class="page-actions">
          <div class="date-range-btns" id="date-range-btns">
            ${[['today','Today'],['7d','Last 7 days'],['30d','Last 30 days'],['3m','Last 3 months']].map(([k,l])=>`<button data-range="${k}" class="${STATE.dateRange===k?'is-active':''}">${l}</button>`).join('')}
          </div>
          <select class="select" id="org-filter"><option>All organizations</option>${SCHOOLS.map(s=>`<option>${s}</option>`).join('')}</select>
          <button class="btn btn-outline btn-sm" id="btn-refresh-dashboard">Refresh</button>
        </div>
      </div>

      <div class="grid grid-3" style="grid-template-columns:repeat(6,1fr); margin-bottom:24px;">
        ${kpiCard({icon:'patients', iconBg:'var(--sky)', iconColor:'var(--blue)', num:totalPatients.toLocaleString(), label:'Total Patients', sub:'+8.4% this month', subClass:'trend up', tip:'Total number of registered screening participants currently in the platform.'})}
        ${kpiCard({icon:'screenings', iconBg:'var(--teal-100)', iconColor:'var(--teal-600)', num:totalScreenings.toLocaleString(), label:'Total Screenings', sub:'All-time completed and incomplete records', tip:'All screening sessions ever recorded, including incomplete ones.'})}
        ${kpiCard({icon:'calendar', iconBg:'var(--mint)', iconColor:'var(--teal-600)', num:screeningsThisMonth.toLocaleString(), label:'Screenings This Month', sub:fmtDate(now).split(',')[0]+' activity', tip:'Screenings recorded so far in the current calendar month.'})}
        ${kpiCard({icon:'alerts', iconBg:'var(--amber-100)', iconColor:'var(--amber)', num:followUps.toLocaleString(), label:'Follow-ups Required', sub:'Higher screening indicators for review', tip:'Screenings with a higher indicator. This is not a diagnosis.'})}
        ${kpiCard({icon:'warning', iconBg:'var(--rust-100)', iconColor:'var(--rust)', num:higherRisk.toLocaleString(), label:'Higher-Indicator Results', sub:'Screenings requiring further review — not a diagnosis', tip:'Screenings whose observed indicators were classified in the higher range. This reflects screening output, not a clinical diagnosis.'})}
        ${kpiCard({icon:'checkCircle', iconBg:'var(--green-100)', iconColor:'var(--green)', num:completed.toLocaleString(), label:'Completed Assessments', sub:totalScreenings ? fmtPct(completed/totalScreenings)+' completion rate' : 'No completed assessments yet', tip:'Screenings that were fully completed by the participant.'})}
      </div>

      <div class="grid grid-2" style="grid-template-columns:1.6fr 1fr; margin-bottom:20px; align-items:stretch;">
        <div class="card card-pad">
          <div class="card-head">
            <h3>Screening Activity Over Time ${tooltip('Total, completed and follow-up screenings recorded per period.')}</h3>
            <div class="date-range-btns" id="activity-granularity">
              <button data-g="daily" class="is-active">Daily</button><button data-g="weekly">Weekly</button><button data-g="monthly">Monthly</button>
            </div>
          </div>
          <canvas id="chart-activity" height="110"></canvas>
        </div>
        <div class="card card-pad">
          <h3 style="margin-bottom:14px;">Screening Outcome Distribution ${tooltip('Screening indicator categories — not medical diagnoses.')}</h3>
          <canvas id="chart-outcome" height="170"></canvas>
        </div>
      </div>

      <div class="grid grid-2" style="grid-template-columns:1.6fr 1fr;">
        <div class="card card-pad">
          <h3 style="margin-bottom:14px;">Age Distribution ${tooltip('Number of screened children by age group. Use to filter dashboard scope.')}</h3>
          <canvas id="chart-age" height="110"></canvas>
        </div>
        <div class="card card-pad">
          <div class="card-head"><h3>Recent Screening Activity</h3></div>
          <div style="display:flex; flex-direction:column; gap:14px;">
            ${recent.length ? recent.map(r => `
              <div style="display:flex; justify-content:space-between; gap:10px; padding-bottom:12px; border-bottom:1px solid var(--line-soft);">
                <div><div style="font-weight:600; font-size:0.85rem;">${r.participation_id || r.screening_code || `Screening #${r.id}`}</div><div class="muted" style="font-size:0.8rem;">${r.status === 'completed' ? 'Screening completed' : 'Screening in progress'}</div></div>
                <div class="muted" style="font-size:0.76rem; white-space:nowrap;">${timeAgo(r.started_at)}</div>
              </div>`).join('') : '<div class="muted" style="font-size:0.85rem;">No live screening activity yet.</div>'}
          </div>
        </div>
      </div>
    `;
  }

  function initDashboardCharts(){
    if(!$('#chart-activity')) return;
    function buildActivity(granularity){
      const buckets = {};
      const bucketsOf = s => {
        if(granularity==='daily') return Math.floor(s.daysAgo);
        if(granularity==='weekly') return Math.floor(s.daysAgo/7);
        return s.date.getFullYear()+'-'+s.date.getMonth();
      };
      const span = granularity==='daily'?21:(granularity==='weekly'?12:9);
      const labels = [];
      const totalArr=[], completeArr=[], followArr=[];
      for(let i=span-1;i>=0;i--){
        let label, matcher;
        if(granularity==='daily'){ const d=daysAgo(i); label=d.toLocaleDateString('en-US',{month:'short',day:'numeric'}); matcher = s=>Math.floor(s.daysAgo)===i; }
        else if(granularity==='weekly'){ label='Wk -'+i; matcher = s=>Math.floor(s.daysAgo/7)===i; }
        else { const d=new Date(); d.setMonth(d.getMonth()-i); label=d.toLocaleDateString('en-US',{month:'short'}); matcher = s=> s.date && s.date.getFullYear()===d.getFullYear() && s.date.getMonth()===d.getMonth(); }
        const subset = DB.screenings.filter(matcher);
        labels.push(label);
        totalArr.push(subset.length);
        completeArr.push(subset.filter(s=>s.completionStatus==='Completed').length);
        followArr.push(subset.filter(s=>s.followUp==='Required'||s.followUp==='Overdue').length);
      }
      return { labels, totalArr, completeArr, followArr };
    }
    function render(granularity){
      const { labels, totalArr, completeArr, followArr } = buildActivity(granularity);
      makeChart('chart-activity', { type:'bar', data:{ labels, datasets:[
        { label:'Total screenings', data:totalArr, backgroundColor:'#B7DAD6', borderRadius:3 },
        { label:'Completed', data:completeArr, backgroundColor:'#2C8C88', borderRadius:3 },
        { type:'line', label:'Follow-up required', data:followArr, borderColor:'#B8622C', backgroundColor:'#B8622C', tension:0.3, pointRadius:2 },
      ]}, options:{ responsive:true, interaction:{mode:'index',intersect:false}, plugins:{ legend:{position:'bottom'} }, scales:{ y:{ beginAtZero:true } } } });
    }
    render('daily');
    $$('#activity-granularity button').forEach(b => b.addEventListener('click', () => { $$('#activity-granularity button').forEach(x=>x.classList.remove('is-active')); b.classList.add('is-active'); render(b.dataset.g); }));

    const outcomeCounts = { Lower:0, Moderate:0, Higher:0, Incomplete:0 };
    DB.screenings.forEach(s => outcomeCounts[s.indicator]++);
    makeChart('chart-outcome', { type:'doughnut', data:{ labels:['Lower indicator','Moderate indicator','Higher indicator','Incomplete'], datasets:[{ data:Object.values(outcomeCounts), backgroundColor:['#2C8C88','#9A7B22','#B8622C','#94A3B8'] }] }, options:{ plugins:{ legend:{position:'bottom', labels:{boxWidth:10,font:{size:11}}} }, cutout:'62%' } });

    const ageGroups = { '5–6':0,'7–8':0,'9–10':0,'11–12':0,'13+':0 };
    DB.patients.forEach(p => {
      const a=p.age;
      const g = a<=6?'5–6':a<=8?'7–8':a<=10?'9–10':a<=12?'11–12':'13+';
      ageGroups[g]++;
    });
    makeChart('chart-age', { type:'bar', data:{ labels:Object.keys(ageGroups), datasets:[{ label:'Patients', data:Object.values(ageGroups), backgroundColor:'#2C8C88', borderRadius:4 }] }, options:{ plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} } });

    $$('#date-range-btns button').forEach(b => b.addEventListener('click', () => { STATE.dateRange = b.dataset.range; renderRoute(); }));
  }

  /* ---------------------------------------------------------------------
     SCREENINGS
     Real screening records only. No prototype/synthetic rows.
  --------------------------------------------------------------------- */
  function screeningIndicatorValue(s){
    const raw = String(s?.overallIndicator || s?.indicator || '').toLowerCase();
    if(raw.includes('higher')) return 'Higher';
    if(raw.includes('moderate')) return 'Moderate';
    if(raw.includes('low') || raw.includes('lower')) return 'Lower';
    return s?.status === 'completed' ? 'Inconclusive' : 'Incomplete';
  }

  function pageScreenings(){
    const rows = DB.screenings.slice().sort((a,b)=>{
      const ad=a.date instanceof Date ? a.date.getTime() : 0;
      const bd=b.date instanceof Date ? b.date.getTime() : 0;
      return bd-ad;
    });
    const table = dataTable({
      id:'screenings-table',
      pageSize:10,
      defaultSort:'dateLabel',
      columns:[
        {key:'id',label:'Screening ID',sortable:true,render:r=>`<span class="cell-id">${escapeHtml(r.id)}</span>`},
        {key:'participationId',label:'Participation ID',sortable:true,render:r=>escapeHtml(r.participationId || r.screeningCode || '—')},
        {key:'dateLabel',label:'Date',sortable:true,render:r=>escapeHtml(r.dateTimeLabel || r.dateLabel || '—')},
        {key:'status',label:'Status',sortable:true,render:r=>escapeHtml(String(r.status || '—').replace(/_/g,' '))},
        {key:'overallIndicator',label:'Indicator',sortable:true,render:r=>indicatorBadge(screeningIndicatorValue(r))},
        {key:'modelVersion',label:'Model',sortable:true,render:r=>escapeHtml(r.modelVersion || '—')}
      ],
      rows,
      searchKeys:['id','participationId','screeningCode','status','overallIndicator','modelVersion'],
      onRowClick:id=>navigate('/screenings/'+id),
      rowActions:r=>`<button class="icon-btn" data-noRowClick data-screening-id="${escapeHtml(r.id)}" title="View screening">${icon('eye',15)}</button>`,
      wireActions:container=>$$('[data-screening-id]',container).forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();navigate('/screenings/'+b.dataset.screeningId);})),
      emptyTitle:'No screening records',
      emptyBody:'No real screening records were returned by the WriteAble backend.'
    });
    window.__screeningsTable=table;
    return `
      <div class="page-header">
        <div><h1>Screenings</h1><p class="muted">Screening sessions returned by the WriteAble backend.</p></div>
        <div class="page-actions"><button class="btn btn-outline btn-sm" id="btn-refresh-screenings">${icon('refresh',15)} Refresh</button></div>
      </div>
      <div class="card card-pad">
        <div class="toolbar">
          <div class="search-input">${icon('search',15)}<input type="text" id="screenings-search" placeholder="Search screening or participation ID…"></div>
          <div class="spacer"></div>
          <span class="muted" style="font-size:.8rem;">${rows.length} screening${rows.length===1?'':'s'}</span>
        </div>
        ${table.mountHtml}
      </div>`;
  }

  function pageScreeningDetail(id){
    const s=DB.screenings.find(x=>String(x.id)===String(id));
    if(!s) return notFound();
    const indicator=screeningIndicatorValue(s);
    const score=reportIndicatorScore(s.indicatorScore);
    return `
      <div class="page-header">
        <div>
          <p class="muted mono" style="margin-bottom:2px;font-size:.78rem;">SCREENING ${escapeHtml(s.id)}</p>
          <h1>Screening detail</h1>
          <p class="muted">Complete screening record from the WriteAble backend.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-ghost btn-sm" id="screening-back">← Back</button>
          <button class="btn btn-primary btn-sm" id="btn-open-admin-report">View Full Report</button>
        </div>
      </div>

      <div id="screening-detail-content">
        <div class="grid grid-5 screening-detail-kpis" style="margin-bottom:20px;">
          ${kpiCard({num:escapeHtml(String(s.status||'—').replace(/_/g,' ')),label:'Status'})}
          ${kpiCard({num:escapeHtml(indicator),label:'Screening indicator'})}
          ${kpiCard({num:escapeHtml(s.modelVersion||'—'),label:'Model version'})}
          ${kpiCard({num:escapeHtml(score),label:'Indicator score'})}
          ${kpiCard({num:'—',label:'Analyzed tasks'})}
        </div>

        <div class="card card-pad screening-detail-loading">
          <div class="state-empty">
            ${icon('refresh',34)}
            <h4>Loading screening evidence…</h4>
            <p>Retrieving the participant, handwriting samples, predictions, interpretation and recommendations for this screening.</p>
          </div>
        </div>
      </div>`;
  }

  function wireScreeningsPage(){
    const table=window.__screeningsTable; if(!table) return;
    table.render();
    $('#screenings-search')?.addEventListener('input',e=>{table.tableState.search=e.target.value;table.tableState.page=1;table.render();});
    $('#btn-refresh-screenings')?.addEventListener('click',async()=>{
      try{ liveScreeningsLoaded=false; await loadLiveScreenings(true); renderRoute2(); }
      catch(error){ console.error('Screening refresh failed:',error); toast(error.message||'Failed to refresh screenings','error'); }
    });
  }

  async function wireScreeningDetail(id){
    $('#screening-back')?.addEventListener('click',()=>navigate('/screenings'));
    $('#btn-open-admin-report')?.addEventListener('click',()=>openAdminScreeningReport(id));

    try{
      const report = await loadScreeningReport(id);
      await renderScreeningDetail(id, report);
    }catch(error){
      console.error('Screening detail report error:', error);
      const host=$('#screening-detail-content');
      if(host){
        host.innerHTML=`<div class="card card-pad"><div class="state-empty">
          ${icon('warning',40)}
          <h4>Unable to load screening evidence</h4>
          <p>${escapeHtml(error.message||'The screening report could not be loaded.')}</p>
          <button class="btn btn-primary btn-sm" id="retry-screening-detail">Try again</button>
        </div></div>`;
        $('#retry-screening-detail')?.addEventListener('click',()=>wireScreeningDetail(id));
      }
    }
  }

  function getReportModelVersion(report){
    if(report?.screening?.model_version) return String(report.screening.model_version);
    const versions=(report?.tasks||[]).map(t=>t?.prediction?.model_version).filter(Boolean).map(String);
    if(!versions.length) return '—';
    const unique=[...new Set(versions)];
    return unique.length===1 ? unique[0] : unique.join(', ');
  }

  function getReportPatient(report){
    return report?.patient || report?.participant || report?.screening?.patient || null;
  }

  function reportTaskResultClass(prediction){
    const label=reportPredictionLabel(prediction).toLowerCase();
    if(label.includes('potential dysgraphia') && !label.includes('low potential')) return 'potential';
    if(label.includes('low potential')) return 'low';
    return 'neutral';
  }

  async function renderScreeningDetail(id, report){
    const host=$('#screening-detail-content');
    if(!host) return;

    const screening=report?.screening||{};
    const interpretation=report?.interpretation||{};
    const patient=getReportPatient(report);
    const tasks=Array.isArray(report?.tasks)?report.tasks:[];
    const modelVersion=getReportModelVersion(report);
    const score=reportIndicatorScore(screening.indicator_score);
    const indicator=interpretation.indicator || screening.overall_indicator || 'inconclusive';
    const status=screening.status || DB.screenings.find(x=>String(x.id)===String(id))?.status || '—';
    const participantCode=patient?.patient_code || screening.patient_code || '—';
    const participantName=[patient?.first_name,patient?.last_name].filter(Boolean).join(' ') || patient?.name || '—';
    const started=formatAdminReportDate(screening.started_at);
    const completed=formatAdminReportDate(screening.completed_at);
    const analyzed=Number(interpretation.evidence_count||0);
    const potential=Number(interpretation.potential_count||0);
    const low=Number(interpretation.low_count||0);
    const completedTasks=tasks.filter(t=>t?.prediction).length;

    host.innerHTML=`
      <div class="grid grid-5 screening-detail-kpis" style="margin-bottom:20px;">
        ${kpiCard({num:escapeHtml(String(status).replace(/_/g,' ')),label:'Status'})}
        ${kpiCard({num:escapeHtml(formatAdminIndicator(indicator)),label:'Screening indicator'})}
        ${kpiCard({num:escapeHtml(modelVersion),label:'Model version'})}
        ${kpiCard({num:escapeHtml(score),label:'Indicator score'})}
        ${kpiCard({num:escapeHtml(String(analyzed)),label:'Analyzed tasks'})}
      </div>

      <div class="screening-detail-grid">
        <section class="card card-pad screening-detail-card screening-participant-card">
          <div class="screening-detail-section-head">
            <div><span class="screening-detail-icon">${icon('users',18)}</span><div><h3>Participant information</h3><p class="muted">Information attached to this screening session.</p></div></div>
            ${patient?.id ? `<button class="btn btn-outline btn-sm" id="screening-view-patient">View Patient</button>` : ''}
          </div>
          <div class="screening-info-grid">
            <div><span>Participant ID</span><strong>${escapeHtml(participantCode)}</strong></div>
            <div><span>Screening ID</span><strong>${escapeHtml(String(screening.id||id))}</strong></div>
            <div><span>Participation ID</span><strong>${escapeHtml(screening.participation_id||'—')}</strong></div>
            <div><span>Name</span><strong>${escapeHtml(participantName)}</strong></div>
            <div><span>Date of birth</span><strong>${escapeHtml(patient?.date_of_birth || patient?.dateOfBirth || '—')}</strong></div>
            <div><span>Age at screening</span><strong>${escapeHtml(patient?.age_at_screening ?? patient?.age ?? '—')}</strong></div>
            <div><span>Gender</span><strong>${escapeHtml(patient?.gender || '—')}</strong></div>
            <div><span>Started</span><strong>${escapeHtml(started)}</strong></div>
            <div><span>Completed</span><strong>${escapeHtml(completed)}</strong></div>
            <div><span>Tasks completed</span><strong>${completedTasks} / ${tasks.length}</strong></div>
          </div>
        </section>

        <section class="card card-pad screening-detail-card">
          <div class="screening-detail-section-head"><div><span class="screening-detail-icon">${icon('chart',18)}</span><div><h3>Screening indicator & model</h3><p class="muted">Results derived from analyzed handwriting task outputs.</p></div></div></div>
          <div class="screening-indicator-panel ${escapeHtml(indicator)}">
            <div><span>Overall screening indicator</span><strong>${escapeHtml(formatAdminIndicator(indicator))}</strong></div>
            <span class="screening-indicator-status">${analyzed} analyzed task${analyzed===1?'':'s'}</span>
          </div>
          <div class="screening-result-list">
            <div><span>Indicator score</span><strong>${escapeHtml(score)}</strong></div>
            <div><span>Model version</span><strong>${escapeHtml(modelVersion)}</strong></div>
            <div><span>Potential Dysgraphia classifications</span><strong>${potential}</strong></div>
            <div><span>Low Potential Dysgraphia classifications</span><strong>${low}</strong></div>
          </div>
          <div class="screening-score-note">Indicator score is only displayed when it is stored by the screening service. A missing value is shown as <strong>Not calculated</strong>; it is not replaced with a fabricated score.</div>
        </section>
      </div>

      <div class="screening-detail-grid screening-detail-grid-bottom">
        <section class="card card-pad screening-detail-card screening-evidence-card">
          <div class="screening-detail-section-head"><div><span class="screening-detail-icon">${icon('image',18)}</span><div><h3>Handwriting evidence & model predictions</h3><p class="muted">Actual handwriting samples and predictions returned for this screening.</p></div></div></div>
          <div id="screening-detail-evidence" class="screening-detail-evidence">
            ${tasks.length ? tasks.map((t,i)=>`<article class="screening-evidence-item" data-task-index="${i}">
              <div class="screening-evidence-head"><div><span class="mono">TASK ${i+1}</span><h4>${escapeHtml(t.title||`Task ${t.id||i+1}`)}</h4></div><span class="admin-prediction-badge ${reportTaskResultClass(t.prediction)}">${escapeHtml(reportPredictionLabel(t.prediction))}</span></div>
              <div class="screening-evidence-body"><div class="screening-evidence-images" data-images-for="${i}"><div class="screening-image-loading">Loading handwriting image…</div></div><div class="screening-prediction-grid">
                <div><span>Probability</span><strong>${adminReportPercentage(t.prediction?.probability)}</strong></div>
                <div><span>Confidence</span><strong>${adminReportPercentage(t.prediction?.confidence)}</strong></div>
                <div><span>Model</span><strong>${escapeHtml(t.prediction?.model_name||'—')}</strong></div>
                <div><span>Model version</span><strong>${escapeHtml(t.prediction?.model_version||modelVersion)}</strong></div>
              </div></div>
            </article>`).join('') : `<div class="state-empty"><h4>No screening tasks recorded</h4><p>No handwriting evidence was returned for this screening.</p></div>`}
          </div>
        </section>

        <div class="screening-detail-side">
          <section class="card card-pad screening-detail-card">
            <div class="screening-detail-section-head"><div><span class="screening-detail-icon">${icon('file',18)}</span><div><h3>Interpretation</h3><p class="muted">Model-based screening interpretation.</p></div></div></div>
            <div class="screening-interpretation"><p>${escapeHtml(interpretation.explanation||'No interpretation explanation is available.')}</p></div>
            <p class="screening-disclaimer-inline">This is a screening indicator from the deployed model, not a clinical diagnosis or definitive assessment.</p>
          </section>

          <section class="card card-pad screening-detail-card">
            <div class="screening-detail-section-head"><div><span class="screening-detail-icon">${icon('lightbulb',18)}</span><div><h3>Recommendations</h3><p class="muted">Recommendations returned for this screening.</p></div></div></div>
            <div class="screening-recommendations">${(report?.recommendations||[]).length ? (report.recommendations||[]).map((r,i)=>`<div class="screening-recommendation"><span>${i+1}</span><div><strong>${escapeHtml(r.title||'Recommendation')}</strong><p>${escapeHtml(r.description||'')}</p></div></div>`).join('') : '<p class="muted">No recommendations were returned.</p>'}</div>
          </section>
        </div>
      </div>`;

    if(patient?.id) $('#screening-view-patient')?.addEventListener('click',()=>navigate('/patients/'+patient.id));

    for(let i=0;i<tasks.length;i++){
      const container=document.querySelector(`[data-images-for="${i}"]`);
      if(!container) continue;
      const images=Array.isArray(tasks[i]?.images)?tasks[i].images:[];
      if(!images.length){ container.innerHTML='<div class="screening-no-image">No handwriting image recorded.</div>'; continue; }
      const parts=[];
      for(const image of images){
        try{
          const url=await loadAuthenticatedImage(image.id);
          parts.push(`<figure class="screening-detail-image"><img src="${url}" alt="Handwriting sample for ${escapeHtml(tasks[i].title||'screening task')}"><figcaption>${escapeHtml(image.original_filename||'Handwriting sample')}</figcaption></figure>`);
        }catch(error){
          console.error('Screening detail image error:',error);
          parts.push('<div class="screening-no-image">Unable to load handwriting image.</div>');
        }
      }
      container.innerHTML=parts.join('');
    }
  }

  /* ---------------------------------------------------------------------
     PATIENTS
  --------------------------------------------------------------------- */
  let patientFilters = { indicator:'all', followUp:'all', school:'all', status:'all', ageMin:'', ageMax:'', grade:'all', professional:'all' };

  function pagePatients(){
    const table = dataTable({
      id:'patients-table',
      pageSize:10,
      defaultSort:'id',
      columns:[
        { key:'patientCode', label:'Patient Code', sortable:true, render:r=>`<span class="cell-id">${escapeHtml(r.patientCode || '—')}</span>` },
        { key:'name', label:'Name', sortable:true, render:r=>escapeHtml(r.name || '—') },
        { key:'age', label:'Age', sortable:true, render:r=>escapeHtml(r.age ?? '—') },
        { key:'grade', label:'Grade', sortable:true, render:r=>escapeHtml(r.grade || '—') },
        { key:'dominantHand', label:'Hand', sortable:true, render:r=>escapeHtml(r.dominantHand || '—') },
        { key:'screeningsCount', label:'Screenings', sortable:true, render:r=>escapeHtml(r.screeningsCount ?? 0) },
        { key:'lastScreeningLabel', label:'Last Screening', sortable:true, render:r=>escapeHtml(r.lastScreeningLabel || 'No screening') },
        { key:'indicator', label:'Indicator', sortable:true, render:r=>indicatorBadge(r.indicator || 'No screening') },
        { key:'status', label:'Latest Screening Status', sortable:true, render:r=>`<span class="muted">${escapeHtml(r.status || 'Not screened')}</span>` }
      ],
      rows: DB.patients,
      searchKeys:['id','patientCode','name','firstName','lastName','grade'],
      onRowClick:id=>navigate('/patients/'+id),
      rowActions:r=>`
        <button class="icon-btn" data-noRowClick data-act="view" data-id="${escapeHtml(r.id)}" title="View patient">${icon('eye',15)}</button>
        <button class="icon-btn" data-noRowClick data-act="report" data-id="${escapeHtml(r.id)}" title="Generate report">${icon('reports',15)}</button>`,
      wireActions:container=>{
        $$('button[data-act]',container).forEach(b=>b.addEventListener('click',e=>{
          e.stopPropagation();
          const id=b.dataset.id;
          if(b.dataset.act==='view') navigate('/patients/'+id);
          if(b.dataset.act==='report') openReportModal('individual',id);
        }));
      },
      emptyTitle:'No registered patients',
      emptyBody:'No real patient records were returned by the WriteAble backend.'
    });
    window.__patientsTable=table;

    return `
      <div class="page-header">
        <div><h1>Patients</h1><p class="muted">Registered participants from the WriteAble database.</p></div>
        <div class="page-actions">
          <button class="btn btn-outline btn-sm" id="btn-refresh-patients">${icon('refresh',15)} Refresh</button>
          <button class="btn btn-outline btn-sm" id="btn-export-patients">${icon('download',15)} Export</button>
        </div>
      </div>
      <div class="card card-pad">
        <div class="toolbar">
          <div class="search-input">${icon('search',15)}<input type="text" id="patients-search" placeholder="Search real patients by name, code or ID…"></div>
          <div class="spacer"></div>
          <span class="muted" style="font-size:.8rem;">${DB.patients.length} registered patient${DB.patients.length===1?'':'s'}</span>
        </div>
        ${table.mountHtml}
      </div>`;
  }

  function wirePatientsPage(){
    const table=window.__patientsTable; if(!table) return;
    table.render();
    $('#patients-search')?.addEventListener('input',e=>{ table.tableState.search=e.target.value; table.tableState.page=1; table.render(); });
    $('#btn-export-patients')?.addEventListener('click',exportPatientsCSV);
    $('#btn-refresh-patients')?.addEventListener('click',async()=>{
      try{
        await loadLivePatients();
        renderRoute2();
      }catch(error){
        console.error('Patient refresh failed:',error);
        toast(error.message || 'Failed to refresh patients','error');
      }
    });
  }

  function openAdvancedFiltersModal(){
    toast('Patient filters are now limited to real backend fields. Use search to find a registered participant.');
  }
  function openAddPatientModal(){
    openModal(`
      <div class="modal-head"><h3>Register patient</h3><button class="icon-btn" data-close>${icon('close',16)}</button></div>
      <div class="modal-body">
        <div class="state-empty" style="padding:28px 12px;">
          ${icon('users',40)}
          <h4>Patient registration belongs to the real backend</h4>
          <p>This Admin page no longer creates or stores demo patients. Register the participant through the WriteAble registration workflow so the record is persisted in MySQL and appears here automatically.</p>
        </div>
      </div>
      <div class="modal-foot"><button class="btn btn-primary" data-close>Close</button></div>`);
    $$('[data-close]').forEach(b=>b.addEventListener('click',closeModal));
  }
  function openAddNoteModal(patientId){
    openModal(`
      <div class="modal-head"><h3>Add note — Patient #${patientId}</h3><button class="icon-btn" data-close>${icon('close',16)}</button></div>
      <div class="modal-body">
        <div class="form-field"><label>Note</label><textarea class="input" id="note-text" rows="4" style="width:100%; resize:vertical;" placeholder="Add an observation or context for other reviewers…"></textarea></div>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="save-note">Save note</button></div>`);
    $$('[data-close]').forEach(b=>b.addEventListener('click', closeModal));
    $('#save-note').addEventListener('click', () => {
      const text = $('#note-text').value.trim();
      const p = DB.patients.find(p=>p.id===patientId);
      if(text && p){ p.notes = p.notes||[]; p.notes.unshift({ text, author:ADMIN_STAFF[0], date:new Date() }); }
      closeModal(); toast('Note added'); if(STATE.route==='patients' && STATE.routeParam===patientId) renderRoute();
    });
  }
  function exportPatientsCSV(){
    const cols = ['id','name','age','grade','school','lastScreeningLabel','indicator','progressTrend','followUp','status'];
    downloadCSV('patients-export.csv', cols, DB.patients);
    toast('Patient export downloaded (CSV)');
  }
  function downloadCSV(filename, cols, rows){
    const header = cols.join(',');
    const lines = rows.map(r => cols.map(c => `"${String(r[c]!=null?r[c]:'').replace(/"/g,'""')}"`).join(','));
    const blob = new Blob([header+'\n'+lines.join('\n')], { type:'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
  }
  function downloadJSON(filename, data){
    const blob = new Blob([JSON.stringify(data,null,2)], { type:'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
  }

  /* ---------------------------------------------------------------------
     PATIENT PROFILE
  --------------------------------------------------------------------- */
  let profileTab = 'overview';

  function getPatientScreenings(patient){
    const id=String(patient?.id ?? '');
    return DB.screenings.filter(s=>String(s.patientId ?? '')===id);
  }

  function pagePatientProfile(id){
    const p=DB.patients.find(x=>String(x.id)===String(id));
    if(!p) return notFound();
    const screenings=getPatientScreenings(p);
    const latest=screenings[0] || null;
    return `
      <div class="page-header">
        <div>
          <p class="muted mono" style="margin-bottom:2px;font-size:.78rem;">PATIENT ${escapeHtml(p.patientCode || p.id)}</p>
          <h1>${escapeHtml(p.name || 'Unnamed patient')}</h1>
          <p class="muted">Real participant record from the WriteAble backend.</p>
        </div>
        <div class="page-actions"><button class="btn btn-ghost btn-sm" id="patient-back">← Back</button></div>
      </div>

      <div class="grid grid-4" style="margin-bottom:20px;">
        ${kpiCard({num:p.age ?? '—',label:'Age'})}
        ${kpiCard({num:p.grade || '—',label:'Grade'})}
        ${kpiCard({num:p.dominantHand || '—',label:'Dominant hand'})}
        ${kpiCard({num:p.screeningsCount ?? 0,label:'Screenings'})}
      </div>

      <div class="card card-pad" style="margin-bottom:20px;">
        <h3 style="margin-bottom:14px;">Participant information</h3>
        <div class="grid grid-2">
          <div><p class="muted">Patient code</p><strong>${escapeHtml(p.patientCode || '—')}</strong></div>
          <div><p class="muted">Name</p><strong>${escapeHtml(p.name || '—')}</strong></div>
          <div><p class="muted">Date of birth</p><strong>${escapeHtml(p.dateOfBirth || '—')}</strong></div>
          <div><p class="muted">Registered</p><strong>${escapeHtml(p.createdAt ? formatAdminDate(p.createdAt) : '—')}</strong></div>
          <div><p class="muted">Latest indicator</p><strong>${escapeHtml(p.indicator || 'No screening')}</strong></div>
          <div><p class="muted">Latest screening status</p><strong>${escapeHtml(p.status || 'Not screened')}</strong></div>
        </div>
      </div>

      <div class="card card-pad">
        <div class="card-head"><div><h3>Screenings for this patient</h3><p class="muted" style="margin:4px 0 0;">Only screenings returned by the backend are shown.</p></div></div>
        ${screenings.length ? `
          <div style="overflow:auto;"><table class="data-table"><thead><tr><th>Screening ID</th><th>Date</th><th>Status</th><th>Indicator</th><th>Model</th><th>Action</th></tr></thead><tbody>
          ${screenings.map(s=>`<tr><td class="cell-id">${escapeHtml(s.id)}</td><td>${escapeHtml(s.dateLabel)}</td><td>${escapeHtml(String(s.status||'').replace(/_/g,' ') || '—')}</td><td>${s.overallIndicator ? indicatorBadge(s.overallIndicator) : '<span class="muted">Pending</span>'}</td><td>${escapeHtml(s.modelVersion || '—')}</td><td><button class="btn btn-ghost btn-sm" data-patient-screening="${escapeHtml(s.id)}">View</button></td></tr>`).join('')}
          </tbody></table></div>` : `
          <div class="state-empty" style="padding:35px 15px;">${icon('screenings',40)}<h4>No screenings recorded</h4><p>This participant exists in the database, but no screening record is currently linked to this patient.</p></div>`}
      </div>

      ${latest ? `<div class="card card-pad" style="margin-top:20px;"><h3>Latest screening meaning</h3><p class="muted">${escapeHtml(latest.overallIndicator || 'No overall indicator has been recorded yet.')}</p><button class="btn btn-primary btn-sm" data-patient-screening="${escapeHtml(latest.id)}">Open latest screening</button></div>` : ''}
    `;
  }

  function wirePatientProfile(id){
    $('#patient-back')?.addEventListener('click',()=>navigate('/patients'));
    $$('[data-patient-screening]').forEach(b=>b.addEventListener('click',()=>navigate('/screenings/'+b.dataset.patientScreening)));
  }

  /* ---------------------------------------------------------------------
     PROGRESS MONITORING
  --------------------------------------------------------------------- */
  function pageProgress(){
    const groups = { Improving:0, Stable:0, 'Needs review':0, 'Insufficient data':0 };
    DB.patients.forEach(p => groups[p.progressTrend]++);
    return `
      <div class="page-header"><div><h1>Progress Monitoring</h1><p class="muted">Identify improvement, stability, or decline across multiple screenings.</p></div></div>
      <div class="grid grid-4" style="margin-bottom:20px;">
        ${kpiCard({icon:'trendUp', iconBg:'var(--green-100)', iconColor:'var(--green)', num:groups.Improving, label:'Children improving'})}
        ${kpiCard({icon:'trendFlat', iconBg:'var(--sky)', iconColor:'var(--blue)', num:groups.Stable, label:'Children stable'})}
        ${kpiCard({icon:'trendDown', iconBg:'var(--rust-100)', iconColor:'var(--rust)', num:groups['Needs review'], label:'Children requiring review'})}
        ${kpiCard({icon:'warning', iconBg:'var(--amber-100)', iconColor:'var(--amber)', num:groups['Insufficient data'], label:'Insufficient data'})}
      </div>
      <div class="grid grid-2" style="margin-bottom:20px;">
        <div class="card card-pad"><h3 style="margin-bottom:12px;">Average screening score over time ${tooltip('Cohort average composite screening score, aggregated monthly.')}</h3><canvas id="chart-progress-score" height="140"></canvas></div>
        <div class="card card-pad"><h3 style="margin-bottom:12px;">Writing speed &amp; accuracy progression ${tooltip('Cohort averages for two observed task measurements over time.')}</h3><canvas id="chart-progress-tasks" height="140"></canvas></div>
      </div>
      <div class="card card-pad">
        <div class="card-head"><h3>Compare Screening 1 vs Screening 2 ${icon('compare',16)}</h3></div>
        <div class="toolbar">
          <select class="select" id="cmp-patient" style="min-width:220px;"><option value="">Select a patient…</option>${DB.patients.filter(p=>p.screeningsCount>1).slice(0,300).map(p=>`<option value="${p.id}" ${STATE.compareSel.patientId===p.id?'selected':''}>#${p.id} — ${p.name}</option>`).join('')}</select>
          <select class="select" id="cmp-a"><option value="">Screening 1</option></select>
          <select class="select" id="cmp-b"><option value="">Screening 2</option></select>
        </div>
        <div id="compare-output"></div>
      </div>`;
  }
  function wireProgressPage(){
    const monthly = {};
    for(let i=8;i>=0;i--){ const d=new Date(); d.setMonth(d.getMonth()-i); monthly[d.getFullYear()+'-'+d.getMonth()] = { label:d.toLocaleDateString('en-US',{month:'short'}), scores:[], speed:[], acc:[] }; }
    DB.screenings.forEach(s => { const k=s.date ? s.date.getFullYear()+'-'+s.date.getMonth() : null; if(monthly[k] && s.overallScore!=null){ monthly[k].scores.push(s.overallScore); monthly[k].speed.push(s.tasks.writingSpeed); monthly[k].acc.push(s.tasks.copyingAccuracy); } });
    const labels = Object.values(monthly).map(m=>m.label);
    const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : null;
    makeChart('chart-progress-score', { type:'line', data:{ labels, datasets:[{ label:'Average overall score', data:Object.values(monthly).map(m=>avg(m.scores)), borderColor:'#17324D', backgroundColor:'rgba(23,50,77,0.1)', fill:true, tension:0.3 }] }, options:{ plugins:{legend:{display:false}}, scales:{y:{min:0,max:100}} } });
    makeChart('chart-progress-tasks', { type:'line', data:{ labels, datasets:[
      { label:'Writing speed (avg)', data:Object.values(monthly).map(m=>avg(m.speed)), borderColor:'#2C8C88', tension:0.3 },
      { label:'Copying accuracy (avg)', data:Object.values(monthly).map(m=>avg(m.acc)), borderColor:'#9A7B22', tension:0.3 },
    ]}, options:{ plugins:{legend:{position:'bottom'}}, scales:{y:{min:0,max:100}} } });

    function populateScreeningSelects(patientId){
      const p = DB.patients.find(x=>x.id===patientId);
      const a = $('#cmp-a'), b = $('#cmp-b');
      if(!p){ a.innerHTML='<option value="">Screening 1</option>'; b.innerHTML='<option value="">Screening 2</option>'; return; }
      const opts = p.screenings.map(s=>`<option value="${s.id}">${s.id} — ${s.dateLabel}</option>`).join('');
      a.innerHTML = '<option value="">Screening 1</option>'+opts;
      b.innerHTML = '<option value="">Screening 2</option>'+opts;
      if(p.screenings[1]) b.value = p.screenings[0].id, a.value = p.screenings[1].id;
      renderCompare();
    }
    function renderCompare(){
      const out = $('#compare-output');
      const aId=$('#cmp-a').value, bId=$('#cmp-b').value;
      if(!aId||!bId){ out.innerHTML=''; return; }
      const sa = DB.screenings.find(s=>s.id===aId), sb = DB.screenings.find(s=>s.id===bId);
      out.innerHTML = `
        <div class="grid grid-2" style="margin-top:16px;">
          <div><h4 style="margin-bottom:8px;">${sa.id} — ${sa.dateLabel}</h4>${indicatorBadge(sa.indicator)}</div>
          <div><h4 style="margin-bottom:8px;">${sb.id} — ${sb.dateLabel}</h4>${indicatorBadge(sb.indicator)}</div>
        </div>
        <table class="data-table" style="margin-top:14px;"><thead><tr><th class="no-sort">Task</th><th class="no-sort">${sa.dateLabel}</th><th class="no-sort">${sb.dateLabel}</th><th class="no-sort">Change</th></tr></thead>
        <tbody>${TASK_DEFS.map(t=>{ const va=sa.tasks[t.key], vb=sb.tasks[t.key]; const d = (va!=null&&vb!=null)?vb-va:null; return `<tr><td>${t.label}</td><td>${va??'—'}</td><td>${vb??'—'}</td><td>${d==null?'—':`<span class="trend ${d>0?'up':d<0?'down':'flat'}">${d>0?'+':''}${d}</span>`}</td></tr>`; }).join('')}
        <tr style="font-weight:700;"><td>Overall score</td><td>${sa.overallScore??'—'}</td><td>${sb.overallScore??'—'}</td><td>${(sa.overallScore!=null&&sb.overallScore!=null)?(sb.overallScore-sa.overallScore>=0?'+':'')+(sb.overallScore-sa.overallScore):'—'}</td></tr>
        </tbody></table>`;
    }
    $('#cmp-patient').addEventListener('change', e => { STATE.compareSel.patientId=e.target.value; populateScreeningSelects(e.target.value); });
    $('#cmp-a').addEventListener('change', renderCompare);
    $('#cmp-b').addEventListener('change', renderCompare);
    if(STATE.compareSel.patientId){ $('#cmp-patient').value = STATE.compareSel.patientId; populateScreeningSelects(STATE.compareSel.patientId); }
  }

  /* ---------------------------------------------------------------------
     ANALYTICS (tabbed)
  --------------------------------------------------------------------- */
  const ANALYTICS_TABS = [['trends','Screening Trends'],['demographics','Demographics'],['performance','Performance Indicators'],['followup','Follow-up Analytics'],['model','Model Performance'],['quality','Data Quality']];
  function pageAnalytics(tab){
    return `
      <div class="page-header"><div><h1>Analytics</h1><p class="muted">Platform-wide trends, demographics, and model &amp; data quality insight.</p></div></div>
      <div class="tabs-bar">${ANALYTICS_TABS.map(([k,l])=>`<div class="tab-item ${tab===k?'is-active':''}" data-atab="${k}">${l}</div>`).join('')}</div>
      <div id="analytics-content">${renderAnalyticsTab(tab)}</div>`;
  }
  function renderAnalyticsTab(tab){
    if(tab==='trends') return analyticsTrends();
    if(tab==='demographics') return analyticsDemographics();
    if(tab==='performance') return analyticsPerformance();
    if(tab==='followup') return analyticsFollowup();
    if(tab==='model') return analyticsModel();
    if(tab==='quality') return analyticsQuality();
    return '';
  }
  function analyticsTrends(){
    const repeatRate = DB.patients.filter(p=>p.screeningsCount>1).length/DB.patients.length;
    const completionRate = DB.screenings.filter(s=>s.completionStatus==='Completed').length/DB.screenings.length;
    const followRate = DB.patients.filter(p=>p.followUp==='Required'||p.followUp==='Overdue'||p.followUp==='Scheduled').length/DB.patients.length;
    return `
      <div class="grid grid-3" style="margin-bottom:20px;">
        ${kpiCard({icon:'compare', iconBg:'var(--sky)', iconColor:'var(--blue)', num:fmtPct(repeatRate), label:'Repeat screening rate'})}
        ${kpiCard({icon:'checkCircle', iconBg:'var(--green-100)', iconColor:'var(--green)', num:fmtPct(completionRate), label:'Completion rate'})}
        ${kpiCard({icon:'alerts', iconBg:'var(--amber-100)', iconColor:'var(--amber)', num:fmtPct(followRate), label:'Follow-up rate'})}
      </div>
      <div class="card card-pad" style="margin-bottom:20px;"><h3 style="margin-bottom:12px;">Screenings per month</h3><canvas id="chart-trends-volume" height="90"></canvas></div>
      <div class="card card-pad"><h3 style="margin-bottom:12px;">Indicator distribution over time</h3><canvas id="chart-trends-indicator" height="90"></canvas></div>`;
  }
  function analyticsDemographics(){
    return `
      <div class="grid grid-2" style="margin-bottom:20px;">
        <div class="card card-pad"><h3 style="margin-bottom:12px;">Age distribution</h3><canvas id="chart-demo-age" height="130"></canvas></div>
        <div class="card card-pad"><h3 style="margin-bottom:12px;">Grade distribution</h3><canvas id="chart-demo-grade" height="130"></canvas></div>
      </div>
      <div class="grid grid-2">
        <div class="card card-pad"><h3 style="margin-bottom:12px;">Organization / school distribution</h3><canvas id="chart-demo-school" height="150"></canvas></div>
        <div class="card card-pad"><h3 style="margin-bottom:12px;">Screenings per patient ${tooltip('How many screening sessions each patient has completed to date — a proxy for participation depth, not identity.')}</h3><canvas id="chart-demo-participation" height="150"></canvas></div>
      </div>
      <p class="muted" style="font-size:0.8rem; margin-top:14px;">All demographic figures are aggregated. No individual child is identifiable from this view.</p>`;
  }
  function analyticsPerformance(){
    const below = {}; TASK_DEFS.forEach(t=>below[t.key]=0);
    let n=0;
    DB.screenings.forEach(s => { if(s.completionStatus!=='Completed') return; n++; TASK_DEFS.forEach(t=>{ if(s.tasks[t.key]<65) below[t.key]++; }); });
    const rows = TASK_DEFS.map(t=>({ label:t.label, pct: below[t.key]/n })).sort((a,b)=>b.pct-a.pct);
    const max = rows[0].pct;
    return `<div class="card card-pad">
      <h3 style="margin-bottom:4px;">Which screening dimensions most frequently require attention</h3>
      <p class="muted" style="margin-bottom:18px;">Share of completed screenings scoring below the attention threshold (65/100) on each observed screening dimension.</p>
      ${rows.map(r=>`
        <div style="display:grid; grid-template-columns:160px 1fr 60px; align-items:center; gap:14px; margin-bottom:14px;">
          <div style="font-size:0.87rem;">${r.label}</div>
          <div style="height:10px; background:var(--line-soft); border-radius:5px; overflow:hidden;"><div style="height:100%; width:${(r.pct/max*100).toFixed(1)}%; background:var(--teal);"></div></div>
          <div class="mono" style="text-align:right;">${fmtPct(r.pct)}</div>
        </div>`).join('')}
      <p class="muted" style="font-size:0.8rem;">Labeled as observed screening indicators — this reflects task performance patterns in the dataset, not confirmed clinical findings.</p>
      </div>`;
  }
  function analyticsFollowup(){
    const req = DB.patients.filter(p=>p.followUp==='Required').length;
    const overdue = DB.patients.filter(p=>p.followUp==='Overdue').length;
    const scheduled = DB.patients.filter(p=>p.followUp==='Scheduled').length;
    const notReq = DB.patients.filter(p=>p.followUp==='Not required').length;
    return `
      <div class="grid grid-4" style="margin-bottom:20px;">
        ${kpiCard({icon:'alerts', iconBg:'var(--rust-100)', iconColor:'var(--rust)', num:req, label:'Follow-up required'})}
        ${kpiCard({icon:'clock', iconBg:'var(--rust-100)', iconColor:'var(--rust)', num:overdue, label:'Follow-up overdue'})}
        ${kpiCard({icon:'calendar', iconBg:'var(--amber-100)', iconColor:'var(--amber)', num:scheduled, label:'Scheduled'})}
        ${kpiCard({icon:'checkCircle', iconBg:'var(--green-100)', iconColor:'var(--green)', num:notReq, label:'Not required'})}
      </div>
      <div class="card card-pad"><h3 style="margin-bottom:12px;">Follow-up status breakdown</h3><canvas id="chart-followup" height="130"></canvas></div>`;
  }
  function analyticsModel(){
    if(!canAccess('research') && STATE.role==='educator') return unauthorizedState();
    const m = MODEL;
    return `
      <div class="grid grid-3" style="margin-bottom:20px;">
        <div class="card card-pad"><p class="muted" style="font-size:0.78rem;">MODEL STATUS</p><h3 style="color:var(--green);">${m.status}</h3><p class="muted" style="font-size:0.8rem;">Last evaluated: ${m.lastUpdated}</p></div>
        <div class="card card-pad"><p class="muted" style="font-size:0.78rem;">MODEL VERSION</p><p class="mono" style="font-weight:700;">${m.version}</p><p class="muted" style="font-size:0.8rem;">${m.algorithmVersion}</p></div>
        <div class="card card-pad"><p class="muted" style="font-size:0.78rem;">EVALUATIONS</p><p class="mono" style="font-weight:700; font-size:1.3rem;">${m.evaluations.toLocaleString()}</p><p class="muted" style="font-size:0.8rem;">Test-set samples</p></div>
      </div>
      <div class="card card-pad" style="margin-bottom:20px;"><p class="muted" style="font-size:0.8rem; margin-bottom:6px;">TRAINING DATASET</p><p style="margin:0;">${m.trainingDataset}</p></div>
      <div class="grid grid-4" style="margin-bottom:20px;">
        ${kpiCard({icon:'checkCircle', iconBg:'var(--teal-100)', iconColor:'var(--teal-600)', num:fmtPct(m.metrics.accuracy), label:'Accuracy'})}
        ${kpiCard({icon:'checkCircle', iconBg:'var(--teal-100)', iconColor:'var(--teal-600)', num:fmtPct(m.metrics.precision), label:'Precision'})}
        ${kpiCard({icon:'checkCircle', iconBg:'var(--teal-100)', iconColor:'var(--teal-600)', num:fmtPct(m.metrics.recall), label:'Recall'})}
        ${kpiCard({icon:'checkCircle', iconBg:'var(--teal-100)', iconColor:'var(--teal-600)', num:m.metrics.rocAuc.toFixed(3), label:'ROC-AUC'})}
      </div>
      <div class="grid grid-2" style="margin-bottom:20px;">
        <div class="card card-pad"><h3 style="margin-bottom:12px;">Confusion matrix (test set)</h3>
          <table class="data-table"><thead><tr><th class="no-sort"></th><th class="no-sort">Predicted: Higher</th><th class="no-sort">Predicted: Lower/Mod.</th></tr></thead>
          <tbody><tr><td style="font-weight:600;">Actual: Higher</td><td class="mono" style="background:var(--teal-100);">${m.confusion.tp}</td><td class="mono" style="background:var(--rust-100);">${m.confusion.fn}</td></tr>
          <tr><td style="font-weight:600;">Actual: Lower/Mod.</td><td class="mono" style="background:var(--rust-100);">${m.confusion.fp}</td><td class="mono" style="background:var(--teal-100);">${m.confusion.tn}</td></tr></tbody></table>
        </div>
        <div class="card card-pad"><h3 style="margin-bottom:12px;">ROC curve</h3><canvas id="chart-model-roc" height="140"></canvas></div>
      </div>
      <div class="grid grid-2">
        <div class="card card-pad"><h3 style="margin-bottom:12px;">Precision–recall curve</h3><canvas id="chart-model-pr" height="140"></canvas></div>
        <div class="card card-pad"><h3 style="margin-bottom:6px;">Feature importance ${tooltip(m.note)}</h3>
          <p class="muted" style="font-size:0.78rem; margin-bottom:14px;">Illustrative — planned hybrid feature model, not live model output.</p>
          ${m.featureImportance.map(f=>`<div style="display:grid; grid-template-columns:130px 1fr 44px; gap:10px; align-items:center; margin-bottom:10px;"><span style="font-size:0.83rem;">${f.name}</span><div style="height:8px; background:var(--line-soft); border-radius:4px; overflow:hidden;"><div style="height:100%; width:${f.val*100*2.6}%; background:var(--muted);"></div></div><span class="mono" style="font-size:0.78rem;">${(f.val*100).toFixed(0)}%</span></div>`).join('')}
        </div>
      </div>
      <div class="card card-pad" style="margin-top:20px; background:var(--sky);">
        <p style="margin:0; font-weight:600;">Model outputs are screening indicators and should not be interpreted as a clinical diagnosis.</p>
      </div>`;
  }
  function analyticsQuality(){ return dataQualityMarkup(); }

  function wireAnalyticsPage(tab){
    $$('.tabs-bar [data-atab]').forEach(t => t.addEventListener('click', () => { navigate('/analytics/'+t.dataset.atab); }));
    if(tab==='trends'){
      const monthly=[]; for(let i=11;i>=0;i--){ const d=new Date(); d.setMonth(d.getMonth()-i); monthly.push({label:d.toLocaleDateString('en-US',{month:'short'}), y:d.getFullYear(), m:d.getMonth()}); }
      const counts = monthly.map(mo => DB.screenings.filter(s=>s.date && s.date.getFullYear()===mo.y && s.date.getMonth()===mo.m).length);
      makeChart('chart-trends-volume', { type:'bar', data:{ labels:monthly.map(m=>m.label), datasets:[{ label:'Screenings', data:counts, backgroundColor:'#2C8C88', borderRadius:4 }] }, options:{ plugins:{legend:{display:false}} } });
      const indCounts = monthly.map(mo => { const subset = DB.screenings.filter(s=>s.date && s.date.getFullYear()===mo.y && s.date.getMonth()===mo.m); return { Lower:subset.filter(s=>s.indicator==='Lower').length, Moderate:subset.filter(s=>s.indicator==='Moderate').length, Higher:subset.filter(s=>s.indicator==='Higher').length, Incomplete:subset.filter(s=>s.indicator==='Incomplete').length }; });
      makeChart('chart-trends-indicator', { type:'bar', data:{ labels:monthly.map(m=>m.label), datasets:[
        {label:'Lower', data:indCounts.map(c=>c.Lower), backgroundColor:'#2C8C88', stack:'s'},
        {label:'Moderate', data:indCounts.map(c=>c.Moderate), backgroundColor:'#9A7B22', stack:'s'},
        {label:'Higher', data:indCounts.map(c=>c.Higher), backgroundColor:'#B8622C', stack:'s'},
        {label:'Incomplete', data:indCounts.map(c=>c.Incomplete), backgroundColor:'#94A3B8', stack:'s'},
      ]}, options:{ plugins:{legend:{position:'bottom'}}, scales:{x:{stacked:true},y:{stacked:true}} } });
    }
    if(tab==='demographics'){
      const ageGroups = { '5–6':0,'7–8':0,'9–10':0,'11–12':0,'13+':0 };
      DB.patients.forEach(p=>{ const a=p.age; const g=a<=6?'5–6':a<=8?'7–8':a<=10?'9–10':a<=12?'11–12':'13+'; ageGroups[g]++; });
      makeChart('chart-demo-age', { type:'bar', data:{ labels:Object.keys(ageGroups), datasets:[{ data:Object.values(ageGroups), backgroundColor:'#2C8C88', borderRadius:4 }] }, options:{ plugins:{legend:{display:false}} } });
      const gradeCounts={}; DB.patients.forEach(p=>gradeCounts[p.grade]=(gradeCounts[p.grade]||0)+1);
      makeChart('chart-demo-grade', { type:'bar', data:{ labels:Object.keys(gradeCounts), datasets:[{ data:Object.values(gradeCounts), backgroundColor:'#17324D', borderRadius:4 }] }, options:{ plugins:{legend:{display:false}}, scales:{x:{ticks:{autoSkip:false,font:{size:9}}}} } });
      const schoolCounts={}; DB.patients.forEach(p=>schoolCounts[p.school]=(schoolCounts[p.school]||0)+1);
      makeChart('chart-demo-school', { type:'bar', data:{ labels:Object.keys(schoolCounts), datasets:[{ data:Object.values(schoolCounts), backgroundColor:'#5B7A91', borderRadius:4 }] }, options:{ indexAxis:'y', plugins:{legend:{display:false}} } });
      const partCounts={1:0,2:0,3:0,4:0}; DB.patients.forEach(p=>partCounts[p.screeningsCount]++);
      makeChart('chart-demo-participation', { type:'doughnut', data:{ labels:['1 screening','2 screenings','3 screenings','4 screenings'], datasets:[{ data:Object.values(partCounts), backgroundColor:['#B7DAD6','#7FC7C2','#2C8C88','#17324D'] }] }, options:{ plugins:{legend:{position:'bottom'}} } });
    }
    if(tab==='followup'){
      const req=DB.patients.filter(p=>p.followUp==='Required').length, overdue=DB.patients.filter(p=>p.followUp==='Overdue').length, sched=DB.patients.filter(p=>p.followUp==='Scheduled').length, not=DB.patients.filter(p=>p.followUp==='Not required').length;
      makeChart('chart-followup', { type:'doughnut', data:{ labels:['Required','Overdue','Scheduled','Not required'], datasets:[{ data:[req,overdue,sched,not], backgroundColor:['#B8622C','#7A2E10','#9A7B22','#2C8C88'] }] }, options:{ plugins:{legend:{position:'bottom'}} } });
    }
    if(tab==='model'){
      makeChart('chart-model-roc', { type:'line', data:{ datasets:[{ label:'Model', data:MODEL.rocPoints.map(([x,y])=>({x,y})), borderColor:'#2C8C88', pointRadius:0, tension:0.3 },{ label:'Random', data:[{x:0,y:0},{x:1,y:1}], borderColor:'#CBD5E1', borderDash:[4,4], pointRadius:0 }]}, options:{ scales:{ x:{type:'linear',min:0,max:1,title:{display:true,text:'False positive rate'}}, y:{min:0,max:1,title:{display:true,text:'True positive rate'}} } } });
      makeChart('chart-model-pr', { type:'line', data:{ datasets:[{ label:'Precision-Recall', data:MODEL.prPoints.map(([x,y])=>({x,y})), borderColor:'#17324D', backgroundColor:'rgba(23,50,77,0.1)', fill:true, pointRadius:0, tension:0.3 }]}, options:{ scales:{ x:{type:'linear',min:0,max:1,title:{display:true,text:'Recall'}}, y:{min:0,max:1,title:{display:true,text:'Precision'}} } } });
    }
  }
  function dataQualityMarkup(){
    const q = DB.dataQuality;
    return `
      <div class="grid grid-2" style="grid-template-columns:0.9fr 1.1fr; margin-bottom:20px;">
        <div class="card card-pad" style="text-align:center;">
          <p class="muted" style="font-size:0.8rem;">OVERALL DATA QUALITY SCORE</p>
          <div style="font-size:2.6rem; font-weight:800; color:var(--teal-600); font-family:var(--mono);">${fmtPct(q.overall)}</div>
          <p class="muted" style="font-size:0.8rem;">Across ${q.totalRecords.toLocaleString()} screening records</p>
        </div>
        <div class="card card-pad">
          <div class="grid grid-2" style="gap:14px;">
            ${[['Completeness',q.completeness],['Consistency',q.consistency],['Validity',q.validity],['Uniqueness',q.uniqueness]].map(([l,v])=>`
              <div><div style="display:flex; justify-content:space-between; margin-bottom:6px;"><span style="font-size:0.83rem; font-weight:600;">${l}</span><span class="mono">${fmtPct(v)}</span></div>
              <div style="height:8px; background:var(--line-soft); border-radius:4px; overflow:hidden;"><div style="height:100%; width:${v*100}%; background:var(--teal);"></div></div></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="grid grid-4">
        ${kpiCard({icon:'checkCircle', iconBg:'var(--green-100)', iconColor:'var(--green)', num:q.completeRecords.toLocaleString(), label:'Complete records'})}
        ${kpiCard({icon:'warning', iconBg:'var(--amber-100)', iconColor:'var(--amber)', num:q.missingValues.toLocaleString(), label:'Missing values'})}
        ${kpiCard({icon:'compare', iconBg:'var(--rust-100)', iconColor:'var(--rust)', num:q.duplicateRecords.toLocaleString(), label:'Duplicate records'})}
        ${kpiCard({icon:'screenings', iconBg:'var(--sky)', iconColor:'var(--blue)', num:q.incompleteRecords.toLocaleString(), label:'Incomplete screenings'})}
      </div>`;
  }

  /* ---------------------------------------------------------------------
     ALERTS
  --------------------------------------------------------------------- */
  const ALERT_META = {
    'High-priority review': { icon:'warning', bg:'var(--rust-100)', color:'var(--rust)' },
    'Follow-up overdue': { icon:'clock', bg:'var(--rust-100)', color:'var(--rust)' },
    'Progress decline': { icon:'trendDown', bg:'var(--amber-100)', color:'var(--amber)' },
    'Incomplete screening': { icon:'screenings', bg:'var(--sky)', color:'var(--blue)' },
    'Data quality issue': { icon:'database', bg:'var(--sky)', color:'var(--blue)' },
    'System notification': { icon:'bell', bg:'var(--line-soft)', color:'var(--muted)' },
  };
  let alertFilter = 'all';
  function pageAlerts(){
    const cats = ['all', ...Object.keys(ALERT_META)];
    const openCount = DB.alerts.filter(a=>a.status==='Open').length;
    return `
      <div class="page-header"><div><h1>Alerts</h1><p class="muted">${openCount} open alert${openCount===1?'':'s'} across the platform.</p></div></div>
      <div class="toolbar">${cats.map(c=>`<button class="btn btn-sm ${alertFilter===c?'btn-primary':'btn-outline'}" data-cat="${c}">${c==='all'?'All':c}</button>`).join('')}</div>
      <div id="alerts-list"></div>`;
  }
  function renderAlertsList(){
    const list = $('#alerts-list'); if(!list) return;
    const rows = DB.alerts.filter(a => alertFilter==='all'||a.category===alertFilter);
    if(!rows.length){ list.innerHTML = `<div class="card"><div class="state-empty">${icon('checkCircle',44)}<h4>No alerts here</h4><p>All alerts in this category have been reviewed or resolved.</p></div></div>`; return; }
    list.innerHTML = rows.map(a => {
      const meta = ALERT_META[a.category];
      return `<div class="alert-item" data-alert="${a.id}">
        <div class="alert-icon" style="background:${meta.bg}; color:${meta.color};">${icon(meta.icon,18)}</div>
        <div class="alert-body">
          <div style="display:flex; justify-content:space-between; gap:10px;">
            <div><div class="alert-title">${a.title.toUpperCase()}</div><p style="margin:0; font-size:0.85rem;">${a.message}</p></div>
          </div>
          <div class="alert-meta">
            <span>${a.category}</span>
            ${a.patientId?`<a href="#/patients/${a.patientId}" style="color:var(--teal-600); font-weight:600;">#${a.patientId}</a>`:''}
            <span>${timeAgo(daysAgo(a.daysAgo))}</span>
            <span class="badge ${a.status==='Open'?'badge-moderate':a.status==='Resolved'?'badge-lower':'badge-pending'}"><span class="dot"></span>${a.status}${a.assignedTo?' · '+a.assignedTo:''}</span>
          </div>
        </div>
        <div class="alert-actions">
          <button class="btn btn-ghost btn-sm" data-a="review">Mark reviewed</button>
          <button class="btn btn-ghost btn-sm" data-a="assign">Assign</button>
          <button class="btn btn-ghost btn-sm" data-a="note">Add note</button>
          <button class="btn btn-danger btn-sm" data-a="resolve">Resolve</button>
        </div>
      </div>`;
    }).join('');
    $$('.alert-item', list).forEach(item => {
      const a = DB.alerts.find(x=>x.id===item.dataset.alert);
      $$('button[data-a]', item).forEach(btn => btn.addEventListener('click', () => {
        const act = btn.dataset.a;
        if(act==='review'){ a.status='Reviewed'; toast('Alert marked as reviewed'); renderAlertsList(); }
        if(act==='resolve'){ confirmAction('Resolve alert?','This will mark the alert as resolved for all administrators.','Resolve', () => { a.status='Resolved'; toast('Alert resolved'); renderAlertsList(); }); }
        if(act==='note'){ openModal(`<div class="modal-head"><h3>Add note</h3><button class="icon-btn" data-close>${icon('close',16)}</button></div><div class="modal-body"><textarea class="input" rows="4" style="width:100%;" placeholder="Add context for this alert…"></textarea></div><div class="modal-foot"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="save-alert-note">Save</button></div>`); $$('[data-close]').forEach(b=>b.addEventListener('click',closeModal)); $('#save-alert-note').addEventListener('click',()=>{closeModal(); toast('Note added to alert');}); }
        if(act==='assign'){ openModal(`<div class="modal-head"><h3>Assign alert</h3><button class="icon-btn" data-close>${icon('close',16)}</button></div><div class="modal-body"><select class="select" id="assign-to" style="width:100%;">${ADMIN_STAFF.map(s=>`<option>${s}</option>`).join('')}</select></div><div class="modal-foot"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="save-assign">Assign</button></div>`); $$('[data-close]').forEach(b=>b.addEventListener('click',closeModal)); $('#save-assign').addEventListener('click',()=>{ a.assignedTo=$('#assign-to').value; a.status='Assigned'; closeModal(); toast('Alert assigned to '+a.assignedTo); renderAlertsList(); }); }
      }));
    });
  }
  function wireAlertsPage(){
    $$('button[data-cat]').forEach(b => b.addEventListener('click', () => { alertFilter=b.dataset.cat; renderRoute(); }));
    renderAlertsList();
  }

  /* ---------------------------------------------------------------------
     REPORTS
  --------------------------------------------------------------------- */
  function pageReports(){
    return `
      <div class="page-header"><div><h1>Reports</h1><p class="muted">Generate, preview and export reports from authentic WriteAble screening records.</p></div></div>
      <div class="grid grid-3">${REPORT_TYPES.map(r=>`<div class="card card-pad"><h4 style="margin-bottom:6px;">${escapeHtml(r.name)}</h4><p class="muted" style="font-size:.85rem;">${escapeHtml(r.desc)}</p><button class="btn btn-outline btn-sm" data-generate="${escapeHtml(r.key)}">Generate</button></div>`).join('')}</div>`;
  }

  function reportScreeningOptions(selectedId){
    const rows=DB.screenings.slice().sort((a,b)=>(b.date?.getTime()||0)-(a.date?.getTime()||0));
    if(!rows.length) return '<option value="">No screening records available</option>';
    return '<option value="">Select a screening…</option>'+rows.map(s=>{
      const p=DB.patients.find(x=>String(x.id)===String(s.patientId));
      const participant=p?.patientCode||s.participationId||'Participant not assigned';
      return `<option value="${escapeHtml(s.id)}" ${String(selectedId||'')===String(s.id)?'selected':''}>${escapeHtml(`${s.id} · ${participant} · ${s.dateTimeLabel||s.dateLabel||'No date'} · ${screeningIndicatorValue(s)}`)}</option>`;
    }).join('');
  }

  function reportOrganizationOptions(){
    const values=new Set();
    DB.patients.forEach(p=>{ const org=p.organization||p.organizationName||p.school; if(org) values.add(String(org)); });
    const options=[...values].sort((a,b)=>a.localeCompare(b));
    return options.length ? '<option value="">Select an organization…</option>'+options.map(o=>`<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('') : '<option value="">No organization data available</option>';
  }

  function wireReportsPage(){ $$('button[data-generate]').forEach(b=>b.addEventListener('click',()=>openReportModal(b.dataset.generate))); }

  async function openReportModal(type, presetPatientId, presetScreeningId){
    const rt=REPORT_TYPES.find(r=>r.key===type); if(!rt) return;
    const screeningBased=['individual','summary','progress'].includes(type);
    openModal(`<div class="modal-head"><h3>Generate — ${escapeHtml(rt.name)}</h3><button class="icon-btn" data-close>${icon('close',16)}</button></div>
      <div class="modal-body" id="report-modal-body">
      ${screeningBased?`<div class="form-field" style="margin-bottom:14px;"><label for="rp-screening">Screening record</label><select class="select" id="rp-screening" style="width:100%;">${reportScreeningOptions(presetScreeningId)}</select><p class="muted" style="font-size:.78rem;margin-top:7px;">Select the real screening. Participant information, handwriting evidence, model predictions, interpretation and recommendations are loaded from that screening.</p></div>`:''}
      ${type==='org'?`<div class="form-field" style="margin-bottom:14px;"><label for="rp-org">Organization</label><select class="select" id="rp-org" style="width:100%;">${reportOrganizationOptions()}</select></div>`:''}
      ${type==='monthly'?`<div class="form-field" style="margin-bottom:14px;"><label for="rp-month">Month</label><input class="input" type="month" id="rp-month" value="${new Date().toISOString().slice(0,7)}"></div>`:''}
      <div id="report-gen-area"></div></div>
      <div class="modal-foot" id="report-modal-foot"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="rp-generate">Generate report</button></div>`);
    $$('[data-close]').forEach(b=>b.addEventListener('click',closeModal));
    $('#rp-generate').addEventListener('click',async()=>{
      const area=$('#report-gen-area'); $('#rp-generate').disabled=true;
      area.innerHTML='<div style="padding:20px 0;">Generating from live screening data…</div>';
      try{
        let html='', rows=[];
        if(screeningBased){ const id=$('#rp-screening').value; if(!id) throw new Error('Select a screening record first.'); html=await buildAuthenticScreeningReportHTML(type,id); rows=await buildScreeningExportRows(id,type); }
        else if(type==='org'){ const org=$('#rp-org').value; if(!org) throw new Error('Select an organization with real data.'); html=buildOrganizationReportHTML(org); rows=buildOrganizationExportRows(org); }
        else if(type==='monthly'){ const month=$('#rp-month').value; html=buildMonthlyReportHTML(month); rows=buildMonthlyExportRows(month); }
        else { html=buildResearchAnalyticsReportHTML(); rows=buildResearchExportRows(); }
        area.innerHTML=`<div style="border:1px solid var(--border);border-radius:10px;padding:18px;max-height:480px;overflow:auto;background:var(--surface-2);">${html}</div>`;
        $('#report-modal-foot').innerHTML='<button class="btn btn-ghost" data-close>Close</button><button class="btn btn-outline" id="rp-csv">Export CSV</button><button class="btn btn-outline" id="rp-print">Print</button><button class="btn btn-primary" id="rp-pdf">Save PDF</button>';
        $$('[data-close]').forEach(b=>b.addEventListener('click',closeModal));
        const print=()=>{const x=$('#print-area');x.innerHTML=html;x.style.display='block';window.print();setTimeout(()=>x.style.display='none',500);};
        $('#rp-print').addEventListener('click',print); $('#rp-pdf').addEventListener('click',print);
        $('#rp-csv').addEventListener('click',()=>{if(!rows.length){toast('No exportable data.','error');return;} downloadCSV(`writeable-${type}-report-${new Date().toISOString().slice(0,10)}.csv`,Object.keys(rows[0]),rows);toast('Authentic report data exported (CSV)');});
        toast('Report generated from live data');
      }catch(e){ console.error(e); area.innerHTML=`<div class="state-empty"><h4>Unable to generate report</h4><p>${escapeHtml(e.message||'Unexpected report error.')}</p></div>`; }
      finally{ if($('#rp-generate')) $('#rp-generate').disabled=false; }
    });
  }

  function reportDisclaimer(){return `<div style="font-size:.78rem;color:#64748B;margin-top:18px;border-top:1px solid #E2E8F0;padding-top:12px;"><strong>Important:</strong> This is a screening report. Model outputs are indicators and are not a medical diagnosis or definitive assessment.</div>`;}
  function reportPredictionLabel(prediction){
    if(!prediction) return "Not analyzed";
    const label = prediction.predicted_class ?? prediction.predictedClass ?? prediction.label;
    return label ? String(label) : "Unknown";
  }

  function formatCount(value){
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString() : "0";
  }

  async function loadAuthenticatedImage(imageId){
    const token = getAuthToken();
    if(!token) throw new Error("Authentication required to load handwriting images.");

    const response = await fetch(
      `${ADMIN_API_BASE_URL}/screening-images/images/${encodeURIComponent(imageId)}/file`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if(!response.ok){
      throw new Error(`Failed to load handwriting image (${response.status}).`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    adminReportImageUrls.push(url);
    return url;
  }

  function reportIndicatorScore(value){
    if(value === null || value === undefined || value === "") return "Not calculated";
    const n = Number(value);
    if(!Number.isFinite(n)) return String(value);
    const normalized = n > 1 && n <= 100 ? n / 100 : n;
    return `${normalized.toFixed(3)} (${(normalized * 100).toFixed(1)}%)`;
  }


  async function buildAuthenticScreeningReportHTML(type,screeningId){
    const screening=DB.screenings.find(s=>String(s.id)===String(screeningId)); if(!screening) throw new Error('Screening record not found.');
    const report=await loadScreeningReport(screeningId); const patient=report.patient||report.participant||report.screening?.patient||DB.patients.find(p=>String(p.id)===String(screening.patientId));
    const code=patient?.patient_code||patient?.patientCode||report.screening?.patient_code||report.screening?.participation_id||screening.participationId||'—';
    const name=[patient?.first_name,patient?.last_name].filter(Boolean).join(' ')||patient?.name||'Participant'; const i=report.interpretation||{};
    const tasksHtml=[];
    for(const t of (report.tasks||[])){
      const pr=t.prediction;
      const imageParts=[];
      for(const im of (t.images||[])){
        try{
          const imageUrl=await loadAuthenticatedImage(im.id);
          imageParts.push(`<div style="margin:10px 0;"><img src="${escapeHtml(imageUrl)}" alt="Handwriting sample" style="display:block;width:100%;max-width:720px;max-height:420px;object-fit:contain;border:1px solid #ddd;border-radius:8px;background:#f8fafc;"><div style="font-size:.75rem;color:#64748B;margin-top:6px;">${escapeHtml(im.original_filename||'Handwriting sample')}</div></div>`);
        }catch(error){
          console.error("Report image error:",error);
          imageParts.push(`<div style="margin:10px 0;padding:12px;border:1px dashed #cbd5e1;border-radius:8px;color:#64748B;">Handwriting image could not be loaded.</div>`);
        }
      }
      const imgs=imageParts.join("")||'<p style="color:#64748B;">No handwriting image recorded.</p>';
      tasksHtml.push(`<article style="border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin:12px 0;"><h3 style="margin:0 0 6px;">${escapeHtml(t.title||`Task ${t.id}`)}</h3>${imgs}<p><strong>Prediction:</strong> ${escapeHtml(reportPredictionLabel(pr))}</p><p><strong>Probability:</strong> ${adminReportPercentage(pr?.probability)}</p><p><strong>Model version:</strong> ${escapeHtml(pr?.model_version||report.screening?.model_version||'—')}</p></article>`);
    }
    const tasks=tasksHtml.join('');
    const recs=(report.recommendations||[]).map(r=>`<li><strong>${escapeHtml(r.title||'Recommendation')}</strong>${r.description?` — ${escapeHtml(r.description)}`:''}</li>`).join('');
    let progress='';
    if(type==='progress'){ const history=DB.screenings.filter(s=>String(s.patientId)===String(screening.patientId)).sort((a,b)=>(a.date?.getTime()||0)-(b.date?.getTime()||0)); const rr=[]; for(const s of history){try{rr.push(await loadScreeningReport(s.id));}catch(e){console.warn('Skipping unavailable screening in progress report',s.id);}} progress=`<section><h2>Screening Progress</h2><table style="width:100%;border-collapse:collapse;font-size:.84rem;"><thead><tr><th>Date</th><th>Indicator</th><th>Analyzed</th><th>Potential</th><th>Low potential</th></tr></thead><tbody>${rr.map(r=>`<tr><td>${escapeHtml(formatAdminReportDate(r.screening?.started_at))}</td><td>${escapeHtml(r.interpretation?.indicator||'inconclusive')}</td><td>${r.interpretation?.evidence_count??0}</td><td>${r.interpretation?.potential_count??0}</td><td>${r.interpretation?.low_count??0}</td></tr>`).join('')||'<tr><td colspan="5">No completed screening history available.</td></tr>'}</tbody></table></section>`; }
    return `<div class="authentic-report"><header style="border-bottom:2px solid #17324D;padding-bottom:14px;"><strong>WRITEABLE</strong><h2>${escapeHtml(REPORT_TYPES.find(r=>r.key===type)?.name||'Screening Report')}</h2><p>Generated from canonical screening data.</p></header><section><h2>Participant</h2><p><strong>Participant ID:</strong> ${escapeHtml(code)}</p><p><strong>Name:</strong> ${escapeHtml(name)}</p></section><section><h2>Screening</h2><p><strong>Screening ID:</strong> ${escapeHtml(String(report.screening?.id||screening.id))} · <strong>Participation ID:</strong> ${escapeHtml(report.screening?.participation_id||screening.participationId||'—')}</p><p><strong>Date:</strong> ${escapeHtml(formatAdminReportDate(report.screening?.started_at||screening.startedAt))}</p></section><section><h2>Screening Indicator</h2><p><strong>${escapeHtml(formatAdminIndicator(i.indicator))}</strong></p><p>${escapeHtml(i.explanation||'No interpretation explanation is available.')}</p><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0;"><div style="padding:12px;border:1px solid #e2e8f0;border-radius:8px;"><small style="color:#64748B;display:block;">Model version</small><strong>${escapeHtml(report.screening?.model_version||'—')}</strong></div><div style="padding:12px;border:1px solid #e2e8f0;border-radius:8px;"><small style="color:#64748B;display:block;">Indicator score</small><strong>${escapeHtml(reportIndicatorScore(report.screening?.indicator_score))}</strong></div><div style="padding:12px;border:1px solid #e2e8f0;border-radius:8px;"><small style="color:#64748B;display:block;">Analyzed tasks</small><strong>${i.evidence_count??0}</strong></div></div><p><strong>Potential Dysgraphia:</strong> ${i.potential_count??0} · <strong>Low Potential Dysgraphia:</strong> ${i.low_count??0}</p><p style="font-size:.78rem;color:#64748B;margin-top:8px;">Indicator score is not calculated in the current screening interpretation service; the overall result is a categorical screening indicator derived from the analyzed task outputs.</p></section><section><h2>Handwriting Evidence & Predictions</h2>${tasks||'<p>No screening tasks were recorded.</p>'}</section><section><h2>Recommendations</h2>${recs?`<ul>${recs}</ul>`:'<p>No recommendations were returned.</p>'}</section>${progress}${reportDisclaimer()}</div>`;
  }

  async function buildScreeningExportRows(id,type){const r=await loadScreeningReport(id);return (r.tasks||[]).map(t=>({report_type:type,screening_id:r.screening?.id||id,participation_id:r.screening?.participation_id||'',patient_code:r.patient?.patient_code||r.screening?.patient_code||'',task_id:t.id||'',task_title:t.title||'',prediction:t.prediction?.predicted_class||'',probability:t.prediction?.probability??'',indicator:r.interpretation?.indicator||'inconclusive'}));}
  function buildOrganizationReportHTML(org){const ps=DB.patients.filter(p=>String(p.organization||p.organizationName||p.school||'')===String(org));const ss=DB.screenings.filter(s=>ps.some(p=>String(p.id)===String(s.patientId)));return `<div class="authentic-report"><h2>Organization Report — ${escapeHtml(org)}</h2><p><strong>Patients represented:</strong> ${ps.length}</p><p><strong>Screenings:</strong> ${ss.length}</p><p><strong>Completed:</strong> ${ss.filter(s=>s.status==='completed').length}</p><p><strong>Higher indicator:</strong> ${ss.filter(s=>s.status==='completed'&&screeningIndicatorValue(s)==='Higher').length}</p>${reportDisclaimer()}</div>`;}
  function buildOrganizationExportRows(org){return DB.screenings.filter(s=>{const p=DB.patients.find(x=>String(x.id)===String(s.patientId));return String(p?.organization||p?.organizationName||p?.school||'')===String(org);}).map(s=>({organization:org,screening_id:s.id,patient_id:s.patientId||'',participation_id:s.participationId||'',status:s.status||'',indicator:screeningIndicatorValue(s),date:s.date?.toISOString()||''}));}
  function monthMatch(s,m){if(!s.date)return false;const [y,mo]=m.split('-').map(Number);return s.date.getFullYear()===y&&s.date.getMonth()===mo-1;}
  function buildMonthlyReportHTML(m){const ss=DB.screenings.filter(s=>monthMatch(s,m)),c=ss.filter(s=>s.status==='completed');return `<div class="authentic-report"><h2>Monthly Screening Report — ${escapeHtml(m)}</h2><p><strong>Total:</strong> ${ss.length}</p><p><strong>Completed:</strong> ${c.length}</p><p><strong>Higher indicator:</strong> ${c.filter(s=>screeningIndicatorValue(s)==='Higher').length}</p><p><strong>Moderate indicator:</strong> ${c.filter(s=>screeningIndicatorValue(s)==='Moderate').length}</p><p><strong>Lower indicator:</strong> ${c.filter(s=>screeningIndicatorValue(s)==='Lower').length}</p>${reportDisclaimer()}</div>`;}
  function buildMonthlyExportRows(m){return DB.screenings.filter(s=>monthMatch(s,m)).map(s=>({month:m,screening_id:s.id,patient_id:s.patientId||'',participation_id:s.participationId||'',status:s.status||'',indicator:screeningIndicatorValue(s),date:s.date?.toISOString()||''}));}
  function buildResearchAnalyticsReportHTML(){const c=DB.screenings.filter(s=>s.status==='completed');return `<div class="authentic-report"><h2>Research Analytics Report</h2><p><strong>Total screening records:</strong> ${DB.screenings.length}</p><p><strong>Completed:</strong> ${c.length}</p><p><strong>Higher indicator:</strong> ${c.filter(s=>screeningIndicatorValue(s)==='Higher').length}</p><p><strong>Moderate indicator:</strong> ${c.filter(s=>screeningIndicatorValue(s)==='Moderate').length}</p><p><strong>Lower indicator:</strong> ${c.filter(s=>screeningIndicatorValue(s)==='Lower').length}</p><p style="color:#64748B;font-size:.82rem;">The research export contains aggregate/anonymized screening fields only.</p>${reportDisclaimer()}</div>`;}
  function buildResearchExportRows(){return DB.screenings.map(s=>({screening_id:s.id,status:s.status||'',indicator:screeningIndicatorValue(s),model_version:s.modelVersion||'',date:s.date?.toISOString()||''}));}

  /* ---------------------------------------------------------------------
     RESEARCH DATA
  --------------------------------------------------------------------- */
  let researchFilters = { outcome:'all', ageMin:'', ageMax:'' };
  let researchVars = { age:true, grade:true, screeningDate:true, tasks:true, indicators:true, outcome:true };
  function pageResearch(){
    const table = dataTable({
      id:'research-table', pageSize:12, defaultSort:'anonId',
      columns:[
        { key:'anonId', label:'Anonymous ID', sortable:true, render:r=>`<span class="cell-id">${r.anonId}</span>` },
        { key:'age', label:'Age', sortable:true }, { key:'grade', label:'Grade', sortable:true },
        { key:'screeningDate', label:'Screening Date', sortable:false },
        { key:'overallScore', label:'Overall Score', sortable:true, render:r=>r.overallScore!=null?r.overallScore+'/100':'—' },
        { key:'outcomeCategory', label:'Outcome Category', sortable:true, render:r=>indicatorBadge(r.outcomeCategory) },
      ],
      rows: DB.research, searchKeys:['anonId'],
      applyFilters: rows => rows.filter(r => (researchFilters.outcome==='all'||r.outcomeCategory===researchFilters.outcome) && (!researchFilters.ageMin||r.age>=+researchFilters.ageMin) && (!researchFilters.ageMax||r.age<=+researchFilters.ageMax)),
      emptyTitle:'No records match these filters', emptyBody:'Adjust the filters above to widen the result set.',
    });
    window.__researchTable = table;
    return `
      <div class="page-header"><div><h1>Research Data</h1><p class="muted">Anonymized, aggregate screening data for authorized research use.</p></div></div>
      <div class="login-banner warn" style="margin-bottom:18px;">${icon('warning',16)}<span>Only anonymized and authorized data should be exported for research purposes. Anonymous IDs are not linked to patient names in this view.</span></div>
      <div class="grid grid-4" style="margin-bottom:20px;">
        ${kpiCard({icon:'database', iconBg:'var(--sky)', iconColor:'var(--blue)', num:formatCount(DB.dataQuality.totalRecords), label:'Total records'})}
        ${kpiCard({icon:'checkCircle', iconBg:'var(--green-100)', iconColor:'var(--green)', num:formatCount(DB.dataQuality.completeRecords), label:'Complete records'})}
        ${kpiCard({icon:'warning', iconBg:'var(--amber-100)', iconColor:'var(--amber)', num:formatCount(DB.dataQuality.incompleteRecords), label:'Incomplete records'})}
        ${kpiCard({icon:'checkCircle', iconBg:'var(--teal-100)', iconColor:'var(--teal-600)', num:fmtPct(DB.dataQuality.overall), label:'Data quality score'})}
      </div>
      <div class="card card-pad">
        <div class="toolbar">
          <div class="search-input">${icon('search',15)}<input type="text" id="research-search" placeholder="Search anonymous ID…"></div>
          <select class="select" id="rf-outcome"><option value="all">All outcomes</option><option>Lower</option><option>Moderate</option><option>Higher</option><option>Incomplete</option></select>
          <input class="input" style="width:90px;" type="number" id="rf-age-min" placeholder="Age min">
          <input class="input" style="width:90px;" type="number" id="rf-age-max" placeholder="Age max">
          <div class="spacer"></div>
          <button class="btn btn-ghost btn-sm" id="btn-select-vars">${icon('filter',15)} Select variables</button>
          <button class="btn btn-outline btn-sm" id="btn-export-json">${icon('download',15)} Export JSON</button>
          <button class="btn btn-primary btn-sm" id="btn-export-csv">${icon('download',15)} Export CSV</button>
        </div>
        ${table.mountHtml}
      </div>`;
  }
  function wireResearchPage(){
    const table = window.__researchTable; if(!table) return;
    table.render();
    $('#research-search').addEventListener('input', e => { table.tableState.search=e.target.value; table.render(); });
    $('#rf-outcome').addEventListener('change', e => { researchFilters.outcome=e.target.value; table.render(); });
    $('#rf-age-min').addEventListener('input', e => { researchFilters.ageMin=e.target.value; table.render(); });
    $('#rf-age-max').addEventListener('input', e => { researchFilters.ageMax=e.target.value; table.render(); });
    $('#btn-select-vars').addEventListener('click', () => {
      openModal(`<div class="modal-head"><h3>Select variables to export</h3><button class="icon-btn" data-close>${icon('close',16)}</button></div>
        <div class="modal-body">${Object.keys(researchVars).map(k=>`<label class="checkbox-row" style="margin-bottom:10px;"><input type="checkbox" data-var="${k}" ${researchVars[k]?'checked':''}> ${k}</label>`).join('<br>')}</div>
        <div class="modal-foot"><button class="btn btn-primary" data-close>Done</button></div>`);
      $$('[data-close]').forEach(b=>b.addEventListener('click', closeModal));
      $$('input[data-var]').forEach(cb => cb.addEventListener('change', () => researchVars[cb.dataset.var]=cb.checked));
    });
    function currentRows(){ const ts = table.tableState; let rows = DB.research.filter(r => (researchFilters.outcome==='all'||r.outcomeCategory===researchFilters.outcome)); return rows; }
    $('#btn-export-csv').addEventListener('click', () => {
      const cols = []; if(researchVars.age) cols.push('age'); if(researchVars.grade) cols.push('grade'); if(researchVars.screeningDate) cols.push('screeningDate'); if(researchVars.outcome) cols.push('outcomeCategory');
      const rows = currentRows().map(r => ({ anonId:r.anonId, age:r.age, grade:r.grade, screeningDate:r.screeningDate, outcomeCategory:r.outcomeCategory }));
      downloadCSV('research-export.csv', ['anonId', ...cols], rows);
      toast('Anonymized research dataset exported (CSV)');
    });
    $('#btn-export-json').addEventListener('click', () => { downloadJSON('research-export.json', currentRows()); toast('Anonymized research dataset exported (JSON)'); });
  }

  /* ---------------------------------------------------------------------
     SETTINGS (tabbed)
  --------------------------------------------------------------------- */
  const SETTINGS_TABS = [['account','Account'],['security','Security'],['users','Users & Roles'],['notifications','Notifications'],['organization','Organization'],['screening','Screening Configuration'],['privacy','Data & Privacy'],['system','System Settings']];
  function pageSettings(tab){
    return `
      <div class="page-header"><div><h1>Settings</h1><p class="muted">Configure your account, organization and platform preferences.</p></div></div>
      <div class="tabs-bar">${SETTINGS_TABS.map(([k,l])=>`<div class="tab-item ${tab===k?'is-active':''}" data-stab="${k}">${l}</div>`).join('')}</div>
      <div id="settings-content">${renderSettingsTab(tab)}</div>`;
  }
  function renderSettingsTab(tab){
    if(tab==='account') return settingsAccount();
    if(tab==='security') return settingsSecurity();
    if(tab==='users') return settingsUsers();
    if(tab==='notifications') return settingsNotifications();
    if(tab==='organization') return settingsOrg();
    if(tab==='screening') return settingsScreening();
    if(tab==='privacy') return settingsPrivacy();
    if(tab==='system') return settingsSystem();
    return '';
  }
  function settingsAccount(){
    return `<div class="card card-pad" style="max-width:560px;">
      <h3 style="margin-bottom:16px;">Account</h3>
      <div class="form-grid">
        <div class="form-field"><label>Full name</label><input class="input" value="Jordan Admin"></div>
        <div class="form-field"><label>Email</label><input class="input" value="admin@writeable-platform.org"></div>
        <div class="form-field"><label>Role</label><input class="input" value="${ROLES[STATE.role].label}" disabled></div>
        <div class="form-field"><label>Organization</label><input class="input" value="WriteAble Platform HQ"></div>
      </div>
      <button class="btn btn-primary btn-sm" style="margin-top:14px;" id="save-account">Save changes</button>
    </div>`;
  }
  function settingsSecurity(){
    const rows = DB.auditLog.slice(0,60);
    return `
      <div class="card card-pad" style="margin-bottom:20px;">
        <h3 style="margin-bottom:14px;">Session &amp; access</h3>
        <div class="settings-row"><div><div class="t">Session timeout</div><div class="d">Automatically log out after a period of inactivity.</div></div><select class="select" id="session-timeout"><option>15 minutes</option><option selected>30 minutes</option><option>60 minutes</option></select></div>
        <div class="settings-row"><div><div class="t">Two-factor authentication</div><div class="d">Require a second verification step at login.</div></div><label class="switch"><input type="checkbox" checked><span class="slider"></span></label></div>
        <div class="settings-row"><div><div class="t">Log out of all other sessions</div><div class="d">Ends any active sessions on other devices.</div></div><button class="btn btn-outline btn-sm" id="btn-logout-others">Log out others</button></div>
      </div>
      <div class="card card-pad">
        <div class="card-head"><h3>Audit log</h3><span class="muted" style="font-size:0.8rem;">${DB.auditLog.length} events recorded</span></div>
        <table class="data-table"><thead><tr><th class="no-sort">Administrator</th><th class="no-sort">Action</th><th class="no-sort">Timestamp</th><th class="no-sort">Status</th></tr></thead>
        <tbody>${rows.map(r=>`<tr><td>${r.admin}</td><td>${r.action}</td><td class="mono">${r.timestamp.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})}</td><td><span class="badge ${r.status==='Successful'?'badge-active':r.status==='Denied'?'badge-higher':'badge-moderate'}"><span class="dot"></span>${r.status}</span></td></tr>`).join('')}</tbody></table>
      </div>`;
  }
  function settingsUsers(){
    if(!['superadmin','admin'].includes(STATE.role)) return unauthorizedState();
    return `
      <div class="card card-pad" style="margin-bottom:20px;">
        <div class="card-head"><h3>Platform users</h3><button class="btn btn-primary btn-sm">${icon('plus',14)} Invite user</button></div>
        <table class="data-table"><thead><tr><th class="no-sort">Name</th><th class="no-sort">Role</th><th class="no-sort">Status</th></tr></thead>
        <tbody>
          <tr><td>Jordan Admin</td><td>Super Administrator</td><td>${statusBadge('Active')}</td></tr>
          <tr><td>P. Whitfield</td><td>Administrator</td><td>${statusBadge('Active')}</td></tr>
          <tr><td>Dr. R. Owens</td><td>Clinician / Professional</td><td>${statusBadge('Active')}</td></tr>
          <tr><td>S. Nakagawa</td><td>Researcher</td><td>${statusBadge('Active')}</td></tr>
          <tr><td>R. Bello</td><td>Educator</td><td>${statusBadge('Pending')}</td></tr>
        </tbody></table>
      </div>
      <div class="card card-pad">
        <h3 style="margin-bottom:6px;">Role permissions</h3>
        <p class="muted" style="margin-bottom:14px;">Researcher can access anonymized research data. Administrator can manage users and screening records. Professional can review assigned patient screening records. Educator can view appropriate educational progress information.</p>
        <div style="overflow-x:auto;"><table class="perm-table"><thead><tr><th>Permission</th>${Object.values(ROLES).map(r=>`<th>${r.short}</th>`).join('')}</tr></thead>
        <tbody>${PERMISSIONS.map(p=>`<tr><td>${p.perm}</td>${Object.keys(ROLES).map(k=>`<td>${p[k]===1?`<span class="perm-yes">${icon('check',14)}</span>`:p[k]===0?`<span class="perm-no">—</span>`:`<span class="mono" style="font-size:0.72rem;">${p[k]}</span>`}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      </div>`;
  }
  function settingsNotifications(){
    return `<div class="card card-pad" style="max-width:640px;">
      <h3 style="margin-bottom:14px;">Email notifications</h3>
      ${[['High-priority alerts','Immediate email when a higher-indicator screening is recorded.'],['Follow-up reminders','Weekly digest of overdue follow-ups.'],['Weekly summary','A weekly platform activity summary.'],['System notifications','Maintenance and system-status updates.']].map(([t,d],i)=>`
      <div class="settings-row"><div><div class="t">${t}</div><div class="d">${d}</div></div><label class="switch"><input type="checkbox" ${i<3?'checked':''}><span class="slider"></span></label></div>`).join('')}
      </div>`;
  }
  function settingsOrg(){
    return `<div class="grid grid-2">
      <div class="card card-pad">
        <h3 style="margin-bottom:14px;">Organization profile</h3>
        <div class="form-field" style="margin-bottom:12px;"><label>Organization name</label><input class="input" value="WriteAble Platform HQ"></div>
        <div class="form-field" style="margin-bottom:12px;"><label>Primary contact</label><input class="input" value="admin@writeable-platform.org"></div>
        <button class="btn btn-primary btn-sm">Save changes</button>
      </div>
      <div class="card card-pad">
        <h3 style="margin-bottom:14px;">Associated schools &amp; organizations</h3>
        <ul style="margin:0; padding-left:18px;">${SCHOOLS.map(s=>`<li style="margin-bottom:6px;">${s}</li>`).join('')}</ul>
      </div></div>`;
  }
  function settingsScreening(){
    return `<div class="card card-pad" style="max-width:640px;">
      <h3 style="margin-bottom:6px;">Indicator threshold configuration</h3>
      <p class="muted" style="margin-bottom:18px;">Adjust the score cutoffs used to classify screenings. Changes here are illustrative in this prototype and would require validation before affecting live classification.</p>
      <div class="form-field" style="margin-bottom:18px;"><label>Lower / Moderate cutoff — <span id="cut1-val" class="mono">74</span></label><input type="range" id="cut1" min="60" max="85" value="74" style="width:100%; accent-color:var(--teal);"></div>
      <div class="form-field" style="margin-bottom:18px;"><label>Moderate / Higher cutoff — <span id="cut2-val" class="mono">55</span></label><input type="range" id="cut2" min="35" max="65" value="55" style="width:100%; accent-color:var(--teal);"></div>
      <div id="cutoff-preview" class="card card-pad" style="background:var(--surface-2); box-shadow:none;"></div>
      <h3 style="margin:22px 0 10px;">Included screening tasks</h3>
      ${TASK_DEFS.map(t=>`<label class="checkbox-row" style="margin-bottom:8px;"><input type="checkbox" checked> ${t.label}</label><br>`).join('')}
      </div>`;
  }
  function settingsPrivacy(){
    return `<div class="grid grid-2">
      <div class="card card-pad">
        <h3 style="margin-bottom:14px;">Data &amp; privacy</h3>
        <div class="settings-row"><div><div class="t">Anonymize research exports</div><div class="d">Strip patient names and IDs from research exports.</div></div><label class="switch"><input type="checkbox" checked><span class="slider"></span></label></div>
        <div class="settings-row"><div><div class="t">Data retention period</div><div class="d">How long screening records are retained.</div></div><select class="select"><option>2 years</option><option selected>5 years</option><option>7 years</option></select></div>
        <div class="settings-row"><div><div class="t">Restrict exports to authorized roles</div><div class="d">Only Administrator and Researcher roles may export data.</div></div><label class="switch"><input type="checkbox" checked><span class="slider"></span></label></div>
      </div>
      <div class="card card-pad">
        <h3 style="margin-bottom:10px;">Consent &amp; minimization</h3>
        <p class="muted">This platform is designed around data minimization — only information relevant to screening and progress monitoring is collected. Guardian consent is a prerequisite for enrolling a child, and identifiable information is limited wherever anonymized data will do.</p>
        <button class="btn btn-outline btn-sm">Request full data export (demo)</button>
      </div></div>`;
  }
  function settingsSystem(){
    return `
      <div class="card card-pad" style="margin-bottom:20px;">
        <div class="card-head"><h3>Environment</h3><span class="badge badge-moderate"><span class="dot"></span>Demo / prototype environment</span></div>
        <p class="muted" style="margin:0;">This portal runs entirely in your browser against a generated fictional dataset. No real patient data is stored or transmitted.</p>
      </div>
      <div class="card card-pad" style="margin-bottom:20px;">
        <h3 style="margin-bottom:10px;">Model &amp; pipeline</h3>
        <p style="margin:0 0 6px;"><b>${MODEL.version}</b> · ${MODEL.algorithmVersion}</p>
        <p class="muted" style="margin:0;">Last updated ${MODEL.lastUpdated}. See Analytics → Model Performance for full metrics.</p>
      </div>
      <div class="demo-panel">
        <h4>${icon('refresh',16)} Prototype demo controls <span class="tag">FOR DEMONSTRATION ONLY</span></h4>
        <p class="muted" style="margin:10px 0 14px;">These buttons preview realistic UI states that are otherwise hard to trigger live — useful when presenting this prototype.</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" data-demo="empty">Preview empty state</button>
          <button class="btn btn-outline btn-sm" data-demo="error">Preview network error</button>
          <button class="btn btn-outline btn-sm" data-demo="unauthorized">Preview unauthorized access</button>
          <button class="btn btn-outline btn-sm" data-demo="session">Preview session expired</button>
        </div>
      </div>`;
  }
  function wireSettingsPage(tab){
    $$('.tabs-bar [data-stab]').forEach(t => t.addEventListener('click', () => navigate('/settings/'+t.dataset.stab)));
    if(tab==='screening'){
      function updatePreview(){
        const c1=+$('#cut1').value, c2=+$('#cut2').value;
        $('#cut1-val').textContent=c1; $('#cut2-val').textContent=c2;
        let lower=0,mod=0,higher=0;
        DB.screenings.forEach(s=>{ if(s.overallScore==null) return; if(s.overallScore>=c1) lower++; else if(s.overallScore>=c2) mod++; else higher++; });
        $('#cutoff-preview').innerHTML = `<p style="margin:0; font-size:0.85rem;">With these cutoffs: <b>${lower.toLocaleString()}</b> Lower · <b>${mod.toLocaleString()}</b> Moderate · <b>${higher.toLocaleString()}</b> Higher (recomputed live from current screening data).</p>`;
      }
      $('#cut1').addEventListener('input', updatePreview); $('#cut2').addEventListener('input', updatePreview); updatePreview();
    }
    if(tab==='system'){
      $$('button[data-demo]').forEach(b => b.addEventListener('click', () => {
        const kind = b.dataset.demo;
        if(kind==='empty') $('#page-root').innerHTML = `<div class="card"><div class="state-empty">${icon('search',44)}<h4>No screening records yet.</h4><p>Screening records will appear here once assessments are completed.</p></div></div>`;
        if(kind==='error') $('#page-root').innerHTML = `<div class="card"><div class="state-empty">${icon('warning',44)}<h4>Network error</h4><p>We couldn't reach the server. Check your connection and try again.</p><button class="btn btn-outline btn-sm" style="margin-top:12px;" onclick="location.hash='#/settings/system'">Retry</button></div></div>`;
        if(kind==='unauthorized') $('#page-root').innerHTML = unauthorizedState();
        if(kind==='session') openSessionExpiredModal();
      }));
    }
    $$('#save-account').forEach && null;
    const saveAccount = $('#save-account'); if(saveAccount) saveAccount.addEventListener('click', ()=>toast('Account changes saved'));
    const logoutOthers = $('#btn-logout-others'); if(logoutOthers) logoutOthers.addEventListener('click', ()=>toast('Logged out of all other sessions'));
  }

  /* ---------------------------------------------------------------------
     Session expired (demo)
  --------------------------------------------------------------------- */
  function openSessionExpiredModal(){
    openModal(`<div class="modal-head"><h3>${icon('lock',18)} Your session has expired</h3></div>
      <div class="modal-body"><p>For your security, you've been signed out after a period of inactivity. Please log in again to continue.</p></div>
      <div class="modal-foot"><button class="btn btn-primary" id="session-relogin">Log in again</button></div>`);
    $('#session-relogin').addEventListener('click', () => { closeModal(); doLogout(); });
  }

  /* ---------------------------------------------------------------------
     Sidebar / topbar / dropdowns
  --------------------------------------------------------------------- */
  function renderSidebar(){
    $('#sidebar-nav').innerHTML = NAV.map(n => `<div class="nav-item" data-route="${n.key}">${icon(n.icon,18)}<span class="nav-label">${n.label}</span></div>`).join('');
    $$('#sidebar-nav .nav-item').forEach(n => n.addEventListener('click', () => navigate('/'+n.dataset.route)));
  }
  function updateProfileChrome(){
    const user=STATE.user || {};
    const name=user.name || user.full_name || user.email || 'Administrator';
    const roleConfig=ROLES[STATE.role] || ROLES.educator || {label:'Educator',short:'Educator'};
    $('#sidebar-name').textContent=name;
    $('#sidebar-role').textContent=roleConfig.label;
    $('#topbar-role-pill').textContent=roleConfig.short;
  }
  function renderNotifPanel(){
    const openAlerts = DB.alerts.filter(a=>a.status==='Open').slice(0,6);
    $('#notif-badge').style.display = openAlerts.length ? 'block':'none';
    $('#panel-notifications').innerHTML = `<div class="dropdown-head">Notifications</div>` +
      (openAlerts.length ? openAlerts.map(a=>`<div class="dropdown-item" data-goto-alert="${a.id}"><div class="t">${a.title}</div><div class="m">${a.message}</div></div>`).join('') : `<div class="dropdown-item"><div class="m">No new notifications.</div></div>`) +
      `<div class="dropdown-item" style="text-align:center; font-weight:600; color:var(--teal-600);" id="view-all-alerts">View all alerts</div>`;
  }
  function renderProfilePanel(){
  const user = STATE.user || getStoredUser() || {};

  const fullName =
    [user.first_name, user.last_name]
      .filter(Boolean)
      .join(' ')
    || user.name
    || user.full_name
    || user.email
    || 'Administrator';

  const email = user.email || '—';
  const role = user.role || STATE.role || 'educator';

  return `
    <div class="profile-panel">
      <div class="profile-name">${fullName}</div>
      <div class="profile-email">${email}</div>
      <div class="profile-role">${role}</div>
    </div>
  `;
}
  function wireTopbar(){
    const themeButton = $('#btn-theme');
    if(themeButton){
      themeButton.addEventListener('click', () => {
        STATE.theme = STATE.theme==='light' ? 'dark':'light';
        document.documentElement.setAttribute('data-theme', STATE.theme);
      });
    }

    const collapseButton = $('#btn-collapse-sidebar');
    if(collapseButton){
      collapseButton.addEventListener('click', () => {
        STATE.sidebarCollapsed = !STATE.sidebarCollapsed;
        $('#sidebar')?.classList.toggle(
          'is-collapsed',
          STATE.sidebarCollapsed
        );
      });
    }

    const mobileButton = $('#btn-mobile-nav');
    if(mobileButton){
      mobileButton.addEventListener(
        'click',
        () => $('#sidebar')?.classList.toggle('is-mobile-open')
      );
    }

    const logoutButton = $('#btn-logout');
    if(logoutButton){
      logoutButton.addEventListener(
        'click',
        () => confirmAction(
          'Log out?',
          'You will need to sign in again to access the admin portal.',
          'Log out',
          doLogout
        )
      );
    }

    function toggleDropdown(panelId){
      const panel = $(panelId);
      if(!panel) return;

      const open = panel.classList.contains('is-open');
      $$('.dropdown-panel').forEach(
        p => p.classList.remove('is-open')
      );

      if(!open){
        panel.classList.add('is-open');
      }
    }

    const notificationsButton = $('#btn-notifications');
    if(notificationsButton){
      notificationsButton.addEventListener('click', e => {
        e.stopPropagation();
        renderNotifPanel();
        toggleDropdown('#panel-notifications');
      });
    }

    const profileButton = $('#btn-profile-menu');
    if(profileButton){
      profileButton.addEventListener('click', e => {
        e.stopPropagation();
        const panel = $('#panel-profile');
        if(!panel) return;

        renderProfilePanel();

        toggleDropdown('#panel-profile');

        const roleSwitch = $('#role-switch');
        if(roleSwitch && !roleSwitch.dataset.wired){
          roleSwitch.dataset.wired = '1';
          roleSwitch.addEventListener('change', e2 => {
            STATE.role = e2.target.value;
            updateProfileChrome();
            toast(
              'Switched demo role to ' +
              ROLES[STATE.role].label
            );
            renderRoute2();
          });
        }

        const menuLogout = $('#menu-logout');
        if(menuLogout && !menuLogout.dataset.wired){
          menuLogout.dataset.wired = '1';
          menuLogout.addEventListener(
            'click',
            () => confirmAction(
              'Log out?',
              'You will need to sign in again to access the admin portal.',
              'Log out',
              doLogout
            )
          );
        }

        $$('.menu-item[data-nav]', panel)
          .forEach(item => {
            if(item.dataset.wired) return;
            item.dataset.wired = '1';
            item.addEventListener(
              'click',
              () => navigate('/' + item.dataset.nav)
            );
          });
      });
    }

    document.addEventListener(
      'click',
      () => $$('.dropdown-panel').forEach(
        p => p.classList.remove('is-open')
      )
    );

    const notificationPanel = $('#panel-notifications');
    if(notificationPanel){
      notificationPanel.addEventListener('click', e => {
        const item =
          e.target.closest('[data-goto-alert]');

        if(item || e.target.id === 'view-all-alerts'){
          navigate('/alerts');
        }
      });
    }

    const helpButton = $('#btn-help');
    if(helpButton){
      helpButton.addEventListener(
        'click',
        () => openModal(
          `<div class="modal-head">
             <h3>Help &amp; support</h3>
             <button class="icon-btn" data-close>
               ${icon('close',16)}
             </button>
           </div>
           <div class="modal-body">
             <p>This is a prototype admin portal for the WriteAble screening platform. Hover the <span class="info-dot">i</span> icons throughout the dashboard for explanations of specific metrics.</p>
             <p class="muted">For a real deployment, this panel would link to product documentation and a support contact.</p>
           </div>
           <div class="modal-foot">
             <button class="btn btn-primary" data-close>Close</button>
           </div>`
        )
      );
    }

    const globalSearch = $('#global-search');
    if(globalSearch){
      globalSearch.addEventListener('keydown', e => {
        if(e.key !== 'Enter') return;

        const q = e.target.value.trim();
        if(!q) return;

        const patients =
          DB.patients || [];

        const screenings =
          DB.screenings || [];

        const p = patients.find(
          patient =>
            String(patient.id || '')
              .toLowerCase()
              .includes(q.toLowerCase()) ||
            String(patient.name || '')
              .toLowerCase()
              .includes(q.toLowerCase())
        );

        const s = screenings.find(
          screening =>
            String(screening.id || '')
              .toLowerCase()
              .includes(q.toLowerCase())
        );

        if(p){
          navigate('/patients/' + p.id);
        }else if(s){
          navigate('/screenings/' + s.id);
        }else{
          navigate('/patients');
          toast(
            'No exact match — showing Patients'
          );
        }
      });
    }
  }

  /* ---------------------------------------------------------------------
     Post-render wiring dispatcher
  --------------------------------------------------------------------- */
  function wireCurrentPage(){
    const { section, param } = parseHash();
    if(!canAccess(section)) return;
    if(section==='dashboard') {
      initDashboardCharts();
      $('#btn-refresh-dashboard')?.addEventListener('click', async () => {
        STATE.dashboardData = null;
        await renderRoute2();
      });
    }
    if(section==='patients') param ? wirePatientProfile(param) : wirePatientsPage();
    if(section==='screenings') param ? wireScreeningDetail(param) : wireScreeningsPage();
    if(section==='progress') wireProgressPage();
    if(section==='analytics') wireAnalyticsPage(param||'trends');
    if(section==='alerts') wireAlertsPage();
    if(section==='reports') wireReportsPage();
    if(section==='research') wireResearchPage();
    if(section==='settings') wireSettingsPage(param||'account');
  }
  
  // wrap renderRoute to also wire interactivity after content injection
  async function renderRoute2(){
    if(!STATE.authenticated) return;
    const { section, param } = parseHash();
    if(section !== 'dashboard' && dashboardRefreshTimer){
      clearInterval(dashboardRefreshTimer);
      dashboardRefreshTimer = null;
    }
    STATE.route=section; STATE.routeParam=param;
    $$('.nav-item').forEach(n=>n.classList.toggle('is-active',n.dataset.route===section));
    $('#topbar-title').textContent=section==='patients'&&param?'Patient profile':(section==='screenings'&&param?'Screening detail':(TITLES[section]||'Dashboard'));
    const root=$('#page-root');
    Object.keys(charts).forEach(destroyChart);
    if(!ROUTES[section]){ root.innerHTML=notFound(); return; }
    if(!canAccess(section)){ root.innerHTML=unauthorizedState(); return; }

    root.innerHTML=skeletonPage();

    try{
      await loadLiveScreenings();
      if(section === 'patients' || section === 'dashboard'){
        await loadLivePatients();
      }
      if(section === 'patients' && param){
        const livePatient = await loadLivePatient(param);
        if(livePatient){
          const normalized = normalizeLivePatient(livePatient);
          const idx = DB.patients.findIndex(p => String(p.id) === String(param));
          if(idx >= 0) DB.patients[idx] = normalized;
          else DB.patients.push(normalized);
        }
      }
      if(section === 'dashboard'){
        await loadLiveDashboard();
        if(!dashboardRefreshTimer){
          dashboardRefreshTimer = setInterval(() => {
            if(parseHash().section === 'dashboard'){
              STATE.dashboardData = null;
              renderRoute2();
            }
          }, 60000);
        }
      }
      root.innerHTML=ROUTES[section](param);
      wireCurrentPage();
    }catch(error){
      console.error('Admin live data error:',error);
      root.innerHTML=`<div class="card card-pad"><div class="state-empty">
        ${icon('warning',44)}
        <h4>Unable to load screening data</h4>
        <p>${error.message}</p>
        <button class="btn btn-primary" id="retry-live-screenings">Try again</button>
      </div></div>`;
      const retry=$('#retry-live-screenings');
      if(retry) retry.addEventListener('click',()=>{ liveScreeningsLoaded=false; renderRoute2(); });
    }
    $('#sidebar').classList.remove('is-mobile-open');
  }

async function loadScreeningReport(
    screeningId
){

    const response =
        await authenticatedFetch(
            `${ADMIN_API_BASE_URL}/screenings/${encodeURIComponent(
                screeningId
            )}/report`,
            {
                method: "GET"
            }
        );

    if(!response.ok){

        let message =
            "Failed to load screening report.";

        try{

            const payload =
                await response.json();

            message =
                payload.message ||
                message;

        }catch(error){
            // ignore JSON parsing error
        }

        throw new Error(message);
    }

    const payload =
        await response.json();

    if(
        !payload.success ||
        !payload.data
    ){

        throw new Error(
            payload.message ||
            "Invalid screening report."
        );
    }

    return payload.data;
}
let adminReportImageUrls = [];
async function openAdminScreeningReport(
    screeningId
){

    try{

        const report =
            await loadScreeningReport(
                screeningId
            );

        adminReportImageUrls.forEach(
            url => URL.revokeObjectURL(url)
        );

        adminReportImageUrls = [];

        let modal =
            document.getElementById(
                "admin-screening-report-modal"
            );

        if(!modal){

            modal =
                document.createElement(
                    "div"
                );

            modal.id =
                "admin-screening-report-modal";

            modal.className =
                "admin-report-modal";

            document.body.appendChild(
                modal
            );
        }

        modal.innerHTML = `
            <div class="admin-report-overlay"></div>

            <div class="admin-report-dialog">

                <div class="admin-report-toolbar no-print">

                    <div>
                        <strong>
                            WriteAble Screening Report
                        </strong>

                        <small>
                            Participation ID:
                            ${escapeHtml(
                                report.screening.participation_id ||
                                "—"
                            )}
                        </small>
                    </div>

                    <div class="admin-report-actions">

                        <button
                            class="btn btn-primary btn-sm"
                            id="admin-report-print"
                            type="button"
                        >
                            Print Report / Save PDF
                        </button>

                        <button
                            class="btn btn-outline btn-sm"
                            id="admin-recommendations-print"
                            type="button"
                        >
                            Print Recommendations
                        </button>

                        <button
                            class="btn btn-outline btn-sm"
                            id="admin-report-close"
                        >
                            Close
                        </button>

                    </div>

                </div>

                <div
                    id="admin-report-content"
                    class="admin-report-content"
                >

                    <div class="admin-report-header">

                        <div>

                            <div class="admin-report-brand">
                                WRITEABLE
                            </div>

                            <h1>
                                Handwriting Screening Report
                            </h1>

                            <p>
                                Screening evidence and
                                recommendations
                            </p>

                        </div>

                        <div class="admin-report-meta">

                            <div>
                                <span>
                                    Participation ID
                                </span>

                                <strong>
                                    ${escapeHtml(
                                        report.screening.participation_id ||
                                        "—"
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Screening ID
                                </span>

                                <strong>
                                    ${escapeHtml(
                                        String(
                                            report.screening.id
                                        )
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Screening Code
                                </span>

                                <strong>
                                    ${escapeHtml(
                                        report.screening.screening_code ||
                                        "—"
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Date
                                </span>

                                <strong>
                                    ${formatAdminReportDate(
                                        report.screening.started_at
                                    )}
                                </strong>
                            </div>

                        </div>

                    </div>


                    <section class="admin-report-section">

                        <h2>
                            Screening Indicator
                        </h2>

                        <div class="
                            admin-report-indicator
                            ${escapeHtml(
                                report.interpretation.indicator
                            )}
                        ">

                            <strong>
                                ${escapeHtml(
                                    formatAdminIndicator(
                                        report.interpretation.indicator
                                    )
                                )}
                            </strong>

                            <span>
                                ${
                                    report.interpretation.evidence_count
                                }
                                analyzed task${
                                    report.interpretation.evidence_count === 1
                                        ? ""
                                        : "s"
                                }
                            </span>

                        </div>

                        <div class="admin-report-evidence">

                            <div>
                                <span>
                                    Potential Dysgraphia
                                </span>

                                <strong>
                                    ${
                                        report.interpretation.potential_count
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Low Potential Dysgraphia
                                </span>

                                <strong>
                                    ${
                                        report.interpretation.low_count
                                    }
                                </strong>
                            </div>

                        </div>

                    </section>


                    <section class="admin-report-section">

                        <h2>
                            Interpretation
                        </h2>

                        <div class="admin-report-explanation">

                            <p>
                                ${escapeHtml(
                                    report.interpretation.explanation
                                )}
                            </p>

                        </div>

                    </section>


                    <section class="admin-report-section">

                        <h2>
                            Handwriting Samples & Predictions
                        </h2>

                        <div
                            id="admin-report-tasks"
                            class="admin-report-tasks"
                        >
                            Loading…
                        </div>

                    </section>


                    <section class="admin-report-section">

                        <h2>
                            Recommendations
                        </h2>

                        <div class="admin-report-recommendations" id="admin-report-recommendations">

                            ${
                                report.recommendations
                                    .map(
                                        item => `
                                            <div class="admin-report-recommendation">

                                                <strong>
                                                    ${escapeHtml(
                                                        item.title
                                                    )}
                                                </strong>

                                                <p>
                                                    ${escapeHtml(
                                                        item.description
                                                    )}
                                                </p>

                                            </div>
                                        `
                                    )
                                    .join("")
                            }

                        </div>

                    </section>


                    <section class="admin-report-disclaimer">

                        <strong>
                            Important Disclaimer
                        </strong>

                        <p>
                            ${escapeHtml(
                                report.disclaimer
                            )}
                        </p>

                    </section>


                    <footer class="admin-report-footer">

                        <span>
                            WriteAble
                        </span>

                        <span>
                            Generated:
                            ${formatAdminReportDate(
                                report.generated_at
                            )}
                        </span>

                    </footer>

                </div>

            </div>
        `;

        modal.classList.add(
            "is-open"
        );

        document.body.classList.add(
            "admin-report-open"
        );

        await renderAdminReportTasks(
            report
        );

        document
            .getElementById(
                "admin-report-close"
            )
            ?.addEventListener(
                "click",
                closeAdminScreeningReport
            );

        document
            .querySelector(
                ".admin-report-overlay"
            )
            ?.addEventListener(
                "click",
                closeAdminScreeningReport
            );

        document
            .getElementById(
                "admin-report-print"
            )
            ?.addEventListener(
                "click",
                () => printAdminReportElement(
                    document.getElementById("admin-report-content"),
                    "WriteAble Screening Report"
                )
            );

        document
            .getElementById(
                "admin-recommendations-print"
            )
            ?.addEventListener(
                "click",
                () => printAdminReportElement(
                    document.getElementById("admin-report-recommendations"),
                    "WriteAble Recommendations"
                )
            );

    }catch(error){

        console.error(
            "Admin report error:",
            error
        );

        alert(
            error.message ||
            "Unable to generate screening report."
        );
    }
}
async function printAdminReportElement(
    element,
    title = "WriteAble Document"
){
    if(!element){
        alert("The document is not available for printing.");
        return;
    }

    const printWindow =
        window.open(
            "",
            "_blank",
            "width=1000,height=800"
        );

    if(!printWindow){
        alert("Please allow pop-ups for printing.");
        return;
    }

    const cloned =
        element.cloneNode(true);

    cloned
        .querySelectorAll(".no-print")
        .forEach(node => node.remove());

    const styleLinks =
        Array.from(
            document.querySelectorAll(
                'link[rel="stylesheet"]'
            )
        )
        .map(link => link.outerHTML)
        .join("\n");

    const inlineStyles =
        Array.from(
            document.querySelectorAll("style")
        )
        .map(style => `<style>${style.innerHTML}</style>`)
        .join("\n");

    printWindow.document.open();

    printWindow.document.write(`
        <!doctype html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${escapeHtml(title)}</title>
            ${styleLinks}
            ${inlineStyles}
            <style>
                @page{
                    size:A4;
                    margin:14mm;
                }

                body{
                    background:#fff !important;
                }

                .admin-report-image,
                .admin-report-task,
                .admin-report-recommendation{
                    break-inside:avoid;
                    page-break-inside:avoid;
                }

                img{
                    max-width:100%;
                    height:auto;
                }
            </style>
        </head>
        <body>
            ${cloned.outerHTML}
        </body>
        </html>
    `);

    printWindow.document.close();

    const waitForImages = () => {
        const images =
            Array.from(
                printWindow.document.images
            );

        return Promise.all(
            images.map(image => {
                if(image.complete){
                    return Promise.resolve();
                }

                return new Promise(resolve => {
                    image.addEventListener(
                        "load",
                        resolve,
                        {once:true}
                    );

                    image.addEventListener(
                        "error",
                        resolve,
                        {once:true}
                    );
                });
            })
        );
    };

    try{
        await waitForImages();
        await new Promise(
            resolve => setTimeout(resolve, 200)
        );

        printWindow.focus();
        printWindow.print();
    }finally{
        setTimeout(
            () => printWindow.close(),
            1000
        );
    }
}

function formatAdminIndicator(
    indicator
){

    const labels = {
        higher: "Higher Indicator",
        low: "Low Indicator",
        inconclusive: "Inconclusive"
    };

    return labels[indicator] ||
        "Inconclusive";
}


function formatAdminReportDate(
    value
){

    if(!value){
        return "—";
    }

    const date =
        new Date(value);

    if(Number.isNaN(date.getTime())){
        return "—";
    }

    return date.toLocaleString(
        "en-KE",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}


function adminReportPercentage(
    value
){

    if(
        value === null ||
        value === undefined
    ){
        return "—";
    }

    return (
        Number(value) * 100
    ).toFixed(1) + "%";
}


function closeAdminScreeningReport(){

    const modal =
        document.getElementById(
            "admin-screening-report-modal"
        );

    if(modal){

        modal.classList.remove(
            "is-open"
        );
    }

    document.body.classList.remove(
        "admin-report-open"
    );

    adminReportImageUrls.forEach(
        url => URL.revokeObjectURL(url)
    );

    adminReportImageUrls = [];
}async function renderAdminReportTasks(
    report
){

    const container =
        document.getElementById(
            "admin-report-tasks"
        );

    if(!container){
        return;
    }

    if(!report.tasks.length){

        container.innerHTML = `
            <div class="admin-report-empty">
                No screening tasks were recorded.
            </div>
        `;

        return;
    }

    const output = [];

    for(
        const task of report.tasks
    ){

        let images = "";

        if(
            task.images &&
            task.images.length
        ){

            const imageParts = [];

            for(
                const image of task.images
            ){

                try{

                    const url =
                        await loadAuthenticatedImage(
                            image.id
                        );

                    adminReportImageUrls.push(
                        url
                    );

                    imageParts.push(`
                        <div class="admin-report-image">

                            <img
                                src="${url}"
                                alt="Handwriting sample"
                            >

                            <small>
                                ${escapeHtml(
                                    image.original_filename ||
                                    "Handwriting sample"
                                )}
                            </small>

                        </div>
                    `);

                }catch(error){

                    console.error(
                        error
                    );

                    imageParts.push(`
                        <div class="admin-report-image-error">
                            Unable to load handwriting image.
                        </div>
                    `);
                }
            }

            images =
                `<div class="admin-report-images">
                    ${imageParts.join("")}
                </div>`;

        }else{

            images = `
                <div class="admin-report-no-image">
                    No handwriting image available.
                </div>
            `;
        }

        const prediction =
            task.prediction;

        output.push(`
            <article class="admin-report-task">

                <div class="admin-report-task-top">

                    <div>

                        <small>
                            TASK ${escapeHtml(
                                String(task.id)
                            )}
                        </small>

                        <h3>
                            ${escapeHtml(
                                task.title
                            )}
                        </h3>

                    </div>

                    <strong class="
                        admin-prediction-badge
                        ${
                            prediction &&
                            String(
                                prediction.predicted_class
                            ).toLowerCase()
                                .includes(
                                    "potential dysgraphia"
                                ) &&
                            !String(
                                prediction.predicted_class
                            ).toLowerCase()
                                .includes(
                                    "low potential"
                                )
                                ? "potential"
                                : "low"
                        }
                    ">
                        ${
                            prediction
                            ? escapeHtml(
                                prediction.predicted_class
                            )
                            : "Not analyzed"
                        }
                    </strong>

                </div>

                ${images}

                <div class="admin-report-prediction-grid">

                    <div>
                        <span>
                            Probability
                        </span>

                        <strong>
                            ${
                                prediction
                                ? adminReportPercentage(
                                    prediction.probability
                                )
                                : "—"
                            }
                        </strong>
                    </div>

                    <div>
                        <span>
                            Confidence
                        </span>

                        <strong>
                            ${
                                prediction
                                ? adminReportPercentage(
                                    prediction.confidence
                                )
                                : "—"
                            }
                        </strong>
                    </div>

                    <div>
                        <span>
                            Model
                        </span>

                        <strong>
                            ${
                                prediction
                                ? escapeHtml(
                                    prediction.model_name
                                )
                                : "—"
                            }
                        </strong>
                    </div>

                    <div>
                        <span>
                            Version
                        </span>

                        <strong>
                            ${
                                prediction
                                ? escapeHtml(
                                    prediction.model_version
                                )
                                : "—"
                            }
                        </strong>
                    </div>

                </div>

            </article>
        `);
    }

    container.innerHTML =
        output.join("");
}
  /* ---------------------------------------------------------------------
     Login
  --------------------------------------------------------------------- */
  const LOGIN_API_URL = `${ADMIN_API_BASE_URL}/auth/login`;
  function renderLoginIllustration(){
    const mount = $('#login-illustration'); if(!mount) return;
    mount.innerHTML = `<svg viewBox="0 0 260 150" width="100%" style="max-width:320px;">
      <rect x="10" y="10" width="150" height="110" rx="10" fill="#132C40"/>
      ${[0,1,2,3].map(i=>`<line x1="24" y1="${34+i*22}" x2="146" y2="${34+i*22}" stroke="#23405A" stroke-width="1"/>`).join('')}
      <path d="M24 100 C 40 70,55 70,66 88 C 77 106,92 70,110 60" stroke="#7FC7C2" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <circle cx="200" cy="45" r="30" fill="#0E2233" stroke="#23405A"/>
      <path d="M188 46l8 8 16-16" stroke="#7FC7C2" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="170" y="90" width="70" height="40" rx="8" fill="#0E2233" stroke="#23405A"/>
      <rect x="180" y="100" width="50" height="6" rx="3" fill="#23405A"/><rect x="180" y="112" width="34" height="6" rx="3" fill="#23405A"/>
    </svg>`;
  }
  function setFieldError(id, msg){ const err=$('#err-'+id), input=$('#login-'+id); if(msg){ err.textContent=msg; err.hidden=false; err.innerHTML = icon('warning',14)+`<span>${msg}</span>`; input.classList.add('has-error'); } else { err.hidden=true; input.classList.remove('has-error'); } }
  function setLoginBanner(html){ $('#login-banner-slot').innerHTML = html||''; }
  function initLogin(){
    renderLoginIllustration();
    const form = $('#login-form');
    $('#toggle-pw').addEventListener('click', () => { const inp=$('#login-password'); inp.type = inp.type==='password'?'text':'password'; });
    $('#btn-forgot').addEventListener('click', () => openModal(`<div class="modal-head"><h3>Reset password</h3><button class="icon-btn" data-close>${icon('close',16)}</button></div><div class="modal-body"><div class="form-field"><label>Email</label><input class="input" placeholder="you@organization.org"></div></div><div class="modal-foot"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="send-reset">Send reset link</button></div>`) );
    document.addEventListener('click', e => { if(e.target.closest('[data-close]')) closeModal(); const b=e.target.closest('#send-reset'); if(b){ closeModal(); toast('If that account exists, a reset link has been sent.'); } });
    $('#btn-contact-admin').addEventListener('click', () => openModal(`<div class="modal-head"><h3>Contact administrator</h3><button class="icon-btn" data-close>${icon('close',16)}</button></div><div class="modal-body"><p>For access issues, contact your organization's platform administrator at <b>support@writeable-platform.org</b>.</p></div><div class="modal-foot"><button class="btn btn-primary" data-close>Close</button></div>`));

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if(STATE.locked) return;
      const email = $('#login-email').value.trim();
      const pass = $('#login-password').value;
      let ok = true;
      setFieldError('email',''); setFieldError('password','');
      if(!email){ setFieldError('email','Email or username is required.'); ok=false; }
      else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ setFieldError('email','Enter a valid email address.'); ok=false; }
      if(!pass){ setFieldError('password','Password is required.'); ok=false; }
      if(!ok) return;

      const btn = $('#btn-login');
      btn.disabled=true; btn.innerHTML=`<span class="spinner"></span> Signing in…`;

      try{
        const response=await fetch(LOGIN_API_URL,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({email,password:pass})
        });

        let payload={};
        try{ payload=await response.json(); }catch(_){}

        if(!response.ok || !payload.success){
          throw new Error(payload.message || 'Invalid email or password.');
        }

        const token=payload.token || payload.data?.token;
        const user=payload.user || payload.data?.user || {};
        if(!token) throw new Error('Login succeeded but no authentication token was returned.');

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        STATE.authenticated=true;
        STATE.failCount=0;
        STATE.role=user.role || 'educator';
        STATE.user=user;
        liveScreeningsLoaded=false;
        updateProfileChrome();
        setLoginBanner('');
        toast('Welcome back');
        $('#view-login').style.display='none';
        $('#view-app').classList.add('is-active');
        if(!location.hash) location.hash='#/dashboard'; else renderRoute2();
      }catch(error){
        console.error('Admin login error:',error);
        btn.disabled=false; btn.textContent='Log in';
        setFieldError('password',error.message || 'Unable to sign in.');
      }
    });
  }
  function doLogout(){
    STATE.authenticated = false;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    STATE.user=null;
    $('#view-app').classList.remove('is-active');
    $('#view-login').style.display='grid';
    $('#login-password').value=''; STATE.failCount=0; STATE.locked=false;
    setLoginBanner(''); $$('.login-form-wrap input').forEach(i=>i.classList.remove('has-error'));
    location.hash = '';
    toast('You have been logged out');
  }
  function getAuthToken(){
  return localStorage.getItem('token');
}
async function restoreSession(){
  const token = getAuthToken();

  if(!token){
    return;
  }

  const storedUser = getStoredUser();

  STATE.user = storedUser || {};
  STATE.role = STATE.user.role || 'educator';

  try {
    await loadLiveScreenings(true);

    STATE.authenticated = true;

    updateProfileChrome();

    $('#view-login').style.display = 'none';
    $('#view-app').classList.add('is-active');

    if(!location.hash){
      location.hash = '#/dashboard';
    } else {
      await renderRoute2();
    }

  } catch(error) {
    console.warn('Session restore failed:', error);

    localStorage.removeItem('token');
    localStorage.removeItem('user');

    STATE.authenticated = false;
    STATE.user = null;

    $('#view-login').style.display = 'grid';
    $('#view-app').classList.remove('is-active');
  }
}
  /* ---------------------------------------------------------------------
     Init
  --------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    if(window.Chart) Chart.defaults.font.family = 'Inter, sans-serif';
    renderSidebar();
    updateProfileChrome();
    wireTopbar();
    initLogin();
    window.removeEventListener('hashchange', renderRoute);
    window.addEventListener('hashchange', renderRoute2);
    restoreSession();
  });
})();
