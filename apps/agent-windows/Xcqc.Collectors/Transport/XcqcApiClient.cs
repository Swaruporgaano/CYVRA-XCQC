using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Runtime.Versioning;
using System.Text;
using System.Text.Json;

namespace Xcqc.Collectors.Transport;

[SupportedOSPlatform("windows")]
public sealed class XcqcApiClient : IDisposable
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false,
    };

    private readonly HttpClient _http;
    private readonly string _baseUrl;

    public XcqcApiClient(string baseUrl, string? ingestToken)
    {
        _baseUrl = baseUrl.TrimEnd('/');
        _http = new HttpClient { Timeout = TimeSpan.FromSeconds(60) };
        _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        if (!string.IsNullOrWhiteSpace(ingestToken))
        {
            _http.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", ingestToken);
        }
    }

    public async Task<bool> HealthAsync(CancellationToken ct = default)
    {
        using var res = await _http.GetAsync($"{_baseUrl}/health", ct);
        return res.IsSuccessStatusCode;
    }

    public async Task<CreateSessionResponse> CreateSessionAsync(
        object body,
        CancellationToken ct = default)
    {
        using var res = await _http.PostAsJsonAsync($"{_baseUrl}/sessions", body, JsonOptions, ct);
        var text = await res.Content.ReadAsStringAsync(ct);
        if (!res.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"CreateSession failed ({(int)res.StatusCode}): {text}");
        }
        var parsed = JsonSerializer.Deserialize<CreateSessionResponse>(text, JsonOptions);
        return parsed ?? throw new InvalidOperationException("CreateSession returned empty body");
    }

    public async Task PostEventAsync(
        string sessionId,
        object body,
        CancellationToken ct = default)
    {
        using var res = await _http.PostAsJsonAsync(
            $"{_baseUrl}/sessions/{sessionId}/events",
            body,
            JsonOptions,
            ct);
        if (!res.IsSuccessStatusCode)
        {
            var text = await res.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"PostEvent failed ({(int)res.StatusCode}): {text}");
        }
    }

    public async Task<FinalizeSessionResponse> FinalizeAsync(
        string sessionId,
        ReportPayload payload,
        CancellationToken ct = default)
    {
        var body = new { payload };
        using var res = await _http.PostAsJsonAsync(
            $"{_baseUrl}/sessions/{sessionId}/finalize",
            body,
            JsonOptions,
            ct);
        var text = await res.Content.ReadAsStringAsync(ct);
        if (!res.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Finalize failed ({(int)res.StatusCode}): {text}");
        }
        var parsed = JsonSerializer.Deserialize<FinalizeSessionResponse>(text, JsonOptions);
        return parsed ?? throw new InvalidOperationException("Finalize returned empty body");
    }

    public static async Task SaveLocalAsync(ReportPayload payload, string path, CancellationToken ct = default)
    {
        var dir = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(dir))
        {
            Directory.CreateDirectory(dir);
        }
        var json = JsonSerializer.Serialize(payload, JsonOptions);
        await File.WriteAllTextAsync(path, json, Encoding.UTF8, ct);
    }

    public void Dispose() => _http.Dispose();
}
