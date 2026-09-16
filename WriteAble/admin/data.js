/* =========================================================================
   WriteAble Admin — data.js
   Static reference data (nav, roles, icons, report types) plus a seeded,
   in-browser generator that builds a full fictional patient/screening
   database so every KPI, chart and table is computed, not hardcoded.
   Model metrics are reused verbatim from the patient-facing WriteAble
   site's own reported experimental results, to keep the two prototypes
   consistent as one connected platform.
   ========================================================================= */

const ICONS = {
  dashboard:  '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  patients:   '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14a5 5 0 0 1 5.5 5"/>',
  screenings: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3M8 10h8M8 14h8M8 18h5"/>',
  progress:   '<path d="M4 18 9 11l4 3 7-9"/><path d="M14 4h6v6"/>',
  analytics:  '<path d="M4 20V10M11 20V4M18 20v-7"/><path d="M2 20h20"/>',
  alerts:     '<path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M9.5 21a2.5 2.5 0 0 0 5 0"/>',
  reports:    '<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  research:   '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  settings:   '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a1.8 1.8 0 0 0 .36 1.98l.06.06a2.16 2.16 0 1 1-3.06 3.06l-.06-.06a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.09 1.65V19.6a2.16 2.16 0 1 1-4.32 0v-.09A1.8 1.8 0 0 0 8.2 17.86a1.8 1.8 0 0 0-1.98.36l-.06.06a2.16 2.16 0 1 1-3.06-3.06l.06-.06a1.8 1.8 0 0 0 .36-1.98A1.8 1.8 0 0 0 1.87 12H1.8a2.16 2.16 0 1 1 0-4.32h.09A1.8 1.8 0 0 0 3.54 6.6a1.8 1.8 0 0 0-.36-1.98l-.06-.06a2.16 2.16 0 1 1 3.06-3.06l.06.06a1.8 1.8 0 0 0 1.98.36H8.4A1.8 1.8 0 0 0 9.49.63V.6a2.16 2.16 0 1 1 4.32 0v.09A1.8 1.8 0 0 0 15.8 2.14a1.8 1.8 0 0 0 1.98-.36l.06-.06a2.16 2.16 0 1 1 3.06 3.06l-.06.06a1.8 1.8 0 0 0-.36 1.98v.09c.16.7.68 1.26 1.36 1.49H22a2.16 2.16 0 1 1 0 4.32h-.09A1.8 1.8 0 0 0 19.4 13Z" fill="none"/>',
  search:     '<circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/>',
  bell:       '<path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M9.5 21a2.5 2.5 0 0 0 5 0"/>',
  help:       '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2 2-2 3.5M12 17h.01"/>',
  logout:     '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  chevronDown:'<path d="m6 9 6 6 6-6"/>',
  chevronLeft:'<path d="m15 18-6-6 6-6"/>',
  chevronRight:'<path d="m9 18 6-6-6-6"/>',
  close:      '<path d="M18 6 6 18M6 6l12 12"/>',
  check:      '<path d="M20 6 9 17l-5-5"/>',
  checkCircle:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  warning:    '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
  plus:       '<path d="M12 5v14M5 12h14"/>',
  download:   '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  upload:     '<path d="M12 21V9m0 0-4 4m4-4 4 4M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2"/>',
  filter:     '<path d="M4 5h16l-6 8v6l-4 2v-8Z"/>',
  eye:        '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/>',
  note:       '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  print:      '<path d="M6 9V3h12v6M6 18h12v4H6v-4Z"/><path d="M6 14h12v-1a3 3 0 0 0-3-3H9a3 3 0 0 0-3 3Z" fill="none"/><rect x="4" y="9" width="16" height="7" rx="1.4"/>',
  building:   '<path d="M4 21V6l8-4 8 4v15"/><path d="M9 21v-6h6v6M9 10h.01M9 14h.01M15 10h.01M15 14h.01"/>',
  calendar:   '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  trendUp:    '<path d="M3 17 9 11l4 3 8-9"/><path d="M13 5h6v6"/>',
  trendDown:  '<path d="M3 7 9 13l4-3 8 9"/><path d="M13 19h6v-6"/>',
  trendFlat:  '<path d="M3 12h18"/>',
  lock:       '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  database:   '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  fileCsv:    '<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/>',
  compare:    '<path d="M8 3v18M16 3v18M4 8h4M16 8h4M4 16h4M16 16h4"/>',
  shield:     '<path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5Z"/>',
  clock:      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  refresh:    '<path d="M20 11A8 8 0 0 0 6.2 6.2M4 13a8 8 0 0 0 13.8 4.8"/><path d="M20 4v6h-6M4 20v-6h6"/>',
};
function icon(key, size){ size=size||18; return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[key]||''}</svg>`; }

const NAV = [
  { key:'dashboard',  label:'Dashboard',          icon:'dashboard' },
  { key:'patients',   label:'Patients',           icon:'patients' },
  { key:'screenings', label:'Screenings',         icon:'screenings' },
  { key:'progress',   label:'Progress Monitoring',icon:'progress' },
  { key:'analytics',  label:'Analytics',          icon:'analytics' },
  { key:'alerts',     label:'Alerts',             icon:'alerts' },
  { key:'reports',    label:'Reports',            icon:'reports' },
  { key:'research',   label:'Research Data',      icon:'research' },
  { key:'settings',   label:'Settings',           icon:'settings' },
];

const ROLES = {
  superadmin: { label:'Super Administrator', short:'Super Admin' },
  admin:      { label:'Administrator',        short:'Administrator' },
  clinician:  { label:'Clinician / Professional', short:'Clinician' },
  researcher: { label:'Researcher',            short:'Researcher' },
  educator:   { label:'Educator',              short:'Educator' },
};

const PERMISSIONS = [
  { perm:'View all patient records',            superadmin:1, admin:1, clinician:'assigned', researcher:0, educator:'assigned' },
  { perm:'Manage users & roles',                superadmin:1, admin:1, clinician:0, researcher:0, educator:0 },
  { perm:'Edit screening records',              superadmin:1, admin:1, clinician:'assigned', researcher:0, educator:0 },
  { perm:'Access anonymized research data',     superadmin:1, admin:1, clinician:0, researcher:1, educator:0 },
  { perm:'View progress reports',               superadmin:1, admin:1, clinician:1, researcher:0, educator:'assigned' },
  { perm:'Export data',                         superadmin:1, admin:1, clinician:0, researcher:'anon only', educator:0 },
  { perm:'View model / system analytics',       superadmin:1, admin:1, clinician:0, researcher:1, educator:0 },
  { perm:'View audit log',                      superadmin:1, admin:1, clinician:0, researcher:0, educator:0 },
  { perm:'Manage organization settings',        superadmin:1, admin:0, clinician:0, researcher:0, educator:0 },
];

const REPORT_TYPES = [
  { key:'individual', name:'Individual Patient Report', desc:'Full screening history, progress timeline and recommendations for one patient.' },
  { key:'summary',     name:'Screening Summary', desc:'A single screening record formatted for sharing with a parent or professional.' },
  { key:'progress',    name:'Progress Report', desc:'Change across screenings for one patient, with trend charts.' },
  { key:'org',         name:'Organization Report', desc:'Aggregate screening activity and outcomes for one school or organization.' },
  { key:'monthly',     name:'Monthly Screening Report', desc:'Platform-wide screening volume and outcomes for a calendar month.' },
  { key:'research',    name:'Research Analytics Report', desc:'Anonymized, aggregate dataset summary for research purposes.' },
];

const TASK_DEFS = [
  { key:'letterFormation', label:'Letter Formation' },
  { key:'spacing',          label:'Spacing' },
  { key:'writingSpeed',     label:'Writing Speed' },
  { key:'alignment',        label:'Alignment' },
  { key:'copyingAccuracy',  label:'Copying Accuracy' },
  { key:'motorCoordination',label:'Motor Coordination' },
];

const SCHOOLS = ["Riverbend Elementary","Maple Grove Primary","Cedar Hill School","Northfield Academy","Lakeside Community School","Oakridge Primary","Harbor View Elementary","Sunridge Learning Center"];
const PROFESSIONALS = ["Dr. R. Owens (Clinical Psychologist)","M. Alvarez, OT (Occupational Therapist)","Dr. S. Okafor (Developmental Pediatrician)","J. Lindqvist, SLP (Speech-Language Pathologist)","T. Nakamura (Learning Support Teacher)","Dr. A. Petrova (Educational Psychologist)","C. Mensah, OT (Occupational Therapist)","R. Fitzgerald (SENCO)"];
const FIRST_NAMES = ["Alex","Jordan","Sam","Maria","Liam","Noah","Emma","Olivia","Mia","Ethan","Ava","Lucas","Sofia","Mason","Chloe","Amir","Zoe","Isla","Leo","Priya","Kwame","Nadia","Owen","Ruby","Theo","Yusuf","Ivy","Hana","Diego","Freya"];
const LAST_INITIALS = "ABCDEFGHJKLMNPRSTVW".split('');

const ADMIN_STAFF = ["Jordan Admin","P. Whitfield","S. Nakagawa","R. Bello"];

/* ---------------------------------------------------------------------
   Seeded RNG
--------------------------------------------------------------------- */
function makeRng(seed){
  let s = seed % 2147483647; if (s <= 0) s += 2147483646;
  return function(){ s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
function pick(rng, arr){ return arr[Math.floor(rng()*arr.length)]; }
function randInt(rng, min, max){ return Math.floor(min + rng()*(max-min+1)); }
function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
function fmtDate(d){
  if(!d) return '—';

  const date = d instanceof Date ? d : new Date(d);

  if(Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-US', {
    month:'short',
    day:'numeric',
    year:'numeric'
  });
}

function daysAgo(n){
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
const NOW = new Date('2026-09-05T09:30:00');

/* ---------------------------------------------------------------------
   Database generator
--------------------------------------------------------------------- */
function generateDatabase(){
  const rng = makeRng(20260905);
  const N_PATIENTS = 1248;
  const patients = [];
  const screenings = [];
  let screeningSeq = 1;

  for(let i=1;i<=N_PATIENTS;i++){
    const id = 'DS-' + String(i).padStart(4,'0');
    const age = randInt(rng,5,15);
    const grade = age<=5?'Kindergarten':`Grade ${clamp(age-5,1,10)}`;
    const school = pick(rng, SCHOOLS);
    const professional = pick(rng, PROFESSIONALS);
    const regDaysAgo = randInt(rng, 20, 540);
    const registrationDate = daysAgo(regDaysAgo);
    const statusRoll = rng();
    const status = statusRoll<0.85 ? 'Active' : (statusRoll<0.93 ? 'Pending' : 'Inactive');
    const name = `${pick(rng,FIRST_NAMES)} ${pick(rng,LAST_INITIALS)}.`;

    const nScreeningsRoll = rng();
    const nScreenings = nScreeningsRoll<0.35?1:(nScreeningsRoll<0.70?2:(nScreeningsRoll<0.90?3:4));
    const trajRoll = rng();
    const trajectory = nScreenings===1 ? 'insufficient' : (trajRoll<0.5?'improving':(trajRoll<0.8?'stable':'declining'));

    // baseline ability (higher = stronger performance across tasks), some patients simply start lower
    let baseline = clamp(randInt(rng,40,92), 30, 96);

    const patientScreenings = [];
    let cursorDaysAgo = null;

for(let s=0;s<nScreenings;s++){
  const date = null;
      let drift = 0;
      if(trajectory==='improving') drift = s * randInt(rng,2,5);
      if(trajectory==='declining') drift = -s * randInt(rng,2,5);

      const isIncomplete = rng() < 0.035;
      const isInvalid = !isIncomplete && rng() < 0.012;
      const isDuplicateLike = !isIncomplete && rng() < 0.008;

      const tasks = {};
      TASK_DEFS.forEach(t => {
        let v = isIncomplete ? null : clamp(Math.round(baseline + drift + (rng()-0.5)*22), 5, 100);
        if(isInvalid && t.key==='writingSpeed') v = 132; // out-of-range synthetic data issue
        tasks[t.key] = v;
      });
      const validScores = Object.values(tasks).filter(v=>v!==null && v<=100);
      const overallScore = isIncomplete ? null : Math.round(validScores.reduce((a,b)=>a+b,0)/validScores.length);

      let indicator;
      if(isIncomplete) indicator = 'Incomplete';
      else if(overallScore>=75) indicator = 'Lower';
      else if(overallScore>=55) indicator = 'Moderate';
      else indicator = 'Higher';

      const duration = isIncomplete ? randInt(rng,2,6) : randInt(rng,8,22);
      const olderVersion = false;
      const scrId = 'SCR-2026-' + String(screeningSeq++).padStart(5,'0');
      let followUp;
      if(indicator==='Higher') followUp = (cursorDaysAgo>35 && s===nScreenings-1) ? 'Overdue' : 'Required';
      else if(indicator==='Moderate') followUp = rng()<0.6 ? 'Required' : 'Scheduled';
      else if(indicator==='Incomplete') followUp = 'Required';
      else followUp = 'Not required';

      const screening = {
        id: scrId, patientId:id, patientName:name,date:null,
dateLabel:'Live timestamp required',
daysAgo:null,
        type: s===0?'Initial screening':'Follow-up', ageAtScreening:age, grade, durationMinutes:duration,
        completionStatus: isIncomplete?'Incomplete':'Completed', overallScore, indicator, tasks,
        modelVersion: olderVersion?'MobileNetV2 v1.1':'MobileNetV2 v1.2',
        algorithmVersion: olderVersion?'WriteAble Pipeline v1.3.2':'WriteAble Pipeline v1.4.0',
        reviewer: rng()<0.7 ? professional : null,
        followUp, dataFlags:{ invalid:isInvalid, duplicateLike:isDuplicateLike },
      };
      patientScreenings.push(screening);
      screenings.push(screening);
    }
    // Live screening timestamps are supplied by the backend.
    // Live screening records are sorted by backend timestamp.
    const latest = patientScreenings[0];
    const prev = patientScreenings[1];
    let progressTrend;
    if(nScreenings===1) progressTrend = 'Insufficient data';
    else if(latest.overallScore!=null && prev && prev.overallScore!=null){
      const delta = latest.overallScore - prev.overallScore;
      progressTrend = delta>=4 ? 'Improving' : (delta<=-4 ? 'Needs review' : 'Stable');
    } else progressTrend = 'Insufficient data';

    patients.push({
      id, name, age, grade, school, professional, registrationDate, registrationLabel:fmtDate(registrationDate),
      status, screenings:patientScreenings, screeningsCount:nScreenings,
      lastScreeningDate:latest.date, lastScreeningLabel:latest.dateLabel, indicator:latest.indicator,
      previousIndicator: prev ? prev.indicator : null, progressTrend, followUp:latest.followUp,
      completedFollowUps: patientScreenings.filter(s=>s.type==='Follow-up' && s.completionStatus==='Completed').length,
    });
  }

  screenings.sort((a,b)=>a.daysAgo-b.daysAgo);

  // ---- Alerts (derived from the generated data, capped per category) ----
  const alerts = [];
  let alertSeq = 1;
  function addAlert(category, title, message, daysAgoVal, patientId){
    alerts.push({ id:'ALT-'+String(alertSeq++).padStart(4,'0'), category, title, message, daysAgo:daysAgoVal, patientId, status:'Open', assignedTo:null });
  }
  patients.filter(p=>p.indicator==='Higher' && p.followUp==='Required').slice(0,14).forEach(p=>{
    addAlert('High-priority review','Higher-indicator screening', `Patient #${p.id} requires professional review based on the latest screening indicators.`, randInt(rng,0,6), p.id);
  });
  patients.filter(p=>p.followUp==='Overdue').slice(0,14).forEach(p=>{
    addAlert('Follow-up overdue','Follow-up overdue', `Patient #${p.id} has not completed the recommended follow-up.`, randInt(rng,1,20), p.id);
  });
  patients.filter(p=>p.progressTrend==='Needs review').slice(0,12).forEach(p=>{
    addAlert('Progress decline','Progress change', `Patient #${p.id} showed a decline in selected performance indicators compared with the previous screening.`, randInt(rng,0,10), p.id);
  });
  screenings.filter(s=>s.completionStatus==='Incomplete').slice(0,10).forEach(s=>{
    addAlert('Incomplete screening','Incomplete screening', `Screening #${s.id} for patient #${s.patientId} was not completed.`, s.daysAgo, s.patientId);
  });
  screenings.filter(s=>s.dataFlags.invalid || s.dataFlags.duplicateLike).slice(0,8).forEach(s=>{
    addAlert('Data quality issue', s.dataFlags.invalid ? 'Out-of-range value detected':'Possible duplicate record', `Screening #${s.id} was flagged during automated data-quality checks.`, s.daysAgo, s.patientId);
  });
  ['Scheduled maintenance window completed','Screening model evaluation completed','Weekly data backup completed successfully']
    .forEach((msg,i)=> addAlert('System notification','System notification', msg, i*3+1, null));
  alerts.sort((a,b)=>a.daysAgo-b.daysAgo);

  // ---- Audit log ----
  const auditActions = [
    ()=>({action:'Logged in', status:'Successful'}),
    ()=>({action:`Viewed screening #${pick(rng,screenings).id}`, status:'Successful'}),
    ()=>({action:`Viewed patient #${pick(rng,patients).id}`, status:'Successful'}),
    ()=>({action:'Updated patient status', status:'Successful'}),
    ()=>({action:'Generated report (Individual Patient Report)', status:'Successful'}),
    ()=>({action:'Exported research dataset (CSV)', status:'Successful'}),
    ()=>({action:'Assigned alert', status:'Successful'}),
    ()=>({action:'Resolved alert', status:'Successful'}),
    ()=>({action:'Changed account password', status:'Successful'}),
    ()=>({action:'Attempted export of identifiable data', status:'Denied'}),
    ()=>({action:'Login attempt', status:'Failed'}),
  ];
  const auditLog = [];
  for(let i=0;i<160;i++){
    const staff = pick(rng, ADMIN_STAFF);
    const a = pick(rng, auditActions)();
    const ts = new Date(NOW); ts.setMinutes(ts.getMinutes() - randInt(rng,5, 60*24*60));
    auditLog.push({ id:'LOG-'+String(i+1).padStart(5,'0'), admin:staff, action:a.action, timestamp:ts, status:a.status });
  }
  auditLog.sort((a,b)=>b.timestamp-a.timestamp);

  // ---- Research rows (anonymized view of screenings) ----
  const research = screenings.map((s,i) => {
    const belowThreshold = TASK_DEFS.filter(t => s.tasks[t.key]!=null && s.tasks[t.key] < 65).map(t=>t.label);
    return {
      anonId: 'R-' + String(i+1).padStart(5,'0'),
      age: s.ageAtScreening, grade: s.grade, screeningDate: s.dateLabel,
      tasks: s.tasks, overallScore: s.overallScore,
      observedIndicators: belowThreshold, outcomeCategory: s.indicator,
      completionStatus: s.completionStatus,
    };
  });

  // ---- Data quality ----
  const totalScreenings = screenings.length;
  const incompleteCount = screenings.filter(s=>s.completionStatus==='Incomplete').length;
  const invalidCount = screenings.filter(s=>s.dataFlags.invalid).length;
  const duplicateCount = screenings.filter(s=>s.dataFlags.duplicateLike).length;
  const completeness = (totalScreenings-incompleteCount)/totalScreenings;
  const validity = (totalScreenings-invalidCount)/totalScreenings;
  const uniqueness = (totalScreenings-duplicateCount)/totalScreenings;
  const consistency = 0.985; // illustrative — cross-field logic checks (e.g. duration > 0, dates within range)
  const dataQuality = {
    totalRecords: totalScreenings, completeRecords: totalScreenings-incompleteCount,
    incompleteRecords: incompleteCount, missingValues: incompleteCount*randInt(rng,1,3),
    duplicateRecords: duplicateCount, invalidValues: invalidCount,
    completeness, consistency, validity, uniqueness,
    overall: (completeness+consistency+validity+uniqueness)/4,
  };

  return { patients, screenings, alerts, auditLog, research, dataQuality };
}

/* ---------------------------------------------------------------------
   Model analytics (reused from the WriteAble patient-facing prototype's
   own reported experimental results, for a consistent ecosystem)
--------------------------------------------------------------------- */
const MODEL = {
  version:'MobileNetV2 v1.2',
  algorithmVersion:'WriteAble Screening Pipeline v1.4.0',
  trainingDataset:'WriteAble Handwriting Fragments v1 — 3,127 fragments (1,876 train / 625 validation / 626 test)',
  lastUpdated:'September 2, 2026',
  evaluations: 626,
  status:'Operational',
  metrics: { accuracy:0.81, precision:0.85, recall:0.80, f1:0.82, rocAuc:0.878 },
  confusion: { tp:281, fn:70, fp:49, tn:226 },
  rocPoints: [[0,0],[0.02,0.30],[0.05,0.50],[0.1,0.65],[0.15,0.74],[0.2,0.80],[0.3,0.86],[0.4,0.90],[0.5,0.93],[0.6,0.95],[0.7,0.965],[0.8,0.978],[0.9,0.99],[1,1]],
  prPoints:  [[0,1],[0.1,0.96],[0.2,0.94],[0.3,0.92],[0.4,0.90],[0.5,0.88],[0.6,0.87],[0.7,0.85],[0.8,0.82],[0.9,0.78],[1.0,0.70]],
  featureImportance: [
    { name:'Letter formation', val:0.27 }, { name:'Spacing', val:0.21 }, { name:'Writing speed', val:0.19 },
    { name:'Alignment', val:0.14 }, { name:'Copying accuracy', val:0.12 }, { name:'Motor coordination', val:0.07 },
  ],
  note:'The currently deployed image classifier does not yet expose per-feature attribution. Values above are illustrative, reflecting the planned hybrid feature model described in the platform roadmap — not live output of the deployed model.',
};
/* ============================================================
   WRITEABLE LIVE ADMIN DATA ADAPTER
   ============================================================ */

const ADMIN_API_BASE_URL =
  window.WRITEABLE_API_BASE_URL || 'https://backend-rho-eight-41.vercel.app/api';

function getAdminAuthToken() {
  return localStorage.getItem('token');
}

function normalizeLiveScreening(screening) {
  const started =
    screening.started_at ||
    screening.startedAt ||
    null;

  const completed =
    screening.completed_at ||
    screening.completedAt ||
    null;

  const timestamp =
    started ||
    screening.created_at ||
    screening.createdAt ||
    null;

  return {
    id: String(screening.id),

    participationId:
      screening.participation_id ||
      screening.participationId ||
      null,

    screeningCode:
      screening.screening_code ||
      screening.screeningCode ||
      null,

    status:
      screening.status ||
      'started',

    startedAt: started,

    completedAt: completed,

    createdAt:
      screening.created_at ||
      screening.createdAt ||
      null,

    overallIndicator:
      screening.overall_indicator ||
      screening.overallIndicator ||
      null,

    indicatorScore:
      screening.indicator_score ??
      screening.indicatorScore ??
      null,

    modelVersion:
      screening.model_version ||
      screening.modelVersion ||
      null,

    date: timestamp
      ? new Date(timestamp)
      : null,

    dateLabel: timestamp
      ? new Date(timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      : '—',

    dateTimeLabel: timestamp
      ? new Date(timestamp).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })
      : '—'
  };
}

async function fetchLiveScreenings(
  endpoint = `${ADMIN_API_BASE_URL}/screenings`
) {
  const token = getAdminAuthToken();

  if (!token) {
    throw new Error(
      'No authentication token found. Please sign in again.'
    );
  }

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    let detail = '';

    try {
      detail = await response.text();
    } catch (_) {}

    throw new Error(
      `Failed to load live screenings (${response.status}). ${detail}`.trim()
    );
  }

  const payload = await response.json();

  const rows =
    Array.isArray(payload)
      ? payload
      : Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload.data?.screenings)
          ? payload.data.screenings
          : [];

  return rows
    .map(normalizeLiveScreening)
    .sort(
      (a, b) =>
        new Date(b.date || 0) -
        new Date(a.date || 0)
    );
}

window.WriteAbleAdminLive = {
  fetchLiveScreenings,
  normalizeLiveScreening,
  fmtDate
};