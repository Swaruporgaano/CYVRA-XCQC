using System.Runtime.Versioning;

namespace Xcqc.Collectors.Health;

[SupportedOSPlatform("windows")]
public static class SmartCollector
{
    public static List<SmartDiskHealth> Collect(
        IReadOnlyList<DiskInventory> disks,
        bool elevated,
        Action<string, int>? progress = null)
    {
        progress?.Invoke("smart_map", 10);
        var results = new List<SmartDiskHealth>();
        var predictMap = elevated ? CollectFailurePredict() : new Dictionary<string, (bool? Predict, string? Reason)>();

        var reliability = CollectStorageReliability();
        var diskCount = Math.Max(disks.Count, 1);
        var idx = 0;

        foreach (var disk in disks)
        {
            idx++;
            var pct = 10 + (int)(80.0 * idx / diskCount);
            progress?.Invoke($"smart_disk_{disk.Index ?? idx}", pct);

            var entry = new SmartDiskHealth
            {
                DiskIndex = disk.Index,
                Model = disk.Model,
                SerialNumber = disk.SerialNumber,
                PartialData = !elevated,
            };

            if (!elevated)
            {
                entry.HealthStatus = "Unknown";
                entry.Notes.Add("Not elevated — SMART failure-predict and deep counters require Administrator.");
            }

            var key = NormalizeKey(disk.SerialNumber) ?? NormalizeKey(disk.Model) ?? $"disk{disk.Index}";
            if (predictMap.TryGetValue(key, out var pred))
            {
                entry.PredictFailure = pred.Predict;
                entry.FailureReason = pred.Reason;
                entry.HealthStatus = pred.Predict == true ? "Warning" : pred.Predict == false ? "Healthy" : "Unknown";
            }

            if (reliability.TryGetValue(key, out var rel))
            {
                entry.PowerOnHours = rel.PowerOnHours;
                entry.WearLevel = rel.Wear;
                entry.Temperature = rel.Temperature;
                entry.PartialData = rel.Partial || entry.PartialData;
                if (entry.HealthStatus is null or "Unknown" && rel.HealthStatus is not null)
                {
                    entry.HealthStatus = rel.HealthStatus;
                }
            }

            entry.HealthStatus ??= elevated ? "Unknown" : "Partial";
            results.Add(entry);
        }

        if (results.Count == 0)
        {
            results.Add(new SmartDiskHealth
            {
                HealthStatus = "Unknown",
                PartialData = !elevated,
                Notes = { disks.Count == 0 ? "No disks in inventory." : "SMART mapping failed." },
            });
        }

        progress?.Invoke("smart_done", 100);
        return results;
    }

    private static Dictionary<string, (bool? Predict, string? Reason)> CollectFailurePredict()
    {
        var map = new Dictionary<string, (bool? Predict, string? Reason)>(StringComparer.OrdinalIgnoreCase);
        try
        {
            foreach (var o in WmiHelper.Query(
                         "SELECT InstanceName, PredictFailure, Reason FROM MSStorageDriver_FailurePredictStatus",
                         @"root\wmi"))
            {
                var instance = WmiHelper.Str(o, "InstanceName") ?? "";
                var key = NormalizeKey(instance) ?? instance;
                map[key] = (WmiHelper.Bool(o, "PredictFailure"), WmiHelper.Str(o, "Reason"));
            }
        }
        catch (Exception)
        {
            // Admin WMI namespace may be blocked
        }

        return map;
    }

    private static Dictionary<string, ReliabilityRow> CollectStorageReliability()
    {
        var map = new Dictionary<string, ReliabilityRow>(StringComparer.OrdinalIgnoreCase);
        try
        {
            foreach (var o in WmiHelper.Query(
                         "SELECT DeviceId, Wear, PowerOnHours, Temperature, Reliability, ReadErrorsTotal, WriteErrorsTotal FROM MSFT_StorageReliabilityCounter",
                         @"root\Microsoft\Windows\Storage"))
            {
                var deviceId = WmiHelper.Str(o, "DeviceId") ?? "";
                var key = NormalizeKey(deviceId) ?? deviceId;
                var reliability = WmiHelper.Long(o, "Reliability");
                map[key] = new ReliabilityRow
                {
                    Wear = WmiHelper.Long(o, "Wear"),
                    PowerOnHours = WmiHelper.Long(o, "PowerOnHours"),
                    Temperature = WmiHelper.Long(o, "Temperature"),
                    HealthStatus = reliability switch
                    {
                        0 => "Healthy",
                        1 => "Warning",
                        2 => "Unhealthy",
                        _ => "Unknown",
                    },
                    Partial = false,
                };
            }
        }
        catch
        {
            // Storage namespace may require Win8+ and permissions
        }

        return map;
    }

    private static string? NormalizeKey(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var s = raw.Trim().ToUpperInvariant();
        s = s.Replace(" ", "").Replace("_", "").Replace("\\", "").Replace(".", "");
        if (s.Length < 4) return null;
        return s;
    }

    private sealed class ReliabilityRow
    {
        public long? Wear { get; init; }
        public long? PowerOnHours { get; init; }
        public long? Temperature { get; init; }
        public string? HealthStatus { get; init; }
        public bool Partial { get; init; }
    }
}
