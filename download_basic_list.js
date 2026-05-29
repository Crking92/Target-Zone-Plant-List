// Basic plant list download button.
// This reads the dashboard's existing window.PLANT_DATA and makes a simple CSV.
// No extra spreadsheet is required.

(function () {
  const BASIC_COLUMNS = [
    { label: "Scientific Name", keys: ["Scientific Name", "Plant_ID"] },
    { label: "Common Name(s)", keys: ["Common Name(s)", "Common Name", "Common Names"] },
    { label: "Family", keys: ["Family", "Family Name"] },
    { label: "Growth Habit", keys: ["Growth Habitat", "Habit", "Growth Habit"] },
    { label: "Duration", keys: ["Duration"] },
    { label: "Light Requirement", keys: ["Sun/Shade Requirements", "Light Requirement", "Light Requirements"] },
    { label: "Water Requirement", keys: ["Water Req.", "Water Use", "Water Requirement", "Water Requirements"] },
    { label: "Soil Moisture", keys: ["Soil Moisture"] },
    { label: "Bloom Time", keys: ["Bloom Time"] },
    { label: "Bloom Color", keys: ["Bloom Color", "Bloom Colour"] },
    { label: "Primary Microregion", keys: ["Primary Microregion"] },
    { label: "Microregion Group", keys: ["Microregion Group"] },
    { label: "Fine Habitat Tags", keys: ["Fine Habitat Tags"] },
    { label: "Wildflower Center URL", keys: ["LBJ URL", "Microregion LBJ Profile URL", "LBJ Manual URL"] }
  ];

  function getValue(row, keys) {
    for (const key of keys) {
      const value = row && row[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return String(value).trim();
      }
    }
    return "";
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function buildBasicCsv() {
    const plants = Array.isArray(window.PLANT_DATA) ? window.PLANT_DATA : [];
    const header = BASIC_COLUMNS.map(col => csvEscape(col.label)).join(",");
    const lines = plants.map(row => {
      return BASIC_COLUMNS.map(col => csvEscape(getValue(row, col.keys))).join(",");
    });
    return [header, ...lines].join("\n");
  }

  function downloadBasicList() {
    const csv = buildBasicCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `target_zone_basic_plant_list_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function addButton() {
    if (document.getElementById("downloadBasicPlantList")) return;

    const box = document.createElement("div");
    box.className = "download-box";
    box.innerHTML = `
      <button type="button" id="downloadBasicPlantList" class="download-button">
        Download basic plant list CSV
      </button>
      <p class="download-note">
        Downloads scientific name, common name, family, growth traits, bloom traits, microregion, and source URL.
      </p>
    `;

    const filters = document.querySelector(".filters");
    const header = document.querySelector("header");
    const main = document.querySelector("main");

    if (filters && filters.parentNode) {
      filters.parentNode.insertBefore(box, filters);
    } else if (header && header.parentNode) {
      header.parentNode.insertBefore(box, header.nextSibling);
    } else if (main) {
      main.prepend(box);
    } else {
      document.body.prepend(box);
    }

    document.getElementById("downloadBasicPlantList").addEventListener("click", downloadBasicList);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addButton);
  } else {
    addButton();
  }
})();
