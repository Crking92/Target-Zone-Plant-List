alert("Download script loaded");

document.addEventListener("DOMContentLoaded", function () {
  const button = document.getElementById("downloadBasicPlantList");

  if (!button) {
    alert("Button not found");
    return;
  }

  button.addEventListener("click", function () {
    alert("Button clicked");
  });
});
