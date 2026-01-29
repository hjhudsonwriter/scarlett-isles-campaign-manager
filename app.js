const topNav = document.getElementById("topNav");
const sideTitle = document.getElementById("sideTitle");
const sideList = document.getElementById("sideList");
const view = document.getElementById("view");
// ---------- GitHub Pages base-path helper ----------
const BASE = (() => {
  const parts = location.pathname.split("/").filter(Boolean);
  return parts.length ? `/${parts[0]}/` : "/";
})();

// Holds the loaded bastion config so renderSpecialFacilities() can access it
let __BASTION_SPEC__ = null;

function withBase(url) {
  if (!url) return url;
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (url.startsWith("./")) url = url.slice(2);
  if (url.startsWith("/")) url = url.slice(1);
  return BASE + url;
}


function rewriteAssetUrls(containerEl) {
  containerEl.querySelectorAll("img").forEach(img => {
    const src = img.getAttribute("src");
    if (src) img.setAttribute("src", withBase(src));
  });
  containerEl.querySelectorAll("a").forEach(a => {
    const href = a.getAttribute("href");
    if (href) a.setAttribute("href", withBase(href));
  });
}


// ---------- Simple local "admin" ----------
const LOCAL_KEY = "scarlettIsles.localEdits.v1";
const EDIT_FLAG = "scarlettIsles.editMode";


// LocalStorage for text + metadata
function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}"); }
  catch { return {}; }
}
function saveLocal(obj) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(obj));
}
function isEditMode() {
  return localStorage.getItem(EDIT_FLAG) === "1";
}
function setEditMode(on) {
  localStorage.setItem(EDIT_FLAG, on ? "1" : "0");
}


// IndexedDB for PDFs (blobs)
const DB_NAME = "scarlettIslesFiles";
const DB_STORE = "files";


function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbSet(key, blob) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  
}
async function idbDel(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}


function blobToObjectURL(blob) {
  return URL.createObjectURL(blob);
}


// ---------- Wire edit buttons ----------
const btnToggleEdit = document.getElementById("btnToggleEdit");
const modeLabel = document.getElementById("modeLabel");
const btnExport = document.getElementById("btnExport");
const btnImport = document.getElementById("btnImport");
const importFile = document.getElementById("importFile");


function updateModeUI() {
  if (modeLabel) modeLabel.textContent = isEditMode() ? "Edit" : "View";
}


btnToggleEdit?.addEventListener("click", () => {
  setEditMode(!isEditMode());
  updateModeUI();
  router();
});


btnExport?.addEventListener("click", () => {
  const data = loadLocal();
  const out = {
    meta: { exportedAt: new Date().toISOString(), note: "PDFs are not included. Re-upload PDFs on the new device." },
    local: data
  };
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "scarlett-isles-edits.json";
  a.click();
  URL.revokeObjectURL(url);
});


btnImport?.addEventListener("click", () => importFile?.click());


importFile?.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  if (!file) return;
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (parsed?.local) saveLocal(parsed.local);
  updateModeUI();
  router();
});


// ---------- Your site map ----------
const TOP_TABS = [
  { id: "clans", title: "The Clans" },
  { id: "temples", title: "The Temples" },
  { id: "heroes", title: "The Heroes" },
  { id: "story", title: "The Story" },
  { id: "tools", title: "Tools" },
];


const CLAN_PAGES = [
  { id: "blackstone", title: "Blackstone", file: "./content/clans/blackstone.md" },
  { id: "bacca", title: "Bacca", file: "./content/clans/bacca.md" },
  { id: "molten", title: "Molten", file: "./content/clans/molten.md" },
  { id: "slade", title: "Slade", file: "./content/clans/slade.md" },
  { id: "rowthorn", title: "Rowthorn", file: "./content/clans/rowthorn.md" },
  { id: "karr", title: "Karr", file: "./content/clans/karr.md" },
  { id: "farmer", title: "Farmer", file: "./content/clans/farmer.md" },
];


const TEMPLE_PAGES = [
  { id: "telluria", title: "Telluria", file: "./content/temples/telluria.md" },
  { id: "aurush", title: "Aurush", file: "./content/temples/aurush.md" },
  { id: "pelagos", title: "Pelagos", file: "./content/temples/pelagos.md" },
];


// Hero defaults use your existing filenames
const HEROES = [
  { id: "kaelen-of-wolfhaven", title: "Kaelen of Wolfhaven", defaultPdf: "./assets/pdfs/KaelenofWolfhavenCharacterSheet.pdf" },
  { id: "umbrys", title: "Umbrys", defaultPdf: "./assets/pdfs/UmbrysCharacterSheet.pdf" },
  { id: "magnus-ironward", title: "Magnus Ironward", defaultPdf: "./assets/pdfs/MagnusIronwardCharacterSheet.pdf" },
  { id: "elara-varrus", title: "Elara Varrus", defaultPdf: "./assets/pdfs/ElaraVarrusCharacterSheet.pdf" },
  { id: "charles-vect", title: "Charles Vect", defaultPdf: "./assets/pdfs/CharlesVect%20CharacterSheet.pdf" } // space encoded
];


const TOOL_PAGES = [
  { id: "bastion", title: "Bastion Management", type: "bastion" },
  { id: "honour", title: "Honour Tracker", type: "honour" },
  { id: "explorer", title: "Scarlett Isles Explorer", type: "explorer" },
];


// ---------- UI helpers ----------
function renderTopNav(activeTab) {
  topNav.innerHTML = TOP_TABS.map(t =>
    `<a href="#/${t.id}" data-id="${t.id}" class="${t.id===activeTab ? "active":""}">${t.title}</a>`
  ).join("");
}


function renderSideList(title, items, activeId, baseTab) {
  sideTitle.textContent = title;
  sideList.innerHTML = items.map(it =>
    `<a href="#/${baseTab}/${it.id}" data-id="${it.id}" class="${it.id===activeId ? "active":""}">${it.title}</a>`
  ).join("");
}


async function loadMarkdown(file) {
  const res = await fetch(file, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load: ${file}`);
  const md = await res.text();
  return marked.parse(md);
}


function showError(err) {
  view.innerHTML = `
    <h1>Page couldn’t load</h1>
    <p><small>${String(err)}</small></p>
    <hr />
    <p class="badge">Tip: check the file path exists in the repo.</p>
  `;
}


// ---------- Story (Editable Recaps) ----------
function getLocalRecaps() {
  const data = loadLocal();
  if (!data.recaps) {
    // Seed with Session 002 PDF you already uploaded, plus Session 001 placeholder
    data.recaps = [
      { id: "session-001", number: 1, title: "Session 001", text: "" },
      { id: "session-002", number: 2, title: "Session 002", text: "" }
    ];
    saveLocal(data);
  }
  return data.recaps;
}


function saveRecaps(recaps) {
  const data = loadLocal();
  data.recaps = recaps;
  saveLocal(data);
}


function sortRecapsNumeric(recaps) {
  return [...recaps].sort((a,b) => (a.number||0) - (b.number||0));
}


function recapPdfKey(id) {
  return `recapPdf:${id}`;
}


async function renderStory(activeId) {
  const recaps = sortRecapsNumeric(getLocalRecaps());
  const active = activeId || recaps[0]?.id || "session-001";
  renderSideList("Session Recaps", recaps.map(r => ({ id: r.id, title: r.title })), active, "story");


  const item = recaps.find(r => r.id === active) || recaps[0];
  if (!item) {
    view.innerHTML = "<h1>No recaps yet</h1>";
    return;
  }


  // Decide PDF src:
  // If user uploaded one into IndexedDB, use that.
  // Otherwise, fall back to repo PDF if session-002 exists.
  let pdfSrc = "";
  const blob = await idbGet(recapPdfKey(item.id));
  if (blob) {
    pdfSrc = blobToObjectURL(blob);
  } else if (item.id === "session-002") {
    pdfSrc = "./assets/pdfs/session-002-recap.pdf";
  } else {
    pdfSrc = "";
  }


  const edit = isEditMode();


  view.innerHTML = `
    <h1>${item.title}</h1>
    ${edit ? `<p class="badge">Edit Mode is ON</p>` : ``}


    <h2>Recap Text</h2>
    ${edit ? `
      <textarea id="recapText" style="width:100%;min-height:180px;padding:12px;border-radius:14px;border:1px solid var(--border);background:rgba(18,22,27,.8);color:var(--text);">${item.text || ""}</textarea>
      <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
        <button id="btnSaveRecap">Save Text</button>
      </div>
    ` : `
      ${item.text ? marked.parse(item.text) : `<p><small>No recap text yet. Toggle Edit Mode to add it.</small></p>`}
    `}


    <hr />


    <h2>Recap PDF</h2>
    ${edit ? `
      <p><small>Upload a PDF to replace/attach to this recap (saved on this device).</small></p>
      <input id="recapPdfInput" type="file" accept="application/pdf" />
      <div style="margin-top:10px"><button id="btnSaveRecapPdf">Save PDF</button></div>
    ` : ``}


    ${pdfSrc ? `
      <iframe
        src="${pdfSrc}"
        style="width:100%;height:80vh;border:1px solid #28303a;border-radius:16px;background:#0f1216"
      ></iframe>
    ` : `<p><small>No PDF attached yet.</small></p>`}


    ${edit ? `
      <hr />
      <h2>Add a new recap</h2>
      <label><small>Session number (e.g. 3)</small></label>
      <input id="newRecapNum" type="number" min="1" />
      <label style="margin-top:10px;display:block"><small>Title (e.g. Session 003)</small></label>
      <input id="newRecapTitle" type="text" />
      <div style="margin-top:10px"><button id="btnAddRecap">Add Recap</button></div>
      <p><small>After adding, it will appear in the sidebar automatically in numeric order.</small></p>
    ` : ``}
  `;


  if (edit) {
    document.getElementById("btnSaveRecap")?.addEventListener("click", () => {
      const txt = document.getElementById("recapText").value;
      const updated = recaps.map(r => r.id === item.id ? { ...r, text: txt } : r);
      saveRecaps(updated);
      router();
    });


    document.getElementById("btnSaveRecapPdf")?.addEventListener("click", async () => {
      const file = document.getElementById("recapPdfInput").files?.[0];
      if (!file) return alert("Choose a PDF first.");
      await idbSet(recapPdfKey(item.id), file);
      router();
    });


    document.getElementById("btnAddRecap")?.addEventListener("click", () => {
      const num = Number(document.getElementById("newRecapNum").value);
      const title = document.getElementById("newRecapTitle").value.trim();
      if (!num || num < 1) return alert("Enter a session number (1, 2, 3...).");
      if (!title) return alert("Enter a title.");


      const id = `session-${String(num).padStart(3,"0")}`;
      if (recaps.some(r => r.id === id)) return alert("That session already exists.");


      const next = [...recaps, { id, number: num, title, text: "" }];
      saveRecaps(next);
      location.hash = `#/story/${id}`;
    });
  }
}


// ---------- Heroes (Editable PDF swap) ----------
function heroPdfKey(id) {
  return `heroPdf:${id}`;
}


async function renderHero(activeId) {
  const active = activeId || HEROES[0].id;
  renderSideList("The Heroes", HEROES.map(h => ({ id: h.id, title: h.title })), active, "heroes");


  const hero = HEROES.find(h => h.id === active) || HEROES[0];
  const edit = isEditMode();


  let pdfSrc = hero.defaultPdf;
  const blob = await idbGet(heroPdfKey(hero.id));
  if (blob) pdfSrc = blobToObjectURL(blob);


  view.innerHTML = `
    <h1>${hero.title}</h1>
    ${edit ? `<p class="badge">Edit Mode is ON</p>` : ``}


    <h2>Character Sheet</h2>
    ${edit ? `
      <p><small>Upload a new PDF to replace this hero sheet (saved on this device).</small></p>
      <input id="heroPdfInput" type="file" accept="application/pdf" />
      <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
        <button id="btnSaveHeroPdf">Save PDF</button>
<button id="btnClearHeroPdf">Clear Override</button>
      </div>
    ` : ``}


    <iframe
      src="${pdfSrc}"
      style="width:100%;height:80vh;border:1px solid #28303a;border-radius:16px;background:#0f1216"
    ></iframe>
  `;


  if (edit) {
    document.getElementById("btnSaveHeroPdf")?.addEventListener("click", async () => {
      const file = document.getElementById("heroPdfInput").files?.[0];
      if (!file) return alert("Choose a PDF first.");
      await idbSet(heroPdfKey(hero.id), file);
      router();
    });


    document.getElementById("btnClearHeroPdf")?.addEventListener("click", async () => {
  await idbDel(heroPdfKey(hero.id));
  router();
});
  }
}


// ---------- Tools ----------
// ---------- Bastion Manager (Ironbow) ----------
// ---------- Bastion specs (safe switcher) ----------
const BASTION_SPEC_V1_PATH = "./data/bastion.json"; // current working spec
const BASTION_SPEC_V1_1_PATH = "./data/ironbow_bastion_v1_1.json"; // new additive spec


const BASTION_SPEC_CHOICE_KEY = "bastion.ironbow.specChoice"; // local device
function getBastionSpecChoice() {
  const v = localStorage.getItem(BASTION_SPEC_CHOICE_KEY);
  return (v === "v1_1") ? "v1_1" : "v1";
}
function setBastionSpecChoice(choice) {
  localStorage.setItem(BASTION_SPEC_CHOICE_KEY, (choice === "v1_1") ? "v1_1" : "v1");
}
function getBastionConfigPath() {
  return getBastionSpecChoice() === "v1_1" ? BASTION_SPEC_V1_1_PATH : BASTION_SPEC_V1_PATH;
}
function getBastionStoreKey() {
  // keep saves separate so v1.1 can't mess with your working v1 save
  return getBastionSpecChoice() === "v1_1" ? "bastion.ironbow.v1_1" : "bastion.ironbow.v1";
}
// -----------------------------------------------
// NOTE: dynamic store key based on selected spec
const BASTION_STORE_KEY = getBastionStoreKey();
const UI_COIN_ICON = "./assets/ui/coin.svg";
const UI_TIMER_ICON = "./assets/ui/timer.svg";
// Facility images (match your actual filenames in /assets/facilities/)
const FACILITY_IMG_MAP = {
  dock: "./assets/facilities/dock.png",
  watchtower: "./assets/facilities/watchtower.png",
  barracks: "./assets/facilities/barracks.jpg",
  workshop: "./assets/facilities/workshop.jpg",
  warehouse: "./assets/facilities/warehouse.jpg",
  treasury: "./assets/facilities/treasury.png",


  // IMPORTANT: your file is "armoury.jpg" (UK spelling)
  armory: "./assets/facilities/armoury.jpg",
  armoury: "./assets/facilities/armoury.jpg",
};


function FACILITY_IMG(id) {
  // Normalise IDs like "dock_A", "Watchtower_B", "armory-C" -> "dock", "watchtower", "armory"
  const raw = String(id || "").trim();


  // Lowercase
  let key = raw.toLowerCase();


  // If it contains an underscore (dock_A), keep the left side
  if (key.includes("_")) key = key.split("_")[0];


  // If it contains a space, keep the first chunk
  if (key.includes(" ")) key = key.split(" ")[0];


  // If it contains a hyphen and ends in "-a" style, keep the left side
  // (safe: if your IDs are like "training-yard" this won't break because it only trims single-letter suffix)
  const parts = key.split("-");
  if (parts.length > 1 && parts[parts.length - 1].length === 1) {
    parts.pop();
    key = parts.join("-");
  }


  return FACILITY_IMG_MAP[key] || "./assets/facilities/warehouse.jpg";
}


function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }


function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }


function loadBastionSave() {
  try {
    const raw = localStorage.getItem(BASTION_STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveBastionSave(saveObj) {
  localStorage.setItem(BASTION_STORE_KEY, JSON.stringify(saveObj));
}


function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}


// Supports strings like "1d6*25", "2d4+3", "1d100"
function rollDiceExpr(expr) {
  const raw = String(expr || "").trim();
  if (!raw) return 0;


  // If it's just a number like "25"
  if (/^\d+$/g.test(raw)) return safeNum(raw, 0);


  // Basic pattern: NdM with optional +K/-K and optional *X
  // Examples: "1d6*25", "2d4+3", "1d100", "3d8-2"
  const m = raw.match(/^(\d+)\s*d\s*(\d+)\s*([+-]\s*\d+)?\s*(\*\s*\d+)?$/i);
  if (!m) return 0;


  const n = safeNum(m[1], 0);
  const sides = safeNum(m[2], 0);
  const plusMinus = m[3] ? safeNum(m[3].replace(/\s+/g, ""), 0) : 0;
  const mult = m[4] ? safeNum(m[4].replace(/\s+/g, "").replace("*", ""), 1) : 1;


  if (!n || !sides) return 0;


  let total = 0;
  for (let i = 0; i < n; i++) total += rollDie(sides);


  total += plusMinus;
  total *= mult;


  return Math.max(0, Math.floor(total));
}
// ---------- Bastion v1.1 helpers (safe, additive) ----------


// --- Facility ID helpers (supports "barracks_D" style IDs) ---
function baseFacilityId(fid){
  const s = String(fid||"");
  const m = s.match(/^(.+?)(_[A-Z])?$/);
  let base = m ? m[1].toLowerCase() : s.toLowerCase();

  // Normalise common variant
  if (base === "armory") base = "armoury";

  return base;
}

function facilityIconDataUri(baseId){
  // Simple inline SVG icons (no external files => no 404s)
  const id = String(baseId || "facility").toLowerCase();

  const glyph = (() => {
    if (id === "dock") return "⚓";
    if (id === "watchtower") return "🛡️";
    if (id === "barracks") return "🪖";
    if (id === "armoury") return "⚔️";
    if (id === "workshop") return "🛠️";
    if (id === "storehouse" || id === "warehouse") return "📦";
    if (id === "garden") return "🌿";
    return "🏰";
  })();

  const svg =
`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
  <defs>
    <radialGradient id="g" cx="35%" cy="30%">
      <stop offset="0" stop-color="#2b0b0f"/>
      <stop offset="1" stop-color="#0b0a0f"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="256" height="256" rx="48" fill="url(#g)"/>
  <circle cx="128" cy="128" r="86" fill="rgba(0,0,0,.35)" stroke="rgba(212,175,55,.65)" stroke-width="10"/>
  <text x="128" y="150" text-anchor="middle" font-size="92" font-family="serif">${glyph}</text>
</svg>`;

  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function getFacilityById(runtimeState, idOrBase) {
  const facilities = (runtimeState?.facilities || []);
  const want = String(idOrBase || "").trim().toLowerCase();
  if (!want) return null;


  // 1) exact match first
  let f = facilities.find(x => String(x.id).toLowerCase() === want);
  if (f) return f;


  // 2) then base-id match ("barracks" matches "barracks_D")
  const wantBase = baseFacilityId(want);
  f = facilities.find(x => baseFacilityId(x.id) === wantBase);
  return f || null;
}


function getFacilityLevel(runtimeState, idOrBase) {
  const f = getFacilityById(runtimeState, idOrBase);
  return f ? safeNum(f.currentLevel, 0) : 0;
}


function hasFacility(runtimeState, idOrBase, minLevel = 1) {
  return getFacilityLevel(runtimeState, idOrBase) >= minLevel;
}


// Barracks capacity mapping: level -> max defenders
// Spec says (0/12/12/25). We'll interpret as:
// level 0 => 0
// level 1 => 12
// level 2 => 12
// level 3+ => 25
function getBarracksCapacity(runtimeState) {
  const barracks = getFacilityById(runtimeState, "barracks"); // will match barracks_D
  if (!barracks) return 0;


  const lvl = safeNum(barracks.currentLevel, 0);
  if (lvl <= 0) return 0;


  // Prefer JSON's capacityByLevel if present (v1.1 spec)
  const capMap = barracks?.capacityByLevel || null;
  if (capMap && typeof capMap === "object") {
    const cap = safeNum(capMap[String(lvl)], 0);
    if (cap > 0) return cap;
  }


  // Fallback mapping if capacityByLevel missing
  if (lvl === 1) return 12;
  if (lvl === 2) return 12;
  return 25;
}


function ensureRosterState(runtimeState) {
  runtimeState.state.roster = runtimeState.state.roster || {};


  // defenders
  runtimeState.state.roster.defenders = runtimeState.state.roster.defenders || {};
  if (!Number.isFinite(Number(runtimeState.state.roster.defenders.count))) {
    runtimeState.state.roster.defenders.count = 0;
  }


  // hirelings (computed + manual adjustment)
  runtimeState.state.roster.hirelings = runtimeState.state.roster.hirelings || {};
  if (!Number.isFinite(Number(runtimeState.state.roster.hirelings.manualAdjustment))) {
    runtimeState.state.roster.hirelings.manualAdjustment = 0;
  }
}


// Hirelings computed from facilities staffing + manual adjustment
function computeHirelings(runtimeState) {
  const facilities = runtimeState?.facilities || [];
  let base = 0;


  for (const f of facilities) {
    // staffing is on the facility spec; your UI already reads it
    const h = safeNum(f?.staffing?.hirelings, safeNum(f?.staffing?.hirelingsBase, 0));
    base += h;
  }


  ensureRosterState(runtimeState);
  const adj = safeNum(runtimeState.state.roster.hirelings.manualAdjustment, 0);
  return { base, adj, total: base + adj };
}


// Defender count clamped by Barracks capacity
function setDefenders(runtimeState, nextCount) {
  ensureRosterState(runtimeState);
  const cap = getBarracksCapacity(runtimeState);
  const n = clamp(safeNum(nextCount, 0), 0, cap);
  runtimeState.state.roster.defenders.count = n;
  return { count: n, cap };
}


// Convenience: current defenders + cap
function getDefenders(runtimeState) {
  ensureRosterState(runtimeState);
  const cap = getBarracksCapacity(runtimeState);
  const count = clamp(safeNum(runtimeState.state.roster.defenders.count, 0), 0, cap);
  return { count, cap };
}


// Special facility slot milestones
function computeSpecialSlots(playerLevel) {
  const lvl = clamp(safeNum(playerLevel, 1), 1, 20);
  if (lvl >= 17) return 6;
  if (lvl >= 13) return 5;
  if (lvl >= 9) return 4;
  if (lvl >= 5) return 2;
  return 0;
}


function specialCatalogById(config, id) {
  return (config?.facilityCatalog || []).find(x => x.id === id) || null;
}


// ------------------------------------------------------------
// DMG 2024 Special Facility definitions (used to build real cards)
// Note: these are single-level cards for newly-built specials (v1.1).
// They show hirelings + one order button. Some outcomes are DM-facing notes
// (because DMG often says “roll any die” or “DM determines the goods”).
// ------------------------------------------------------------
const SPECIAL_FACILITY_DEFS = {
  // Level 5
  arcane_study: {
    label: "Arcane Study",
    orderType: "craft",
    hirelings: 1,
    benefits: [
      "A quiet study for arcane work."
    ],
    functions: [{
      id: "arcane_study_craft",
      label: "Craft: Arcane Creation",
      orderType: "craft",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "effect_note", qty: 1, label: "Arcane Study Craft Order", notes: "DMG: Hireling crafts an arcane-themed item (nonmagical or DM-approved). If your table uses specific crafting rules, apply them." }
      ],
      notes: ["DMG'24 Special Facility Order: Craft."]
    }]
  },


  armory: {
    label: "Armory",
    orderType: "trade",
    hirelings: 1,
    benefits: ["A secure place to store and issue arms and armor."],
    functions: [{
      id: "armory_trade",
      label: "Trade: Stock Armory (DMG)",
      orderType: "trade",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "effect_note", qty: 1, label: "Armory Stocked (DMG)", notes: "DMG: Stocking has a cost and affects Attack outcomes. If you’re using your custom Armoury card (armory_C), use that button instead." }
      ],
      notes: ["If you already have armory_C on the map, do not build this duplicate version."]
    }]
  },


  barrack: {
    label: "Barrack",
    orderType: "recruit",
    hirelings: 1,
    benefits: ["Houses Bastion Defenders (capacity depends on the facility size)."],
    functions: [{
      id: "barrack_recruit",
      label: "Recruit: Bastion Defenders (DMG)",
      orderType: "recruit",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "effect_note", qty: 1, label: "Recruitment Attempt", notes: "DMG: Recruit defenders for the bastion. If you’re using your custom Barracks card (barracks_D), use that button instead." }
      ],
      notes: ["If you already have barracks_D on the map, do not build this duplicate version."]
    }]
  },


  garden: {
    label: "Garden",
    orderType: "harvest",
    hirelings: 1,
    benefits: ["A tended garden that can produce useful natural materials."],
    functions: [{
      id: "garden_harvest",
      label: "Harvest: Garden Produce",
      orderType: "harvest",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "effect_note", qty: 1, label: "Garden Harvest", notes: "DMG: Hireling harvests useful plants/ingredients. DM chooses appropriate output (herbs, healing supplies, poisons, etc.) based on the garden type." }
      ],
      notes: ["DMG'24 Special Facility Order: Harvest."]
    }]
  },


  library: {
    label: "Library",
    orderType: "research",
    hirelings: 1,
    benefits: ["A library for collecting lore and conducting research."],
    functions: [{
      id: "library_research",
      label: "Research: Gather Lore",
      orderType: "research",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "intel_report", qty: 1, label: "Library Research Result", notes: "DMG: Hireling researches a topic. DM provides lore, rumor, map clue, or advantage on a future related check." }
      ],
      notes: ["DMG'24 Special Facility Order: Research."]
    }]
  },


  sanctuary: {
    label: "Sanctuary",
    orderType: "craft",
    hirelings: 1,
    benefits: ["A sacred space tied to divine or primal practice."],
    functions: [{
      id: "sanctuary_craft",
      label: "Craft: Sacred Work",
      orderType: "craft",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "effect_note", qty: 1, label: "Sanctuary Craft Order", notes: "DMG: Crafting tied to a holy/druidic focus. DM determines an appropriate crafted outcome (often a charm/consumable/ritual object) per campaign tone." }
      ],
      notes: ["Prereq in DMG: ability to use a Holy Symbol or Druidic Focus as a Spellcasting Focus."]
    }]
  },


  smithy: {
    label: "Smithy",
    orderType: "craft",
    hirelings: 1,
    benefits: ["Metalwork and repairs. Halves certain Armory stocking costs at your table (per your rules)."],
    functions: [{
      id: "smithy_craft",
      label: "Craft: Metalwork",
      orderType: "craft",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "crafted_item", qty: 1, label: "Smithy Craft Output", notes: "DMG: Nonmagical metal item/repair completed (DM decides exact item)." }
      ],
      notes: ["DMG'24 Special Facility Order: Craft."]
    }]
  },


      storehouse: {
    label: "Storehouse",
    orderType: "trade",
    hirelings: 1,
    benefits: ["A secure storage space for trade goods."],
    functions: [{
      id: "storehouse_trade",
      label: "Trade: Buy or Sell Goods",
      orderType: "trade",
      durationTurns: 1,
      costGP: 0, // dynamic for BUY, handled at start
      crafting: {
        modes: [
          {
            id: "buy",
            label: "Buy (spend GP → add Trade Shipment)",
            effects: [{ type: "storehouse_trade" }],
            inputs: [
              { type: "number", label: "Spend GP", storeAs: "spendGp", min: 1 }
            ],
            notes: [
              "Creates a Trade Shipment entry in the Warehouse.",
              "Cap depends on Player Level (DMG): 500gp (L5), 2000gp (L9), 5000gp (L13)."
            ]
          },
          {
            id: "sell",
            label: "Sell (consume Trade Shipment → gain GP)",
            effects: [{ type: "storehouse_trade" }],
            inputs: [
              { type: "select_shipment", label: "Choose Shipment to Sell", storeAs: "shipmentId" }
            ],
            notes: [
              "Requires a Trade Shipment in the Warehouse.",
              "Profit depends on Player Level (DMG): +10% (L5), +20% (L9), +50% (L13), +100% (L17)."
            ]
          }
        ]
      },
      notes: [
        "DMG'24 Special Facility Order: Trade (implemented with dropdowns and Warehouse shipments)."
      ]
    }]
  },


  workshop: {
    label: "Workshop",
    orderType: "craft",
    hirelings: 3,
    benefits: ["Crafting space and tools."],
    functions: [{
      id: "workshop_craft",
      label: "Craft: Workshop Project (DMG)",
      orderType: "craft",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "effect_note", qty: 1, label: "Workshop Craft Order", notes: "DMG: Hirelings craft a nonmagical item. If you already have workshop_E on the map, use that card instead." }
      ],
      notes: ["If you already have workshop_E on the map, do not build this duplicate version."]
    }]
  },


  // Level 9
  gaming_hall: {
    label: "Gaming Hall",
    orderType: "trade",
    hirelings: 2,
    benefits: ["A public-facing hall for games, wagers, and social leverage."],
    functions: [{
      id: "gaming_hall_trade",
      label: "Trade: Gaming Night",
      orderType: "trade",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "coin", qty: 1, gp: "1d6*50", label: "Gaming Hall Proceeds", notes: "DMG: Earnings represent profits from events/games. Adjust if fiction demands." }
      ],
      notes: ["DMG'24 Special Facility Order: Trade."]
    }]
  },


  greenhouse: {
    label: "Greenhouse",
    orderType: "harvest",
    hirelings: 2,
    benefits: ["Controlled cultivation for rarer plants."],
    functions: [{
      id: "greenhouse_harvest",
      label: "Harvest: Rare Botanicals",
      orderType: "harvest",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "crafted_item", qty: 1, label: "Greenhouse Harvest", notes: "DMG: Harvest rare plants/ingredients. DM chooses output (antitoxin, potion ingredient, poison component, etc.)." }
      ],
      notes: ["DMG'24 Special Facility Order: Harvest."]
    }]
  },


  laboratory: {
    label: "Laboratory",
    orderType: "craft",
    hirelings: 2,
    benefits: ["Alchemy, tinctures, and controlled experiments (DMG)."],
    functions: [{
      id: "laboratory_craft",
      label: "Craft (choose option)",
      orderType: "craft",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [{ type: "note", qty: 1, label: "Laboratory Craft (see notes)", notes: "This order creates the chosen laboratory output." }],
      crafting: {
        modes: [
          { id: "alchemists_fire", label: "Craft: Alchemist's Fire", costGP: 50, outputsToWarehouse: [{ type: "alchemists_fire", qty: 1 }] },
          { id: "antitoxin", label: "Craft: Antitoxin", costGP: 50, outputsToWarehouse: [{ type: "antitoxin", qty: 1 }] },
          { id: "oil_of_slipperiness", label: "Craft: Oil of Slipperiness", costGP: 200, outputsToWarehouse: [{ type: "oil_of_slipperiness", qty: 1 }] },
          { id: "potion_of_healing", label: "Craft: Potion of Healing", costGP: 50, outputsToWarehouse: [{ type: "potion_of_healing", qty: 1 }] },
          { id: "perfume_bundle", label: "Craft: Perfume (10 vials)", costGP: 10, outputsToWarehouse: [{ type: "perfume", qty: 10, notes: "10 vials" }] },
          { id: "basic_poison", label: "Craft: Basic Poison", costGP: 100, outputsToWarehouse: [{ type: "basic_poison", qty: 1 }] }
        ]
      },
      notes: [
        "Choose one option. Costs are set to common PHB-style values (adjust if you want different baselines).",
        "All outputs are logged to the Warehouse when the order completes."
      ]
    }]
  },


  scriptorium: {
  label: "Scriptorium",
  orderType: "craft",
  hirelings: 1,
  benefits: ["Copies, books, scrollwork, and official paperwork."],
  functions: [{
    id: "scriptorium_craft",
    label: "Craft (choose output)",
    orderType: "craft",
    durationTurns: 1,
    costGP: 0,
    outputsToWarehouse: [],
    crafting: {
      modes: [
        {
          id: "book_replica",
          label: "Book Replica (0gp) [requires blank book]",
          costGP: 0,
          outputsToWarehouse: [
            { type: "item", qty: 1, label: "Book Replica", notes: "Requires at least 1 Blank Book in Warehouse (DM check for now)." }
          ]
        },
        {
          id: "spell_scroll_l1",
          label: "Spell Scroll (Level 1) (0gp) [requires blank book]",
          costGP: 0,
          outputsToWarehouse: [
            { type: "item", qty: 1, label: "Spell Scroll (Level 1)", notes: "Requires at least 1 Blank Book in Warehouse (DM check for now)." }
          ]
        },
        {
          id: "spell_scroll_l2",
          label: "Spell Scroll (Level 2) (0gp) [requires blank book]",
          costGP: 0,
          outputsToWarehouse: [
            { type: "item", qty: 1, label: "Spell Scroll (Level 2)", notes: "Requires at least 1 Blank Book in Warehouse (DM check for now)." }
          ]
        },
        {
          id: "spell_scroll_l3",
          label: "Spell Scroll (Level 3) (0gp) [requires blank book]",
          costGP: 0,
          outputsToWarehouse: [
            { type: "item", qty: 1, label: "Spell Scroll (Level 3)", notes: "Requires at least 1 Blank Book in Warehouse (DM check for now)." }
          ]
        },

        // Paperwork: your sheet says 1gp per copy, up to 50 copies.
        // We make it dead-simple dropdown modes so it ALWAYS does something.
        {
          id: "paperwork_10",
          label: "Paperwork: 10 copies (10gp)",
          costGP: 10,
          outputsToWarehouse: [
            { type: "item", qty: 10, label: "Paperwork Copies", gp: 0, notes: "10 copies created and can be distributed within 50 miles." }
          ]
        },
        {
          id: "paperwork_25",
          label: "Paperwork: 25 copies (25gp)",
          costGP: 25,
          outputsToWarehouse: [
            { type: "item", qty: 25, label: "Paperwork Copies", gp: 0, notes: "25 copies created and can be distributed within 50 miles." }
          ]
        },
        {
          id: "paperwork_50",
          label: "Paperwork: 50 copies (50gp)",
          costGP: 50,
          outputsToWarehouse: [
            { type: "item", qty: 50, label: "Paperwork Copies", gp: 0, notes: "50 copies created and can be distributed within 50 miles." }
          ]
        }
      ]
    },
    notes: [
      "Uses dropdown selection; creates real warehouse entries when completed.",
      "Blank Book requirement is recorded in notes for now (we can automate checks next)."
    ]
  }]
},


  stable: {
    label: "Stable",
    orderType: "trade",
    hirelings: 1,
    benefits: ["Houses and cares for mounts and animals."],
    functions: [{
      id: "stable_trade",
      label: "Trade: Mount Services",
      orderType: "trade",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "coin", qty: 1, gp: "1d6*25", label: "Stable Income", notes: "DMG: Represents boarding/trade services related to mounts." }
      ],
      notes: ["DMG'24 Special Facility Order: Trade."]
    }]
  },


  teleportation_circle: {
    label: "Teleportation Circle",
    orderType: "recruit",
    hirelings: 1,
    benefits: ["Invites a friendly NPC spellcaster who can cast a spell for you while you’re in the Bastion."],
    functions: [{
      id: "teleport_recruit_spellcaster",
      label: "Recruit: Spellcaster (odd/even)",
      orderType: "recruit",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "effect_note", qty: 1, label: "Teleportation Circle Invite", notes: "DMG: Roll any die. Odd: declines. Even: accepts, arrives. While you’re in bastion, can cast 1 Wizard spell (L4 or lower; L8 if you’re level 17+). You pay costly material components." }
      ],
      notes: ["DMG'24 Special Facility Order: Recruit."]
    }]
  },


  theater: {
    label: "Theater",
    orderType: "empower",
    hirelings: 2,
    benefits: ["Performance and morale."],
    functions: [{
      id: "theater_empower",
      label: "Empower: Inspire Performance",
      orderType: "empower",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "effect_note", qty: 1, label: "Theater Empower", notes: "DMG: Empower benefit tied to performances. Apply the DMG benefit as written for your table; record any named beneficiary here." }
      ],
      notes: ["DMG'24 Special Facility Order: Empower."]
    }]
  },


  training_area: {
    label: "Training Area",
    orderType: "empower",
    hirelings: 2,
    benefits: ["Training, drills, and physical conditioning."],
    functions: [{
      id: "training_empower",
      label: "Empower: Training Regimen",
      orderType: "empower",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "effect_note", qty: 1, label: "Training Area Empower", notes: "DMG: Empower benefit tied to training. Apply the DMG benefit as written; record details here." }
      ],
      notes: ["DMG'24 Special Facility Order: Empower."]
    }]
  },


  trophy_room: {
    label: "Trophy Room",
    orderType: "research",
    hirelings: 1,
    benefits: ["A curated collection that supports research and reputation."],
    functions: [{
      id: "trophy_research",
      label: "Research: Study Trophies",
      orderType: "research",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "intel_report", qty: 1, label: "Trophy Room Research", notes: "DMG: Use trophies to learn about a creature/faction or gain advantage on a future check (DM determines)." }
      ],
      notes: ["DMG'24 Special Facility Order: Research."]
    }]
  },


  // Level 13
  archive: {
    label: "Archive",
    orderType: "research",
    hirelings: 2,
    benefits: ["Deep records and preserved knowledge."],
    functions: [{
      id: "archive_research",
      label: "Research: Deep Records",
      orderType: "research",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "intel_report", qty: 1, label: "Archive Research", notes: "DMG: Powerful research result. DM provides concrete clue, lore, map lead, or similar." }
      ],
      notes: ["DMG'24 Special Facility Order: Research."]
    }]
  },


  meditation_chamber: {
    label: "Meditation Chamber",
    orderType: "empower",
    hirelings: 1,
    benefits: ["A focused space for mental clarity and spiritual practice."],
    functions: [{
      id: "meditation_empower",
      label: "Empower: Meditative Focus",
      orderType: "empower",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "effect_note", qty: 1, label: "Meditation Chamber Empower", notes: "DMG: Apply the Meditation Chamber empower benefit as written; record who benefits and for how long." }
      ],
      notes: ["DMG'24 Special Facility Order: Empower."]
    }]
  },


  menagerie: {
    label: "Menagerie",
    orderType: "recruit",
    hirelings: 2,
    benefits: ["Buy and keep creatures; includes caretakers (DMG)."],
    functions: [{
      id: "menagerie_recruit",
      label: "Recruit (choose creature)",
      orderType: "recruit",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "effect_note", qty: 1, label: "Menagerie", notes: "Recruit completed. See chosen creature in this note." }
      ],
      crafting: {
        modes: [
          { id: "blink_dog", label: "Blink Dog (200gp)", costGP: 200, outputsToWarehouse: [{ type: "effect_note", qty: 1, label: "Menagerie: Blink Dog", notes: "A Blink Dog is now available at your Bastion." }] },
          { id: "displacer_beast", label: "Displacer Beast (500gp)", costGP: 500, outputsToWarehouse: [{ type: "effect_note", qty: 1, label: "Menagerie: Displacer Beast", notes: "A Displacer Beast is now available at your Bastion." }] },
          { id: "griffin", label: "Griffin (500gp)", costGP: 500, outputsToWarehouse: [{ type: "effect_note", qty: 1, label: "Menagerie: Griffin", notes: "A Griffin is now available at your Bastion." }] },
          { id: "hippogriff", label: "Hippogriff (350gp)", costGP: 350, outputsToWarehouse: [{ type: "effect_note", qty: 1, label: "Menagerie: Hippogriff", notes: "A Hippogriff is now available at your Bastion." }] },
          { id: "panther", label: "Panther (80gp)", costGP: 80, outputsToWarehouse: [{ type: "effect_note", qty: 1, label: "Menagerie: Panther", notes: "A Panther is now available at your Bastion." }] }
        ]
      },
      notes: ["Costs pulled from your sheet. You can expand this list later."]
    }]
  },


  observatory: {
    label: "Observatory",
    orderType: "empower",
    hirelings: 2,
    benefits: ["Skywatching, omens, and cosmic insight."],
    functions: [{
      id: "observatory_empower",
      label: "Empower: Celestial Insight",
      orderType: "empower",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "effect_note", qty: 1, label: "Observatory Empower", notes: "DMG: Apply the Observatory empower benefit; record details/beneficiary." }
      ],
      notes: ["DMG prereq: ability to use a Spellcasting Focus."]
    }]
  },


  pub: {
    label: "Pub",
    orderType: "research",
    hirelings: 2,
    benefits: ["Information network and local gossip."],
    functions: [{
      id: "pub_research",
      label: "Research: Rumors & Leads",
      orderType: "research",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "intel_report", qty: 1, label: "Pub Rumors", notes: "DMG: Gather rumors/leads, contacts, or local intel." }
      ],
      notes: ["DMG'24 Special Facility Order: Research."]
    }]
  },


  reliquary: {
    label: "Reliquary",
    orderType: "harvest",
    hirelings: 2,
    benefits: ["Sacred storage and spiritually charged harvests."],
    functions: [{
      id: "reliquary_harvest",
      label: "Harvest: Sacred Boon",
      orderType: "harvest",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "effect_note", qty: 1, label: "Reliquary Harvest", notes: "DMG: Harvest a sacred boon/consumable as written; DM determines exact item." }
      ],
      notes: ["DMG prereq: ability to use a Holy Symbol or Druidic Focus as a Spellcasting Focus."]
    }]
  },


  // Level 17
  demiplane: {
    label: "Demiplane",
    orderType: "empower",
    hirelings: 2,
    benefits: ["Extraplanar space with powerful empowerment potential."],
    functions: [{
      id: "demiplane_empower",
      label: "Empower: Demiplanar Boon",
      orderType: "empower",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "effect_note", qty: 1, label: "Demiplane Empower", notes: "DMG: Apply Demiplane empower effect as written; record beneficiary and duration." }
      ],
      notes: ["DMG prereq: Arcane Focus or tool as Spellcasting Focus."]
    }]
  },


  guildhall: {
    label: "Guildhall",
    orderType: "recruit",
    hirelings: 3,
    benefits: ["A hub of professional expertise and recruitment."],
    functions: [{
      id: "guildhall_recruit",
      label: "Recruit: Skilled Allies",
      orderType: "recruit",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "effect_note", qty: 1, label: "Guildhall Recruit", notes: "DMG: Recruit skilled NPCs/allies as written; DM chooses specifics." }
      ],
      notes: ["DMG prereq: Expertise in a skill."]
    }]
  },


  sanctum: {
    label: "Sanctum",
    orderType: "empower",
    hirelings: 2,
    benefits: ["High-tier sacred empowerment."],
    functions: [{
      id: "sanctum_empower",
      label: "Empower: Sanctum Blessing",
      orderType: "empower",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "effect_note", qty: 1, label: "Sanctum Empower", notes: "DMG: Apply Sanctum empower effect as written; record beneficiary and duration." }
      ],
      notes: ["DMG prereq: Holy Symbol or Druidic Focus as Spellcasting Focus."]
    }]
  },


  war_room: {
    label: "War Room",
    orderType: "recruit",
    hirelings: 3,
    benefits: ["Strategic coordination and recruitment."],
    functions: [{
      id: "war_room_recruit",
      label: "Recruit: Tactical Forces",
      orderType: "recruit",
      durationTurns: 1,
      costGP: 0,
      outputsToWarehouse: [
        { type: "effect_note", qty: 1, label: "War Room Recruit", notes: "DMG: Recruit military help as written; DM determines exact result." }
      ],
      notes: ["DMG prereq: Fighting Style feature or Unarmored Defense feature."]
    }]
  }
};


  function ensureSpecialFacilityCard(runtimeState, configOrSpecial, maybeSpecial) {
  const specialInput = (typeof maybeSpecial !== "undefined") ? maybeSpecial : configOrSpecial;
  // Accept:
  //  - "library"
  //  - { id:"library" }
  //  - { specialId:"library" }
  //  - { facilityId:"library" }
  //  - { facility:{ id:"library" } }
  //  - { id:{ id:"library" } }


  let specialId = "";


  if (typeof specialInput === "string") {
    specialId = specialInput;
  } else if (specialInput && typeof specialInput === "object") {
    const raw =
      (specialInput.id ?? specialInput.specialId ?? specialInput.facilityId ?? specialInput.key ??
       specialInput.facility ?? specialInput.specialFacility ?? specialInput.data ?? "");


    if (typeof raw === "string") {
      specialId = raw;
    } else if (raw && typeof raw === "object") {
      specialId = raw.id || raw.key || raw.name || raw.label || "";
    } else {
      specialId = specialInput.name || specialInput.label || "";
    }
  }


  const key = String(specialId || "").toLowerCase().trim();
  if (!key) return;


  const baseId = `special_${key}`;


  // prevent duplicates
  const already = (runtimeState.facilities || []).some(f => String(f.id) === baseId);
  if (already) return;


  // Optional defs map (safe if empty)
  const def = (typeof SPECIAL_FACILITY_DEFS !== "undefined" && SPECIAL_FACILITY_DEFS)
    ? (SPECIAL_FACILITY_DEFS[key] || null)
    : null;


  // Try to read facilityCatalog from the same spec object the page uses
  let cat = null;
  const spec =
    (typeof bastionSpec !== "undefined" && bastionSpec) ? bastionSpec :
    (typeof BASTION_SPEC !== "undefined" && BASTION_SPEC) ? BASTION_SPEC :
    null;


  if (spec?.facilityCatalog && Array.isArray(spec.facilityCatalog)) {
    cat = spec.facilityCatalog.find(x => String(x?.id || "").toLowerCase() === key) || null;
  }


  const name =
    def?.label ||
    cat?.name ||
    cat?.label ||
    (specialInput && typeof specialInput === "object" ? (specialInput.name || specialInput.label) : "") ||
    String(specialId || "Special Facility");


  const hire = safeNum(def?.hirelings, 0);


  runtimeState.facilities = runtimeState.facilities || [];
  runtimeState.facilities.push({
    id: baseId,
    name,
    type: "dmg24_special_facility_runtime",
    currentLevel: 1,
    maxLevel: 1,
    staffing: {
      hirelingsBase: hire,
      hirelingsByLevel: { "1": hire },
      notes: (cat?.notes && cat.notes.length) ? cat.notes : (def?.benefits || ["Special facility (DMG'24)."])
    },
    levels: {
      "1": {
        label: "Active",
        construction: { costGP: 0, turns: 0 },
        benefits: (def?.benefits && def.benefits.length)
          ? def.benefits
          : ((cat?.notes && cat.notes.length) ? cat.notes : ["Special facility active."]),
        functions: Array.isArray(def?.functions) ? def.functions : []
      }
    }
  });
}


// Armoury stock cost rule:
// cost = 100 + 100 * defenders
// halved if Smithy OR Workshop exists
function computeArmouryStockCost(runtimeState) {
  const { count } = getDefenders(runtimeState);
  let cost = 100 + (100 * count);
  if (hasFacility(runtimeState, "smithy", 1) || hasFacility(runtimeState, "workshop", 1)) {
    cost = Math.ceil(cost / 2);
  }
  return cost;
}


// Apply a "defenders-loss on ones" effect: roll NdM and lose 1 defender per die == 1
function applyDefendersLossOnOnes(runtimeState, diceExpr) {
  // Expect "6d6" etc.
  const m = String(diceExpr || "").match(/^(\d+)d(\d+)$/i);
  const n = m ? safeNum(m[1], 0) : 0;
  const sides = m ? safeNum(m[2], 0) : 0;
  if (!n || !sides) return { rolled: [], lost: 0 };


  const rolls = [];
  let lost = 0;
  for (let i = 0; i < n; i++) {
    const r = rollDie(sides);
    rolls.push(r);
    if (r === 1) lost += 1;
  }


  const def = getDefenders(runtimeState);
  setDefenders(runtimeState, def.count - lost);
  return { rolled: rolls, lost };
}


function computeUpkeep(config, runtimeState) {
  const phaseId = config?.economy?.activeUpkeepPhaseId;
  const phase = (config?.economy?.upkeepPhases || []).find(p => p.id === phaseId);
  const base = safeNum(phase?.partyPaysFlatGPPertTurn, 0);


  const rep = String(safeNum(runtimeState?.state?.bastionReputation, 1));
  const repEffects = runtimeState?.state?.reputationEffects || {};
  const mult = safeNum(repEffects?.[rep]?.upkeepMultiplier, 1);


  // future upkeep add effects (from events)
  const mods = runtimeState?.state?.pendingUpkeepAdds || [];
  const addGP = mods.reduce((a, x) => a + safeNum(x?.gp, 0), 0);


  return Math.ceil((base + addGP) * mult);
}


function trafficLightClass(config, treasuryGP, nextUpkeep) {
  const cfg = config?.state?.treasury?.trafficLightConfig;
  const greenTurns = safeNum(cfg?.greenIfRemainingGPGreaterOrEqualTo?.turns, 2);
  const amberTurns = safeNum(cfg?.amberIfRemainingGPGreaterOrEqualTo?.turns, 1);


  const remaining = treasuryGP - nextUpkeep;
  if (remaining >= nextUpkeep * greenTurns) return "traffic-green";
  if (remaining >= nextUpkeep * amberTurns) return "traffic-amber";
  return "traffic-red";
}


function ensureRuntimeState(config, saved) {
  // Runtime state contains:
  // - config (immutable-ish)
  // - state (mutable and persisted)
  const base = deepClone(config);


  // Add extra runtime-only fields if missing
  base.state.turnCount = safeNum(base.state.turnCount, 0);
  base.state.lastEventTurn = safeNum(base.state.lastEventTurn, 0);
  base.state.pendingUpkeepAdds = Array.isArray(base.state.pendingUpkeepAdds) ? base.state.pendingUpkeepAdds : [];
  base.state.ordersInProgress = Array.isArray(base.state.ordersInProgress) ? base.state.ordersInProgress : [];
  base.state.constructionInProgress = Array.isArray(base.state.constructionInProgress) ? base.state.constructionInProgress : [];
  base.state.warehouse = base.state.warehouse || { items: [], editable: true };
  base.state.warehouse.items = Array.isArray(base.state.warehouse.items) ? base.state.warehouse.items : [];
    // v1.1 additive scaffolding
  ensureRosterState(base);


  base.state.artisanTools = base.state.artisanTools || { slots: Array(6).fill(null), presets: [] };
  base.state.artisanTools.slots = Array.isArray(base.state.artisanTools.slots) ? base.state.artisanTools.slots.slice(0, 6) : Array(6).fill(null);
  while (base.state.artisanTools.slots.length < 6) base.state.artisanTools.slots.push(null);
  base.state.workshop = base.state.workshop || { selectedTool: "", selectedItem: "" };
  base.state.activeEffects = Array.isArray(base.state.activeEffects) ? base.state.activeEffects : [];


  base.state.specialFacilities = Array.isArray(base.state.specialFacilities) ? base.state.specialFacilities : [];
  base.state.specialConstruction = Array.isArray(base.state.specialConstruction) ? base.state.specialConstruction : [];
  // If special facilities exist in saved state, make sure they become real facility cards
for (const sf of base.state.specialFacilities) {
  const id = (sf && typeof sf === "object") ? sf.id : sf;
  if (id) ensureSpecialFacilityCard(base, base, id);
}


  if (!saved) return base;


  // Merge saved.state into base.state safely (keep schema additions from config)
  const merged = deepClone(base);
  merged.state = { ...merged.state, ...(saved.state || {}) };
    // v1.1 additive scaffolding (after merge)
  ensureRosterState(merged);


  merged.state.artisanTools = merged.state.artisanTools || { slots: Array(6).fill(null), presets: [] };
  merged.state.artisanTools.slots = Array.isArray(merged.state.artisanTools.slots) ? merged.state.artisanTools.slots.slice(0, 6) : Array(6).fill(null);
  while (merged.state.artisanTools.slots.length < 6) merged.state.artisanTools.slots.push(null);
  merged.state.workshop = merged.state.workshop || { selectedTool: "", selectedItem: "" };
  merged.state.activeEffects = Array.isArray(merged.state.activeEffects) ? merged.state.activeEffects : [];


  merged.state.specialFacilities = Array.isArray(merged.state.specialFacilities) ? merged.state.specialFacilities : [];
  merged.state.specialConstruction = Array.isArray(merged.state.specialConstruction) ? merged.state.specialConstruction : [];
  for (const sf of merged.state.specialFacilities) {
  const id = (sf && typeof sf === "object") ? sf.id : sf;
  if (id) ensureSpecialFacilityCard(merged, merged, id);
}


  // ensure arrays still arrays
  merged.state.warehouse = merged.state.warehouse || { items: [], editable: true };
  merged.state.warehouse.items = Array.isArray(merged.state.warehouse.items) ? merged.state.warehouse.items : [];
  merged.state.ordersInProgress = Array.isArray(merged.state.ordersInProgress) ? merged.state.ordersInProgress : [];
  merged.state.constructionInProgress = Array.isArray(merged.state.constructionInProgress) ? merged.state.constructionInProgress : [];
  merged.state.pendingUpkeepAdds = Array.isArray(merged.state.pendingUpkeepAdds) ? merged.state.pendingUpkeepAdds : [];
  merged.state.turnCount = safeNum(merged.state.turnCount, 0);
  merged.state.lastEventTurn = safeNum(merged.state.lastEventTurn, 0);


  // facilities currentLevel is stored in config.facilities[] in your spec,
  // so we also merge currentLevel values from saved.facilities into merged.facilities.
  if (Array.isArray(saved.facilities) && Array.isArray(merged.facilities)) {
    const byId = new Map(saved.facilities.map(f => [f.id, f]));
    merged.facilities = merged.facilities.map(f => {
      const s = byId.get(f.id);
      if (!s) return f;
      return { ...f, currentLevel: safeNum(s.currentLevel, f.currentLevel) };
    });
  }


  return merged;
}


function exportBastion(runtimeState) {
  const out = deepClone(runtimeState);
  return JSON.stringify(out, null, 2);
}


function parseJsonSafe(text) {
  try { return JSON.parse(text); } catch { return null; }
}


function findFacility(root, facilityId) {
  const id = String(facilityId || "");

  const pools = [
    ...(root?.facilities || []),
    ...(root?.specialFacilities || []),
    ...(root?.special_facilities || []),
    ...(root?.state?.specialFacilities || []),
    ...(root?.state?.special_facilities || []),
  ];

  return pools.find(f => String(f?.id) === id) || null;
}


function facilityLevelData(facility, lvl) {
  // Normal facilities (have levels map)
  if (facility?.levels) {
    return facility.levels[String(lvl)] || null;
  }

  // Special facilities (defined in SPECIAL_FACILITY_DEFS, typically single-level)
  const id = String(facility?.id || "");
  const def = (typeof SPECIAL_FACILITY_DEFS !== "undefined") ? SPECIAL_FACILITY_DEFS[id] : null;

  // If it's special: only available when built (level >= 1)
  if (def) {
    if (safeNum(lvl, 0) < 1) return null;

    return {
      label: def.label || def.name || id,
      benefits: Array.isArray(def.benefits) ? def.benefits : [],
      functions: Array.isArray(def.functions) ? def.functions : [],
      staffing: def.staffing || null,
      construction: def.construction || null
    };
  }

  return null;
}


function isUnderConstruction(runtimeState, facilityId) {
  return (runtimeState.state.constructionInProgress || []).some(c => c.facilityId === facilityId);
}


function startUpgrade(runtimeState, facilityId) {
  const fac = findFacility({ facilities: runtimeState.facilities }, facilityId);
  if (!fac) return { ok:false, msg:"Facility not found." };


  const current = safeNum(fac.currentLevel, 0);
  const max = safeNum(fac.maxLevel, current);
  if (current >= max) return { ok:false, msg:"Already at max level." };
  if (isUnderConstruction(runtimeState, facilityId)) return { ok:false, msg:"Already under construction." };


  const next = current + 1;
  const lvl = facilityLevelData(fac, next);
  const cost = safeNum(lvl?.construction?.costGP, 0);
  const turns = safeNum(lvl?.construction?.turns, 0);


  const treasury = safeNum(runtimeState.state?.treasury?.gp, 0);
  if (treasury < cost) return { ok:false, msg:"Not enough GP in treasury." };


  runtimeState.state.treasury.gp = treasury - cost;
  runtimeState.state.constructionInProgress.push({
    facilityId,
    targetLevel: next,
    remainingTurns: turns
  });


  return { ok:true };
}

function startFunctionOrder(runtimeState, facilityId, fnId) {
  const fac = getFacilityById(runtimeState, facilityId);
  if (!fac) return { ok:false, msg:"Facility not found." };

  const baseId = baseFacilityId(fac.id);

  // Only 2 automated function buttons remain:
  // - barracks: recruit_defenders
  // - armoury: stock_armoury
  const allowed = (baseId === "barracks" && fnId === "recruit_defenders")
               || (baseId === "armoury"  && fnId === "stock_armoury");

  if (!allowed) {
    return { ok:false, msg:"This function is dropdown-only now (no automation)." };
  }

  // Prevent duplicate same order in progress
  const exists = (runtimeState.state.ordersInProgress || [])
    .some(o => baseFacilityId(o.facilityId) === baseId && o.functionId === fnId);
  if (exists) return { ok:false, msg:"That function is already active." };

  const treasury = safeNum(runtimeState.state?.treasury?.gp, 0);

  // --- Barracks: recruit defenders (1d4, 1 turn) ---
  if (baseId === "barracks") {
    runtimeState.state.ordersInProgress.push({
      facilityId: fac.id,
      functionId: fnId,
      label: "Recruit Defenders",
      remainingTurns: 1,
      rosterEffects: [{ type:"defenders_add", dice:"1d4" }],
      notes: ["Adds 1d4 defenders to the Bastion roster when the turn is taken."]
    });
    return { ok:true };
  }

  // --- Armoury: stock armoury (cost scales with defender count) ---
  if (baseId === "armoury") {
    const defenders = safeNum(runtimeState.state?.roster?.defenders?.count, 0);
    const cost = 100 + (defenders * 100);

    if (treasury < cost) return { ok:false, msg:`Not enough GP. Need ${cost} gp.` };
    runtimeState.state.treasury.gp = treasury - cost;

    // Mark: defenders will show "Armed" NEXT bastion turn only
    runtimeState.state.armoryStockedForTurn = safeNum(runtimeState.state.turnCount, 0) + 1;

    // (Optional) We still create a 1-turn order so you see it running/complete
    runtimeState.state.ordersInProgress.push({
      facilityId: fac.id,
      functionId: fnId,
      label: "Stock Armoury",
      remainingTurns: 1,
      rosterEffects: [],
      notes: [`Cost paid: ${cost} gp. Defenders become Armed next Bastion Turn only.`]
    });

    return { ok:true };
  }

  return { ok:false, msg:"Unhandled function." };
}


function applyOrderEffects(runtimeState, order) {
  const effects = order?.effects;
  if (!effects) return;

  const list = Array.isArray(effects) ? effects : [effects];

  runtimeState.state.activeEffects = Array.isArray(runtimeState.state.activeEffects)
    ? runtimeState.state.activeEffects
    : [];

  for (const eff of list) {
    if (!eff || typeof eff !== "object") continue;

    // Store persistent "status-like" effects for the DM to track.
    if (eff.type === "status_effect_grant") {
      const beneficiary =
        (eff.beneficiaryFromInputKey && order?.inputValues?.[eff.beneficiaryFromInputKey]) ||
        eff.beneficiary ||
        "Unnamed";

      runtimeState.state.activeEffects.push({
        id: eff.effectId || "effect",
        label: eff.label || eff.effectId || "Effect",
        beneficiary,
        durationDays: safeNum(eff.durationDays, 1),
        tempHpFormula: eff.tempHpFormula || null,
        source: {
          facilityId: order.facilityId,
          functionId: order.functionId,
          turnStarted: safeNum(order.turnStarted, null)
        },
        createdAt: new Date().toISOString()
      });

      continue;
    }

    // Storehouse Trade (Buy/Sell) - structured logic (no placeholders)
    if (eff.type === "storehouse_trade") {
      const pl = safeNum(runtimeState.state?.playerLevel, 1);

      // DMG caps/profit by player level
      const caps = (() => {
        // Buy caps: 500 (L5), 2000 (L9), 5000 (L13)
        // Profit: +10% (L5), +20% (L9), +50% (L13), +100% (L17)
        if (pl >= 17) return { buyCap: 5000, profitPct: 1.00 };
        if (pl >= 13) return { buyCap: 5000, profitPct: 0.50 };
        if (pl >= 9)  return { buyCap: 2000, profitPct: 0.20 };
        return          { buyCap: 500,  profitPct: 0.10 };
      })();

      const mode = String(order?.craftingMode || order?.inputValues?.mode || "").toLowerCase();

      runtimeState.state.warehouse = runtimeState.state.warehouse || { items: [], editable: true };
      runtimeState.state.warehouse.items = Array.isArray(runtimeState.state.warehouse.items)
        ? runtimeState.state.warehouse.items
        : [];

      const wh = runtimeState.state.warehouse.items;
      const makeId = () => `wh_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      if (mode === "buy") {
        const spend = safeNum(order?.inputValues?.spendGp, 0);

        if (spend <= 0) {
          wh.push({ type:"note", qty:1, label:"Storehouse Trade Failed", notes:"Buy selected but no spend GP was provided." });
          continue;
        }
        if (spend > caps.buyCap) {
          wh.push({ type:"note", qty:1, label:"Storehouse Trade Failed", notes:`Buy exceeds cap. Spend ${spend}gp > cap ${caps.buyCap}gp (Player Level ${pl}).` });
          continue;
        }

        wh.push({
          id: makeId(),
          type: "trade_shipment",
          qty: 1,
          gp: spend,
          label: "Trade Shipment (Storehouse)",
          notes: `Purchased goods worth up to ${spend}gp. Cap at time: ${caps.buyCap}gp (PL ${pl}).`,
          meta: { spentGp: spend, buyCapAtTime: caps.buyCap, playerLevelAtTime: pl },
          sourceFacilityId: "storehouse",
          sourceFunctionId: "storehouse_trade",
          createdAt: new Date().toISOString()
        });

        continue;
      }

      if (mode === "sell") {
        const shipId = String(order?.inputValues?.shipmentId || "").trim();

        if (!shipId) {
          wh.push({ type:"note", qty:1, label:"Storehouse Trade Failed", notes:"Sell selected but no shipment was chosen." });
          continue;
        }

        const idx = wh.findIndex(x => x && String(x.id || "") === shipId && x.type === "trade_shipment");
        if (idx < 0) {
          wh.push({ type:"note", qty:1, label:"Storehouse Trade Failed", notes:"Selected shipment not found in Warehouse." });
          continue;
        }

        const shipment = wh[idx];
        const base = safeNum(shipment.gp, safeNum(shipment.meta?.spentGp, 0));
        const payout = Math.round(base * (1 + caps.profitPct));

        // Remove shipment
        wh.splice(idx, 1);

        // Add GP to treasury
        const tNow = safeNum(runtimeState.state?.treasury?.gp, 0);
        runtimeState.state.treasury.gp = tNow + payout;

        // Log result
        wh.push({
          type: "note",
          qty: 1,
          label: "Storehouse Sale Completed",
          notes: `Sold Trade Shipment (base ${base}gp) for ${payout}gp (+${Math.round(caps.profitPct*100)}%). Player Level ${pl}.`
        });

        continue;
      }

      wh.push({ type:"note", qty:1, label:"Storehouse Trade Failed", notes:"No valid trade mode selected (buy/sell)." });
      continue;
    }

    // Future-proof: add more effect types here later.
  }
}

function applyOutputsToWarehouse(runtimeState, outputs) {
  const items = runtimeState.state.warehouse.items;


  outputs.forEach(out => {
    if (!out || typeof out !== "object") return;


    // Resolve dice gp outputs
    if (out.type === "coin" && typeof out.gp === "string") {
      const gp = rollDiceExpr(out.gp);
      items.push({ type: "coin", qty: 1, gp, label: "Coin", notes: `Rolled ${out.gp}` });
      return;
    }


    // Trade goods with max value
    if (out.type === "trade_goods") {
      const v = safeNum(out.valueGPMax, safeNum(out.gpValueMax, 0));
      items.push({
        type: "trade_goods",
        qty: safeNum(out.qty, 1),
        gpValueMax: v,
        label: "Trade goods",
        notes: out.notes || "DM chooses trade goods."
      });
      return;
    }


    // Generic item objects (ensure label so it always shows in Warehouse)
    const cloned = deepClone(out);


    if (!cloned.label) {
      if (cloned.name) cloned.label = String(cloned.name);
      else if (cloned.title) cloned.label = String(cloned.title);
      else if (cloned.key) cloned.label = String(cloned.key);
      else if (cloned.type) cloned.label = String(cloned.type);
      else cloned.label = "Item";
    }


    if (cloned.qty == null) cloned.qty = 1;


    items.push(cloned);
  });
}


// --- Workshop Crafting: create an order that deposits a chosen item into Warehouse ---
function createWorkshopCraftOrder(runtimeState, toolName, itemName) {
  const safeTool = String(toolName || "").trim();
  const safeItem = String(itemName || "").trim();


  // Fallbacks so it never breaks
  const tool = safeTool || "Artisan tools";
  const item = safeItem || "Crafted item";


  // Decide duration/cost (simple defaults; you can tune later)
  const durationTurns = 1;
  const costGP = 0;


  // Spend GP if needed
  const treasuryNow = safeNum(runtimeState.state?.treasury?.gp, 0);
  if (treasuryNow < costGP) {
    return { ok: false, msg: "Not enough GP in Treasury for this craft." };
  }
  runtimeState.state.treasury.gp = treasuryNow - costGP;


  // Create a standard “order” that your pipeline already understands
  const order = {
    facilityId: "workshop",                 // base id is fine
    functionId: "craft_custom",             // custom marker
    label: `Craft: ${item}`,
    remainingTurns: durationTurns,
    outputsToWarehouse: [
      {
        type: "item",
        qty: 1,
        label: item,
        notes: `Crafted using ${tool}`
      }
    ],
    notes: [`Workshop Crafting: ${tool} → ${item}`]
  };


  return { ok: true, order };
}


function rollEvent(runtimeState) {
  const table = runtimeState?.events?.d100Table || [];
  const roll = rollDie(100);
  const hit = table.find(e => roll >= safeNum(e.range?.[0], 1) && roll <= safeNum(e.range?.[1], 100)) || null;


  return { roll, event: hit };
}


function applyEventEffects(runtimeState, eventObj) {
  if (!eventObj?.effects) return;


  for (const eff of eventObj.effects) {
    if (!eff || typeof eff !== "object") continue;


    if (eff.type === "future_upkeep_add") {
      runtimeState.state.pendingUpkeepAdds.push({
        gp: safeNum(eff.gp, 0),
        remainingTurns: safeNum(eff.durationTurns, 1)
      });
    }


    if (eff.type === "treasury_gain") {
      const gp = typeof eff.gp === "string" ? rollDiceExpr(eff.gp) : safeNum(eff.gp, 0);
      runtimeState.state.treasury.gp = safeNum(runtimeState.state.treasury.gp, 0) + gp;
    }


    if (eff.type === "warehouse_add" && eff.item) {
      runtimeState.state.warehouse.items.push(deepClone(eff.item));
    }


        // v1.1 structured roster effects (must be INSIDE the eff loop)
    if (eff.type === "defenders_loss_on_ones") {
      const dice = eff.dice || "6d6";
      const out = applyDefendersLossOnOnes(runtimeState, dice);


      runtimeState.state.lastEventApplied = runtimeState.state.lastEventApplied || [];
      runtimeState.state.lastEventApplied.push({
        type: "defenders_loss_on_ones",
        dice,
        rolls: out.rolled,
        lost: out.lost
      });
    }


    if (eff.type === "hirelings_delta") {
      ensureRosterState(runtimeState);
      runtimeState.state.roster.hirelings.manualAdjustment =
        safeNum(runtimeState.state.roster.hirelings.manualAdjustment, 0) + safeNum(eff.delta, 0);
    }


    // other effects are displayed as notes for DM handling
  }
}


function advanceTurnPipeline(runtimeState, opts = { maintainIssued:false }) {
  // 1) calculate upkeep
  const nextUpkeep = computeUpkeep(runtimeState, runtimeState);


  // 2) auto deduct upkeep
  const auto = !!runtimeState?.turnSystem?.upkeep?.autoDeductFromTreasury;
  const treasury = safeNum(runtimeState.state?.treasury?.gp, 0);


  runtimeState.state.flags = runtimeState.state.flags || {};


  if (auto) {
    if (treasury >= nextUpkeep) {
      runtimeState.state.treasury.gp = treasury - nextUpkeep;
      runtimeState.state.flags.upkeep_unpaid = false;
    } else {
      // insufficient
      const setFlag = runtimeState?.turnSystem?.upkeep?.ifInsufficientFunds?.setFlag || "upkeep_unpaid";
      runtimeState.state.flags[setFlag] = true;
      // optional: do not deduct to zero by default
    }
  }


    // 2.5) v1.1 rosterEffects tick (e.g. Barracks Recruit adds defenders per turn while active)
if (Array.isArray(runtimeState.state.ordersInProgress)) {
  for (const o of runtimeState.state.ordersInProgress) {
    const effects = o?.rosterEffects;
    if (!effects) continue;


    const list = Array.isArray(effects) ? effects : [effects];


    for (const eff of list) {
      if (!eff || typeof eff !== "object") continue;


      // defenders_add: { type:"defenders_add", dice:"1d4", capBy:{ facilityId:"barracks_D" } }
      if (eff.type === "defenders_add") {
        const gainExpr = eff.dice || eff.defendersGainDice || "1d4";
        const gain = typeof gainExpr === "string" ? rollDiceExpr(gainExpr) : safeNum(gainExpr, 0);


        const def = getDefenders(runtimeState);


        // Cap is driven by Barracks, regardless of whether eff says barracks_D or "barracks"
        const cap = getBarracksCapacity(runtimeState);
        const next = clamp(def.count + gain, 0, cap);


        ensureRosterState(runtimeState);
        runtimeState.state.roster.defenders.count = next;


        runtimeState.state.lastRosterTick = runtimeState.state.lastRosterTick || [];
        runtimeState.state.lastRosterTick.push({
          facilityId: o.facilityId,
          functionId: o.functionId,
          type: "defenders_add",
          gained: gain,
          before: def.count,
          after: next,
          cap
        });
      }
    }
  }
}
  // 3) decrement construction timers, complete upgrades at 0
  runtimeState.state.constructionInProgress = (runtimeState.state.constructionInProgress || []).map(c => ({
    ...c,
    remainingTurns: safeNum(c.remainingTurns, 0) - 1
  }));


  const completedCon = runtimeState.state.constructionInProgress.filter(c => safeNum(c.remainingTurns, 0) <= 0);
  runtimeState.state.constructionInProgress = runtimeState.state.constructionInProgress.filter(c => safeNum(c.remainingTurns, 0) > 0);


  completedCon.forEach(c => {
    const fac = findFacility(runtimeState, c.facilityId);
    if (fac) fac.currentLevel = safeNum(c.targetLevel, fac.currentLevel);
  });


  // --- v1.1 Special Facilities construction completion ---
runtimeState.state.specialConstruction = (runtimeState.state.specialConstruction || []).map(x => ({
  ...x,
  remainingTurns: safeNum(x.remainingTurns, 0) - 1
}));


const doneSpecial = (runtimeState.state.specialConstruction || []).filter(x => safeNum(x.remainingTurns, 0) <= 0);
runtimeState.state.specialConstruction = (runtimeState.state.specialConstruction || []).filter(x => safeNum(x.remainingTurns, 0) > 0);


runtimeState.state.specialFacilities = Array.isArray(runtimeState.state.specialFacilities)
  ? runtimeState.state.specialFacilities
  : [];


doneSpecial.forEach(x => {
  const fid = x.facilityId || x.id;
  if (!fid) return;


  const slotIndex = Number.isFinite(Number(x.slotIndex)) ? Number(x.slotIndex) : -1;


  // Ensure array exists and has enough length
  runtimeState.state.specialFacilities = Array.isArray(runtimeState.state.specialFacilities)
    ? runtimeState.state.specialFacilities
    : [];


  if (slotIndex >= 0) {
    // Put it in the exact slot that finished building
    runtimeState.state.specialFacilities[slotIndex] = {
      id: fid,
      name: x.name || fid,
      status: "active"
    };
  } else {
    // Fallback: append if no slot provided
    const exists = runtimeState.state.specialFacilities.some(sf => sf?.id === fid);
    if (!exists) runtimeState.state.specialFacilities.push({ id: fid, name: x.name || fid, status: "active" });
  }


  // Create/attach a real facility card (NO duplicates)
  ensureSpecialFacilityCard(runtimeState, runtimeState, fid);
});


  // 4) decrement order timers
  runtimeState.state.ordersInProgress = (runtimeState.state.ordersInProgress || []).map(o => ({
    ...o,
    remainingTurns: safeNum(o.remainingTurns, 0) - 1
  }));


  // 5) resolve completed outputs
  const completedOrders = runtimeState.state.ordersInProgress.filter(o => safeNum(o.remainingTurns, 0) <= 0);
  runtimeState.state.ordersInProgress = runtimeState.state.ordersInProgress.filter(o => safeNum(o.remainingTurns, 0) > 0);


  completedOrders.forEach(o => {
  applyOrderEffects(runtimeState, o);
  applyOutputsToWarehouse(runtimeState, o.outputsToWarehouse || []);
});


  // decrement pending upkeep adds duration
  runtimeState.state.pendingUpkeepAdds = (runtimeState.state.pendingUpkeepAdds || [])
    .map(x => ({ ...x, remainingTurns: safeNum(x.remainingTurns, 0) - 1 }))
    .filter(x => safeNum(x.remainingTurns, 0) > 0);


  // 6) monthly events every 4 turns OR maintain issued
  runtimeState.state.turnCount = safeNum(runtimeState.state.turnCount, 0) + 1;
    // --- Armoury "armed next turn only" logic ---
  runtimeState.state.roster = runtimeState.state.roster || {};
  runtimeState.state.roster.defenders = runtimeState.state.roster.defenders || {};
  const currentTurn = safeNum(runtimeState.state.turnCount, 0);

  const armedTurn = safeNum(runtimeState.state.armoryStockedForTurn, -999);
  runtimeState.state.roster.defenders.armed = (armedTurn === currentTurn);

  const turnCount = runtimeState.state.turnCount;


  let didRoll = false;
  let rolled = null;


  const monthly = runtimeState?.events?.frequency === "monthly";
  const dueMonthly = monthly && (turnCount % 4 === 0);


  if (opts.maintainIssued || dueMonthly) {
        runtimeState.state.lastEventApplied = [];
    const r = rollEvent(runtimeState);
    rolled = r;
    didRoll = true;
    runtimeState.state.lastEventTurn = turnCount;


    if (r.event) applyEventEffects(runtimeState, r.event);


        runtimeState.state.lastEventResult = {
      turn: turnCount,
      roll: r.roll,
      key: r.event?.key || null,
      label: r.event?.label || null,
      notes: r.event?.notes || null,
      effects: r.event?.effects || [],
      applied: runtimeState.state.lastEventApplied || []
    };
  }


  return { nextUpkeep, didRoll, rolled };
}


function fmtJSON(obj) {
  try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
}

function ensureDefenseState(rs){
  rs.state = rs.state || {};
  rs.state.turnCount = Number(rs.state.turnCount || 0);

  rs.state.roster = rs.state.roster || {};
  rs.state.roster.defendersTotal = Number(rs.state.roster.defendersTotal || 0);
  rs.state.roster.defendersArmed = !!rs.state.roster.defendersArmed;

  // Track when actions were issued
  if (rs.state.roster.recruitIssuedTurn == null) rs.state.roster.recruitIssuedTurn = null;
  if (rs.state.roster.lastArmouryStockTurn == null) rs.state.roster.lastArmouryStockTurn = null;
}

function issueRecruitDefenders(rs, fid){
  ensureDefenseState(rs);

  // One action per turn (keeps it simple)
  if (rs.state.roster.recruitIssuedTurn === rs.state.turnCount) {
    alert("Recruit Defenders has already been issued this turn.");
    return;
  }

  rs.state.roster.recruitIssuedTurn = rs.state.turnCount;
  rs.state.log = rs.state.log || [];
  rs.state.log.push({
    t: Date.now(),
    title: "Barracks",
    text: "Recruit Defenders issued (completes next turn)."
  });
}

function issueStockArmoury(rs, fid){
  ensureDefenseState(rs);

  // cost: 100 + (defenders x 100)
  const defenders = Number(rs.state.roster.defendersTotal || 0);
  const cost = 100 + (defenders * 100);

  rs.state.treasury = rs.state.treasury || {};
  rs.state.treasury.gp = Number(rs.state.treasury.gp || 0);

  if (rs.state.treasury.gp < cost) {
    alert(`Insufficient treasury. Stock Armoury costs ${cost}gp (100 + defenders×100).`);
    return false;
  }

  // One stock per turn
  if (rs.state.roster.lastArmouryStockTurn === rs.state.turnCount) {
    alert("Stock Armoury has already been done this turn.");
    return false;
  }

  rs.state.treasury.gp -= cost;
  rs.state.roster.lastArmouryStockTurn = rs.state.turnCount;

  rs.state.log = rs.state.log || [];
  rs.state.log.push({
    t: Date.now(),
    title: "Armoury",
    text: `Stock Armoury issued for ${cost}gp (completes next turn).`
  });

  return true;
}
function resolveDefenseTurnCompletion(rs){
  ensureDefenseState(rs);

  // If recruit was issued last turn, it completes now
  if (rs.state.roster.recruitIssuedTurn === (rs.state.turnCount - 1)) {
    const gained = 1 + Math.floor(Math.random() * 4); // 1d4
    rs.state.roster.defendersTotal += gained;

    rs.state.log = rs.state.log || [];
    rs.state.log.push({
      t: Date.now(),
      title: "Barracks",
      text: `Recruit Defenders completed: +${gained} defenders added.`
    });

    // Allow recruitment again on future turns
    rs.state.roster.recruitIssuedTurn = null;
  }

  // Armed status ONLY if armoury was stocked last turn
  rs.state.roster.defendersArmed =
    (rs.state.roster.lastArmouryStockTurn === (rs.state.turnCount - 1));
}


async function renderBastionManager() {
  // Load config
  let config;
  try {
    const configPath = getBastionConfigPath();
    const res = await fetch(configPath, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load ${configPath}`);
    config = await res.json();

// 🔑 MAKE CONFIG AVAILABLE EVERYWHERE (runtimeState may not exist yet here)
__BASTION_SPEC__ = config;


  } catch (e) {
    const configPath = getBastionConfigPath();
    view.innerHTML = `<h1>Bastion Manager</h1><p class="badge">Error loading ${configPath}</p><pre>${String(e)}</pre>`;
    return;
  }


  // Load saved state or seed from config
  const saved = loadBastionSave();
  const runtimeState = ensureRuntimeState(config, saved);
  runtimeState.spec = __BASTION_SPEC__ || config;
  window.__bmState = runtimeState;



  // Precompute
  const treasuryGP = safeNum(runtimeState.state?.treasury?.gp, 0);
  const nextUpkeep = computeUpkeep(runtimeState, runtimeState);
  const tlClass = trafficLightClass(runtimeState, treasuryGP, nextUpkeep);


  const rep = String(safeNum(runtimeState.state?.bastionReputation, 1));
  const repInfo = runtimeState.state?.reputationEffects?.[rep];


  const mapPath = runtimeState?.meta?.mapImage?.defaultPath || "";
  const mapTitle = runtimeState?.meta?.mapImage?.title || "Bastion Map";


  const facilities = runtimeState.facilities || [];
  const orders = runtimeState.state.ordersInProgress || [];
  const constructions = runtimeState.state.constructionInProgress || [];
  const lastEvent = runtimeState.state.lastEventResult;


  // --- Render HTML (ONLY HTML inside this template string) ---
  view.innerHTML = `
    <h1>Bastion Manager</h1>
    <p class="badge">${runtimeState?.meta?.name || "Bastion"} • ${runtimeState?.meta?.type || ""}</p>


    <div class="card">
      <h2>${mapTitle}</h2>
        <div class="pill" style="margin-top:10px;">
    <span class="small muted">Spec:</span>
    <select id="bm_specSelect" style="margin-left:10px;">
      <option value="v1">v1 (current)</option>
      <option value="v1_1">v1.1 (new)</option>
    </select>
    <span class="small muted" style="margin-left:10px;">(v1 is your safe default)</span>
  </div>
      ${mapPath
        ? `<img src="${mapPath}" alt="${mapTitle}" style="width:100%;border-radius:18px;border:1px solid var(--border);">`
        : `<p class="small">No mapImage.defaultPath set.</p>`
      }
      <p class="small muted">Path: <code>${mapPath || "(none)"}</code></p>
    </div>


   <div class="bmGrid" style="margin-top:12px;">
      <div class="card">
        <h2>State</h2>
        <div class="inputRow">
          <label>Player Level
            <input id="bm_playerLevel" type="number" min="1" max="20" value="${safeNum(runtimeState.state.playerLevel, 1)}">
          </label>
          <label>Bastion Reputation
            <input id="bm_rep" type="number" min="-2" max="2" value="${safeNum(runtimeState.state.bastionReputation, 1)}">
          </label>
        </div>
        <div style="margin-top:10px;">
          <span class="pill">Reputation: <b>${repInfo?.label || "Unknown"}</b></span>
          <span class="pill">Upkeep Multiplier: <b>${safeNum(repInfo?.upkeepMultiplier, 1).toFixed(2)}</b></span>
        </div>
        <div class="small muted" style="margin-top:10px;">
          ${(repInfo?.notes || []).map(n => `<div>• ${n}</div>`).join("") || `<div>• No notes.</div>`}
        </div>
      </div>


      <div class="card treasuryCard ${tlClass}">
        <h2>Treasury</h2>
        <div class="inputRow">
          <label>GP
            <input id="bm_treasury" type="number" min="0" step="1" value="${treasuryGP}">
          </label>
        </div>
        <div style="margin-top:10px;">
          <span class="pill">Next Upkeep: <b>${nextUpkeep} gp</b></span>
          <span class="pill">After Upkeep: <b>${treasuryGP - nextUpkeep} gp</b></span>
        </div>
        <div class="small muted" style="margin-top:10px;">
          Traffic light is computed from <code>(treasury - nextUpkeep)</code>.
        </div>
      </div>
    </div>
        <div class="card" style="margin-top:12px;">
      <h2>Bastion Roster</h2>
      <p class="small muted">v1.1: defenders + hirelings. Manual adjustment is for deaths/extra hires.</p>


      <div class="grid2">
        <div>
          <div class="pill">
            Defenders: <b id="bm_defCount">0</b> / <b id="bm_defCap">0</b>
          </div>


          <label style="display:block;margin-top:10px;">Edit defenders
            <input id="bm_defendersInput" type="number" min="0" step="1" value="0">
          </label>


          <div class="small muted" style="margin-top:8px;">
            Capacity is driven by <b>Barracks level</b>.
          </div>
        </div>


        <div>
          <div class="pill">
            Hirelings (computed): <b id="bm_hireBase">0</b>
          </div>
          <label style="display:block;margin-top:10px;">Manual adjustment
            <input id="bm_hireAdj" type="number" step="1" value="0">
          </label>
          <div class="pill" style="margin-top:10px;">
            Total hirelings: <b id="bm_hireTotal">0</b>
          </div>
        </div>
      </div>
    </div>


    <!-- Warehouse (full width) -->
<div class="card warehouseCard" style="margin-top:12px;">
  <h2>Warehouse</h2>
  <p class="small muted">DM editable. Function outputs append here automatically when completed.</p>


  <div class="tableWrap" style="overflow:auto;">
    <table class="table" style="min-width:780px;">
      <thead>
        <tr>
          <th>Item</th>
          <th style="width:90px;">Qty</th>
          <th style="width:120px;">GP</th>
          <th>Notes</th>
          <th style="width:110px;">Action</th>
        </tr>
      </thead>
      <tbody id="bm_wh_rows"></tbody>
    </table>
  </div>


  <div class="btnRow">
    <button id="bm_wh_add">Add Item</button>
    <button id="bm_wh_save">Save Warehouse</button>
  </div>
</div>


<!-- Import/Export (under Warehouse) -->
<div class="card" style="margin-top:12px;">
  <h2>Import / Export</h2>
  <div class="btnRow">
    <button id="bm_export">Export State JSON</button>
    <button id="bm_import_btn">Import JSON</button>
    <input id="bm_import_file" type="file" accept="application/json" style="display:none;">
    <button id="bm_reset">Reset From Spec</button>
  </div>
  <p class="small muted">Saved under <code>${BASTION_STORE_KEY}</code> in localStorage.</p>


  ${lastEvent ? `
    <hr />
    <div class="card" style="margin-top:10px; background: rgba(18,22,27,.55)">
      <p class="badge">Last Event (Turn ${safeNum(lastEvent.turn,0)})</p>
      <p><b>Roll:</b> ${safeNum(lastEvent.roll,0)} • <b>${lastEvent.label || "No event"}</b></p>
      ${lastEvent.notes ? `<p class="small muted">${lastEvent.notes}</p>` : ``}
    </div>
  ` : ``}
</div>


        <div class="card" style="margin-top:12px;">


<!-- Workshop: Artisan Tools (if you already have this elsewhere in the template, do NOT duplicate it) -->
<div class="card" style="margin-top:12px;">
  <h2>Workshop: Artisan Tools</h2>
  <p class="small muted">v1.1: manage up to 6 tool sets (saved locally).</p>
  <div id="bm_toolsWrap"></div>
  <div class="btnRow" style="margin-top:10px;">
    <button id="bm_toolsSave">Save Tools</button>
  </div>
</div>


<!-- Special Facilities -->
<div class="card" style="margin-top:12px;">
  <h2>Special Facilities</h2>
  <p class="small muted">v1.1: unlocked by Player Level (5=2, 9=4, 13=5, 17=6). Build from the catalog into slots.</p>
  <div id="bm_specialWrap"></div>
</div>


<!-- Facilities -->
<div class="card" style="margin-top:12px;">
  <h2>Facilities</h2>
  <p class="small muted">Upgrade costs are deducted immediately. Construction timers tick down on Bastion Turns.</p>
  <div id="bm_facilities"></div>
</div>


    <div class="card" style="margin-top:12px;">
      <h2>Current Upkeep</h2>
      <div class="pill">Per Bastion Turn: <b>${nextUpkeep} gp</b></div>
      <div class="pill">Bastion Turns Taken: <b>${safeNum(runtimeState.state.turnCount, 0)}</b></div>
      <div class="small muted" style="margin-top:10px;">
        Monthly events roll every <b>4</b> Bastion Turns (and optionally on Maintain).
      </div>


      <div class="btnRow" style="margin-top:12px; align-items:center;">
        <label style="display:flex;gap:10px;align-items:center;">
          <input id="bm_maintain" type="checkbox">
          <span>Issue “Maintain” this turn (forces event roll)</span>
        </label>
      </div>


      <div class="btnRow" style="margin-top:12px;">
        <button id="bm_takeTurn" style="padding:12px 16px;">${runtimeState?.turnSystem?.takeTurnButtonLabel || "Take Bastion Turn"}</button>
      </div>


      <div id="bm_turnResult" class="small muted" style="margin-top:10px;"></div>
    </div>
  `;
  // ---- DOM helpers (Bastion only) ----
  const must = (id) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Bastion Manager: Missing element #${id} (ID mismatch in the HTML template)`);
    return el;
  };
  const opt = (id) => document.getElementById(id);


  // ----- Warehouse rows (clean editor) -----
  const whTbody = must("bm_wh_rows");


  function itemToFields(it) {
    const qty = safeNum(it?.qty ?? 1, 1);
    const gp = safeNum(it?.gp ?? it?.gpValueMax ?? it?.valueGPMax ?? 0, 0);
    const notes = String(it?.notes || it?.note || "");
    const label = String(it?.label || it?.name || it?.title || it?.key || it?.type || "Item");
    return { qty, gp, notes, label };
  }


  function fieldsToItem(original, fields) {
    const out = { ...(original || {}) };
    out.qty = clamp(safeNum(fields.qty, 1), 0, 999999);
    out.label = fields.label || out.label || "Item";
    out.notes = fields.notes || "";


    const gpVal = fields.gp;
    if (gpVal !== "" && Number.isFinite(Number(gpVal))) {
      if ((out.type || "") === "trade_goods") out.gpValueMax = safeNum(gpVal, 0);
      else out.gp = safeNum(gpVal, 0);
    } else {
      delete out.gp;
      delete out.gpValueMax;
    }
    return out;
  }


  function renderWarehouseRows() {
    const items = runtimeState.state.warehouse.items || [];
    whTbody.innerHTML = items.map((it, idx) => {
      const f = itemToFields(it);
      return `
        <tr data-idx="${idx}">
          <td><input class="bm_wh_label" type="text" value="${String(f.label).replace(/"/g, "&quot;")}" /></td>
          <td><input class="bm_wh_qty" type="number" min="0" step="1" value="${f.qty}" style="max-width:90px;" /></td>
          <td><input class="bm_wh_gp" type="number" min="0" step="1" value="${f.gp || ""}" placeholder="-" style="max-width:120px;" /></td>
          <td><input class="bm_wh_notes" type="text" value="${String(f.notes).replace(/"/g, "&quot;")}" placeholder="notes..." /></td>
          <td style="width:110px;"><button class="bm_del" type="button">Remove</button></td>
        </tr>
      `;
    }).join("");
  }


  renderWarehouseRows();


  must("bm_wh_add").addEventListener("click", () => {
    runtimeState.state.warehouse.items.push({ type: "item", qty: 1, label: "New Item", notes: "" });
    renderWarehouseRows();
  });


  must("bm_wh_save").addEventListener("click", () => {
    const rows = [...whTbody.querySelectorAll("tr")];
    const items = runtimeState.state.warehouse.items || [];
    const next = [];


    for (const r of rows) {
      const idx = safeNum(r.dataset.idx, -1);
      const original = items[idx] || { type: "item" };


      const label = r.querySelector(".bm_wh_label")?.value?.trim() || "Item";
      const qty = r.querySelector(".bm_wh_qty")?.value;
      const gp = r.querySelector(".bm_wh_gp")?.value;
      const notes = r.querySelector(".bm_wh_notes")?.value || "";


      next.push(fieldsToItem(original, { label, qty, gp, notes }));
    }


    runtimeState.state.warehouse.items = next;
    saveBastionSave(runtimeState);
    alert("Warehouse saved.");
  });


  whTbody.addEventListener("click", (e) => {
    const btn = e.target.closest(".bm_del");
    if (!btn) return;
    const tr = e.target.closest("tr");
    const idx = safeNum(tr?.dataset?.idx, -1);
    if (idx >= 0) {
      runtimeState.state.warehouse.items.splice(idx, 1);
      renderWarehouseRows();
    }
  });


  // ----- Top state fields save on change -----
  const pl = document.getElementById("bm_playerLevel");
  const repInput = document.getElementById("bm_rep");
  const treasuryInput = document.getElementById("bm_treasury");


  function saveTopFields() {
    runtimeState.state.playerLevel = clamp(safeNum(pl.value, 1), 1, 20);
    runtimeState.state.bastionReputation = clamp(safeNum(repInput.value, 1), -2, 2);
    runtimeState.state.treasury.gp = Math.max(0, safeNum(treasuryInput.value, 0));
    saveBastionSave(runtimeState);
  }


  pl.addEventListener("change", () => { saveTopFields(); renderBastionManager(); });
  repInput.addEventListener("change", () => { saveTopFields(); renderBastionManager(); });
  treasuryInput.addEventListener("change", () => { saveTopFields(); renderBastionManager(); });


    // ----- Roster (v1.1) -----
  const defCountEl = document.getElementById("bm_defCount");
  const defCapEl = document.getElementById("bm_defCap");
  const defendersInput = document.getElementById("bm_defendersInput");


  const hireBaseEl = document.getElementById("bm_hireBase");
  const hireAdjInput = document.getElementById("bm_hireAdj");
  const hireTotalEl = document.getElementById("bm_hireTotal");


  function refreshRosterUI() {
    const def = getDefenders(runtimeState);
    if (defCountEl) defCountEl.textContent = String(def.count);
    if (defCapEl) defCapEl.textContent = String(def.cap);
    if (defendersInput) {
      defendersInput.max = String(def.cap);
      defendersInput.value = String(def.count);
    }


    const h = computeHirelings(runtimeState);
    if (hireBaseEl) hireBaseEl.textContent = String(h.base);
    if (hireAdjInput) hireAdjInput.value = String(h.adj);
    if (hireTotalEl) hireTotalEl.textContent = String(h.total);
  }


  defendersInput?.addEventListener("change", () => {
    setDefenders(runtimeState, defendersInput.value);
    saveBastionSave(runtimeState);
    refreshRosterUI();
    renderBastionManager();
  });


  hireAdjInput?.addEventListener("change", () => {
    ensureRosterState(runtimeState);
    runtimeState.state.roster.hirelings.manualAdjustment = safeNum(hireAdjInput.value, 0);
    saveBastionSave(runtimeState);
    refreshRosterUI();
    renderBastionManager();
  });


  refreshRosterUI();


    // ----- Workshop artisan tools (v1.1) -----
  const toolsWrap = document.getElementById("bm_toolsWrap");
  const toolsSaveBtn = document.getElementById("bm_toolsSave");


  function getToolPresets() {
    // Prefer presets in state; fallback list if none supplied by JSON
    const p = runtimeState?.state?.artisanTools?.presets;
    if (Array.isArray(p) && p.length) return p.map(x => String(x));
    return [
      "Alchemist’s supplies","Brewer’s supplies","Calligrapher’s supplies","Carpenter’s tools",
      "Cartographer’s tools","Cobbler’s tools","Cook’s utensils","Glassblower’s tools",
      "Jeweler’s tools","Leatherworker’s tools","Mason’s tools","Painter’s supplies",
      "Potter’s tools","Smith’s tools","Tinker’s tools","Weaver’s tools","Woodcarver’s tools"
    ];
  }


  function renderToolsUI() {
    if (!toolsWrap) return;


    runtimeState.state.artisanTools = runtimeState.state.artisanTools || { slots: Array(6).fill(null), presets: [] };
    runtimeState.state.artisanTools.slots = Array.isArray(runtimeState.state.artisanTools.slots)
      ? runtimeState.state.artisanTools.slots.slice(0, 6)
      : Array(6).fill(null);
    while (runtimeState.state.artisanTools.slots.length < 6) runtimeState.state.artisanTools.slots.push(null);


    const presets = getToolPresets();


    toolsWrap.innerHTML = runtimeState.state.artisanTools.slots.map((val, i) => {
      const v = val ? String(val) : "";
      return `
        <div class="pill" style="display:flex;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap;">
          <span class="small muted" style="min-width:70px;">Slot ${i + 1}</span>
          <select class="bm_toolSel" data-idx="${i}">
            <option value="">(empty)</option>
            ${presets.map(p => `<option value="${p.replace(/"/g, "&quot;")}" ${p === v ? "selected" : ""}>${p}</option>`).join("")}
          </select>
          <button class="btn ghost bm_toolClear" type="button" data-idx="${i}">Clear</button>
        </div>
      `;
    }).join("");


    toolsWrap.querySelectorAll(".bm_toolClear").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = safeNum(btn.dataset.idx, 0);
        runtimeState.state.artisanTools.slots[idx] = null;
        renderToolsUI();
      });
    });
  }


  toolsSaveBtn?.addEventListener("click", () => {
    const sels = toolsWrap?.querySelectorAll(".bm_toolSel") || [];
    sels.forEach(sel => {
      const idx = safeNum(sel.dataset.idx, 0);
      runtimeState.state.artisanTools.slots[idx] = sel.value ? sel.value : null;
    });
    saveBastionSave(runtimeState);
    alert("Artisan tools saved.");
    renderBastionManager();
  });


  renderToolsUI();
  
  // ----- Facilities rendering -----
  const facWrap = must("bm_facilities");
  if (!facWrap) throw new Error("Bastion Manager: #bm_facilities not found in the HTML (ID mismatch).");


    // ----- Special facilities (v1.1) -----
  const specialWrap = document.getElementById("bm_specialWrap");


  function getFacilityCatalogFromRuntime(runtimeState, config) {
    // Prefer config.facilityCatalog (your v1.1 JSON addition)
    if (Array.isArray(config?.facilityCatalog)) return config.facilityCatalog;


    // Backwards compatible: sometimes people nest under meta
    if (Array.isArray(config?.meta?.facilityCatalog)) return config.meta.facilityCatalog;


    return [];
  }


  function renderSpecialFacilities() {
    if (!specialWrap) return;


    const playerLevel = safeNum(runtimeState.state.playerLevel, 1);
    const slotCount = computeSpecialSlots(playerLevel);


    runtimeState.state.specialFacilities = Array.isArray(runtimeState.state.specialFacilities) ? runtimeState.state.specialFacilities : [];
    runtimeState.state.specialConstruction = Array.isArray(runtimeState.state.specialConstruction) ? runtimeState.state.specialConstruction : [];


    const built = runtimeState.state.specialFacilities;
    const building = runtimeState.state.specialConstruction;


    // Always resolve the bastion spec safely (prevents empty Build dropdown)
const spec =
  (runtimeState?.spec && typeof runtimeState.spec === "object") ? runtimeState.spec :
  (runtimeState?.config && typeof runtimeState.config === "object") ? runtimeState.config :
  (typeof __BASTION_SPEC__ !== "undefined" && __BASTION_SPEC__) ? __BASTION_SPEC__ :
  (typeof bastionSpec !== "undefined" && bastionSpec) ? bastionSpec :
  (typeof BASTION_SPEC !== "undefined" && BASTION_SPEC) ? BASTION_SPEC :
  {};

// 1) Prefer JSON-provided facilityCatalog (v1.1)
// 2) If missing (v1), FALL BACK to the built-in SPECIAL_FACILITY_DEFS so dropdown still works.
let catalog = Array.isArray(spec.facilityCatalog) ? spec.facilityCatalog : [];

// Fallback tier mapping (DMG-style unlock levels)
const SPECIAL_TIER_MIN_LEVEL = {
  // Level 5
  arcane_study: 5, armory: 5, barrack: 5, garden: 5, library: 5, sanctuary: 5, smithy: 5, storehouse: 5, workshop: 5, stable: 5,
  // Level 9
  gaming_hall: 9, greenhouse: 9, laboratory: 9, scriptorium: 9, teleportation_circle: 9, theater: 9, theatre: 9, training_area: 9, trophy_room: 9,
  // Level 13
  archive: 13, meditation_chamber: 13, menagerie: 13, observatory: 13, pub: 13, reliquary: 13,
  // Level 17
  demiplane: 17, guildhall: 17, sanctum: 17, war_room: 17
};

if (!catalog.length && typeof SPECIAL_FACILITY_DEFS === "object" && SPECIAL_FACILITY_DEFS) {
  catalog = Object.keys(SPECIAL_FACILITY_DEFS).map(id => {
    const def = SPECIAL_FACILITY_DEFS[id];
    const minPlayerLevel = SPECIAL_TIER_MIN_LEVEL[id] || 5;
    return {
      id,
      name: def?.label || id,
      minPlayerLevel,
      buildCostGP: 0,   // safe default (you can wire real costs later)
      buildTurns: 1     // safe default
    };
  });
}

// Debug (optional): shows why your dropdown is empty
console.log("[special facilities] catalog count", catalog.length, Array.isArray(spec.facilityCatalog) ? "from JSON facilityCatalog" : "fallback SPECIAL_FACILITY_DEFS");

    if (slotCount <= 0) {
      specialWrap.innerHTML = `<p class="small muted">No special facility slots unlocked yet. (Unlocks at Player Level 5.)</p>`;
      return;
    }

    // Empty slot: dropdown
      // Hide facilities you don't want cluttering the dropdown (they can still exist as cards if built).
      const HIDDEN_SPECIAL = new Set([
        "observatory",
        "pub",
        "reliquary",
        "sanctum",
        "theater",
        "theatre",
        "trophy_room",
        "archive",
        "meditation_chamber",
        "chapel",
        "vault"
      ]);
    
    const rows = [];
    for (let i = 0; i < slotCount; i++) {
      const existing = built[i] || null;
      const con = building.find(x => safeNum(x.slotIndex, -1) === i) || null;


      if (existing) {
        rows.push(`
          <div class="pill" style="margin-top:10px; display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div>
              <b>${existing.name || existing.id}</b>
              <div class="small muted">Active</div>
            </div>
            <button class="btn ghost bm_specialRemove" data-slot="${i}" type="button">Remove</button>
          </div>
        `);
        continue;
      }


      if (con) {
        rows.push(`
          <div class="pill" style="margin-top:10px; display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
            <div>
              <b>${con.name || con.facilityId}</b>
              <div class="small muted">Under construction • ${safeNum(con.remainingTurns, 0)} turns left</div>
            </div>
          </div>
        `);
        continue;
      }

      const opts = (catalog || [])
        .filter(c => !HIDDEN_SPECIAL.has(String(c?.id || "").toLowerCase()))
        .map(c => {
        const min = safeNum(c.minPlayerLevel, 1);
        const disabled = playerLevel < min;
        const nm = c.name || c.label || c.id;
const label = `${nm} (L${min}+ • ${safeNum(c.buildCostGP, 0)}gp • ${safeNum(c.buildTurns, 1)} turns)`;
        return `<option value="${c.id}" ${disabled ? "disabled" : ""}>${label}</option>`;
      }).join("");


      rows.push(`
        <div class="pill" style="margin-top:10px;">
          <div class="small muted">Slot ${i + 1} of ${slotCount}</div>
          <div style="display:flex; gap:10px; align-items:center; margin-top:8px; flex-wrap:wrap;">
            <select class="bm_specialSelect" data-slot="${i}">
              <option value="">(choose facility)</option>
              ${opts}
            </select>
            <button class="btn bm_specialBuild" data-slot="${i}" type="button">Build</button>
          </div>
        </div>
      `);
    }


    specialWrap.innerHTML = rows.join("");


    // Build action
    specialWrap.querySelectorAll(".bm_specialBuild").forEach(btn => {
      btn.addEventListener("click", () => {
        const slotIndex = safeNum(btn.dataset.slot, 0);
        const sel = specialWrap.querySelector(`.bm_specialSelect[data-slot="${slotIndex}"]`);
        const id = sel?.value;
        if (!id) return alert("Pick a facility first.");


        const entry = (catalog || []).find(x => x.id === id);
        if (!entry) return alert("Catalog entry not found.");


        const min = safeNum(entry.minPlayerLevel, 1);
        if (playerLevel < min) return alert("Player level too low for that facility.");


        const cost = safeNum(entry.buildCostGP, 0);
        const turns = safeNum(entry.buildTurns, 1);
        const treasury = safeNum(runtimeState.state.treasury.gp, 0);
        if (treasury < cost) return alert("Not enough GP in Treasury.");


        runtimeState.state.treasury.gp = treasury - cost;
        runtimeState.state.specialConstruction.push({
          slotIndex,
          facilityId: entry.id,
          name: entry.name,
          remainingTurns: turns
        });


        saveBastionSave(runtimeState);
        renderBastionManager();
      });
    });


    // Remove action (DM control)
    specialWrap.querySelectorAll(".bm_specialRemove").forEach(btn => {
      btn.addEventListener("click", () => {
        const slotIndex = safeNum(btn.dataset.slot, 0);
        const ok = confirm("Remove this special facility from the slot?");
        if (!ok) return;


        runtimeState.state.specialFacilities[slotIndex] = null;
        saveBastionSave(runtimeState);
        renderBastionManager();
      });
    });
  }

function getAllFunctionOptions(fac){
  // Pull ALL functions across ALL levels (dropdown-only), unique by id
  const levels = fac?.levels || {};
  const seen = new Map();

  Object.keys(levels).forEach(k => {
    const lvl = levels[k];
    (lvl?.functions || []).forEach(fn => {
      if (!fn?.id) return;
      if (!seen.has(fn.id)) seen.set(fn.id, fn);
    });
  });

  // Ensure the two defence actions always exist as options
  const baseId = baseFacilityId(fac?.id);
  if (baseId === "barracks" && !seen.has("recruit_defenders")) {
    seen.set("recruit_defenders", { id:"recruit_defenders", label:"Recruit Defenders" });
  }
  if (baseId === "armoury" && !seen.has("stock_armoury")) {
    seen.set("stock_armoury", { id:"stock_armoury", label:"Stock Armoury" });
  }

  return [...seen.values()];
}

function renderFacilities(){
  facWrap.innerHTML = facilities.map(f => {
    const baseId = baseFacilityId(f.id);

    // No more levels shown on pre-built facilities
    const title = f.name || baseId;
    const subtitle = (f.levels && f.levels["1"]?.label) ? f.levels["1"].label : (f.description || "");

    // Dropdown only for everything (you manage costs manually),
    // BUT Barracks + Armoury still get a working button.
    const opts = getAllFunctionOptions(f);
    const optsHtml = opts.length
      ? opts.map(fn => `<option value="${fn.id}">${fn.label || fn.id}</option>`).join("")
      : `<option value="">No options</option>`;

    const hasBarracksBtn = (baseId === "barracks");
    const hasArmouryBtn = (baseId === "armoury");

    const running = (runtimeState.state.ordersInProgress || [])
      .filter(o => baseFacilityId(o.facilityId) === baseId);

    const runningHtml = running.length
      ? `<div class="small muted" style="margin-top:8px;">
           ${running.map(o => `• ${o.label} (${safeNum(o.remainingTurns,0)} turn(s) left)`).join("<br>")}
         </div>`
      : ``;

    // Button labels + ids
    const btnHtml = hasBarracksBtn
      ? `<button class="bm_defBtn" data-fid="${f.id}" data-fnid="recruit_defenders">Recruit Defenders</button>`
      : hasArmouryBtn
        ? `<button class="bm_defBtn" data-fid="${f.id}" data-fnid="stock_armoury">Stock Armoury</button>`
        : ``;

    return `
      <div class="facMini" data-fid="${f.id}">
        <div class="facMini_head">
          <img class="facMini_icon" src="${facilityIconDataUri(baseId)}" alt="${title}">
          <div class="facMini_meta">
            <div class="facMini_title">${title}</div>
            <div class="facMini_sub">${subtitle || ""}</div>
          </div>
        </div>

        <div class="facMini_body">
          <div class="small muted" style="margin-bottom:6px;">Possible options (dropdown only)</div>
          <select class="facFnSelect">
            ${optsHtml}
          </select>

          ${btnHtml ? `<div style="margin-top:10px;">${btnHtml}</div>` : ``}
          ${runningHtml}
        </div>
      </div>
    `;
  }).join("");
}

renderFacilities();


    // ----- Workshop Crafting (inside Workshop card) -----
  function normaliseToolKey(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/[’']/g, "")          // remove apostrophes (normal + curly)
      .replace(/[^a-z0-9]+/g, "_")   // non-alphanum -> _
      .replace(/^_+|_+$/g, "");      // trim _
  }


  // Basic craft list (you can expand later)
  const CRAFTABLES_BY_TOOL = {
    smiths_tools: ["Arrows (20)", "Caltrops", "Manacles", "Shield (basic)"],
    carpenters_tools: ["Ladder (10ft)", "Pole (10ft)", "Wooden Shield", "Repair kit"],
    leatherworkers_tools: ["Leather armor (basic)", "Saddlebags", "Waterskin", "Bedroll"],
    alchemists_supplies: ["Healing potion (basic)", "Antitoxin", "Alchemist’s fire (1 flask)"],
    jewelers_tools: ["Signet ring", "Gem setting", "Holy symbol (custom)"],
    weavers_tools: ["Rope (50ft)", "Net", "Cloak", "Tent repair"],
    cooks_utensils: ["Rations (10)", "Trail mix (10)", "Spice pouch", "Waterskin"],
    woodcarvers_tools: ["Wooden tokens set", "Carved idol", "Arrow shafts (20)"]
  };


  function parseQtyFromLabel(label) {
    // "Arrows (20)" -> { name:"Arrows", qty:20 }
    const s = String(label || "").trim();
    const m = s.match(/^(.+?)\s*\((\d+)\)\s*$/);
    if (!m) return { name: s, qty: 1 };
    return { name: m[1].trim(), qty: Number(m[2]) || 1 };
  }


  function findWorkshopCraftFunctionId() {
    // Find the workshop facility in your runtime state
    const wf = (runtimeState.facilities || []).find(x => baseFacilityId(x.id) === "workshop");
    if (!wf) return { facilityId: null, functionId: null };


    const lvl = safeNum(wf.currentLevel, 0);
    const lvlData = facilityLevelData(wf, lvl);
    const fns = lvlData?.functions || [];


    // Prefer explicit orderType:"craft" if present
    const craftFn = fns.find(fn => fn?.orderType === "craft")
      || fns.find(fn => String(fn?.id || "").toLowerCase().includes("craft"))
      || null;


    return { facilityId: wf.id, functionId: craftFn?.id || null };
  }


  function wireWorkshopCraftUI() {
    const toolSel = document.getElementById("bm_craftTool");
    const itemSel = document.getElementById("bm_craftItem");
    const startBtn = document.getElementById("bm_craftStart");
    const hint = document.getElementById("bm_craftHint");


    // If we’re not currently rendering the Workshop card, these won’t exist.
    if (!toolSel || !itemSel || !startBtn) return;


    // Pull chosen artisan tools from saved slots
    const slots = runtimeState?.state?.artisanTools?.slots || [];
    const chosenTools = slots.filter(Boolean).map(String);


    if (!chosenTools.length) {
      toolSel.innerHTML = `<option value="">(no tools saved)</option>`;
      itemSel.innerHTML = `<option value="">(save artisan tools below first)</option>`;
      if (hint) hint.textContent = "Save at least 1 Artisan Tool in the 'Workshop: Artisan Tools' section first.";
      startBtn.disabled = true;
      return;
    }


    startBtn.disabled = false;


    // Fill tool dropdown
    toolSel.innerHTML = chosenTools.map(t => `<option value="${t.replace(/"/g, "&quot;")}">${t}</option>`).join("");


    function refreshItemsForTool(toolName) {
      const key = normaliseToolKey(toolName);
      const items = CRAFTABLES_BY_TOOL[key] || ["(No items configured for this tool yet)"];
      itemSel.innerHTML = items.map(x => `<option value="${x.replace(/"/g, "&quot;")}">${x}</option>`).join("");
      if (hint) hint.textContent = "Selected tool controls available crafts. Expand the craft list in app.js anytime.";
    }


    refreshItemsForTool(toolSel.value);


    toolSel.addEventListener("change", () => {
      refreshItemsForTool(toolSel.value);
    });


    startBtn.addEventListener("click", () => {
      const tool = toolSel.value;
      const item = itemSel.value;


      if (!tool) return alert("Pick a tool first.");
      if (!item) return alert("Pick an item first.");


      const { facilityId, functionId } = findWorkshopCraftFunctionId();
      if (!facilityId || !functionId) {
        alert("Could not find a Workshop craft function in the Workshop facility card. Check your workshop function IDs in the JSON.");
        return;
      }


      // Start the actual Workshop function order
      const r = startFunctionOrder(runtimeState, facilityId, functionId, null);
      if (!r.ok) {
        alert(r.msg || "Could not start craft order.");
        return;
      }


      // Override the output so the chosen item goes into the warehouse when the order completes
      const parsed = parseQtyFromLabel(item);
      const order = runtimeState.state.ordersInProgress[runtimeState.state.ordersInProgress.length - 1];


      if (order) {
        order.label = `Craft: ${parsed.name}`;
        order.outputsToWarehouse = [{
          type: "item",
          qty: parsed.qty,
          label: parsed.name,
          notes: `Crafted using ${tool}`
        }];
        order.craftPick = { tool, itemLabel: item, qty: parsed.qty };
      }


      saveBastionSave(runtimeState);
      if (hint) hint.textContent = `Craft started: ${item}. Take Bastion Turns until it completes, then check Warehouse.`;
      renderBastionManager();
    });
  }


  wireWorkshopCraftUI();
    renderSpecialFacilities();

    // Special facilities are wired inside renderSpecialFacilities() (fresh DOM each render)


  // ----- Import / Export -----
  must("bm_export").addEventListener("click", () => {
    const blob = new Blob([exportBastion(runtimeState)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ironbow-bastion-save.json";
    a.click();
    URL.revokeObjectURL(url);
  });


  const importBtn = must("bm_import_btn");
  const importInput = must("bm_import_file");
  importBtn.addEventListener("click", () => importInput.click());


  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseJsonSafe(text);
    if (!parsed) return alert("Invalid JSON file.");
    saveBastionSave(parsed);
    alert("Imported. Reloading Bastion Manager...");
    renderBastionManager();
  });


  must("bm_reset").addEventListener("click", () => {
    localStorage.removeItem(BASTION_STORE_KEY);
    alert("Reset to spec baseline. Reloading...");
    renderBastionManager();
  });


  // ----- Take Bastion Turn -----
must("bm_takeTurn").addEventListener("click", () => {
  saveTopFields();
  const maintain = !!document.getElementById("bm_maintain").checked;

  const result = advanceTurnPipeline(runtimeState, { maintainIssued: maintain });
  resolveDefenseTurnCompletion(runtimeState);

  saveBastionSave(runtimeState);

  const out = opt("bm_turnResult");
  if (out) {
    out.innerHTML = `
      Turn processed. Next upkeep was <b>${result.nextUpkeep} gp</b>.
      ${result.didRoll ? `<br>Event roll: <b>${result.rolled.roll}</b> (${result.rolled.event?.label || "No event"})` : ""}
    `;
  }

  renderBastionManager();
});


    // ----- Spec selector (safe) -----
  const specSelect = document.getElementById("bm_specSelect");
  if (specSelect) {
    specSelect.value = getBastionSpecChoice();
    specSelect.addEventListener("change", () => {
      setBastionSpecChoice(specSelect.value);


      // IMPORTANT: refresh the page view so the new loader + store key apply cleanly
      alert("Spec switched. Reloading Bastion Manager...");
      renderBastionManager();
    });
  }
  // Persist after initial render
  saveBastionSave(runtimeState);
}


function renderHonourTracker() {
  view.innerHTML = `
    <h1>Honour Tracker</h1>
    <p><a class="badge" href="https://hjhudsonwriter.github.io/tsi-honour-tracker/" target="_blank" rel="noopener">Open Honour Tracker</a></p>
    <iframe
      src="https://hjhudsonwriter.github.io/tsi-honour-tracker/"
      style="width:100%;height:80vh;border:1px solid #28303a;border-radius:18px;background:#0f1216"
      loading="lazy"
      referrerpolicy="no-referrer"
    ></iframe>
  `;
}
/* ================================
   Scarlett Isles Explorer (Hex VTT)
   - Upload map (saved locally)
   - Hex grid overlay (toggle, size, offset, opacity)
   - Fullscreen stage
   - 5 hero tokens (initials), drag, box-select, resize, group/ungroup
   - Saves map + grid + token state to localStorage
================================== */


const EXPLORER_KEY = "scarlettIsles.explorer.v1";


function explorerUid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function explorerClamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function explorerLoad() {
  try { return JSON.parse(localStorage.getItem(EXPLORER_KEY) || "{}"); }
  catch { return {}; }
}
function explorerSave(state) {
  localStorage.setItem(EXPLORER_KEY, JSON.stringify(state));
}
function explorerHeroInitial(title) {
  const t = String(title || "").trim();
  if (!t) return "?";
  // Prefer first letter of first word (Kaelen, Umbrys, Magnus, Elara, Charles)
  return t.split(/\s+/)[0].slice(0, 1).toUpperCase();
}
function explorerDefaultState() {
  // Normalised positions so fullscreen/resizes don’t break placement
  const tokens = HEROES.map((h, i) => ({
  id: h.id,
  name: h.title,
  initial: explorerHeroInitial(h.title),
  x: 0.12 + (i * 0.07),
  y: 0.18 + (i * 0.06),
  size: 46,
  groupId: null,
  milesUsed: 0
}));


  return {
    mapDataUrl: null,


    snap: {
      enabled: false
    },


    travel: {
      day: 1,
      milesUsed: 0
    },


    grid: {
      enabled: true,
      r: 38,
      offsetX: 0,
      offsetY: 0,
      opacity: 0.35
    },


    tokens
  };
}


function renderExplorer() {
  // If we previously mounted Explorer, clean up listeners to avoid stacking
  if (window.__explorerCleanup) {
    try { window.__explorerCleanup(); } catch {}
    window.__explorerCleanup = null;
  }


  // Build UI
  view.innerHTML = `
    <div class="explorer-wrap">
      <div class="explorer-head">
        <div>
          <h1 style="margin:0">Scarlett Isles Explorer</h1>
          <p class="muted" style="margin:6px 0 0 0">
            Upload a map, align a hex grid, and drag your heroes around.
          </p>
        </div>
      </div>


      <div class="explorer-fswrap" id="explorerFsWrap">
      <div class="explorer-controls">
        <label class="btn">
          Upload map
          <input id="explorerMapUpload" type="file" accept="image/*" hidden />
        </label>


        <button class="btn ghost" id="explorerClearMap" type="button">Clear map</button>
        <button class="btn ghost" id="explorerFullscreen" type="button">Fullscreen</button>
        <button class="btn ghost" id="explorerHideUi" type="button">Hide UI</button>


        <span class="explorer-divider"></span>


        <button class="btn" id="explorerGridToggle" type="button">Hex Grid: On</button>
        <button class="btn ghost" id="explorerSnapToggle" type="button">Snap: Off</button>


        <div class="explorer-group">
          <button class="btn ghost" id="explorerGridSm" type="button">Hex −</button>
          <button class="btn ghost" id="explorerGridLg" type="button">Hex +</button>
        </div>


        <div class="explorer-group">
          <button class="btn ghost" id="explorerGridLeft" type="button">◀</button>
          <button class="btn ghost" id="explorerGridUp" type="button">▲</button>
          <button class="btn ghost" id="explorerGridDown" type="button">▼</button>
          <button class="btn ghost" id="explorerGridRight" type="button">▶</button>
        </div>


        <div class="explorer-opacity">
          <span class="muted tiny">Grid opacity</span>
          <input id="explorerGridOpacity" type="range" min="0" max="1" step="0.05" />
        </div>


        <span class="explorer-divider"></span>


        <div class="explorer-group">
          <button class="btn ghost" id="explorerTokSm" type="button">Token −</button>
          <button class="btn ghost" id="explorerTokLg" type="button">Token +</button>
        </div>


        <div class="explorer-group">
          <button class="btn" id="explorerGroup" type="button">Group</button>
          <button class="btn ghost" id="explorerUngroup" type="button">Ungroup</button>
        </div>


        <span class="hint" id="explorerReadout">Hex: —</span>
      </div>


      <div class="explorer-stage" id="explorerStage">
        <div class="explorer-world" id="explorerWorld">
          <img id="explorerMap" class="explorer-map" alt="Map" />
          <canvas id="explorerGrid" class="explorer-grid"></canvas>
          <div id="explorerTokens" class="explorer-tokens"></div>
          <div id="explorerMarquee" class="explorer-marquee" hidden></div>
        </div>
      </div>


      <div class="hint" style="margin-top:10px">
  Tips: ...
</div>
<div class="explorer-travel" id="explorerTravel">
  <div class="explorer-travelRow">
    <div class="explorer-travelLeft">
      <div class="explorer-travelLine">
        <strong id="explorerDayLabel">Day 1</strong>
        <span class="muted tiny">•</span>
        <span class="tiny">Miles (selected): <strong id="explorerMilesUsed">0</strong>/30</span>
        <span class="muted tiny">•</span>
        <span class="tiny">Remaining: <strong id="explorerMilesLeft">30</strong></span>
      </div>


      <div class="explorer-travelLine tiny">
        <span class="muted">Mode:</span>
        <strong id="explorerMode">—</strong>
        <span class="muted">• Effects:</span>
        <span id="explorerEffects">—</span>
        <span class="muted">•</span>
        <span id="explorerNotice" class="tiny" style="opacity:.9"></span>
      </div>
      <div id="explorerMilesList" class="explorer-milesList"></div>
    </div>


    <div class="explorer-travelRight">
  <button class="btn ghost" id="explorerResetTravel" type="button">Reset Travel</button>
  <button class="btn" id="explorerMakeCamp" type="button">Make Camp</button>
</div>
  </div>
</div>
</div> <!-- end explorer-fswrap -->
</div> <!-- end explorer-wrap -->
  `;


  const root = view.querySelector(".explorer-wrap");
  const mapUpload = root.querySelector("#explorerMapUpload");
  const btnClear = root.querySelector("#explorerClearMap");
  const btnFs = root.querySelector("#explorerFullscreen");
  const btnHideUi = root.querySelector("#explorerHideUi");
  const btnSnapToggle = root.querySelector("#explorerSnapToggle");


const dayLabel = root.querySelector("#explorerDayLabel");
const milesUsedEl = root.querySelector("#explorerMilesUsed");
const milesLeftEl = root.querySelector("#explorerMilesLeft");
  const milesListEl = root.querySelector("#explorerMilesList");
const modeEl = root.querySelector("#explorerMode");
const effectsEl = root.querySelector("#explorerEffects");
const noticeEl = root.querySelector("#explorerNotice");
const btnMakeCamp = root.querySelector("#explorerMakeCamp");
  const btnResetTravel = root.querySelector("#explorerResetTravel");
  function setNotice(msg) {
  if (!noticeEl) return;
  noticeEl.textContent = msg || "";
}


  const btnGridToggle = root.querySelector("#explorerGridToggle");
  const btnGridSm = root.querySelector("#explorerGridSm");
  const btnGridLg = root.querySelector("#explorerGridLg");
  const btnGridLeft = root.querySelector("#explorerGridLeft");
  const btnGridRight = root.querySelector("#explorerGridRight");
  const btnGridUp = root.querySelector("#explorerGridUp");
  const btnGridDown = root.querySelector("#explorerGridDown");
  const gridOpacity = root.querySelector("#explorerGridOpacity");
  const readout = root.querySelector("#explorerReadout");


  const btnTokSm = root.querySelector("#explorerTokSm");
  const btnTokLg = root.querySelector("#explorerTokLg");
  const btnGroup = root.querySelector("#explorerGroup");
  const btnUngroup = root.querySelector("#explorerUngroup");


  const stage = root.querySelector("#explorerStage");
  const fsWrap = root.querySelector("#explorerFsWrap");
  const world = root.querySelector("#explorerWorld");
  const mapImg = root.querySelector("#explorerMap");
  const gridCanvas = root.querySelector("#explorerGrid");
  const tokenLayer = root.querySelector("#explorerTokens");
  tokenLayer.style.touchAction = "none";
stage.style.touchAction = "none";
  const marquee = root.querySelector("#explorerMarquee");


  // Load state (merge defaults)
  const saved = explorerLoad();
  const state = explorerDefaultState();


  if (typeof saved.mapDataUrl === "string") state.mapDataUrl = saved.mapDataUrl;
  if (saved.grid) state.grid = { ...state.grid, ...saved.grid };
  if (saved.snap) state.snap = { ...state.snap, ...saved.snap };
if (saved.travel) state.travel = { ...state.travel, ...saved.travel };


  if (Array.isArray(saved.tokens)) {
  // merge by id, keep defaults for any missing heroes
  const byId = new Map(saved.tokens.map(t => [t.id, t]));
  state.tokens = state.tokens.map(t => {
    const prev = byId.get(t.id);
    if (!prev) return t;
    return {
      ...t,
      x: Number.isFinite(prev.x) ? prev.x : t.x,
      y: Number.isFinite(prev.y) ? prev.y : t.y,
      size: Number.isFinite(prev.size) ? prev.size : t.size,
      groupId: prev.groupId || null,
      axial: prev.axial && Number.isFinite(prev.axial.q) && Number.isFinite(prev.axial.r)
        ? { q: prev.axial.q, r: prev.axial.r }
        : null
    };
  });
}


  // Selection state (not persisted)
  const selected = new Set();


  // Drag state must exist BEFORE first renderTokens() call
  let drag = null;
  let travelFocusId = state.tokens[0]?.id || null;


  function saveNow() {
    explorerSave({
  mapDataUrl: state.mapDataUrl,
  snap: state.snap,
  travel: state.travel,
  grid: state.grid,
  tokens: state.tokens
});
  }


  function stageDims() {
    return {
      w: stage.clientWidth || 1,
      h: stage.clientHeight || 1
    };
  }
  function normToPx(nx, ny) {
    const { w, h } = stageDims();
    return { x: nx * w, y: ny * h };
  }
  function pxToNorm(px, py) {
    const { w, h } = stageDims();
    return { x: px / w, y: py / h };
  }


  // ---------- Hex snap math (pointy-top axial coords) ----------
// Using grid.r as size and grid offsets as origin.
// Reference math is the standard axial conversion.
function hexSize() {
  return explorerClamp(Number(state.grid.r) || 38, 10, 220);
}
function gridOrigin() {
  return {
    ox: Number(state.grid.offsetX) || 0,
    oy: Number(state.grid.offsetY) || 0
  };
}
function pixelToAxial(px, py) {
  const s = hexSize();
  const { ox, oy } = gridOrigin();
  const x = px - ox;
  const y = py - oy;


  const q = (Math.sqrt(3)/3 * x - 1/3 * y) / s;
  const r = (2/3 * y) / s;
  return { q, r };
}
function axialToPixel(q, r) {
  const s = hexSize();
  const { ox, oy } = gridOrigin();
  const x = s * Math.sqrt(3) * (q + r/2) + ox;
  const y = s * (3/2) * r + oy;
  return { x, y };
}
function axialRound(aq, ar) {
  // Allow calling either axialRound({q,r}) OR axialRound(q,r)
  let q, r;
  if (typeof aq === "object" && aq) {
    q = Number(aq.q);
    r = Number(aq.r);
  } else {
    q = Number(aq);
    r = Number(ar);
  }


  // cube round then convert back
  let x = q;
  let z = r;
  let y = -x - z;


  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);


  const xDiff = Math.abs(rx - x);
  const yDiff = Math.abs(ry - y);
  const zDiff = Math.abs(rz - z);


  if (xDiff > yDiff && xDiff > zDiff) rx = -ry - rz;
  else if (yDiff > zDiff) ry = -rx - rz;
  else rz = -rx - ry;


  return { q: rx, r: rz };
}
  
function hexDistance(a, b) {
  // axial distance
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = (-a.q - a.r) - (-b.q - b.r);
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
}


  function updateReadout() {
    const r = Number(state.grid.r) || 0;
    const w = Math.round(Math.sqrt(3) * r);
    btnGridToggle.textContent = `Hex Grid: ${state.grid.enabled ? "On" : "Off"}`;
    readout.textContent = r ? `Hex: r=${Math.round(r)}px (≈ ${w}px wide)` : "Hex: —";
  }


  function travelModeFromMiles(m) {
  if (m <= 0) return { mode: "—", effects: "—" };
  if (m <= 18) return { mode: "Slow (≤18 miles)", effects: "+Stealth • good foraging" };
  if (m <= 24) return { mode: "Normal (≤24 miles)", effects: "No effects" };
  return { mode: "Fast (≤30 miles)", effects: "−5 Passive Perception" };
}


function updateTravelUI() {
  const focus = state.tokens.find(t => t.id === travelFocusId) || state.tokens[0];


  const used = explorerClamp(Number(focus?.milesUsed) || 0, 0, 30);
  const left = 30 - used;


  if (dayLabel) dayLabel.textContent = `Day ${state.travel.day || 1}`;
  if (milesUsedEl) milesUsedEl.textContent = String(used);
  if (milesLeftEl) milesLeftEl.textContent = String(left);


  const t = travelModeFromMiles(used);
  if (modeEl) modeEl.textContent = t.mode;
  if (effectsEl) effectsEl.textContent = t.effects;


  // Render per-hero list
  if (milesListEl) {
    milesListEl.innerHTML = state.tokens.map(tok => {
      const u = explorerClamp(Number(tok.milesUsed) || 0, 0, 30);
      const isFocus = tok.id === travelFocusId;
      const done = u >= 30;


      return `
        <button type="button"
          class="milesPill ${isFocus ? "isFocus" : ""} ${done ? "isDone" : ""}"
          data-id="${tok.id}">
          ${tok.initial} <strong>${u}</strong>/30
        </button>
      `;
    }).join("");


    milesListEl.querySelectorAll(".milesPill").forEach(btn => {
      btn.addEventListener("click", () => {
        travelFocusId = btn.dataset.id;
        updateTravelUI();
      });
    });
  }


  // IMPORTANT: do NOT globally lock all tokens anymore
  tokenLayer.style.pointerEvents = "";
}


  function resizeGridCanvas() {
    const { w, h } = stageDims();
    const dpr = window.devicePixelRatio || 1;
    gridCanvas.width = Math.floor(w * dpr);
    gridCanvas.height = Math.floor(h * dpr);
    gridCanvas.style.width = `${w}px`;
    gridCanvas.style.height = `${h}px`;
    const ctx = gridCanvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }


  function drawHexGrid() {
  resizeGridCanvas();
  const ctx = gridCanvas.getContext("2d");
  const { w, h } = stageDims();


  ctx.clearRect(0, 0, w, h);
  if (!state.grid.enabled) return;


  const r = hexSize();
  const opacity = explorerClamp(Number(state.grid.opacity) || 0.35, 0, 1);


  ctx.globalAlpha = opacity;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(231,231,234,0.9)";


  // We will iterate axial coords that cover the visible area.
  // Convert viewport corners to axial range (with padding) and draw each hex by axialToPixel.
  const pad = 3;


  const aTL = pixelToAxial(0, 0);
  const aTR = pixelToAxial(w, 0);
  const aBL = pixelToAxial(0, h);
  const aBR = pixelToAxial(w, h);


  const rs = [aTL.r, aTR.r, aBL.r, aBR.r];
  const rMin = Math.floor(Math.min(...rs)) - pad;
  const rMax = Math.ceil(Math.max(...rs)) + pad;


  // q range is trickier because q shifts with r, so we overshoot a bit
  const qs = [aTL.q, aTR.q, aBL.q, aBR.q];
  const qMin0 = Math.floor(Math.min(...qs)) - pad - 6;
  const qMax0 = Math.ceil(Math.max(...qs)) + pad + 6;


  // draw function for a single hex at center (cx, cy)
  function strokeHex(cx, cy) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30); // pointy-top
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }


  for (let rr = rMin; rr <= rMax; rr++) {
    for (let qq = qMin0; qq <= qMax0; qq++) {
      const p = axialToPixel(qq, rr);
      // quick reject: if center is far offscreen, skip
      if (p.x < -2 * r || p.x > w + 2 * r || p.y < -2 * r || p.y > h + 2 * r) continue;
      strokeHex(p.x, p.y);
    }
  }


  ctx.globalAlpha = 1;
}


  function renderTokens() {
  tokenLayer.innerHTML = "";
  const { w, h } = stageDims();


  // Group tokens by hex when snap is on (using t.axial if present)
  const groups = new Map();
  if (state.snap.enabled) {
    state.tokens.forEach(t => {
      if (!t.axial) {
  const px = normToPx(t.x, t.y);
  const cx = px.x + t.size/2;
  const cy = px.y + t.size/2;
  t.axial = axialRound(pixelToAxial(cx, cy));
}
      const key = `${t.axial.q},${t.axial.r}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(t);
    });
  }


  state.tokens.forEach(t => {
    const token = document.createElement("div");
    token.className = "explorer-token";
    token.dataset.id = t.id;


    if (selected.has(t.id)) token.classList.add("isSelected");
    if (t.groupId) token.dataset.groupId = t.groupId;


    token.style.width = `${t.size}px`;
    token.style.height = `${t.size}px`;


    let x, y;


    // If snap is on and this token has an axial hex, draw it as a tight cluster INSIDE the hex
if (state.snap.enabled) {
  // Ensure axial exists (in case token came from old saves)
  if (!t.axial) {
    const px = normToPx(t.x, t.y);
    const cx = px.x + t.size/2;
    const cy = px.y + t.size/2;
    t.axial = axialRound(pixelToAxial(cx, cy));
  }
  const key = `${t.axial.q},${t.axial.r}`;
  const cluster = (groups.get(key) || [t]).slice();


  // Put the "anchor" token first if we are currently dragging
  const anchorId = drag?.anchorId || null;
  if (anchorId) {
    cluster.sort((a, b) => (a.id === anchorId ? -1 : b.id === anchorId ? 1 : 0));
  }


  const idx = cluster.findIndex(tt => tt.id === t.id);
  const n = Math.max(1, cluster.length);


  // Hex center in pixels
  const center = axialToPixel(t.axial.q, t.axial.r);


  // SAFE inner radius so tokens stay well inside the hex
  // hexSize() is vertex radius; inradius ≈ 0.86 * size
  const inRadius = hexSize() * 0.86;
  const tokenRadius = t.size / 2;


  // Tiny cluster radius (keeps them clearly inside the hex)
  // idx 0 sits in the centre, others orbit in a small ring
  const maxClusterR = Math.max(0, inRadius - tokenRadius - 6);
  const clusterR = Math.min(maxClusterR, 12); // <= 12px feels “neat”


  let cx = center.x;
  let cy = center.y;


  if (idx > 0) {
    const angle = (Math.PI * 2 * (idx - 1)) / Math.max(1, (n - 1));
    cx = center.x + Math.cos(angle) * clusterR;
    cy = center.y + Math.sin(angle) * clusterR;
  }


  x = cx - tokenRadius;
  y = cy - tokenRadius;
} else {
      // Normal rendering
      const px = normToPx(t.x, t.y);
      x = px.x;
      y = px.y;
    }


    // Clamp to stage
    x = explorerClamp(x, 0, Math.max(0, w - t.size));
    y = explorerClamp(y, 0, Math.max(0, h - t.size));


    token.style.left = `${x}px`;
    token.style.top = `${y}px`;


    token.innerHTML = `<span>${t.initial}</span>`;
    tokenLayer.appendChild(token);
  });
}


  function rerenderAll() {
    // Map
    if (state.mapDataUrl) {
      mapImg.src = state.mapDataUrl;
      mapImg.style.display = "block";
    } else {
      mapImg.removeAttribute("src");
      mapImg.style.display = "none";
    }


    // Grid UI
    gridOpacity.value = String(state.grid.opacity ?? 0.35);
    updateReadout();


    // Draw + tokens
    drawHexGrid();
    renderTokens();
    updateTravelUI();
  }


  // Initial render
  rerenderAll();
  
  // ---------- Snap toggle ----------
function updateSnapButton() {
  btnSnapToggle.textContent = `Snap: ${state.snap.enabled ? "On" : "Off"}`;
}
updateSnapButton();


btnSnapToggle.addEventListener("click", () => {
  state.snap.enabled = !state.snap.enabled;


  // When enabling snap, assign axial coords to all tokens based on current position
  if (state.snap.enabled) {
    const { w, h } = stageDims();


    state.tokens.forEach(tok => {
      const px = normToPx(tok.x, tok.y);
      const cx = px.x + tok.size / 2;
      const cy = px.y + tok.size / 2;


      const a = axialRound(pixelToAxial(cx, cy));
      tok.axial = a;


      // OPTIONAL but recommended: pull token neatly onto the hex centre
      const p = axialToPixel(a.q, a.r);
      const topLeft = { x: p.x - tok.size / 2, y: p.y - tok.size / 2 };


      const clamped = {
        x: explorerClamp(topLeft.x, 0, Math.max(0, w - tok.size)),
        y: explorerClamp(topLeft.y, 0, Math.max(0, h - tok.size))
      };


      const n = pxToNorm(clamped.x, clamped.y);
      tok.x = n.x;
      tok.y = n.y;
    });
  }


  saveNow();
  updateSnapButton();
  rerenderAll();
});


  // ---------- Map upload / clear ----------
  function onMapUpload() {
    const file = mapUpload.files && mapUpload.files[0];
    if (!file) return;


    // localStorage is limited; warn early
    const maxBytes = 4 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert("That image is over ~4MB. Please use a smaller JPG if possible.");
      mapUpload.value = "";
      return;
    }


    const reader = new FileReader();
    reader.onload = () => {
      state.mapDataUrl = String(reader.result || "");
      saveNow();
      rerenderAll();
    };
    reader.readAsDataURL(file);
  }


  function onClearMap() {
    const ok = confirm("Clear the uploaded map? (Tokens/grid will remain.)");
    if (!ok) return;
    state.mapDataUrl = null;
    saveNow();
    rerenderAll();
  }


  mapUpload.addEventListener("change", onMapUpload);
  btnClear.addEventListener("click", onClearMap);


  // ---------- Fullscreen ----------
  function onFullscreen() {
  const target = root.querySelector("#explorerFsWrap");
  if (!target) {
    alert("Explorer fullscreen wrapper not found (explorerFsWrap).");
    return;
  }


  if (document.fullscreenElement) {
    document.exitFullscreen?.();
    return;
  }
  target.requestFullscreen?.();
}
  btnFs.addEventListener("click", onFullscreen);
  function setUiHidden(hidden) {
  const target = document.fullscreenElement || fsWrap;
  if (!target) return;


  target.classList.toggle("uiHidden", !!hidden);


  // Update button label
  const isHidden = target.classList.contains("uiHidden");
  if (btnHideUi) btnHideUi.textContent = isHidden ? "Show UI" : "Hide UI";
}
// Toggle when button clicked (only really relevant in fullscreen, but harmless outside)
btnHideUi?.addEventListener("click", () => {
  const target = document.fullscreenElement || fsWrap;
  if (!target) return;
  setUiHidden(!target.classList.contains("uiHidden"));
});


// Handy keyboard toggle while fullscreen: press H
function onKeyToggleUi(e) {
  if (e.key.toLowerCase() !== "h") return;
  if (!document.fullscreenElement) return;
  if (!fsWrap) return;
  setUiHidden(!fsWrap.classList.contains("uiHidden"));
}
window.addEventListener("keydown", onKeyToggleUi);


  // Redraw on resize/fullscreen changes
  const onResize = () => rerenderAll();
  window.addEventListener("resize", onResize);
  document.addEventListener("fullscreenchange", onResize);


  // ---------- Grid controls ----------
  btnGridToggle.addEventListener("click", () => {
    state.grid.enabled = !state.grid.enabled;
    saveNow();
    rerenderAll();
  });


  btnGridSm.addEventListener("click", () => {
    state.grid.r = explorerClamp((Number(state.grid.r) || 38) - 2, 10, 220);
    saveNow();
    rerenderAll();
  });
  btnGridLg.addEventListener("click", () => {
    state.grid.r = explorerClamp((Number(state.grid.r) || 38) + 2, 10, 220);
    saveNow();
    rerenderAll();
  });


  function nudge(dx, dy) {
    state.grid.offsetX = (Number(state.grid.offsetX) || 0) + dx;
    state.grid.offsetY = (Number(state.grid.offsetY) || 0) + dy;
    saveNow();
    rerenderAll();
  }
  btnGridLeft.addEventListener("click", () => nudge(-2, 0));
  btnGridRight.addEventListener("click", () => nudge(2, 0));
  btnGridUp.addEventListener("click", () => nudge(0, -2));
  btnGridDown.addEventListener("click", () => nudge(0, 2));


  gridOpacity.addEventListener("input", () => {
    state.grid.opacity = explorerClamp(Number(gridOpacity.value), 0, 1);
    saveNow();
    rerenderAll();
  });


  // ---------- Token size buttons ----------
  function changeSelectedTokenSize(delta) {
    const ids = selected.size ? Array.from(selected) : state.tokens.map(t => t.id);
    state.tokens = state.tokens.map(t => {
      if (!ids.includes(t.id)) return t;
      return { ...t, size: explorerClamp((Number(t.size) || 46) + delta, 24, 140) };
    });
    saveNow();
    rerenderAll();
  }
  btnTokSm.addEventListener("click", () => changeSelectedTokenSize(-2));
  btnTokLg.addEventListener("click", () => changeSelectedTokenSize(2));


  // ---------- Group / Ungroup ----------
  btnGroup.addEventListener("click", () => {
    if (selected.size < 2) {
      alert("Select 2+ tokens first (box select or Ctrl+click).");
      return;
    }
    const gid = explorerUid();
    const ids = new Set(selected);
    state.tokens = state.tokens.map(t => ids.has(t.id) ? { ...t, groupId: gid } : t);
    saveNow();
    rerenderAll();
  });


  btnUngroup.addEventListener("click", () => {
    if (!selected.size) {
      alert("Select grouped tokens first.");
      return;
    }
    const ids = new Set(selected);
    state.tokens = state.tokens.map(t => ids.has(t.id) ? { ...t, groupId: null } : t);
    saveNow();
    rerenderAll();
  });


  // ---------- Make Camp ----------
btnMakeCamp.addEventListener("click", () => {
  state.travel.day = (Number(state.travel.day) || 1) + 1;


  // reset ALL heroes for the new day
  state.tokens.forEach(t => t.milesUsed = 0);


  saveNow();
  setNotice("");
  updateTravelUI();
});


btnResetTravel?.addEventListener("click", () => {
  const ok = confirm("Reset travel back to Day 1 and clear miles for ALL heroes?");
  if (!ok) return;


  state.travel.day = 1;
  state.tokens.forEach(t => t.milesUsed = 0);


  setNotice("");
  saveNow();
  updateTravelUI();
});


  // ---------- Selection + dragging ----------
  function getTokenById(id) {
    return state.tokens.find(t => t.id === id);
  }
  function tokenIdsInGroup(groupId) {
    return state.tokens.filter(t => t.groupId === groupId).map(t => t.id);
  }


  // Ctrl+drag marquee selection on empty space
  let marqueeActive = false;
  let marqueeStart = null;


  function setMarquee(x1, y1, x2, y2) {
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);


    marquee.style.left = `${left}px`;
    marquee.style.top = `${top}px`;
    marquee.style.width = `${width}px`;
    marquee.style.height = `${height}px`;
  }


  function stagePointFromEvent(e) {
    const rect = stage.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }


  stage.addEventListener("pointerdown", (e) => {
    // If clicking on a token, token handler will manage it
    if (e.target.closest(".explorer-token")) return;


    marqueeActive = true;
    marquee.hidden = false;


    const p = stagePointFromEvent(e);
    marqueeStart = p;
    setMarquee(p.x, p.y, p.x, p.y);


    // If not holding Ctrl, start fresh selection (box select replaces)
    if (!e.ctrlKey) selected.clear();
    rerenderAll();
  });


  stage.addEventListener("pointermove", (e) => {
    if (!marqueeActive || !marqueeStart) return;
    const p = stagePointFromEvent(e);
    setMarquee(marqueeStart.x, marqueeStart.y, p.x, p.y);
  });


  stage.addEventListener("pointerup", (e) => {
    if (!marqueeActive || !marqueeStart) return;


    marqueeActive = false;
    marquee.hidden = true;


    const p = stagePointFromEvent(e);
    const left = Math.min(marqueeStart.x, p.x);
    const top = Math.min(marqueeStart.y, p.y);
    const right = Math.max(marqueeStart.x, p.x);
    const bottom = Math.max(marqueeStart.y, p.y);


    // Select tokens whose centers fall inside the marquee
    state.tokens.forEach(t => {
      const pos = normToPx(t.x, t.y);
      const cx = pos.x + (t.size / 2);
      const cy = pos.y + (t.size / 2);
      if (cx >= left && cx <= right && cy >= top && cy <= bottom) {
        selected.add(t.id);
      }
    });


    marqueeStart = null;
    rerenderAll();
  });


  // Drag tokens (moves selection)
  tokenLayer.addEventListener("pointerdown", (e) => {
    const elTok = e.target.closest(".explorer-token");
    if (!elTok) return;


    const id = elTok.dataset.id;
    const t = getTokenById(id);
    if (!t) return;


    // Selection rules:
    // - Ctrl toggles token selection
    // - Click (no ctrl) selects token or its group if grouped
    if (e.ctrlKey) {
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      rerenderAll();
      return; // Ctrl click is just selection toggle
    }


    // No ctrl: select group if exists, otherwise just this token
    selected.clear();
    if (t.groupId) {
      tokenIdsInGroup(t.groupId).forEach(x => selected.add(x));
    } else {
      selected.add(id);
    }
    rerenderAll();


    // Start drag for currently selected set
    const start = stagePointFromEvent(e);
    const dragIds = Array.from(selected);


    const startTokens = dragIds.map(tokId => {
      const tok = getTokenById(tokId);
      const px = normToPx(tok.x, tok.y);
      return { id: tokId, startX: px.x, startY: px.y, size: tok.size };
    });


    drag = { start, ids: dragIds, startTokens };
    drag.anchorId = id; // the token you grabbed
    travelFocusId = id;
    updateTravelUI();
// Always record starting axial coords for miles tracking (snap OR free)
drag.startAxial = null;
drag.startAxials = new Map();
drag.lastTargetAx = null;


const anchorTok = getTokenById(drag.anchorId);
if (anchorTok) {
  const anchorPx = normToPx(anchorTok.x, anchorTok.y);
  const anchorCenter = {
    x: anchorPx.x + anchorTok.size / 2,
    y: anchorPx.y + anchorTok.size / 2
  };
  drag.startAxial = axialRound(pixelToAxial(anchorCenter.x, anchorCenter.y));
}


// Record starting axial for every dragged token (used for snap-group movement)
drag.ids.forEach(tokId => {
  const tok = getTokenById(tokId);
  if (!tok) return;
  const px = normToPx(tok.x, tok.y);
  const c = { x: px.x + tok.size / 2, y: px.y + tok.size / 2 };
  drag.startAxials.set(tokId, axialRound(pixelToAxial(c.x, c.y)));
});
   try {
  // Pointer capture is helpful but can throw InvalidStateError in some cases.
  // If it fails, dragging still works because we also listen on window pointerup.
  elTok.setPointerCapture(e.pointerId);
} catch (err) {
  // ignore
}
  });


  tokenLayer.addEventListener("pointermove", (e) => {
  if (!drag) return;


  // If max travel reached, block movement
  const anchor = getTokenById(drag.anchorId);
if ((Number(anchor?.milesUsed) || 0) >= 30) return;


  const now = stagePointFromEvent(e);
  const { w, h } = stageDims();


  // SNAP MODE: move by whole hex deltas, preserving group formation in hex coords
  if (state.snap.enabled && drag.startAxial && drag.startAxials) {
    // Determine target axial for the anchor token based on pointer position
    // Use pointer position, but bias it slightly toward the anchor token centre for stability
const anchorTok = getTokenById(drag.anchorId);
let tx = now.x, ty = now.y;


if (anchorTok) {
  const aPx = normToPx(anchorTok.x, anchorTok.y);
  const acx = aPx.x + anchorTok.size / 2;
  const acy = aPx.y + anchorTok.size / 2;


  // 70% pointer, 30% current anchor centre
  tx = now.x * 0.7 + acx * 0.3;
  ty = now.y * 0.7 + acy * 0.3;
}


const targetAx = axialRound(pixelToAxial(tx, ty));
    // Don’t reapply positions if we’re still in the same target hex
if (drag.lastTargetAx && drag.lastTargetAx.q === targetAx.q && drag.lastTargetAx.r === targetAx.r) {
  return;
}
drag.lastTargetAx = targetAx;


    // Hex delta from start
    const dq = targetAx.q - drag.startAxial.q;
    const dr = targetAx.r - drag.startAxial.r;


    // Apply that delta to every dragged token based on its starting axial
    drag.ids.forEach(tokId => {
      const tok = getTokenById(tokId);
      const startA = drag.startAxials.get(tokId);
      if (!tok || !startA) return;


      
      const newA = { q: startA.q + dq, r: startA.r + dr };
tok.axial = newA;


      // Place token centered on hex center
      const topLeft = { x: p.x - tok.size/2, y: p.y - tok.size/2 };


      // Clamp to stage bounds
      const clamped = {
        x: explorerClamp(topLeft.x, 0, Math.max(0, w - tok.size)),
        y: explorerClamp(topLeft.y, 0, Math.max(0, h - tok.size))
      };


      const n = pxToNorm(clamped.x, clamped.y);
      tok.x = n.x;
      tok.y = n.y;
      tok.axial = newA;
    });


    renderTokens();
    return;
  }


  // FREE MODE (no snap): normal pixel dragging
  const dx = now.x - drag.start.x;
  const dy = now.y - drag.start.y;


  drag.startTokens.forEach(st => {
    const tok = getTokenById(st.id);
    if (!tok) return;


    const nxPx = explorerClamp(st.startX + dx, 0, Math.max(0, w - st.size));
    const nyPx = explorerClamp(st.startY + dy, 0, Math.max(0, h - st.size));
    const n = pxToNorm(nxPx, nyPx);


    tok.x = n.x;
    tok.y = n.y;
  });


  renderTokens();
});
  
  function onTokenPointerUp() {
  if (!drag) return;


  if (drag.startAxial) {
    const anchorTok = getTokenById(drag.anchorId);


    if (anchorTok) {
      const px = normToPx(anchorTok.x, anchorTok.y);
      const center = { x: px.x + anchorTok.size / 2, y: px.y + anchorTok.size / 2 };
      const endAx = axialRound(pixelToAxial(center.x, center.y));


      const hexesMoved = hexDistance(drag.startAxial, endAx);
      const milesMoved = Math.round(hexesMoved * 6);


      const movedIds = Array.isArray(drag?.ids) ? drag.ids : [anchorTok.id];


      // Check if any moved token would exceed 30
      let wouldExceed = false;
      for (const tokId of movedIds) {
        const tok = getTokenById(tokId);
        if (!tok) continue;
        const before = Number(tok.milesUsed) || 0;
        const after = before + milesMoved;
        if (after > 30) { wouldExceed = true; break; }
      }


      if (wouldExceed) {
        const { w, h } = stageDims();


        // Revert everyone in the move
        drag.startTokens.forEach(st => {
          const tok = getTokenById(st.id);
          if (!tok) return;


          const clampedX = explorerClamp(st.startX, 0, Math.max(0, w - st.size));
          const clampedY = explorerClamp(st.startY, 0, Math.max(0, h - st.size));
          const n = pxToNorm(clampedX, clampedY);
          tok.x = n.x;
          tok.y = n.y;


          const a = drag.startAxials?.get(st.id);
          if (a) tok.axial = { q: a.q, r: a.r };
        });


        setNotice("Too far. One or more heroes would exceed 30 miles. Make Camp to reset.");
        drag = null;
        rerenderAll();
        return;
      }


      // Commit miles to everyone who moved
      for (const tokId of movedIds) {
        const tok = getTokenById(tokId);
        if (!tok) continue;
        tok.milesUsed = (Number(tok.milesUsed) || 0) + milesMoved;
      }


      travelFocusId = anchorTok.id;


      // Optional notice if the anchor hits max
      if ((Number(anchorTok.milesUsed) || 0) >= 30) {
        setNotice(`${anchorTok.initial} has reached 30 miles. Make Camp to reset.`);
      }
    }
  }


  drag = null;
  saveNow();
  rerenderAll();
}


tokenLayer.addEventListener("pointerup", onTokenPointerUp);
window.addEventListener("pointerup", onTokenPointerUp);


  // Optional: mouse wheel to resize selected tokens (hover token)
  tokenLayer.addEventListener("wheel", (e) => {
    const elTok = e.target.closest(".explorer-token");
    if (!elTok) return;


    // Prevent page scroll while resizing
    e.preventDefault();


    const delta = (e.deltaY < 0) ? 2 : -2;
    changeSelectedTokenSize(delta);
  }, { passive: false });


  // Cleanup when navigating away
  // Cleanup when navigating away
window.__explorerCleanup = () => {
  window.removeEventListener("resize", onResize);
  document.removeEventListener("fullscreenchange", onResize);
  window.removeEventListener("keydown", onKeyToggleUi);
  window.removeEventListener("pointerup", onTokenPointerUp);
  tokenLayer.removeEventListener("pointerup", onTokenPointerUp);
};
}
// ---------- Router ----------
async function router() {
  updateModeUI();


  const hash = location.hash.replace("#", "") || "/clans/blackstone";
  const parts = hash.split("/").filter(Boolean);


  const tab = parts[0] || "clans";
  const page = parts[1] || "";


  renderTopNav(tab);


  try {
    if (tab === "clans") {
  const active = page || "blackstone";
  renderSideList("The Clans", CLAN_PAGES, active, "clans");
  const item = CLAN_PAGES.find(x => x.id === active) || CLAN_PAGES[0];


  view.innerHTML = await loadMarkdown(item.file);
  rewriteAssetUrls(view);
  return;
}


    if (tab === "temples") {
  const active = page || "telluria";
  renderSideList("The Temples", TEMPLE_PAGES, active, "temples");
  const item = TEMPLE_PAGES.find(x => x.id === active) || TEMPLE_PAGES[0];


  view.innerHTML = await loadMarkdown(item.file);
  rewriteAssetUrls(view);
  return;
}
    if (tab === "heroes") {
      const active = page || HEROES[0].id;
      await renderHero(active);
      return;
    }


    if (tab === "story") {
      const active = page || "";
      await renderStory(active);
      return;
    }


    if (tab === "tools") {
      const active = page || "bastion";
      renderSideList("Tools", TOOL_PAGES, active, "tools");
      const item = TOOL_PAGES.find(x => x.id === active) || TOOL_PAGES[0];


      if (item.type === "bastion") return await renderBastionManager();
if (item.type === "honour") return renderHonourTracker();
if (item.type === "explorer") return renderExplorer();
    }


    location.hash = "#/clans/blackstone";
  } catch (err) {
    showError(err);
  }
}


// Run once on load
router();


// Re-run whenever the hash changes (tabs/sidebar clicks)
window.addEventListener("hashchange", router);
