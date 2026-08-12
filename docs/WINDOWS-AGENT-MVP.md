# Windows Agent MVP — Wave A+B

Real WMI inventory + health agent for **CYVRA XCQC**. Collectors are dumb; API stores truth.

## Prerequisites (you / lab PC)

| Item | Required? |
|------|-----------|
| Windows 10/11 physical laptop (preferred) | **Yes** for hardware-proven results |
| .NET 8 SDK | **Yes** to build |
| Run as Administrator | Recommended — **required for Full** Wave B SMART depth |
| API running (`npm run dev:api`) | Yes for upload path; or use `--offline` |
| Code signing cert | Later (Wave E) |
| Neon | **No** for Wave A |
| Cloudflare Pages | **No** for Wave A |

## Build

```powershell
cd "e:\swarup new\Cyvoriq\CYVRA XCQC\apps\agent-windows"
dotnet restore
dotnet build Xcqc.Agent.sln -c Release
```

Publish single-file (optional):

```powershell
dotnet publish Xcqc.Agent\Xcqc.Agent.csproj -c Release -r win-x64 --self-contained true /p:PublishSingleFile=true -o .\publish
```

## Run (elevated)

1. Start API in another terminal (repo root):

```powershell
cd "e:\swarup new\Cyvoriq\CYVRA XCQC"
copy .env.example .env
npm install
npm run dev:api
```

2. Open **Admin PowerShell**, then:

```powershell
cd "e:\swarup new\Cyvoriq\CYVRA XCQC\apps\agent-windows"
$env:XCQC_INGEST_TOKEN = "dev-ingest-token"
dotnet run --project Xcqc.Agent -c Release -- --api http://127.0.0.1:8080 --token $env:XCQC_INGEST_TOKEN
```

3. Verify:

```powershell
curl http://127.0.0.1:8080/sessions
```

Offline collect (no API):

```powershell
dotnet run --project Xcqc.Agent -- --offline --out .\evidence
```

## Wave A collectors (DOCX)

- Win32_ComputerSystem / BIOS / BaseBoard / SystemEnclosure
- Win32_Processor / PhysicalMemory (incl. serials)
- Win32_DiskDrive / LogicalDisk
- OS build; TPM present/version (best-effort); Secure Boot best-effort
- Pre-flight: elevation, WMI, network, free storage, VM heuristic

## Wave B collectors (health)

Modules: `battery`, `smart`, `security` (each emits `module.started` / `module.progress` / `module.finished`).

| Area | Sources | Notes |
|------|---------|-------|
| Battery | `Win32_Battery`, `root\wmi` BatteryStaticData / BatteryFullChargedCapacity / BatteryCycleCount | Wear % when design + full-charge capacity available; `Unknown` when desktop or OEM blocks WMI |
| SMART | `MSStorageDriver_FailurePredictStatus`, `MSFT_StorageReliabilityCounter` | Admin path; `Partial` + `SMART_PARTIAL` when not elevated |
| TPM / Secure Boot | `Win32_Tpm`, `Win32_SecureBoot`, `DMS_SecureBoot` | Best-effort; null → partial completeness |
| BitLocker | `Win32_EncryptableVolume` | Per-volume protection/conversion status |

**Completeness:** `blocked` (WMI fail), `partial` (no admin, network, VM suspect, or incomplete health), `full` (elevated + complete health signals).

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 2 | Pre-flight blocked (WMI) |
| 3 | API unreachable / session create failed |
| 4 | Inventory module failed (Wave B modules log failed but run continues) |
| 5 | Finalize failed (local JSON kept under `evidence/`) |

## Electron UI (after Wave A)

Wave A is **native .NET**. Next operator UX is Electron under `apps/agent-windows/electron` — it only **spawns** `Xcqc.Agent.exe` (no Electron-only WMI).

```powershell
cd apps\agent-windows\electron
npm install
npm start
```

## Next after Wave B on your laptop

1. Confirm `health` section in evidence JSON (battery wear, SMART, BitLocker).
2. Use Electron shell for operator preflight/progress.
3. Deploy API to Render or run in Codespace — see `docs/CODESPACE-RUN.md`.
4. Create **Neon** when you need durable baselines for Wave C — `docs/NEON-SETUP.md`.
