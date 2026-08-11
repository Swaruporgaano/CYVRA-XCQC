using System.Management;
using System.Runtime.Versioning;

namespace Xcqc.Collectors;

[SupportedOSPlatform("windows")]
public static class WmiHelper
{
    public static IEnumerable<ManagementObject> Query(string wql, string scope = @"root\cimv2")
    {
        using var searcher = new ManagementObjectSearcher(scope, wql);
        foreach (ManagementObject obj in searcher.Get())
        {
            yield return obj;
        }
    }

    public static string? Str(ManagementBaseObject obj, string property)
    {
        try
        {
            var v = obj[property];
            if (v is null) return null;
            var s = Convert.ToString(v)?.Trim();
            if (string.IsNullOrWhiteSpace(s)) return null;
            if (s.Equals("To be filled by O.E.M.", StringComparison.OrdinalIgnoreCase)) return null;
            if (s.Equals("Default string", StringComparison.OrdinalIgnoreCase)) return null;
            if (s.Equals("None", StringComparison.OrdinalIgnoreCase)) return null;
            return s;
        }
        catch
        {
            return null;
        }
    }

    public static long? Long(ManagementBaseObject obj, string property)
    {
        try
        {
            var v = obj[property];
            if (v is null) return null;
            return Convert.ToInt64(v);
        }
        catch
        {
            return null;
        }
    }

    public static int? Int(ManagementBaseObject obj, string property)
    {
        try
        {
            var v = obj[property];
            if (v is null) return null;
            return Convert.ToInt32(v);
        }
        catch
        {
            return null;
        }
    }

    public static bool? Bool(ManagementBaseObject obj, string property)
    {
        try
        {
            var v = obj[property];
            if (v is null) return null;
            return Convert.ToBoolean(v);
        }
        catch
        {
            return null;
        }
    }
}
