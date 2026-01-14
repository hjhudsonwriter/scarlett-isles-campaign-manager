const topNav = document.getElementById("topNav");
const sideTitle = document.getElementById("sideTitle");
const sideList = document.getElementById("sideList");
const view = document.getElementById("view");

// ---- Your site map ----
const HERO_PAGES = [
  { id: "kaelen-of-wolfhaven", title: "Kaelen of Wolfhaven", file: "./content/heroes/kaelen-of-wolfhaven.md" },
  { id: "umbrys", title: "Umbrys", file: "./content/heroes/umbrys.md" },
  { id: "magnus-ironward", title: "Magnus Ironward", file: "./content/heroes/magnus-ironward.md" },
  { id: "elara-varrus", title: "Elara Varrus", file: "./content/heroes/elara-varrus.md" },
  { id: "charles-vect", title: "Charles Vect", file: "./content/heroes/charles-vect.md" },
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

const TOP_TABS = [
  { id: "clans", title: "The Clans" },
  { id: "temples", title: "The Temples" },
  { id: "heroes", title: "The Heroes" },
  { id: "story", title: "The Story" },
  { id: "tools", title: "Tools" },
];

// Tools sub-pages:
const TOOL_PAGES = [
  { id: "bastion", title: "Bastion Management", type: "bastion" },
  { id: "roller", title: "Bastion Event Roller", type: "roller" },
  { id: "honour", title: "Honour Tracker", type: "honour" },
];

// Story recap list (starter, we’ll expand later via CMS):
async function getRecapPages() {
  // index.json controls sidebar order + labels
  const idx = await fetch("./content/story/recaps/index.json", { cache: "no-store" }).then(r => r.json());
  const order = idx.order || [];
  const labels = idx.labels || {};

  return order.map((id) => ({
    id,
    title: labels[id] || id,
    file: `./content/story/recaps/${id}.md`
  }));
}

// ---- Rendering helpers ----
function setActiveLinks(container, activeId) {
  [...container.querySelectorAll("a")].forEach(a => {
    a.classList.toggle("active", a.dataset.id === activeId);
  });
}

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

// ---- Tools: Bastion ----
async function renderBastionManager() {
  const [bastion, events] = await Promise.all([
    fetch("./data/bastion.json", { cache: "no-store" }).then(r => r.json()),
    fetch("./data/bastion-events.json", { cache: "no-store" }).then(r => r.json())
  ]);

  const structures = bastion.structures;

  view.innerHTML = `
    <h1>Bastion Management</h1>
    <p class="badge">${bastion.bastion_name} • Reputation: ${bastion.reputation}</p>

    <hr />

    <h2>Bastion Map</h2>
    <p><small>Upload your image via Admin (later). For now, place it at <code>assets/images/bastion-map.png</code>.</small></p>
    <img src="./assets/images/bastion-map.png" alt="Bastion Map" onerror="this.style.display='none'" />

    <hr />

    <h2>Upkeep Phase</h2>
    <label><small>Phase</small></label>
    <select id="upkeepPhase"></select>
    <div id="upkeepBox" style="margin-top:12px"></div>

    <hr />

    <h2>Structures</h2>
    <div id="structuresBox"></div>

    <hr />

    <h2>Notes</h2>
    <p><small>Travel Access: ${bastion.travel.access}</small></p>
    <ul>
      ${bastion.travel.notes.map(n => `<li>${n}</li>`).join("")}
    </ul>
  `;

  // Populate phase dropdown
  const phaseSel = document.getElementById("upkeepPhase");
  const phases = bastion.upkeep_phases;
  phaseSel.innerHTML = Object.keys(phases).map(k => {
    const p = phases[k];
    const selected = Number(k) === bastion.upkeep_phase ? "selected" : "";
    return `<option value="${k}" ${selected}>Phase ${k} — ${p.name}</option>`;
  }).join("");

  function drawUpkeep(phaseKey) {
    const p = phases[phaseKey];
    const rows = p.breakdown.map(([name, gp]) => `<li>${name}: <b>${gp} gp</b></li>`).join("");
    document.getElementById("upkeepBox").innerHTML = `
      <p><b>Monthly total: ${p.monthly_cost} gp</b></p>
      <ul>${rows}</ul>
    `;
  }
  drawUpkeep(String(bastion.upkeep_phase || 1));
  phaseSel.addEventListener("change", () => drawUpkeep(phaseSel.value));

  // Structures list
  const box = document.getElementById("structuresBox");
  box.innerHTML = Object.keys(structures).map(key => {
    const s = structures[key];
    const tiers = s.tiers;
    const options = Object.keys(tiers).map(lvl => {
      const t = tiers[lvl];
      const isSelected = Number(lvl) === Number(s.level) ? "selected" : "";
      const cost = t.cost ? `${t.cost} gp` : (t.built ? "Built" : "—");
      return `<option value="${lvl}" ${isSelected}>Level ${lvl} (${cost})</option>`;
    }).join("");

    return `
      <div class="card" style="margin:12px 0; background: rgba(18,22,27,.55)">
        <b>${s.label}</b> <span class="badge">Key: ${s.key}</span>
        <div style="margin-top:10px">
          <label><small>Level</small></label>
          <select data-structure="${key}">${options}</select>
        </div>
        <div style="margin-top:10px">
          <small><b>Benefits:</b> ${s.tiers[s.level]?.benefits?.join(", ") || "—"}</small>
        </div>
      </div>
    `;
  }).join("");
}

async function renderEventRoller() {
  const events = await fetch("./data/bastion-events.json", { cache: "no-store" }).then(r => r.json());

  view.innerHTML = `
    <h1>Bastion Event Roller (D100)</h1>
    <p><small>Click roll. Get fate. Pretend it was always planned.</small></p>
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
    <p><small>Embedded from your live tracker. If it fails to display, we’ll switch to a simple “Open in new tab” button.</small></p>
    <p><a class="badge" href="https://hjhudsonwriter.github.io/tsi-honour-tracker/" target="_blank" rel="noopener">Open Honour Tracker</a></p>
    <iframe
      src="https://hjhudsonwriter.github.io/tsi-honour-tracker/"
      style="width:100%;height:80vh;border:1px solid #28303a;border-radius:18px;background:#0f1216"
      loading="lazy"
      referrerpolicy="no-referrer"
    ></iframe>
  `;
}

// ---- Router ----
async function router() {
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
      return;
    }

    if (tab === "temples") {
      const active = page || "telluria";
      renderSideList("The Temples", TEMPLE_PAGES, active, "temples");
      const item = TEMPLE_PAGES.find(x => x.id === active) || TEMPLE_PAGES[0];
      view.innerHTML = await loadMarkdown(item.file);
      return;
    }

    if (tab === "heroes") {
      const active = page || "kaelen-of-wolfhaven";
      renderSideList("The Heroes", HERO_PAGES, active, "heroes");
      const item = HERO_PAGES.find(x => x.id === active) || HERO_PAGES[0];
      view.innerHTML = await loadMarkdown(item.file);
      return;
    }

    if (tab === "story") {
  const pages = await getRecapPages();
  const defaultId = pages[0]?.id || "session-001";
  const active = page || defaultId;

  renderSideList("Session Recaps", pages, active, "story");
  const item = pages.find(x => x.id === active) || pages[0];

  view.innerHTML = item ? await loadMarkdown(item.file) : "<h1>No recaps yet</h1>";
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

    // fallback
    location.hash = "#/clans/blackstone";
  } catch (err) {
    showError(err);
  }
}

window.addEventListener("hashchange", router);
router();
