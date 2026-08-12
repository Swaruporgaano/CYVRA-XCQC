# DOCX alignment notes

Source: `CYVRA XCQC — Technical Feasibility & Architecture Document.docx`

## Plan deltas vs freeze (max)

1. **Naming:** DOCX free-stack section proposed **CYVRA Certis**; primary title + freeze → **CYVRA XCQC** / `Xcqc.*` namespaces. Repo stays `CYVRA-XCQC`.
2. **Phase order:** DOCX Phase 1 listed Android + Windows together; freeze + Windows-first section → **Windows Wave A before Android**.
3. **Neon:** DOCX Phase 0 wires Neon early; freeze → **defer Neon** until durability / Wave C baselines needed; memory/file store for ingest MVP.
4. **Cloudflare Pages:** DOCX scaffolds admin early; freeze → host on Pages when live admin UI is in scope (`docs/CLOUDFLARE-PAGES.md`).
5. **Agent naming:** DOCX samples used `Certis.Agent`; implemented as **`Xcqc.Agent` / `Xcqc.Collectors`**.
6. **Protocol:** Follow DOCX live flow `session.create` → `event.progress` → `report.finalize` as REST `/sessions`, `/events`, `/finalize`.
7. **Authenticity:** Ship structured verdicts later (Match / ChangedSinceLastScan / …); Wave A collects serial evidence only.
8. **Privilege modes:** Consumer / Enterprise-MDM / OEM-partner remain product contracts; Wave A labels Partial vs Full via pre-flight.
9. **Honest limit:** Cloud agents cannot validate OEM ACPI without physical Windows — user must run elevated EXE on real hardware.
10. **iOS:** Deferred (DOCX + freeze agree).

## Wave roadmap (Windows)

| Wave | Scope |
|------|--------|
| A | Inventory (this MVP) |
| B | Battery + SMART + event health + BitLocker |
| C | Composition diff vs Neon baselines |
| D | Live/guided + stress |
| E | Signing, service mode, Intune, anti-tamper |
