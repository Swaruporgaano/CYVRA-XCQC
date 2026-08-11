using System.Runtime.Versioning;

namespace Xcqc.Collectors.Health;

[SupportedOSPlatform("windows")]
public static class SecurityCollector
{
    public static SecurityHealth Collect(Action<string, int>? progress = null)
    {
        progress?.Invoke("security_tpm", 20);
        var sec = new SecurityHealth();

        CollectTpm(sec);
        progress?.Invoke("security_secureboot", 50);
        CollectSecureBoot(sec);
        progress?.Invoke("security_bitlocker", 80);
        CollectBitLocker(sec);

        progress?.Invoke("security_done", 100);
        return sec;
    }

    private static void CollectTpm(SecurityHealth sec)
    {
        try
        {
            var any = false;
            foreach (var o in WmiHelper.Query(
                         "SELECT SpecVersion, IsEnabled_InitialValue, IsActivated_InitialValue FROM Win32_Tpm",
                         @"root\cimv2\Security\MicrosoftTpm"))
            {
                any = true;
                sec.TpmPresent = true;
                sec.TpmSpecVersion = WmiHelper.Str(o, "SpecVersion");
                var enabled = WmiHelper.Bool(o, "IsEnabled_InitialValue");
                var activated = WmiHelper.Bool(o, "IsActivated_InitialValue");
                sec.TpmReady = enabled == true && activated == true;
                break;
            }

            if (!any)
            {
                sec.TpmPresent = false;
            }
        }
        catch
        {
            sec.TpmPresent = null;
            sec.TpmSpecVersion = null;
            sec.TpmReady = null;
            sec.Notes.Add("TPM WMI unavailable (elevation or TPM off).");
        }
    }

    private static void CollectSecureBoot(SecurityHealth sec)
    {
        sec.SecureBootEnabled = null;
        try
        {
            foreach (var o in WmiHelper.Query(
                         "SELECT SecureBootEnabled FROM Win32_SecureBoot",
                         @"root\cimv2"))
            {
                sec.SecureBootEnabled = WmiHelper.Bool(o, "SecureBootEnabled");
                return;
            }
        }
        catch
        {
            // fall through to legacy namespace
        }

        try
        {
            foreach (var o in WmiHelper.Query(
                         "SELECT SecureBoot FROM DMS_SecureBoot",
                         @"root\wmi"))
            {
                sec.SecureBootEnabled = WmiHelper.Bool(o, "SecureBoot");
                return;
            }
        }
        catch
        {
            sec.Notes.Add("Secure Boot state unknown (firmware/UEFI WMI not exposed).");
        }
    }

    private static void CollectBitLocker(SecurityHealth sec)
    {
        try
        {
            foreach (var o in WmiHelper.Query(
                         "SELECT DriveLetter, ProtectionStatus, ConversionStatus, EncryptionMethod FROM Win32_EncryptableVolume",
                         @"root\cimv2\Security\MicrosoftVolumeEncryption"))
            {
                var drive = WmiHelper.Str(o, "DriveLetter");
                var protection = WmiHelper.Int(o, "ProtectionStatus");
                var conversion = WmiHelper.Int(o, "ConversionStatus");
                var method = WmiHelper.Int(o, "EncryptionMethod");

                sec.BitLockerVolumes.Add(new BitLockerVolume
                {
                    DriveLetter = drive,
                    ProtectionStatus = protection,
                    ProtectionStatusLabel = ProtectionLabel(protection),
                    ConversionStatus = conversion,
                    ConversionStatusLabel = ConversionLabel(conversion),
                    EncryptionMethod = method?.ToString(),
                });
            }
        }
        catch (Exception ex)
        {
            sec.Notes.Add($"BitLocker WMI: {ex.Message}");
        }
    }

    private static string? ProtectionLabel(int? status) => status switch
    {
        0 => "Unprotected",
        1 => "Protected",
        2 => "Unknown",
        _ => null,
    };

    private static string? ConversionLabel(int? status) => status switch
    {
        0 => "FullyDecrypted",
        1 => "FullyEncrypted",
        2 => "EncryptionInProgress",
        3 => "DecryptionInProgress",
        4 => "EncryptionPaused",
        5 => "DecryptionPaused",
        _ => null,
    };
}
