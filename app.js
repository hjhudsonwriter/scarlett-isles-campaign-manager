const topNav = document.getElementById("topNav");
const sideTitle = document.getElementById("sideTitle");
const sideList = document.getElementById("sideList");
const view = document.getElementById("view");
// ---------- GitHub Pages base-path helper ----------
const BASE = (() => {
  const parts = location.pathname.split("/").filter(Boolean);
  return parts.length ? `/${parts[0]}/` : "/";
})();

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
  { id: "roller", title: "Bastion Event Roller", type: "roller" },
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
const BASTION_CONFIG_PATH = "./data/bastion.json";
const BASTION_STORE_KEY = "bastion.ironbow.v1";
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
  if (typeof expr !== "string") return 0;
  const cleaned = expr.replace(/\s+/g, "");

  // handle NdM optionally followed by *K and/or +K
  // e.g. 1d6*25, 2d4+3
  const m = cleaned.match(/^(\d+)d(\d+)(\*(\d+))?(\+(\d+))?$/i);
  if (!m) return 0;

  const count = safeNum(m[1], 1);
  const sides = safeNum(m[2], 6);
  const mult = m[4] ? safeNum(m[4], 1) : 1;
  const add = m[6] ? safeNum(m[6], 0) : 0;

  let sum = 0;
  for (let i=0; i<count; i++) sum += rollDie(sides);
  return sum * mult + add;
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

  if (!saved) return base;

  // Merge saved.state into base.state safely (keep schema additions from config)
  const merged = deepClone(base);
  merged.state = { ...merged.state, ...(saved.state || {}) };

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

function findFacility(config, facilityId) {
  return (config.facilities || []).find(f => f.id === facilityId) || null;
}

function facilityLevelData(facility, lvl) {
  if (!facility?.levels) return null;
  return facility.levels[String(lvl)] || null;
}

function isUnderConstruction(runtimeState, facilityId) {
  return (runtimeState.state.constructionInProgress || []).some(c => c.facilityId === facilityId);
}

function startUpgrade(runtimeState, facilityId) {
  const fac = findFacility(runtimeState, facilityId);
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
  const fac = findFacility(runtimeState, facilityId);
  if (!fac) return { ok:false, msg:"Facility not found." };

  const lvl = safeNum(fac.currentLevel, 0);
  const lvlData = facilityLevelData(fac, lvl);
  const fns = lvlData?.functions || [];
  const fn = fns.find(x => x.id === fnId);
  if (!fn) return { ok:false, msg:"Function not found for current level." };

  if (isUnderConstruction(runtimeState, facilityId)) {
    // Still can use current level functions while building next tier in many systems,
    // but your spec says "prevent using the new tier until complete" – current tier is fine.
    // So we allow orders here.
  }

  // prevent duplicate same order in progress
  const exists = (runtimeState.state.ordersInProgress || []).some(o => o.facilityId === facilityId && o.functionId === fnId);
  if (exists) return { ok:false, msg:"That function is already active." };

  // cost handling
  const cost = safeNum(fn.costGP, 0);
  const treasury = safeNum(runtimeState.state?.treasury?.gp, 0);
  if (treasury < cost) return { ok:false, msg:"Not enough GP for that function." };
  runtimeState.state.treasury.gp = treasury - cost;

  runtimeState.state.ordersInProgress.push({
    facilityId,
    functionId: fnId,
    label: fn.label,
    remainingTurns: safeNum(fn.durationTurns, 1),
    outputsToWarehouse: Array.isArray(fn.outputsToWarehouse) ? fn.outputsToWarehouse : [],
    notes: fn.notes || []
  });

  return { ok:true };
}

function applyOutputsToWarehouse(runtimeState, outputs) {
  const items = runtimeState.state.warehouse.items;

  outputs.forEach(out => {
    if (!out || typeof out !== "object") return;

    // Resolve dice gp outputs
    if (out.type === "coin" && typeof out.gp === "string") {
      const gp = rollDiceExpr(out.gp);
      items.push({ type: "coin", qty: 1, gp, notes: `Rolled ${out.gp}` });
      return;
    }

    // Trade goods with max value
    if (out.type === "trade_goods") {
      const v = safeNum(out.valueGPMax, 0);
      items.push({ type: "trade_goods", qty: safeNum(out.qty, 1), gpValueMax: v, notes: "DM chooses trade goods." });
      return;
    }

    // Generic item objects
    items.push(deepClone(out));
  });
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

  // 4) decrement order timers
  runtimeState.state.ordersInProgress = (runtimeState.state.ordersInProgress || []).map(o => ({
    ...o,
    remainingTurns: safeNum(o.remainingTurns, 0) - 1
  }));

  // 5) resolve completed outputs
  const completedOrders = runtimeState.state.ordersInProgress.filter(o => safeNum(o.remainingTurns, 0) <= 0);
  runtimeState.state.ordersInProgress = runtimeState.state.ordersInProgress.filter(o => safeNum(o.remainingTurns, 0) > 0);

  completedOrders.forEach(o => {
    applyOutputsToWarehouse(runtimeState, o.outputsToWarehouse || []);
  });

  // decrement pending upkeep adds duration
  runtimeState.state.pendingUpkeepAdds = (runtimeState.state.pendingUpkeepAdds || [])
    .map(x => ({ ...x, remainingTurns: safeNum(x.remainingTurns, 0) - 1 }))
    .filter(x => safeNum(x.remainingTurns, 0) > 0);

  // 6) monthly events every 4 turns OR maintain issued
  runtimeState.state.turnCount = safeNum(runtimeState.state.turnCount, 0) + 1;
  const turnCount = runtimeState.state.turnCount;

  let didRoll = false;
  let rolled = null;

  const monthly = runtimeState?.events?.frequency === "monthly";
  const dueMonthly = monthly && (turnCount % 4 === 0);

  if (opts.maintainIssued || dueMonthly) {
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
      effects: r.event?.effects || []
    };
  }

  return { nextUpkeep, didRoll, rolled };
}

function fmtJSON(obj) {
  try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
}

async function renderBastionManager() {
  // Load config
  let config;
  try {
    const res = await fetch(BASTION_CONFIG_PATH, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load ${BASTION_CONFIG_PATH}`);
    config = await res.json();
  } catch (e) {
    view.innerHTML = `<h1>Bastion Manager</h1><p class="badge">Error loading bastion.json</p><pre>${String(e)}</pre>`;
    return;
  }

  // Load saved state or seed from config
  const saved = loadBastionSave();
  const runtimeState = ensureRuntimeState(config, saved);

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
      ${mapPath
        ? `<img src="${mapPath}" alt="${mapTitle}" style="width:100%;border-radius:18px;border:1px solid var(--border);">`
        : `<p class="small">No mapImage.defaultPath set.</p>`
      }
      <p class="small muted">Path: <code>${mapPath || "(none)"}</code></p>
    </div>

    <div class="grid2" style="margin-top:12px;">
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

    <div class="grid2" style="margin-top:12px;">
      <div class="card warehouseCard">
        <h2>Warehouse</h2>
        <p class="small muted">DM editable. Function outputs append here automatically when completed.</p>
        <table class="table">
          <thead>
            <tr>
              <th>Item</th>
              <th style="width:90px;">Qty</th>
              <th style="width:120px;">Value (gp)</th>
              <th>Notes</th>
              <th style="width:110px;">Actions</th>
            </tr>
          </thead>
          <tbody id="bm_wh_rows"></tbody>
        </table>
        <div class="btnRow">
          <button id="bm_wh_add">Add Item</button>
          <button id="bm_wh_save">Save Warehouse</button>
        </div>
      </div>

      <div class="card">
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
    </div>

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

  // ----- Warehouse rows (clean editor) -----
  const whTbody = document.getElementById("bm_wh_rows");

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

  document.getElementById("bm_wh_add").addEventListener("click", () => {
    runtimeState.state.warehouse.items.push({ type: "item", qty: 1, label: "New Item", notes: "" });
    renderWarehouseRows();
  });

  document.getElementById("bm_wh_save").addEventListener("click", () => {
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

  // ----- Facilities rendering -----
  const facWrap = document.getElementById("bm_facilities");

  function renderFacilities() {
    facWrap.innerHTML = facilities.map(f => {
      const lvl = safeNum(f.currentLevel, 0);
      const lvlData = facilityLevelData(f, lvl);
      const nextLvl = lvl + 1;
      const nextData = facilityLevelData(f, nextLvl);

      const underCon = constructions.find(c => c.facilityId === f.id);
      const isBuilding = !!underCon;

      const upgradeCost = safeNum(nextData?.construction?.costGP, 0);
      const upgradeTurns = safeNum(nextData?.construction?.turns, 0);
      const canUpgrade = nextData && !isBuilding && safeNum(runtimeState.state.treasury.gp, 0) >= upgradeCost;

      const fns = lvlData?.functions || [];
      const activeOrders = orders.filter(o => o.facilityId === f.id);

      return `
        <div class="card facCard" style="margin-top:12px;">
          <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
            <div style="display:flex; gap:14px; align-items:center;">
              <img class="facImg" src="${FACILITY_IMG(f.id)}" alt="${f.name}">
              <div>
                <h3 style="margin:0;">${f.name}</h3>
                <div class="small muted">Level <b>${lvl}</b> / ${safeNum(f.maxLevel,lvl)}</div>
                ${lvlData?.label ? `<div class="pill" style="margin-top:8px;">${lvlData.label}</div>` : ""}
                ${isBuilding ? `<div class="pill" style="margin-top:8px;">Under Construction: <b>Level ${underCon.targetLevel}</b> • ${safeNum(underCon.remainingTurns,0)} turns left</div>` : ""}
              </div>
            </div>

            <div style="min-width:280px;">
              <div class="pill">Hirelings: <b>${safeNum(f.staffing?.hirelings, safeNum(f.staffing?.hirelingsBase, 0))}</b></div>
              <div class="small muted" style="margin-top:8px;">
                ${(f.staffing?.notes || []).map(n => `• ${n}`).join("<br>")}
              </div>
            </div>
          </div>

          <hr />

          <h4>Benefits</h4>
          <div class="small muted">
            ${(lvlData?.benefits || []).map(b => `• ${b}`).join("<br>") || "No benefits listed."}
          </div>

          <hr />

          <h4>Functions</h4>
          ${fns.length ? `
            <table class="table">
              <thead><tr><th>Function</th><th>Duration</th><th>Outputs</th><th>Action</th></tr></thead>
              <tbody>
                ${fns.map(fn => {
                  const active = activeOrders.find(o => o.functionId === fn.id);
                  const outputs = (fn.outputsToWarehouse || []).length
                    ? fn.outputsToWarehouse.map(o => `<code>${o.type || "item"}</code>`).join(" ")
                    : "<span class='small muted'>None</span>";

                  return `
                    <tr>
                      <td>
                        <b>${fn.label}</b><br>
                        <span class="small muted">${(fn.notes||[]).join(" • ")}</span>
                      </td>
                      <td>${safeNum(fn.durationTurns,1)} turn(s)</td>
                      <td>${outputs}</td>
                      <td>
                        ${active
                          ? `<span class="pill">Active • ${safeNum(active.remainingTurns,0)} left</span>`
                          : `<button class="bm_startFn" data-fid="${f.id}" data-fnid="${fn.id}">Start</button>`
                        }
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          ` : `<p class="small muted">No functions at this level.</p>`}

          <hr />

          <h4>Upgrade</h4>
          ${nextData ? `
            <div class="small muted">Next: <b>${nextData.label || `Level ${nextLvl}`}</b></div>

            <div class="iconLine">
              <div class="pill iconStat">
                <img src="${UI_COIN_ICON}" alt="Cost">
                <b>${upgradeCost}gp</b>
              </div>
              <div class="pill iconStat">
                <img src="${UI_TIMER_ICON}" alt="Time">
                <b>${upgradeTurns} turns</b>
              </div>
            </div>

            <div class="btnRow" style="margin-top:10px;">
              <button class="bm_upgrade" data-fid="${f.id}" ${canUpgrade ? "" : "disabled"}>Apply Upgrade</button>
              ${!canUpgrade ? `<span class="small muted">${isBuilding ? "Already building." : (safeNum(runtimeState.state.treasury.gp,0) < upgradeCost ? "Insufficient treasury." : "")}</span>` : ""}
            </div>
          ` : `<p class="small muted">No further upgrades (max level).</p>`}
        </div>
      `;
    }).join("");
  }

  renderFacilities();

  facWrap.addEventListener("click", (e) => {
    const up = e.target.closest(".bm_upgrade");
    if (up) {
      const fid = up.dataset.fid;
      const r = startUpgrade(runtimeState, fid);
      if (!r.ok) alert(r.msg || "Could not start upgrade.");
      saveBastionSave(runtimeState);
      renderBastionManager();
      return;
    }

    const st = e.target.closest(".bm_startFn");
    if (st) {
      const fid = st.dataset.fid;
      const fnid = st.dataset.fnid;
      const r = startFunctionOrder(runtimeState, fid, fnid);
      if (!r.ok) alert(r.msg || "Could not start function.");
      saveBastionSave(runtimeState);
      renderBastionManager();
      return;
    }
  });

  // ----- Import / Export -----
  document.getElementById("bm_export").addEventListener("click", () => {
    const blob = new Blob([exportBastion(runtimeState)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ironbow-bastion-save.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  const importBtn = document.getElementById("bm_import_btn");
  const importInput = document.getElementById("bm_import_file");
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

  document.getElementById("bm_reset").addEventListener("click", () => {
    localStorage.removeItem(BASTION_STORE_KEY);
    alert("Reset to spec baseline. Reloading...");
    renderBastionManager();
  });

  // ----- Take Bastion Turn -----
  document.getElementById("bm_takeTurn").addEventListener("click", () => {
    saveTopFields();
    const maintain = !!document.getElementById("bm_maintain").checked;

    const result = advanceTurnPipeline(runtimeState, { maintainIssued: maintain });
    saveBastionSave(runtimeState);

    const out = document.getElementById("bm_turnResult");
    out.innerHTML = `
      Turn processed. Next upkeep was <b>${result.nextUpkeep} gp</b>.
      ${result.didRoll ? `<br>Event roll: <b>${result.rolled.roll}</b> (${result.rolled.event?.label || "No event"})` : ""}
    `;

    renderBastionManager();
  });

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
    x: 0.12 + (i * 0.07),   // just a nice starting spread
    y: 0.18 + (i * 0.06),
    size: 46,
    groupId: null
  }));

  return {
    mapDataUrl: null,
    grid: {
      enabled: true,
      // "r" = radius in px (center -> corner). Hex width ≈ sqrt(3)*r
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
</div> <!-- end explorer-fswrap -->
</div> <!-- end explorer-wrap -->
  `;

  const root = view.querySelector(".explorer-wrap");
  const mapUpload = root.querySelector("#explorerMapUpload");
  const btnClear = root.querySelector("#explorerClearMap");
  const btnFs = root.querySelector("#explorerFullscreen");
  const btnHideUi = root.querySelector("#explorerHideUi");

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
  const marquee = root.querySelector("#explorerMarquee");

  // Load state (merge defaults)
  const saved = explorerLoad();
  const state = explorerDefaultState();

  if (typeof saved.mapDataUrl === "string") state.mapDataUrl = saved.mapDataUrl;
  if (saved.grid) state.grid = { ...state.grid, ...saved.grid };

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
        groupId: prev.groupId || null
      };
    });
  }

  // Selection state (not persisted)
  const selected = new Set();

  function saveNow() {
    explorerSave({
      mapDataUrl: state.mapDataUrl,
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

  function updateReadout() {
    const r = Number(state.grid.r) || 0;
    const w = Math.round(Math.sqrt(3) * r);
    btnGridToggle.textContent = `Hex Grid: ${state.grid.enabled ? "On" : "Off"}`;
    readout.textContent = r ? `Hex: r=${Math.round(r)}px (≈ ${w}px wide)` : "Hex: —";
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

    const r = explorerClamp(Number(state.grid.r) || 38, 10, 220);
    const opacity = explorerClamp(Number(state.grid.opacity) || 0.35, 0, 1);

    const hexW = Math.sqrt(3) * r;      // pointy-top width
    const hexH = 2 * r;                 // pointy-top height
    const stepY = 1.5 * r;              // vertical spacing
    const stepX = hexW;                 // horizontal spacing

    const offX = Number(state.grid.offsetX) || 0;
    const offY = Number(state.grid.offsetY) || 0;

    ctx.globalAlpha = opacity;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(231,231,234,0.9)";

    // Start a bit off-screen so offsets don’t leave gaps
    const startY = -hexH + offY;
    const endY = h + hexH;

    let row = 0;
    for (let cy = startY; cy <= endY; cy += stepY) {
      const rowOffsetX = (row % 2 === 0) ? 0 : (stepX / 2);
      const startX = -hexW + offX + rowOffsetX;
      const endX = w + hexW;

      for (let cx = startX; cx <= endX; cx += stepX) {
        // Draw pointy-top hex
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 180) * (60 * i - 30);
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      row++;
    }

    ctx.globalAlpha = 1;
  }

  function renderTokens() {
    tokenLayer.innerHTML = "";
    const { w, h } = stageDims();

    state.tokens.forEach(t => {
      const token = document.createElement("div");
      token.className = "explorer-token";
      token.dataset.id = t.id;

      if (selected.has(t.id)) token.classList.add("isSelected");
      if (t.groupId) token.dataset.groupId = t.groupId;

      token.style.width = `${t.size}px`;
      token.style.height = `${t.size}px`;

      const px = normToPx(t.x, t.y);
      const x = explorerClamp(px.x, 0, Math.max(0, w - t.size));
      const y = explorerClamp(px.y, 0, Math.max(0, h - t.size));
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
  }

  // Initial render
  rerenderAll();

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
  if (!fsWrap) return;
  setUiHidden(!fsWrap.classList.contains("uiHidden"));
});

// Handy keyboard toggle while fullscreen: press H
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "h") return;
  if (!document.fullscreenElement) return;
  if (!fsWrap) return;
  setUiHidden(!fsWrap.classList.contains("uiHidden"));
});

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
  let drag = null;

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
    elTok.setPointerCapture?.(e.pointerId);
  });

  tokenLayer.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const now = stagePointFromEvent(e);
    const dx = now.x - drag.start.x;
    const dy = now.y - drag.start.y;

    const { w, h } = stageDims();

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

  tokenLayer.addEventListener("pointerup", () => {
    if (!drag) return;
    drag = null;
    saveNow();
    rerenderAll();
  });

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
  window.__explorerCleanup = () => {
  window.removeEventListener("resize", onResize);
  document.removeEventListener("fullscreenchange", onResize);
  window.removeEventListener("keydown", onKeyToggleUi);
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
if (item.type === "roller") return await renderEventRoller();
if (item.type === "honour") return renderHonourTracker();
if (item.type === "explorer") return renderExplorer();
    }

    location.hash = "#/clans/blackstone";
  } catch (err) {
    showError(err);
  }
}

function onKeyToggleUi(e) {
  if (e.key.toLowerCase() !== "h") return;
  if (!document.fullscreenElement) return;
  if (!fsWrap) return;
  setUiHidden(!fsWrap.classList.contains("uiHidden"));
}
window.addEventListener("keydown", onKeyToggleUi);
router();
