using System.Runtime.Versioning;
using Xcqc.Collectors;

namespace Xcqc.Agent;

[SupportedOSPlatform("windows")]
public static class Program
{
    public static async Task<int> Main(string[] args)
    {
        var opt = new OrchestratorOptions();

        for (var i = 0; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--api":
                case "-a":
                    opt.ApiBaseUrl = Next(args, ref i);
                    break;
                case "--token":
                case "-t":
                    opt.IngestToken = Next(args, ref i);
                    break;
                case "--org":
                    opt.OrgId = Next(args, ref i);
                    break;
                case "--operator":
                    opt.OperatorId = Next(args, ref i);
                    break;
                case "--out":
                case "-o":
                    opt.OutDir = Next(args, ref i);
                    break;
                case "--offline":
                    opt.OfflineOnly = true;
                    break;
                case "--help":
                case "-h":
                    PrintHelp();
                    return 0;
                default:
                    Console.Error.WriteLine($"Unknown arg: {args[i]}");
                    PrintHelp();
                    return 1;
            }
        }

        // Env overrides when flags omitted
        opt.ApiBaseUrl = Environment.GetEnvironmentVariable("XCQC_API_BASE_URL") ?? opt.ApiBaseUrl;
        opt.IngestToken ??= Environment.GetEnvironmentVariable("XCQC_INGEST_TOKEN");
        opt.OrgId = Environment.GetEnvironmentVariable("XCQC_ORG_ID") ?? opt.OrgId;
        opt.OperatorId = Environment.GetEnvironmentVariable("XCQC_OPERATOR_ID") ?? opt.OperatorId;

        return await WaveAOrchestrator.RunAsync(opt);
    }

    private static string Next(string[] args, ref int i)
    {
        if (i + 1 >= args.Length)
        {
            throw new ArgumentException($"Missing value after {args[i]}");
        }
        return args[++i];
    }

    private static void PrintHelp()
    {
        Console.WriteLine("""
CYVRA XCQC Windows Agent — Wave A inventory

Usage:
  Xcqc.Agent.exe [--api http://127.0.0.1:8080] [--token TOKEN] [--org lab-org] [--operator lab-operator] [--out .\evidence] [--offline]

Run elevated (Run as administrator) for Full-depth path readiness (Wave B SMART/battery).
Wave A inventory often works without elevation but certificates are marked partial.
""");
    }
}
