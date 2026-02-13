const statusEl = document.getElementById("status");
const btn = document.getElementById("reconcile");

function setStatus(text) {
  statusEl.textContent = text;
}

btn.addEventListener("click", async () => {
  setStatus("Running…");
  try {
    const res = await chrome.runtime.sendMessage({ type: "PINACROSS_RECONCILE" });
    if (res && res.ok) setStatus("Done.");
    else setStatus("Failed: " + (res && res.error ? res.error : "unknown"));
  } catch (e) {
    setStatus("Failed: " + String(e));
  }
  setTimeout(() => setStatus(""), 3000);
});
