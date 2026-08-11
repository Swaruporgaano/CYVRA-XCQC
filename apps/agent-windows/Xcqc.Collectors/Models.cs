using System.Text.Json.Serialization;

namespace Xcqc.Collectors;

public sealed class PreflightCheck
{
    public string Id { get; set; } = "";
    public string Label { get; set; } = "";
    public bool Passed { get; set; }
    public string Severity { get; set; } = "info"; // info | warn | block
    public string? Detail { get; set; }
}

public sealed class MissingPrerequisite
{
    public string Code { get; set; } = "";
    public string Message { get; set; } = "";
}

public sealed class RamModule
{
    public long? CapacityBytes { get; set; }
    public int? SpeedMhz { get; set; }
    public string? Manufacturer { get; set; }
    public string? PartNumber { get; set; }
    public string? SerialNumber { get; set; }
    public string? BankLabel { get; set; }
    public string? DeviceLocator { get; set; }
}

public sealed class DiskInventory
{
    public int? Index { get; set; }
    public string? Model { get; set; }
    public string? SerialNumber { get; set; }
    public long? SizeBytes { get; set; }
    public string? InterfaceType { get; set; }
    public string? MediaType { get; set; }
    public int? Partitions { get; set; }
}

public sealed class VolumeInventory
{
    public string? DeviceId { get; set; }
    public int? DriveType { get; set; }
    public string? FileSystem { get; set; }
    public long? SizeBytes { get; set; }
    public long? FreeBytes { get; set; }
    public string? VolumeName { get; set; }
}

public sealed class InventorySection
{
    public string? Manufacturer { get; set; }
    public string? Model { get; set; }
    public string? SystemFamily { get; set; }
    public string? BiosVendor { get; set; }
    public string? BiosVersion { get; set; }
    public string? BiosReleaseDate { get; set; }
    public string? BaseboardManufacturer { get; set; }
    public string? BaseboardProduct { get; set; }
    public string? BaseboardSerial { get; set; }
    public string? ChassisSerial { get; set; }
    public string? ChassisAssetTag { get; set; }
    public string? ChassisType { get; set; }
    public string? CpuName { get; set; }
    public int? CpuCores { get; set; }
    public int? CpuLogicalProcessors { get; set; }
    public string? OsCaption { get; set; }
    public string? OsVersion { get; set; }
    public string? OsBuild { get; set; }
    public string? OsArchitecture { get; set; }
    public long? TotalPhysicalMemoryBytes { get; set; }
    public bool? SecureBootEnabled { get; set; }
    public bool? TpmPresent { get; set; }
    public string? TpmSpecVersion { get; set; }
    public bool? IsElevated { get; set; }
    public bool? IsVirtualMachineSuspect { get; set; }
    public List<RamModule> RamModules { get; set; } = new();
    public List<DiskInventory> Disks { get; set; } = new();
    public List<VolumeInventory> Volumes { get; set; } = new();
}

public sealed class ModuleResult
{
    public string ModuleId { get; set; } = "";
    public string Wave { get; set; } = "A";
    public string Status { get; set; } = "pending";
    public string? StartedAt { get; set; }
    public string? FinishedAt { get; set; }
    public string? Message { get; set; }
    public List<string>? EvidenceKeys { get; set; }
}

public sealed class ReportPayload
{
    public string SchemaVersion { get; set; } = "1.0.0";
    public string ReportId { get; set; } = "";
    public string SessionId { get; set; } = "";
    public string? OrgId { get; set; }
    public string? OperatorId { get; set; }
    public string Profile { get; set; } = "unknown";
    public string Platform { get; set; } = "windows";
    public string AgentVersion { get; set; } = "0.1.0";
    public string CollectedAt { get; set; } = "";
    public string? Timezone { get; set; }
    public string Completeness { get; set; } = "partial";
    public List<MissingPrerequisite> MissingPrerequisites { get; set; } = new();
    public List<PreflightCheck> Preflight { get; set; } = new();
    public List<ModuleResult> Modules { get; set; } = new();
    public InventorySection Inventory { get; set; } = new();
    public object? Health { get; set; }
    public List<object>? CompositionDiffs { get; set; }
    public List<object>? Authenticity { get; set; }
    public string? AgentBinaryHash { get; set; }
    public string? PayloadSha256 { get; set; }
    public string? RawNotes { get; set; }
}

public sealed class CreateSessionResponse
{
    [JsonPropertyName("sessionId")]
    public string SessionId { get; set; } = "";

    [JsonPropertyName("status")]
    public string Status { get; set; } = "";

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = "";

    [JsonPropertyName("ingestTokenRequired")]
    public bool IngestTokenRequired { get; set; }
}

public sealed class FinalizeSessionResponse
{
    [JsonPropertyName("sessionId")]
    public string SessionId { get; set; } = "";

    [JsonPropertyName("status")]
    public string Status { get; set; } = "";

    [JsonPropertyName("completeness")]
    public string Completeness { get; set; } = "";

    [JsonPropertyName("reportId")]
    public string ReportId { get; set; } = "";

    [JsonPropertyName("storedAt")]
    public string StoredAt { get; set; } = "";

    [JsonPropertyName("certificateId")]
    public string? CertificateId { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = "";
}
