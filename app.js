const plants = window.PLANT_DATA || [];
const aliases = window.PLANT_ALIASES || [];

const key = (name) => name || "";
const norm = (s) => String(s || "").toLowerCase().replace(/×/g, "x").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const get = (plant, names) => {
  for (const name of names) {
    if (plant[name] !== undefined && String(plant[name]).trim() !== "") return String(plant[name]).trim();
  }
  return "";
};
const aliasMap = new Map();
for (const a of aliases) {
  if (!aliasMap.has(a.Plant_ID)) aliasMap.set(a.Plant_ID, []);
  aliasMap.get(a.Plant_ID).push(a.Alias);
}
const searchBlob = new Map();
for (const p of plants) {
  const id = p.Plant_ID || p["Scientific Name"];
  const rowText = Object.values(p).join(" ");
  const aliasText = (aliasMap.get(id) || []).join(" ");
  searchBlob.set(id, norm(rowText + " " + aliasText));
}

const fields = {
  sci: ["Scientific Name", "Plant_ID"],
  common: ["Common Name(s)", "Common Name", "Common Names"],
  family: ["Family", "Family Name"],
  habit: ["Growth Habitat", "Habit", "Growth Habit"],
  water: ["Water Req.", "Water Use", "Water Requirement", "Water Requirements"],
  light: ["Sun/Shade Requirements", "Light Requirement", "Light Requirements"],
  bloom: ["Bloom Color", "Bloom Colour"],
  duration: ["Duration"],
  lbjStatus: ["LBJ Scrape Status"],
  lbjUrl: ["LBJ URL", "LBJ Manual URL"]
};

const searchInput = document.getElementById("searchInput");
const habitFilter = document.getElementById("habitFilter");
const waterFilter = document.getElementById("waterFilter");
const lightFilter = document.getElementById("lightFilter");
const bloomFilter = document.getElementById("bloomFilter");
const tbody = document.querySelector("#plantTable tbody");
const resultCount = document.getElementById("resultCount");
const detailPanel = document.getElementById("detailPanel");
let selectedId = null;

function uniqueOptions(fieldNames) {
  const values = new Set();
  for (const p of plants) {
    const val = get(p, fieldNames);
    if (!val) continue;
    String(val).split(/[,;/]|\band\b/i).map(x => x.trim()).filter(Boolean).forEach(v => values.add(v));
  }
  return [...values].sort((a,b) => a.localeCompare(b));
}
function fillSelect(select, opts) {
  for (const opt of opts) {
    const el = document.createElement("option");
    el.value = opt; el.textContent = opt;
    select.appendChild(el);
  }
}
fillSelect(habitFilter, uniqueOptions(fields.habit));
fillSelect(waterFilter, uniqueOptions(fields.water));
fillSelect(lightFilter, uniqueOptions(fields.light));
fillSelect(bloomFilter, uniqueOptions(fields.bloom));

function includesFilter(value, filter) {
  if (!filter) return true;
  return norm(value).includes(norm(filter));
}
function filteredPlants() {
  const q = norm(searchInput.value);
  return plants.filter(p => {
    const id = p.Plant_ID || get(p, fields.sci);
    return (!q || searchBlob.get(id)?.includes(q)) &&
      includesFilter(get(p, fields.habit), habitFilter.value) &&
      includesFilter(get(p, fields.water), waterFilter.value) &&
      includesFilter(get(p, fields.light), lightFilter.value) &&
      includesFilter(get(p, fields.bloom), bloomFilter.value);
  });
}
function renderStats() {
  const statuses = new Set(plants.map(p => get(p, fields.lbjStatus)).filter(Boolean));
  const families = new Set(plants.map(p => get(p, fields.family)).filter(Boolean));
  const aliasCount = aliases.length;
  document.getElementById("stats").innerHTML = `
    <div class="stat"><strong>${plants.length.toLocaleString()}</strong><span>Plant rows</span></div>
    <div class="stat"><strong>${families.size.toLocaleString()}</strong><span>Families</span></div>
    <div class="stat"><strong>${aliasCount.toLocaleString()}</strong><span>Search aliases</span></div>
    <div class="stat"><strong>${statuses.size.toLocaleString()}</strong><span>Scrape statuses</span></div>`;
}
function renderTable() {
  const data = filteredPlants();
  resultCount.textContent = `${data.length.toLocaleString()} of ${plants.length.toLocaleString()} plants shown`;
  tbody.innerHTML = "";
  for (const p of data) {
    const id = p.Plant_ID || get(p, fields.sci);
    const tr = document.createElement("tr");
    if (id === selectedId) tr.classList.add("selected");
    tr.innerHTML = `
      <td><span class="sciname">${esc(get(p, fields.sci))}</span></td>
      <td>${esc(get(p, fields.common))}</td>
      <td>${esc(get(p, fields.habit))}</td>
      <td>${esc(get(p, fields.water))}</td>
      <td>${esc(get(p, fields.light))}</td>
      <td>${esc(get(p, fields.bloom))}</td>
      <td>${esc(get(p, fields.lbjStatus))}</td>`;
    tr.addEventListener("click", () => { selectedId = id; renderDetail(p); renderTable(); });
    tbody.appendChild(tr);
  }
}
function esc(s) {
  return String(s || "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
}
function linkify(s) {
  const str = esc(s);
  return str.replace(/(https?:\/\/[^\s,;]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
}
const groups = [
  {title: "Core identity", keys: ["Plant_ID", "Scientific Name", "Common Name(s)", "Family", "Synonym(s)"]},
  {title: "Growth and landscape traits", keys: ["Duration", "Deciduous/ Evergreen (green in winter)", "Growth Habitat", "Sun/Shade Requirements", "Water Req.", "Water Use", "Avg Height (ft)", "Avg Width (ft)", "Size Notes", "Leaf", "Soil Moisture", "Soil Description", "Conditions Comments"]},
  {title: "Bloom and wildlife", keys: ["Bloom Time", "Bloom Color", "Bloom Notes", "Flower", "Fruit", "Benefit", "Use Wildlife", "Conspicuous Flowers", "Attracts"]},
  {title: "Range and habitat", keys: ["USA", "Canada", "Native Distribution", "Native Habitat", "Distribution", "Habitat"]},
  {title: "Wildflower Center audit", keys: ["LBJ URL", "LBJ Manual URL", "LBJ Scrape Status", "LBJ Scrape Error", "LBJ Scraped At", "LBJ Fields Scraped", "LBJ Resolve Note", "LBJ Match Type", "LBJ Match Score", "LBJ Image URLs"]}
];
function renderDetail(p) {
  const sci = get(p, fields.sci);
  const common = get(p, fields.common);
  const used = new Set();
  let html = `<h2>${esc(sci)}</h2><p class="common">${esc(common)}</p><div class="detail-grid">`;
  for (const group of groups) {
    const items = group.keys.filter(k => p[k] !== undefined && String(p[k]).trim() !== "");
    if (!items.length) continue;
    html += `<section class="detail-section"><h3>${esc(group.title)}</h3><dl>`;
    for (const k of items) {
      used.add(k);
      html += `<div class="field"><dt>${esc(k)}</dt><dd>${linkify(p[k])}</dd></div>`;
    }
    html += `</dl></section>`;
  }
  const other = Object.keys(p).filter(k => !used.has(k) && String(p[k]).trim() !== "").slice(0, 120);
  if (other.length) {
    html += `<section class="detail-section"><h3>Other fields</h3><dl>`;
    for (const k of other) html += `<div class="field"><dt>${esc(k)}</dt><dd>${linkify(p[k])}</dd></div>`;
    html += `</dl></section>`;
  }
  html += `</div>`;
  detailPanel.innerHTML = html;
}

document.getElementById("clearFilters").addEventListener("click", () => {
  searchInput.value = ""; habitFilter.value = ""; waterFilter.value = ""; lightFilter.value = ""; bloomFilter.value = ""; renderTable();
});
[searchInput, habitFilter, waterFilter, lightFilter, bloomFilter].forEach(el => el.addEventListener("input", renderTable));
renderStats();
renderTable();
if (plants[0]) { selectedId = plants[0].Plant_ID || get(plants[0], fields.sci); renderDetail(plants[0]); renderTable(); }
