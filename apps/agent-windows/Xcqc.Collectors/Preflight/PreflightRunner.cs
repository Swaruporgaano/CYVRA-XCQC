using System.Net.NetworkInformation;
using System.Runtime.Versioning;
using System.Security.Principal;

namespace Xcqc.Collectors.Preflight;

[SupportedOSPlatform("windows")]
public static class PreflightRunner
{
    public static (List<PreflightCheck> Checks, List<MissingPrerequisite> Missing, bool CanContinue) Run()
    {
        var checks = new List<PreflightCheck>();
        var missing = new List<MissingPrerequisite>();

        var elevated = IsElevated();
        checks.Add(new PreflightCheck
        {
            Id = "elevation",
            Label = "Administrator elevation",
            Passed = elevated,
            Severity = elevated ? "info" : "warn",
            Detail = elevated
                ? "Running elevated — Full inventory path available for later Wave B SMART/battery depth."
                : "Not elevated. Wave A inventory may still work; Wave B SMART/deep battery will be Partial.",
        });
        if (!elevated)
        {
            missing.Add(new MissingPrerequisite
            {
                Code = "NOT_ELEVATED",
                Message = "Run as Administrator for Full certificate depth (SMART / deep battery / Event Log).",
            });
        }

        var wmiOk = ProbeWmi();
        checks.Add(new PreflightCheck
        {
            Id = "wmi",
            Label = "WMI functional",
            Passed = wmiOk,
            Severity = wmiOk ? "info" : "block",
            Detail = wmiOk ? "WMI query succeeded." : "WMI query failed — inventory certificate blocked.",
        });
        if (!wmiOk)
        {
            missing.Add(new MissingPrerequisite
            {
                Code = "WMI_UNAVAILABLE",
                Message = "Windows Management Instrumentation is not usable.",
            });
        }

        var netOk = NetworkInterface.GetIsNetworkAvailable();
        checks.Add(new PreflightCheck
        {
            Id = "network",
            Label = "Network available",
            Passed = netOk,
            Severity = netOk ? "info" : "warn",
            Detail = netOk
                ? "Network stack reports available."
                : "No network — local evidence only unless connectivity returns before upload.",
        });
        if (!netOk)
        {
            missing.Add(new MissingPrerequisite
            {
                Code = "NETWORK_UNAVAILABLE",
                Message = "Network not available for cloud certificate upload.",
            });
        }

        var freeBytes = GetSystemDriveFreeBytes();
        var storageOk = freeBytes is null || freeBytes >= 1L * 1024 * 1024 * 1024;
        checks.Add(new PreflightCheck
        {
            Id = "storage",
            Label = "Free storage ≥ 1 GB",
            Passed = storageOk,
            Severity = storageOk ? "info" : "warn",
            Detail = freeBytes is null
                ? "Could not read free space."
                : $"Free bytes on system drive: {freeBytes}",
        });

        var vmSuspect = IsLikelyVirtualMachine();
        checks.Add(new PreflightCheck
        {
            Id = "physical_host",
            Label = "Physical host (heuristic)",
            Passed = !vmSuspect,
            Severity = vmSuspect ? "warn" : "info",
            Detail = vmSuspect
                ? "Hypervisor / VM indicators present — trade-in authenticity may be flagged."
                : "No obvious VM indicators from manufacturer/model heuristics.",
        });
        if (vmSuspect)
        {
            missing.Add(new MissingPrerequisite
            {
                Code = "VM_SUSPECT",
                Message = "Device appears virtual; high-value certificates may be blocked by policy later.",
            });
        }

        var canContinue = wmiOk; // DOCX: WMI fail = block inventory certificate
        return (checks, missing, canContinue);
    }

    public static bool IsElevated()
    {
        try
        {
            using var identity = WindowsIdentity.GetCurrent();
            var principal = new WindowsPrincipal(identity);
            return principal.IsInRole(WindowsBuiltInRole.Administrator);
        }
        catch
        {
            return false;
        }
    }

    private static bool ProbeWmi()
    {
        try
        {
            foreach (var _ in WmiHelper.Query("SELECT Caption FROM Win32_OperatingSystem"))
            {
                return true;
            }
            return false;
        }
        catch
        {
            return false;
        }
    }

    private static long? GetSystemDriveFreeBytes()
    {
        try
        {
            var root = Path.GetPathRoot(Environment.SystemDirectory);
            if (string.IsNullOrEmpty(root)) return null;
            var di = new DriveInfo(root);
            return di.AvailableFreeSpace;
        }
        catch
        {
            return null;
        }
    }

    private static bool IsLikelyVirtualMachine()
    {
        try
        {
            foreach (var cs in WmiHelper.Query("SELECT Manufacturer, Model FROM Win32_ComputerSystem"))
            {
                var mfr = (WmiHelper.Str(cs, "Manufacturer") ?? "").ToLowerInvariant();
                var model = (WmiHelper.Str(cs, "Model") ?? "").ToLowerInvariant();
                if (mfr.Contains("vmware") || mfr.Contains("xen") || mfr.Contains("innotek") ||
                    mfr.Contains("qemu") || mfr.Contains("microsoft corporation") && model.Contains("virtual") ||
                    model.Contains("virtualbox") || model.Contains("kvm") || model.Contains("hyper-v"))
                {
                    return true;
                }
            }

            // Hypervisor present bit is not always exposed; keep heuristic light for Wave A.
            return false;
        }
        catch
        {
            return false;
        }
    }
}
