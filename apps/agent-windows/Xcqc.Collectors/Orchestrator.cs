using System.Collections.Concurrent;
using System.Reflection;
using System.Runtime.Versioning;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
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
public static class WaveAOrchestrator
{
    public const string AgentVersion = "0.1.0-waveA";

    public static async Task<int> RunAsync(OrchestratorOptions opt, CancellationToken ct = default)
    {
        Console.WriteLine("=== CYVRA XCQC Windows Agent — Wave A (Inventory) ===");
        Console.WriteLine($"AgentVersion={AgentVersion}");
        Console.WriteLine($"API={opt.ApiBaseUrl} OfflineOnly={opt.OfflineOnly}");

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
                    message = "Wave A pre-flight completed",
                    data = new
                    {
                        checkCount = checks.Count,
                        missingCount = missing.Count,
                        elevated = PreflightRunner.IsElevated(),
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

        var module = new ModuleResult
        {
            ModuleId = "inventory",
            Wave = "A",
            Status = "running",
            StartedAt = DateTime.UtcNow.ToString("o"),
        };

        if (client is not null)
        {
            await client.PostEventAsync(sessionId, new
            {
                type = "module.started",
                moduleId = "inventory",
                percent = 0,
                message = "Wave A inventory started",
            }, ct);
        }

        var progressQueue = new ConcurrentQueue<(string Step, int Pct)>();
        InventorySection inventory;
        try
        {
            inventory = InventoryCollector.Collect((step, pct) =>
            {
                Console.WriteLine($"  inventory:{step} {pct}%");
                progressQueue.Enqueue((step, pct));
            });
        }
        catch (Exception ex)
        {
            module.Status = "failed";
            module.FinishedAt = DateTime.UtcNow.ToString("o");
            module.Message = ex.Message;
            Console.Error.WriteLine($"Inventory failed: {ex}");
            if (client is not null)
            {
                await client.PostEventAsync(sessionId, new
                {
                    type = "module.failed",
                    moduleId = "inventory",
                    message = ex.Message,
                }, ct);
            }
            client?.Dispose();
            return 4;
        }

        if (client is not null)
        {
            while (progressQueue.TryDequeue(out var p))
            {
                try
                {
                    await client.PostEventAsync(sessionId, new
                    {
                        type = "module.progress",
                        moduleId = "inventory",
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

        module.Status = "ok";
        module.FinishedAt = DateTime.UtcNow.ToString("o");
        module.Message = $"Collected RAM={inventory.RamModules.Count} disks={inventory.Disks.Count}";
        module.EvidenceKeys =
        [
            "baseboardSerial", "chassisSerial", "ramSerials", "diskSerials", "tpm",
        ];

        if (client is not null)
        {
            await client.PostEventAsync(sessionId, new
            {
                type = "module.finished",
                moduleId = "inventory",
                percent = 100,
                message = module.Message,
            }, ct);
        }

        var profile = InventoryCollector.InferProfile(inventory);
        var completeness = "full";
        if (missing.Any(m => m.Code is "WMI_UNAVAILABLE"))
        {
            completeness = "blocked";
        }
        else if (!PreflightRunner.IsElevated() ||
                 missing.Any(m => m.Code is "NOT_ELEVATED" or "NETWORK_UNAVAILABLE" or "VM_SUSPECT"))
        {
            completeness = "partial";
        }

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
            Modules = [module],
            Inventory = inventory,
            Health = new { battery = (object?)null, smart = (object?)null },
            CompositionDiffs = [],
            Authenticity = [],
            AgentBinaryHash = TryHashSelf(),
            RawNotes = "Wave A inventory only. Wave B battery/SMART not collected yet.",
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
        return 0;
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
        var material =
            $"{payload.ReportId}|{payload.SessionId}|{payload.CollectedAt}|{payload.Inventory.BaseboardSerial}|{payload.Inventory.ChassisSerial}|{payload.Inventory.RamModules.Count}|{payload.Inventory.Disks.Count}";
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(material))).ToLowerInvariant();
    }
}
