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


/* --------------------------------------------------------------------------
   Shareable filters and deep links
   Supported URL parameters:
   q=search text
   habit=growth habit (partial matching is allowed)
   water=water requirement (partial matching is allowed)
   light=light requirement (partial matching is allowed)
   bloom=bloom color (partial matching is allowed)
   plant=exact scientific name or common name to open
   -------------------------------------------------------------------------- */

const dashboardUrl = new URL(window.location.href);
let urlSyncTimer = null;

function matchSelectOption(select, requestedValue) {
  const wanted = norm(requestedValue);
  if (!wanted) return "";

  const options = [...select.options].filter(option => option.value);
  const exact = options.find(option => norm(option.value) === wanted);
  if (exact) return exact.value;

  const partial = options.find(option => {
    const optionValue = norm(option.value);
    return optionValue.includes(wanted) || wanted.includes(optionValue);
  });
  return partial ? partial.value : "";
}

function applyUrlFilters() {
  const params = new URLSearchParams(window.location.search);

  searchInput.value = params.get("q") || "";
  habitFilter.value = matchSelectOption(habitFilter, params.get("habit") || "");
  waterFilter.value = matchSelectOption(waterFilter, params.get("water") || "");
  lightFilter.value = matchSelectOption(lightFilter, params.get("light") || "");
  bloomFilter.value = matchSelectOption(bloomFilter, params.get("bloom") || "");
}

function findPlantFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const requestedPlant = norm(params.get("plant") || "");
  if (!requestedPlant) return null;

  return plants.find(plant => {
    const scientific = norm(get(plant, fields.sci));
    const common = norm(get(plant, fields.common));
    const id = norm(plant.Plant_ID || "");
    return scientific === requestedPlant ||
      common === requestedPlant ||
      id === requestedPlant;
  }) || null;
}

function buildShareUrl() {
  const url = new URL(window.location.href);
  const params = new URLSearchParams();

  if (searchInput.value.trim()) params.set("q", searchInput.value.trim());
  if (habitFilter.value) params.set("habit", habitFilter.value);
  if (waterFilter.value) params.set("water", waterFilter.value);
  if (lightFilter.value) params.set("light", lightFilter.value);
  if (bloomFilter.value) params.set("bloom", bloomFilter.value);
  if (selectedId) params.set("plant", selectedId);

  url.search = params.toString();
  url.hash = "";
  return url;
}

function syncUrl() {
  const url = buildShareUrl();
  window.history.replaceState({}, "", url);
}

function scheduleUrlSync() {
  window.clearTimeout(urlSyncTimer);
  urlSyncTimer = window.setTimeout(syncUrl, 180);
}

function addShareButton() {
  const clearButton = document.getElementById("clearFilters");
  if (!clearButton || document.getElementById("shareFilters")) return;

  const shareButton = document.createElement("button");
  shareButton.type = "button";
  shareButton.id = "shareFilters";
  shareButton.textContent = "Copy filtered link";
  shareButton.style.marginLeft = ".5rem";

  shareButton.addEventListener("click", async () => {
    syncUrl();
    const shareUrl = buildShareUrl().toString();
    const originalText = shareButton.textContent;

    try {
      await navigator.clipboard.writeText(shareUrl);
      shareButton.textContent = "Link copied";
    } catch (error) {
      window.prompt("Copy this filtered dashboard link:", shareUrl);
      shareButton.textContent = "Link ready";
    }

    window.setTimeout(() => {
      shareButton.textContent = originalText;
    }, 1800);
  });

  clearButton.insertAdjacentElement("afterend", shareButton);
}

function includesFilter(value, filter) {
  if (!filter) return true;
  return norm(value).includes(norm(filter));
}
function alphaPlantCompare(a, b) {
  const sciA = get(a, fields.sci);
  const sciB = get(b, fields.sci);
  const commonA = get(a, fields.common);
  const commonB = get(b, fields.common);
  return sciA.localeCompare(sciB, undefined, { sensitivity: "base" }) ||
         commonA.localeCompare(commonB, undefined, { sensitivity: "base" });
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
  }).sort(alphaPlantCompare);
}

function refreshFilteredResults() {
  const visiblePlants = filteredPlants();
  const selectedStillVisible = selectedId && visiblePlants.some(plant => {
    const id = plant.Plant_ID || get(plant, fields.sci);
    return id === selectedId;
  });

  if (!selectedStillVisible) {
    const firstPlant = visiblePlants[0] || null;
    selectedId = firstPlant ? (firstPlant.Plant_ID || get(firstPlant, fields.sci)) : null;

    if (firstPlant) {
      renderDetail(firstPlant);
    } else {
      detailPanel.innerHTML = '<p class="empty-detail">No plants match these filters. Try clearing one filter or using a broader search.</p>';
    }
  }

  renderTable();
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
    tr.addEventListener("click", () => { selectedId = id; renderDetail(p); renderTable(); syncUrl(); });
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

function stripHtml(s) {
  const div = document.createElement("div");
  div.innerHTML = String(s || "");
  return div.textContent || div.innerText || "";
}

function firstValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function licenseAllowed(licenseCode) {
  const lic = String(licenseCode || "").toLowerCase();
  if (!lic) return false;
  if (lic.includes("cc-by-nd") || lic.includes("cc-by-nc-nd")) return false;
  return lic === "cc0" ||
         lic === "cc-by" ||
         lic === "cc-by-sa" ||
         lic === "cc-by-nc" ||
         lic === "cc-by-nc-sa";
}

function licenseLabel(licenseCode) {
  const lic = String(licenseCode || "").toLowerCase();
  const labels = {
    "cc0": "CC0",
    "cc-by": "CC BY",
    "cc-by-sa": "CC BY-SA",
    "cc-by-nc": "CC BY-NC",
    "cc-by-nc-sa": "CC BY-NC-SA"
  };
  return labels[lic] || licenseCode || "license listed on source";
}

function iNatSearchUrl(scientificName) {
  const params = new URLSearchParams({
    taxon_name: scientificName,
    photos: "true",
    quality_grade: "research",
    per_page: "12",
    order_by: "observed_on",
    order: "desc"
  });
  return `https://api.inaturalist.org/v1/observations?${params.toString()}`;
}

function observationUrl(obsId) {
  return `https://www.inaturalist.org/observations/${encodeURIComponent(obsId)}`;
}


function pickINatPhotos(data, maxPhotos = 8) {
  const results = data?.results || [];
  const photosOut = [];
  const seen = new Set();

  for (const obs of results) {
    const photos = obs?.photos || [];
    for (const photo of photos) {
      const license = photo.license_code || "";
      if (!licenseAllowed(license)) continue;

      const rawUrl = photo.url || photo.medium_url || photo.original_url || "";
      if (!rawUrl) continue;

      const imageUrl = rawUrl
        .replace("square.", "medium.")
        .replace("small.", "medium.")
        .replace("thumb.", "medium.");

      if (seen.has(imageUrl)) continue;
      seen.add(imageUrl);

      photosOut.push({
        provider: "iNaturalist",
        imageUrl,
        pageUrl: observationUrl(obs.id),
        creator: firstValue(photo.attribution, obs.user?.name, obs.user?.login, "Unknown iNaturalist user"),
        license: licenseLabel(license),
        licenseCode: license,
        taxonName: obs?.taxon?.name || "",
        observedOn: obs?.observed_on || ""
      });

      if (photosOut.length >= maxPhotos) return photosOut;
    }
  }

  return photosOut;
}

function commonsApiUrl(scientificName) {
  const query = `filetype:bitmap "${scientificName}" plant`;
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "12",
    gsrsearch: query,
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "900"
  });
  return `https://commons.wikimedia.org/w/api.php?${params.toString()}`;
}

function pickCommonsPhotos(data, maxPhotos = 8) {
  const pages = Object.values(data?.query?.pages || []);
  const seen = new Set();

  return pages
    .map(page => {
      const info = page.imageinfo?.[0];
      const meta = info?.extmetadata || {};
      return {
        provider: "Wikimedia Commons",
        imageUrl: info?.thumburl || info?.url || "",
        pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || "").replace(/%20/g, "_")}`,
        mime: info?.mime || "",
        creator: stripHtml(meta.Artist?.value || meta.Credit?.value || "Unknown creator"),
        license: stripHtml(meta.LicenseShortName?.value || meta.UsageTerms?.value || "License listed on Commons"),
        licenseUrl: meta.LicenseUrl?.value || ""
      };
    })
    .filter(x => {
      if (!x.imageUrl || !x.mime.startsWith("image/")) return false;
      if (seen.has(x.imageUrl)) return false;
      seen.add(x.imageUrl);
      return true;
    })
    .slice(0, maxPhotos);
}

let plantPhotoRequest = 0;
let plantPhotoGallery = [];
let plantPhotoIndex = 0;
let plantPhotoName = "";
let plantPhotoFallbackUsed = false;

function renderPhotoGallery() {
  const box = document.getElementById("plantPhoto");
  if (!box || !plantPhotoGallery.length) return;

  const photo = plantPhotoGallery[plantPhotoIndex];
  const total = plantPhotoGallery.length;

  const providerNote = plantPhotoFallbackUsed
    ? `<span class="photo-provider-note">No reusable iNaturalist photo was found, so Wikimedia Commons was used.</span>`
    : `<span class="photo-provider-note">Photo source: ${esc(photo.provider)}.</span>`;

  const licenseText = photo.licenseUrl
    ? `<a href="${esc(photo.licenseUrl)}" target="_blank" rel="noreferrer">${esc(photo.license)}</a>`
    : esc(photo.license);

  const controls = total > 1
    ? `<div class="photo-controls">
        <button type="button" class="photo-button" onclick="previousPlantPhoto()" aria-label="Previous plant photo">‹ Previous</button>
        <span class="photo-count">Photo ${plantPhotoIndex + 1} of ${total}</span>
        <button type="button" class="photo-button" onclick="nextPlantPhoto()" aria-label="Next plant photo">Next ›</button>
      </div>`
    : "";

  box.innerHTML = `
    <figure class="plant-photo-figure">
      <img src="${esc(photo.imageUrl)}" alt="Plant photo result for ${esc(plantPhotoName)}" loading="lazy">
      <figcaption>
        ${providerNote}<br>
        Image: ${esc(photo.creator)} via
        <a href="${esc(photo.pageUrl)}" target="_blank" rel="noreferrer">${esc(photo.provider)}</a>.
        License: ${licenseText}.
      </figcaption>
    </figure>
    ${controls}`;
}

function previousPlantPhoto() {
  if (!plantPhotoGallery.length) return;
  plantPhotoIndex = (plantPhotoIndex - 1 + plantPhotoGallery.length) % plantPhotoGallery.length;
  renderPhotoGallery();
}

function nextPlantPhoto() {
  if (!plantPhotoGallery.length) return;
  plantPhotoIndex = (plantPhotoIndex + 1) % plantPhotoGallery.length;
  renderPhotoGallery();
}

window.previousPlantPhoto = previousPlantPhoto;
window.nextPlantPhoto = nextPlantPhoto;

async function loadPlantPhoto(scientificName) {
  const box = document.getElementById("plantPhoto");
  if (!box || !scientificName) return;

  const requestId = ++plantPhotoRequest;
  plantPhotoGallery = [];
  plantPhotoIndex = 0;
  plantPhotoName = scientificName;
  plantPhotoFallbackUsed = false;

  box.innerHTML = `<p class="photo-loading">Looking for reusable iNaturalist photos...</p>`;

  try {
    const iNatResponse = await fetch(iNatSearchUrl(scientificName));
    if (iNatResponse.ok) {
      const iNatData = await iNatResponse.json();
      if (requestId !== plantPhotoRequest) return;
      const iNatPhotos = pickINatPhotos(iNatData, 8);
      if (iNatPhotos.length) {
        plantPhotoGallery = iNatPhotos;
        plantPhotoFallbackUsed = false;
        renderPhotoGallery();
        return;
      }
    }
  } catch (error) {
    // Fall back to Wikimedia Commons below.
  }

  if (requestId !== plantPhotoRequest) return;
  box.innerHTML = `<p class="photo-loading">No reusable iNaturalist photos found. Trying Wikimedia Commons...</p>`;

  try {
    const commonsResponse = await fetch(commonsApiUrl(scientificName));
    if (!commonsResponse.ok) throw new Error(`HTTP ${commonsResponse.status}`);
    const commonsData = await commonsResponse.json();
    if (requestId !== plantPhotoRequest) return;
    const commonsPhotos = pickCommonsPhotos(commonsData, 8);
    if (commonsPhotos.length) {
      plantPhotoGallery = commonsPhotos;
      plantPhotoFallbackUsed = true;
      renderPhotoGallery();
      return;
    }
    box.innerHTML = `<p class="photo-missing">No reusable photo found from iNaturalist or Wikimedia Commons.</p>`;
  } catch (error) {
    if (requestId !== plantPhotoRequest) return;
    box.innerHTML = `<p class="photo-missing">Photo lookup failed. The plant data still works.</p>`;
  }
}



const groups = [
  {
    title: "Core identity",
    keys: [
      "Plant_ID",
      "Scientific Name",
      "Common Name(s)",
      "Family"
    ]
  },
  {
    title: "Growth and landscape traits",
    keys: [
      "Duration",
      "Deciduous/ Evergreen (green in winter)",
      "Growth Habitat",
      "Habit",
      "Sun/Shade Requirements",
      "Light Requirement",
      "Water Req.",
      "Water Use",
      "Avg Height (ft)",
      "Avg Width (ft)",
      "Size Notes",
      "Leaf",
      "Soil Moisture",
      "Soil Description",
      "Conditions Comments"
    ]
  },
  {
    title: "Bloom and wildlife",
    keys: [
      "Bloom Time",
      "Bloom Color",
      "Bloom Notes",
      "Benefit",
      "Use Wildlife",
      "Conspicuous Flowers",
      "Attracts",
      "Larval Host",
      "Value to Beneficial Insects",
      "Butterflies and Moths of North America (BAMONA)"
    ]
  },
  {
    title: "Bird use",
    keys: [
      "Birds Using This Plant",
      "Bird Use Sources"
    ]
  },
  {
    title: "Range and habitat",
    keys: [
      "USA",
      "Native Distribution",
      "Native Habitat",
      "Distribution"
    ]
  },
  {
    title: "Hays County microregion",
    keys: [
      "Microregion Group",
      "Primary Microregion",
      "Secondary Microregions",
      "Fine Habitat Tags",
      "Microregion LBJ Profile URL",
      "USDA Plants URL",
      "FNA Search URL",
      "Wetland Plant List URL",
      "NRCS Web Soil Survey URL",
      "EPA Ecoregions URL",
      "TPWD EMS URL"
    ]
  },
  {
    title: "Propagation",
    keys: [
      "NPSOT Propagation Materials",
      "NPSOT Propagation Instructions",
      "NPSOT Propagation Source URL",
      "NPSOT Propagation References"
    ]
  }
];

function renderDetail(p) {
  const sci = get(p, fields.sci);
  const common = get(p, fields.common);
  const used = new Set();
  let html = `<h2>${esc(sci)}</h2><p class="common">${esc(common)}</p><section class="photo-section" id="plantPhoto"><p class="photo-loading">Photo area loading...</p></section><div class="detail-grid">`;
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
  html += `</div>`;
  detailPanel.innerHTML = html;
  loadPlantPhoto(sci);
}

document.getElementById("clearFilters").addEventListener("click", () => {
  searchInput.value = "";
  habitFilter.value = "";
  waterFilter.value = "";
  lightFilter.value = "";
  bloomFilter.value = "";
  selectedId = null;

  const firstPlant = plants.slice().sort(alphaPlantCompare)[0] || null;
  if (firstPlant) {
    selectedId = firstPlant.Plant_ID || get(firstPlant, fields.sci);
    renderDetail(firstPlant);
  }

  refreshFilteredResults();
  syncUrl();
});

[searchInput, habitFilter, waterFilter, lightFilter, bloomFilter].forEach(element => {
  element.addEventListener("input", () => {
    refreshFilteredResults();
    scheduleUrlSync();
  });
  element.addEventListener("change", () => {
    refreshFilteredResults();
    syncUrl();
  });
});

renderStats();
applyUrlFilters();
addShareButton();

const linkedPlant = findPlantFromUrl();
const firstVisiblePlant = filteredPlants()[0] || plants.slice().sort(alphaPlantCompare)[0] || null;
const initialPlant = linkedPlant || firstVisiblePlant;

if (initialPlant) {
  selectedId = initialPlant.Plant_ID || get(initialPlant, fields.sci);
  renderDetail(initialPlant);
}

renderTable();
syncUrl();
