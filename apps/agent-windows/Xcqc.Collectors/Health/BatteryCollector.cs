using System.Runtime.Versioning;

namespace Xcqc.Collectors.Health;

[SupportedOSPlatform("windows")]
public static class BatteryCollector
{
    public static BatteryHealth Collect(Action<string, int>? progress = null)
    {
        progress?.Invoke("battery_probe", 10);
        var health = new BatteryHealth { Present = false, Status = "Unknown" };

        var hasBattery = false;
        try
        {
            foreach (var o in WmiHelper.Query("SELECT Name, Chemistry, EstimatedChargeRemaining FROM Win32_Battery"))
            {
                hasBattery = true;
                health.Present = true;
                health.Chemistry = WmiHelper.Str(o, "Chemistry");
                health.EstimatedChargeRemaining = WmiHelper.Int(o, "EstimatedChargeRemaining");
                break;
            }
        }
        catch (Exception ex)
        {
            health.Notes.Add($"Win32_Battery: {ex.Message}");
        }

        if (!hasBattery)
        {
            health.Status = "NotPresent";
            progress?.Invoke("battery_done", 100);
            return health;
        }

        progress?.Invoke("battery_wmi_depth", 40);
        CollectWmiBatteryClass(health);

        progress?.Invoke("battery_wear", 80);
        if (health.DesignCapacityMwh is > 0 && health.FullChargeCapacityMwh is > 0)
        {
            var wear = (1.0 - (double)health.FullChargeCapacityMwh.Value / health.DesignCapacityMwh.Value) * 100.0;
            health.WearPercent = Math.Round(Math.Clamp(wear, 0, 100), 1);
            health.Status = health.WearPercent switch
            {
                <= 20 => "Ok",
                <= 40 => "Fair",
                _ => "Degraded",
            };
        }
        else if (health.Status == "Unknown")
        {
            health.Status = "Partial";
            health.Notes.Add("Design/full-charge capacity unavailable — wear % unknown.");
        }

        progress?.Invoke("battery_done", 100);
        return health;
    }

    private static void CollectWmiBatteryClass(BatteryHealth health)
    {
        try
        {
            foreach (var o in WmiHelper.Query(
                         "SELECT DesignedCapacity, FullChargedCapacity, CycleCount FROM BatteryStaticData",
                         @"root\wmi"))
            {
                health.DesignCapacityMwh = WmiHelper.Int(o, "DesignedCapacity");
                break;
            }
        }
        catch (Exception ex)
        {
            health.Notes.Add($"BatteryStaticData: {ex.Message}");
        }

        try
        {
            foreach (var o in WmiHelper.Query(
                         "SELECT FullChargedCapacity FROM BatteryFullChargedCapacity",
                         @"root\wmi"))
            {
                health.FullChargeCapacityMwh = WmiHelper.Int(o, "FullChargedCapacity");
                break;
            }
        }
        catch (Exception ex)
        {
            health.Notes.Add($"BatteryFullChargedCapacity: {ex.Message}");
        }

        if (health.FullChargeCapacityMwh is null)
        {
            try
            {
                foreach (var o in WmiHelper.Query(
                             "SELECT RemainingCapacity, DesignedCapacity FROM BatteryStatus",
                             @"root\wmi"))
                {
                    health.FullChargeCapacityMwh ??= WmiHelper.Int(o, "RemainingCapacity");
                    health.DesignCapacityMwh ??= WmiHelper.Int(o, "DesignedCapacity");
                    break;
                }
            }
            catch (Exception ex)
            {
                health.Notes.Add($"BatteryStatus: {ex.Message}");
            }
        }

        try
        {
            foreach (var o in WmiHelper.Query(
                         "SELECT CycleCount FROM BatteryCycleCount",
                         @"root\wmi"))
            {
                health.CycleCount = WmiHelper.Int(o, "CycleCount");
                break;
            }
        }
        catch (Exception ex)
        {
            health.Notes.Add($"BatteryCycleCount: {ex.Message}");
        }
    }
}
