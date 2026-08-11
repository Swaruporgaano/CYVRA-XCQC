const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

function resolveAgentExe() {
  const envPath = process.env.XCQC_AGENT_EXE;
  if (envPath && fs.existsSync(envPath)) return envPath;

  const candidates = [
    path.join(__dirname, "..", "Xcqc.Agent", "bin", "Release", "net8.0-windows", "Xcqc.Agent.exe"),
    path.join(__dirname, "..", "Xcqc.Agent", "bin", "Debug", "net8.0-windows", "Xcqc.Agent.exe"),
    path.join(__dirname, "..", "publish", "Xcqc.Agent.exe"),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 720,
    title: "CYVRA XCQC Operator",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

ipcMain.handle("agent:path", () => resolveAgentExe());

ipcMain.handle("agent:run", async (_evt, opts = {}) => {
  const exe = resolveAgentExe();
  if (!exe) {
    return {
      ok: false,
      code: -1,
      log: "Xcqc.Agent.exe not found. Build Wave A first: dotnet build apps/agent-windows -c Release",
    };
  }

  const api = opts.apiBaseUrl || process.env.XCQC_API_BASE_URL || "http://127.0.0.1:8080";
  const token = opts.token || process.env.XCQC_INGEST_TOKEN || "dev-ingest-token";
  const args = ["--api", api, "--token", token];
  if (opts.offline) args.push("--offline");

  return await new Promise((resolve) => {
    const child = spawn(exe, args, { windowsHide: true });
    let log = `Spawning: ${exe}\nArgs: ${args.join(" ")}\n\n`;
    child.stdout.on("data", (d) => {
      log += d.toString();
    });
    child.stderr.on("data", (d) => {
      log += d.toString();
    });
    child.on("error", (err) => {
      resolve({ ok: false, code: -1, log: log + String(err) });
    });
    child.on("close", (code) => {
      resolve({ ok: code === 0, code, log });
    });
  });
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
