const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("xcqc", {
  agentPath: () => ipcRenderer.invoke("agent:path"),
  runAgent: (opts) => ipcRenderer.invoke("agent:run", opts),
});
