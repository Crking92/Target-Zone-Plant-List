// Basic plant list download button.
// This reads the dashboard's existing window.PLANT_DATA and makes a simple CSV.

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
      return BASIC_COLUMNS.map(col => {
        return csvEscape(getValue(row, col.keys));
      }).join(",");
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

  function connectButton() {
    const button = document.getElementById("downloadBasicPlantList");

    if (!button) {
      console.warn("Download button not found. Check index.html for id='downloadBasicPlantList'.");
      return;
    }

    button.addEventListener("click", downloadBasicList);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", connectButton);
  } else {
    connectButton();
  }
})();
