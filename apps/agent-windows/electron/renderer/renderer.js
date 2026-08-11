const agentPathEl = document.getElementById("agentPath");
const logEl = document.getElementById("log");
const runBtn = document.getElementById("run");

async function refreshPath() {
  const p = await window.xcqc.agentPath();
  agentPathEl.textContent = p
    ? `Native agent: ${p}`
    : "Native agent not found — build Xcqc.Agent (Release) first.";
  runBtn.disabled = !p;
}

runBtn.addEventListener("click", async () => {
  runBtn.disabled = true;
  logEl.textContent = "Starting native Wave A…\n";
  const result = await window.xcqc.runAgent({
    apiBaseUrl: document.getElementById("api").value.trim(),
    token: document.getElementById("token").value.trim(),
    offline: document.getElementById("offline").checked,
  });
  logEl.textContent = result.log + `\n\nexit=${result.code} ok=${result.ok}`;
  runBtn.disabled = false;
  await refreshPath();
});

refreshPath();
