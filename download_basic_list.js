// Download basic plant list CSV.
// This uses the existing dashboard data from data/processed/plants.js.

(function () {
  function getValue(row, keys) {
    for (const key of keys) {
      const value = row?.[key];
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

  function buildCsv() {
    const plants = Array.isArray(window.PLANT_DATA) ? window.PLANT_DATA : [];

    if (!plants.length) {
      alert("No plant data found. The dashboard data file may not be loaded yet.");
      return "";
    }

    const header = BASIC_COLUMNS.map(col => csvEscape(col.label)).join(",");

    const rows = plants.map(plant => {
      return BASIC_COLUMNS
        .map(col => csvEscape(getValue(plant, col.keys)))
        .join(",");
    });

    return [header, ...rows].join("\r\n");
  }

  function downloadCsv() {
    const csv = buildCsv();
    if (!csv) return;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const today = new Date().toISOString().slice(0, 10);

    const link = document.createElement("a");
    link.href = url;
    link.download = `target_zone_basic_plant_list_${today}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function connectDownloadButton() {
    const button = document.getElementById("downloadBasicPlantList");

    if (!button) {
      console.error("Download button not found. The button id must be downloadBasicPlantList.");
      return;
    }

    button.addEventListener("click", downloadCsv);
    console.log("Download button connected.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", connectDownloadButton);
  } else {
    connectDownloadButton();
  }
})();
