using System.Collections.Concurrent;
using System.Reflection;
using System.Runtime.Versioning;
using System.Security.Cryptography;
using System.Text;
using Xcqc.Collectors.Health;
using Xcqc.Collectors.Inventory;
using Xcqc.Collectors.Preflight;
using Xcqc.Collectors.Transport;

namespace Xcqc.Collectors;

[SupportedOSPlatform("windows")]
public sealed class OrchestratorOptions
{
    public string ApiBaseUrl { get; set; } = "http://127.0.0.1:8080";
    public string? IngestToken { get; set; }
    public string? OrgId { get; set; } = "lab-org";
    public string? OperatorId { get; set; } = "lab-operator";
    public string? OutDir { get; set; }
    public bool OfflineOnly { get; set; }
}

[SupportedOSPlatform("windows")]
public static class XcqcOrchestrator
{
    public const string AgentVersion = "0.2.0-waveB";

    public static Task<int> RunAsync(OrchestratorOptions opt, CancellationToken ct = default) =>
        RunWaveABAsync(opt, ct);

    public static async Task<int> RunWaveABAsync(OrchestratorOptions opt, CancellationToken ct = default)
    {
        Console.WriteLine("=== CYVRA XCQC Windows Agent — Wave A+B ===");
        Console.WriteLine($"AgentVersion={AgentVersion}");
        Console.WriteLine($"API={opt.ApiBaseUrl} OfflineOnly={opt.OfflineOnly}");

        var elevated = PreflightRunner.IsElevated();
        var (checks, missing, canContinue) = PreflightRunner.Run();
        Console.WriteLine("-- Pre-flight --");
        foreach (var c in checks)
        {
            var mark = c.Passed ? "PASS" : "FAIL";
            Console.WriteLine($"  [{mark}/{c.Severity}] {c.Label}: {c.Detail}");
        }

        if (!canContinue)
        {
            Console.Error.WriteLine("Pre-flight blocked (WMI unavailable). Aborting.");
            return 2;
        }

        string sessionId;
        XcqcApiClient? client = null;

        if (!opt.OfflineOnly)
        {
            client = new XcqcApiClient(opt.ApiBaseUrl, opt.IngestToken);
            try
            {
                if (!await client.HealthAsync(ct))
                {
                    Console.Error.WriteLine("API /health not OK. Use --offline to collect locally only.");
                    client.Dispose();
                    return 3;
                }

                var created = await client.CreateSessionAsync(new
                {
                    orgId = opt.OrgId,
                    operatorId = opt.OperatorId,
                    profile = "unknown",
                    platform = "windows",
                    agentVersion = AgentVersion,
                    deviceHint = Environment.MachineName,
                }, ct);
                sessionId = created.SessionId;
                Console.WriteLine($"Session created: {sessionId}");

                await client.PostEventAsync(sessionId, new
                {
                    type = "preflight.completed",
                    message = "Wave A+B pre-flight completed",
                    data = new
                    {
                        checkCount = checks.Count,
                        missingCount = missing.Count,
                        elevated,
                    },
                }, ct);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"API session create failed: {ex.Message}");
                Console.Error.WriteLine("Tip: start API locally or pass --offline");
                client.Dispose();
                return 3;
            }
        }
        else
        {
            sessionId = Guid.NewGuid().ToString();
            Console.WriteLine($"Offline session id: {sessionId}");
        }

        var modules = new List<ModuleResult>();

        var invRun = await RunModuleAsync(
            client, sessionId, "inventory", "A", ct,
            onCollect: q =>
            {
                var inv = InventoryCollector.Collect((step, pct) =>
                {
                    Console.WriteLine($"  inventory:{step} {pct}%");
                    q.Enqueue((step, pct));
                });
                return (
                    inv,
                    $"Collected RAM={inv.RamModules.Count} disks={inv.Disks.Count}",
                    new[] { "baseboardSerial", "chassisSerial", "ramSerials", "diskSerials", "tpm" });
            });
        modules.Add(invRun.Module);
        if (invRun.Failed)
        {
            client?.Dispose();
            return invRun.ExitCode;
        }
        var inventory = invRun.Data!;

        var profile = InventoryCollector.InferProfile(inventory);

        var batRun = await RunModuleAsync(
            client, sessionId, "battery", "B", ct,
            onCollect: q =>
            {
                var battery = BatteryCollector.Collect((step, pct) =>
                {
                    Console.WriteLine($"  battery:{step} {pct}%");
                    q.Enqueue((step, pct));
                });
                var msg = battery.Present == true
                    ? $"Battery wear={battery.WearPercent?.ToString() ?? "Unknown"}% cycles={battery.CycleCount?.ToString() ?? "Unknown"}"
                    : "No battery (desktop or absent)";
                return (battery, msg, new[] { "batteryWear", "batteryCycles", "batteryCapacity" });
            });
        modules.Add(batRun.Module);
        var batteryHealth = batRun.Data;

        var smartRun = await RunModuleAsync(
            client, sessionId, "smart", "B", ct,
            onCollect: q =>
            {
                var smart = SmartCollector.Collect(inventory.Disks, elevated, (step, pct) =>
                {
                    Console.WriteLine($"  smart:{step} {pct}%");
                    q.Enqueue((step, pct));
                });
                var warn = smart.Count(s => s.PredictFailure == true);
                var msg = $"SMART disks={smart.Count} predictFailure={warn} elevated={elevated}";
                return (smart, msg, new[] { "smartPredictFailure", "storageReliability" });
            });
        modules.Add(smartRun.Module);
        var smartHealth = smartRun.Data ?? [];

        var secRun = await RunModuleAsync(
            client, sessionId, "security", "B", ct,
            onCollect: q =>
            {
                var security = SecurityCollector.Collect((step, pct) =>
                {
                    Console.WriteLine($"  security:{step} {pct}%");
                    q.Enqueue((step, pct));
                });
                var bl = security.BitLockerVolumes.Count(v => v.ProtectionStatus == 1);
                var msg =
                    $"TPM={security.TpmPresent} SecureBoot={security.SecureBootEnabled} BitLockerProtected={bl}";
                return (security, msg, new[] { "tpm", "secureBoot", "bitlocker" });
            });
        modules.Add(secRun.Module);
        var securityHealth = secRun.Data;

        if (securityHealth?.TpmPresent is not null)
        {
            inventory.TpmPresent = securityHealth.TpmPresent;
            inventory.TpmSpecVersion = securityHealth.TpmSpecVersion ?? inventory.TpmSpecVersion;
        }
        if (securityHealth?.SecureBootEnabled is not null)
        {
            inventory.SecureBootEnabled = securityHealth.SecureBootEnabled;
        }

        var health = new HealthSection
        {
            Battery = batteryHealth,
            Smart = smartHealth,
            Security = securityHealth,
        };

        var completeness = ComputeCompleteness(missing, elevated, profile, batteryHealth, smartHealth, securityHealth, modules);

        var reportId = Guid.NewGuid().ToString();
        var payload = new ReportPayload
        {
            SchemaVersion = "1.0.0",
            ReportId = reportId,
            SessionId = sessionId,
            OrgId = opt.OrgId,
            OperatorId = opt.OperatorId,
            Profile = profile,
            Platform = "windows",
            AgentVersion = AgentVersion,
            CollectedAt = DateTime.UtcNow.ToString("o"),
            Timezone = TimeZoneInfo.Local.Id,
            Completeness = completeness,
            MissingPrerequisites = missing,
            Preflight = checks,
            Modules = modules,
            Inventory = inventory,
            Health = health,
            CompositionDiffs = [],
            Authenticity = [],
            AgentBinaryHash = TryHashSelf(),
            RawNotes = "Wave A inventory + Wave B health (battery, SMART, security/BitLocker).",
        };
        payload.PayloadSha256 = ComputePayloadHash(payload);

        var outDir = opt.OutDir ?? Path.Combine(Directory.GetCurrentDirectory(), "evidence");
        Directory.CreateDirectory(outDir);
        var localPath = Path.Combine(outDir, $"{reportId}.json");
        await XcqcApiClient.SaveLocalAsync(payload, localPath, ct);
        Console.WriteLine($"Local evidence: {localPath}");

        if (client is not null)
        {
            try
            {
                var fin = await client.FinalizeAsync(sessionId, payload, ct);
                Console.WriteLine($"Finalized: status={fin.Status} cert={fin.CertificateId} report={fin.ReportId}");
                Console.WriteLine(fin.Message);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Finalize failed (local evidence kept): {ex.Message}");
                client.Dispose();
                return 5;
            }
            client.Dispose();
        }
        else
        {
            Console.WriteLine("Offline mode — skipped API finalize.");
        }

        Console.WriteLine($"Done. Profile={profile} Completeness={completeness}");
        Console.WriteLine($"Manufacturer={inventory.Manufacturer} Model={inventory.Model}");
        Console.WriteLine($"BoardSerial={inventory.BaseboardSerial} ChassisSerial={inventory.ChassisSerial}");
        if (batteryHealth?.WearPercent is not null)
        {
            Console.WriteLine($"Battery wear={batteryHealth.WearPercent}% cycles={batteryHealth.CycleCount}");
        }

        return invRun.Failed ? invRun.ExitCode : 0;
    }

    private sealed class ModuleRun<T>
    {
        public ModuleResult Module { get; init; } = new();
        public T? Data { get; init; }
        public bool Failed { get; init; }
        public int ExitCode { get; init; }
    }

    private static async Task<ModuleRun<T>> RunModuleAsync<T>(
        XcqcApiClient? client,
        string sessionId,
        string moduleId,
        string wave,
        CancellationToken ct,
        Func<ConcurrentQueue<(string Step, int Pct)>, (T Data, string Message, string[] Keys)> onCollect)
    {
        var module = new ModuleResult
        {
            ModuleId = moduleId,
            Wave = wave,
            Status = "running",
            StartedAt = DateTime.UtcNow.ToString("o"),
        };

        if (client is not null)
        {
            await client.PostEventAsync(sessionId, new
            {
                type = "module.started",
                moduleId,
                percent = 0,
                message = $"Module {moduleId} started",
            }, ct);
        }

        var progressQueue = new ConcurrentQueue<(string Step, int Pct)>();

        try
        {
            var (data, message, keys) = onCollect(progressQueue);
            await FlushProgressAsync(client, sessionId, moduleId, progressQueue, ct);

            module.Status = "ok";
            module.FinishedAt = DateTime.UtcNow.ToString("o");
            module.Message = message;
            module.EvidenceKeys = [.. keys];

            if (client is not null)
            {
                await client.PostEventAsync(sessionId, new
                {
                    type = "module.finished",
                    moduleId,
                    percent = 100,
                    message,
                }, ct);
            }

            return new ModuleRun<T> { Module = module, Data = data, Failed = false, ExitCode = 0 };
        }
        catch (Exception ex)
        {
            await FlushProgressAsync(client, sessionId, moduleId, progressQueue, ct);
            module.Status = "failed";
            module.FinishedAt = DateTime.UtcNow.ToString("o");
            module.Message = ex.Message;
            Console.Error.WriteLine($"{moduleId} failed: {ex}");

            if (client is not null)
            {
                await client.PostEventAsync(sessionId, new
                {
                    type = "module.failed",
                    moduleId,
                    message = ex.Message,
                }, ct);
            }

            return new ModuleRun<T> { Module = module, Failed = true, ExitCode = 4 };
        }
    }

    private static async Task FlushProgressAsync(
        XcqcApiClient? client,
        string sessionId,
        string moduleId,
        ConcurrentQueue<(string Step, int Pct)> queue,
        CancellationToken ct)
    {
        if (client is null) return;
        while (queue.TryDequeue(out var p))
        {
            try
            {
                await client.PostEventAsync(sessionId, new
                {
                    type = "module.progress",
                    moduleId,
                    percent = p.Pct,
                    message = p.Step,
                }, ct);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  (progress upload warn: {ex.Message})");
            }
        }
    }

    private static string ComputeCompleteness(
        List<MissingPrerequisite> missing,
        bool elevated,
        string profile,
        BatteryHealth? battery,
        List<SmartDiskHealth> smart,
        SecurityHealth? security,
        List<ModuleResult> modules)
    {
        if (missing.Any(m => m.Code is "WMI_UNAVAILABLE"))
        {
            return "blocked";
        }

        var partial = !elevated ||
                      missing.Any(m => m.Code is "NOT_ELEVATED" or "NETWORK_UNAVAILABLE" or "VM_SUSPECT");

        if (profile is "laptop" && battery?.Present == true &&
            battery.WearPercent is null && battery.DesignCapacityMwh is null)
        {
            partial = true;
            if (!missing.Any(m => m.Code == "BATTERY_PARTIAL"))
            {
                missing.Add(new MissingPrerequisite
                {
                    Code = "BATTERY_PARTIAL",
                    Message = "Laptop battery present but deep capacity/cycle data unavailable.",
                });
            }
        }

        if (smart.Any(s => s.PartialData == true || s.HealthStatus is "Partial" or "Unknown"))
        {
            partial = true;
            if (!missing.Any(m => m.Code == "SMART_PARTIAL"))
            {
                missing.Add(new MissingPrerequisite
                {
                    Code = "SMART_PARTIAL",
                    Message = "SMART / storage reliability counters incomplete (elevation or driver support).",
                });
            }
        }

        if (security?.TpmPresent is null || security.SecureBootEnabled is null)
        {
            partial = true;
        }

        if (modules.Any(m => m.Status is "failed" or "warn"))
        {
            partial = true;
        }

        return partial ? "partial" : "full";
    }

    private static string? TryHashSelf()
    {
        try
        {
            var path = Environment.ProcessPath ?? Assembly.GetExecutingAssembly().Location;
            if (string.IsNullOrEmpty(path) || !File.Exists(path)) return null;
            using var stream = File.OpenRead(path);
            return Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
        }
        catch
        {
            return null;
        }
    }

    private static string ComputePayloadHash(ReportPayload payload)
    {
        var smartCount = payload.Health?.Smart?.Count ?? 0;
        var material =
            $"{payload.ReportId}|{payload.SessionId}|{payload.CollectedAt}|{payload.Inventory.BaseboardSerial}|{payload.Inventory.ChassisSerial}|{payload.Inventory.RamModules.Count}|{payload.Inventory.Disks.Count}|{smartCount}|{payload.Health?.Battery?.WearPercent}";
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(material))).ToLowerInvariant();
    }
}

/** Back-compat alias for Wave A entry points. */
[SupportedOSPlatform("windows")]
public static class WaveAOrchestrator
{
    public const string AgentVersion = XcqcOrchestrator.AgentVersion;
    public static Task<int> RunAsync(OrchestratorOptions opt, CancellationToken ct = default) =>
        XcqcOrchestrator.RunAsync(opt, ct);
}
