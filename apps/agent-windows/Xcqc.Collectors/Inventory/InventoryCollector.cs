using System.Runtime.Versioning;

namespace Xcqc.Collectors.Inventory;

[SupportedOSPlatform("windows")]
public static class InventoryCollector
{
    public static InventorySection Collect(Action<string, int>? progress = null)
    {
        var inv = new InventorySection
        {
            IsElevated = Preflight.PreflightRunner.IsElevated(),
        };

        progress?.Invoke("computer_system", 5);
        CollectComputerSystem(inv);

        progress?.Invoke("bios", 15);
        CollectBios(inv);

        progress?.Invoke("baseboard", 25);
        CollectBaseboard(inv);

        progress?.Invoke("chassis", 35);
        CollectChassis(inv);

        progress?.Invoke("cpu", 45);
        CollectCpu(inv);

        progress?.Invoke("os", 55);
        CollectOs(inv);

        progress?.Invoke("ram", 65);
        CollectRam(inv);

        progress?.Invoke("disks", 75);
        CollectDisks(inv);

        progress?.Invoke("volumes", 85);
        CollectVolumes(inv);

        progress?.Invoke("tpm_secureboot", 95);
        CollectTpmAndSecureBoot(inv);

        inv.IsVirtualMachineSuspect = DetectVm(inv);
        progress?.Invoke("inventory_done", 100);
        return inv;
    }

    private static void CollectComputerSystem(InventorySection inv)
    {
        foreach (var o in WmiHelper.Query(
                     "SELECT Manufacturer, Model, SystemFamily, TotalPhysicalMemory FROM Win32_ComputerSystem"))
        {
            inv.Manufacturer = WmiHelper.Str(o, "Manufacturer");
            inv.Model = WmiHelper.Str(o, "Model");
            inv.SystemFamily = WmiHelper.Str(o, "SystemFamily");
            inv.TotalPhysicalMemoryBytes = WmiHelper.Long(o, "TotalPhysicalMemory");
            break;
        }
    }

    private static void CollectBios(InventorySection inv)
    {
        foreach (var o in WmiHelper.Query(
                     "SELECT Manufacturer, SMBIOSBIOSVersion, ReleaseDate FROM Win32_BIOS"))
        {
            inv.BiosVendor = WmiHelper.Str(o, "Manufacturer");
            inv.BiosVersion = WmiHelper.Str(o, "SMBIOSBIOSVersion");
            inv.BiosReleaseDate = WmiHelper.Str(o, "ReleaseDate");
            break;
        }
    }

    private static void CollectBaseboard(InventorySection inv)
    {
        foreach (var o in WmiHelper.Query(
                     "SELECT Manufacturer, Product, SerialNumber FROM Win32_BaseBoard"))
        {
            inv.BaseboardManufacturer = WmiHelper.Str(o, "Manufacturer");
            inv.BaseboardProduct = WmiHelper.Str(o, "Product");
            inv.BaseboardSerial = WmiHelper.Str(o, "SerialNumber");
            break;
        }
    }

    private static void CollectChassis(InventorySection inv)
    {
        foreach (var o in WmiHelper.Query(
                     "SELECT SerialNumber, SMBIOSAssetTag, ChassisTypes FROM Win32_SystemEnclosure"))
        {
            inv.ChassisSerial = WmiHelper.Str(o, "SerialNumber");
            inv.ChassisAssetTag = WmiHelper.Str(o, "SMBIOSAssetTag");
            try
            {
                if (o["ChassisTypes"] is Array arr && arr.Length > 0)
                {
                    inv.ChassisType = Convert.ToString(arr.GetValue(0));
                }
            }
            catch
            {
                // ignore
            }
            break;
        }
    }

    private static void CollectCpu(InventorySection inv)
    {
        foreach (var o in WmiHelper.Query(
                     "SELECT Name, NumberOfCores, NumberOfLogicalProcessors FROM Win32_Processor"))
        {
            inv.CpuName = WmiHelper.Str(o, "Name");
            inv.CpuCores = WmiHelper.Int(o, "NumberOfCores");
            inv.CpuLogicalProcessors = WmiHelper.Int(o, "NumberOfLogicalProcessors");
            break;
        }
    }

    private static void CollectOs(InventorySection inv)
    {
        foreach (var o in WmiHelper.Query(
                     "SELECT Caption, Version, BuildNumber, OSArchitecture FROM Win32_OperatingSystem"))
        {
            inv.OsCaption = WmiHelper.Str(o, "Caption");
            inv.OsVersion = WmiHelper.Str(o, "Version");
            inv.OsBuild = WmiHelper.Str(o, "BuildNumber");
            inv.OsArchitecture = WmiHelper.Str(o, "OSArchitecture");
            break;
        }
    }

    private static void CollectRam(InventorySection inv)
    {
        foreach (var o in WmiHelper.Query(
                     "SELECT Capacity, Speed, Manufacturer, PartNumber, SerialNumber, BankLabel, DeviceLocator FROM Win32_PhysicalMemory"))
        {
            inv.RamModules.Add(new RamModule
            {
                CapacityBytes = WmiHelper.Long(o, "Capacity"),
                SpeedMhz = WmiHelper.Int(o, "Speed"),
                Manufacturer = WmiHelper.Str(o, "Manufacturer"),
                PartNumber = WmiHelper.Str(o, "PartNumber"),
                SerialNumber = WmiHelper.Str(o, "SerialNumber"),
                BankLabel = WmiHelper.Str(o, "BankLabel"),
                DeviceLocator = WmiHelper.Str(o, "DeviceLocator"),
            });
        }
    }

    private static void CollectDisks(InventorySection inv)
    {
        foreach (var o in WmiHelper.Query(
                     "SELECT Index, Model, SerialNumber, Size, InterfaceType, MediaType, Partitions FROM Win32_DiskDrive"))
        {
            inv.Disks.Add(new DiskInventory
            {
                Index = WmiHelper.Int(o, "Index"),
                Model = WmiHelper.Str(o, "Model"),
                SerialNumber = WmiHelper.Str(o, "SerialNumber"),
                SizeBytes = WmiHelper.Long(o, "Size"),
                InterfaceType = WmiHelper.Str(o, "InterfaceType"),
                MediaType = WmiHelper.Str(o, "MediaType"),
                Partitions = WmiHelper.Int(o, "Partitions"),
            });
        }
    }

    private static void CollectVolumes(InventorySection inv)
    {
        foreach (var o in WmiHelper.Query(
                     "SELECT DeviceID, DriveType, FileSystem, Size, FreeSpace, VolumeName FROM Win32_LogicalDisk"))
        {
            inv.Volumes.Add(new VolumeInventory
            {
                DeviceId = WmiHelper.Str(o, "DeviceID"),
                DriveType = WmiHelper.Int(o, "DriveType"),
                FileSystem = WmiHelper.Str(o, "FileSystem"),
                SizeBytes = WmiHelper.Long(o, "Size"),
                FreeBytes = WmiHelper.Long(o, "FreeSpace"),
                VolumeName = WmiHelper.Str(o, "VolumeName"),
            });
        }
    }

    private static void CollectTpmAndSecureBoot(InventorySection inv)
    {
        // Best-effort Secure Boot (often needs elevation / UEFI). Unknown is OK for Wave A.
        inv.SecureBootEnabled = null;
        try
        {
            foreach (var o in WmiHelper.Query(
                         "SELECT SecureBoot FROM DMS_SecureBoot",
                         @"root\wmi"))
            {
                inv.SecureBootEnabled = WmiHelper.Bool(o, "SecureBoot");
                break;
            }
        }
        catch
        {
            // leave null
        }

        try
        {
            var any = false;
            foreach (var o in WmiHelper.Query(
                         "SELECT SpecVersion FROM Win32_Tpm",
                         @"root\cimv2\Security\MicrosoftTpm"))
            {
                any = true;
                inv.TpmPresent = true;
                inv.TpmSpecVersion = WmiHelper.Str(o, "SpecVersion");
                break;
            }
            if (!any)
            {
                inv.TpmPresent = false;
            }
        }
        catch
        {
            // Class may require elevation / TPM service
            inv.TpmPresent = null;
            inv.TpmSpecVersion = null;
        }
    }

    private static bool DetectVm(InventorySection inv)
    {
        var blob = $"{inv.Manufacturer} {inv.Model} {inv.BiosVendor}".ToLowerInvariant();
        return blob.Contains("vmware")
               || blob.Contains("virtualbox")
               || blob.Contains("qemu")
               || blob.Contains("hyper-v")
               || blob.Contains("xen")
               || (blob.Contains("microsoft") && blob.Contains("virtual"));
    }

    public static string InferProfile(InventorySection inv)
    {
        // ChassisTypes common: 3 Desktop, 4 Low Profile Desktop, 6 Mini Tower, 7 Tower,
        // 8 Portable, 9 Laptop, 10 Notebook, 11 Hand Held, 14 Sub Notebook, 30 Tablet, 31 Convertible
        if (int.TryParse(inv.ChassisType, out var t))
        {
            if (t is 8 or 9 or 10 or 14 or 30 or 31 or 32) return "laptop";
            if (t is 3 or 4 or 5 or 6 or 7 or 15 or 16) return "desktop";
            if (t is 17 or 23) return "server";
        }

        // Battery presence heuristic for Wave A (full battery module is Wave B)
        try
        {
            foreach (var _ in WmiHelper.Query("SELECT Name FROM Win32_Battery"))
            {
                return "laptop";
            }
        }
        catch
        {
            // ignore
        }

        return "desktop";
    }
}
