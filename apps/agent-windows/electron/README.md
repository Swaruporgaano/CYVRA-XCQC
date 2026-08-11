# Electron operator shell (AFTER Wave A)

This UI **does not** collect hardware diagnostics in Chromium.

It spawns the native `Xcqc.Agent.exe` (WMI collectors) and streams logs for operators.

## Prerequisites

1. Build Wave A:
   ```powershell
   cd apps\agent-windows
   dotnet build Xcqc.Agent.sln -c Release
   ```
2. API running (`npm run dev:api`) unless using Offline.

## Run

```powershell
cd apps\agent-windows\electron
npm install
npm start
```

Optional: `XCQC_AGENT_EXE` to point at a published EXE.
