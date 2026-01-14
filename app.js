const topNav = document.getElementById("topNav");
const sideTitle = document.getElementById("sideTitle");
const sideList = document.getElementById("sideList");
const view = document.getElementById("view");

// Base URL for GitHub Pages project sites: "/<repo>/"
const BASE = document.querySelector('base')?.getAttribute('href') || (() => {
  const p = location.pathname;
  // if deployed at /repo/... then base is "/repo/"
  const parts = p.split("/").filter(Boolean);
  return parts.length ? `/${parts[0]}/` : "/";
})();

function withBase(url) {
  // only rewrite local paths
  if (!url || url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (url.startsWith("./")) url = url.slice(2);
  if (url.startsWith("/")) url = url.slice(1);
  return BASE + url;
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
        document.getElementById("btnClearHeroPdf")?.addEventListener("click", async () => {
  await idbDel(heroPdfKey(hero.id));
  router();
});
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
      // Clear by storing null? easiest: overwrite with empty, or remove store not implemented.
      // We simulate remove by setting undefined blob not possible; use a special empty Blob marker.
      await idbSet(heroPdfKey(hero.id), new Blob([], { type: "application/pdf" }));
      // If empty blob, treat as no override:
      router();
    });
  }
}

// ---------- Tools ----------
async function renderBastionManager() {
  const bastion = await fetch("./data/bastion.json", { cache: "no-store" }).then(r => r.json());

  view.innerHTML = `
    <h1>Bastion Management</h1>
    <p class="badge">${bastion.bastion_name} • Reputation: ${bastion.reputation}</p>

    <hr />

    <h2>Bastion Map</h2>
    <img src="./assets/images/bastion-map.png" alt="Bastion Map" />

    <hr />

    <h2>Upkeep Phase</h2>
    <p><small>These values are currently read from data/bastion.json.</small></p>
  `;
}

async function renderEventRoller() {
  const events = await fetch("./data/bastion-events.json", { cache: "no-store" }).then(r => r.json());

  view.innerHTML = `
    <h1>Bastion Event Roller (D100)</h1>
    <button id="rollBtn">Roll d100</button>
    <div id="result" style="margin-top:14px"></div>
    <hr />
    <h2>Event Table</h2>
    <ul>
      ${events.map(e => `<li><b>${e.range[0]}–${e.range[1]}:</b> ${e.title}</li>`).join("")}
    </ul>
  `;

  const result = document.getElementById("result");
  document.getElementById("rollBtn").addEventListener("click", () => {
    const roll = Math.floor(Math.random() * 100) + 1;
    const ev = events.find(e => roll >= e.range[0] && roll <= e.range[1]);
    result.innerHTML = `
      <div class="card" style="background: rgba(18,22,27,.55)">
        <p class="badge">Rolled: <b>${roll}</b></p>
        <h2 style="margin-top:8px">${ev?.title || "Unknown Event"}</h2>
        <p>${ev?.text || ""}</p>
      </div>
    `;
  });
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
      function rewriteAssetUrls(containerEl) {
  containerEl.querySelectorAll("img").forEach(img => {
    const src = img.getAttribute("src");
    if (src) img.setAttribute("src", withBase(src));
  });
  containerEl.querySelectorAll("a").forEach(a => {
    const href = a.getAttribute("href");
    if (href && (href.endsWith(".pdf") || href.startsWith("assets/") || href.startsWith("./assets/"))) {
      a.setAttribute("href", withBase(href));
    }
  });
}
      return;
    }

    if (tab === "temples") {
      const active = page || "telluria";
      renderSideList("The Temples", TEMPLE_PAGES, active, "temples");
      const item = TEMPLE_PAGES.find(x => x.id === active) || TEMPLE_PAGES[0];
      view.innerHTML = await loadMarkdown(item.file);
rewriteAssetUrls(view);
      function rewriteAssetUrls(containerEl) {
  containerEl.querySelectorAll("img").forEach(img => {
    const src = img.getAttribute("src");
    if (src) img.setAttribute("src", withBase(src));
  });
  containerEl.querySelectorAll("a").forEach(a => {
    const href = a.getAttribute("href");
    if (href && (href.endsWith(".pdf") || href.startsWith("assets/") || href.startsWith("./assets/"))) {
      a.setAttribute("href", withBase(href));
    }
  });
}
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
    }

    location.hash = "#/clans/blackstone";
  } catch (err) {
    showError(err);
  }
}

window.addEventListener("hashchange", router);
router();
