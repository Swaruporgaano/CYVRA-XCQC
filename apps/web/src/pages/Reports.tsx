const families = [
  {
    id: "post_production",
    title: "Post Production",
    blurb: "Functional pass/fail, burn-in style stress, BOM/SKU compare.",
  },
  {
    id: "oqc_iqc",
    title: "OQC & IQC",
    blurb: "Station checklists, lot/batch metadata, defect codes.",
  },
  {
    id: "business",
    title: "Business",
    blurb: "Fail rates, trade-in grades, warranty risk, license consumption.",
  },
  {
    id: "compliance",
    title: "Compliance",
    blurb: "Encryption, Secure Boot, TPM, OS policy, identifier completeness.",
  },
] as const;

export function ReportsPage() {
  return (
    <>
      <h1>Reports</h1>
      <p className="lede">Four report families map from the same raw ReportPayload.</p>
      <div className="grid">
        {families.map((f) => (
          <div className="stat" key={f.id}>
            <strong style={{ fontSize: "1.05rem" }}>{f.title}</strong>
            <span>{f.blurb}</span>
          </div>
        ))}
      </div>
      <div className="panel">
        <p>Detailed report modules render after Wave B health + scoring engine land.</p>
      </div>
    </>
  );
}
