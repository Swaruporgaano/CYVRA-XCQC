import { useEffect } from "react";
import { Link } from "react-router-dom";
import "./landing.css";

const LOGO = "/brand/cyvoriq-logo.png";

const NAV_LINKS = [
  ["#top", "Home"],
  ["#how-it-works", "How It Works"],
  ["#devices", "Devices"],
  ["#what-we-check", "What We Check"],
  ["#reports", "Reports"],
  ["#enterprise", "For Business"],
  ["#faq", "FAQ"],
] as const;

const FLOW_STEPS = [
  ["CHECK", "Collect relevant device and system information."],
  ["ANALYZE", "Evaluate health, condition and performance indicators."],
  ["SCORE", "Translate results into understandable health indicators."],
  ["REPORT", "Generate a structured device health report."],
  ["DECIDE", "Support maintenance, upgrade, deployment, resale or lifecycle decisions."],
] as const;

const DEVICES = [
  ["💻", "Laptop", "Personal, Professional & Business Laptops", "Assess hardware, performance, battery, storage, display, connectivity and system condition."],
  ["🖥️", "Desktop", "Workstations, Office PCs & Desktop Systems", "Understand configuration, performance, storage, memory, system stability and connected hardware."],
  ["📱", "Mobile", "Smartphones & Mobile Computing Devices", "Assess battery, display, touch, storage, cameras, sensors, connectivity and performance."],
  ["📲", "Tablet", "Consumer, Education & Enterprise Tablets", "Evaluate display, touch, battery, storage, cameras, connectivity, sensors and performance."],
  ["🗄️", "Server", "Servers & Critical Computing Infrastructure", "Assess system information, resource utilization, storage, configuration and hardware status."],
  ["🌐", "IoT", "Connected Devices & Edge Technology", "Support assessment of hardware, connectivity, configuration and operational indicators."],
  ["🏢", "Enterprise", "Manage Device Health at Scale", "Create a consistent approach to device assessment across corporate endpoints and technology assets."],
] as const;

const CATEGORIES = [
  ["01", "Hardware Health", "Understand available information about the physical and system components of a supported device."],
  ["02", "Performance Health", "Understand how the system is performing against the assessment parameters supported by the device."],
  ["03", "Battery & Power", "For devices with supported battery diagnostics: condition, capacity, charging status and power behaviour."],
  ["04", "Storage Health", "Understand storage configuration and available health indicators including capacity and performance."],
  ["05", "Display & Input", "For supported devices: display, touch response, keyboard, touchpad, camera, microphone and speakers."],
  ["06", "Connectivity", "Assess supported connectivity capabilities: Wi-Fi, Bluetooth, mobile, USB and network adapters."],
  ["07", "System & Software", "Understand the operating environment: OS, configuration, drivers, updates and stability."],
  ["08", "Security Indicators", "Surface supported security and configuration indicators relevant to device assessment — not a full cybersecurity product."],
] as const;

const SUBSCORES = [
  ["Hardware", 96],
  ["Performance", 91],
  ["Battery", 84],
  ["Storage", 95],
  ["Connectivity", 97],
  ["System", 93],
] as const;

const HOW_STEPS = [
  ["Register", "Create your DevicePulse account."],
  ["Verify", "Complete applicable account and identity verification requirements."],
  ["Select Your Device", "Choose the appropriate DevicePulse experience for your device type."],
  ["Download / Access", "Access the applicable DevicePulse application or enterprise deployment package."],
  ["Run Assessment", "DevicePulse collects permitted technical information and performs supported diagnostics."],
  ["Analyze", "The platform organizes results into health and condition categories."],
  ["Review", "See health scores, findings, warnings and device information."],
  ["Generate Report", "Create a structured DevicePulse report for your records or operational workflow."],
] as const;

const LIFECYCLE = [
  ["USE", "Device is actively deployed."],
  ["CHECK", "DevicePulse assesses its condition."],
  ["ANALYZE", "Health indicators are reviewed."],
  ["SERVICE", "Maintenance or repair decisions considered."],
  ["REDEPLOY", "Suitable devices return to productive use."],
  ["RESALE", "Assessment supports resale processes."],
  ["REFURBISH", "Condition data supports refurbishment."],
  ["RETIRE", "End-of-life assets enter disposal workflow."],
] as const;

const BENEFITS = [
  ["One Platform", "Multiple device categories under one product architecture."],
  ["Structured Assessment", "Organized around clear device health categories."],
  ["Understandable Results", "Complex technical information presented in a simpler form."],
  ["Traceable Reports", "Maintain assessment history and reports."],
  ["Built for Scale", "Designed for individuals, businesses and enterprise environments."],
  ["Lifecycle Ready", "Created with repair, reuse, resale, refurbishment and ITAD workflows in mind."],
] as const;

const AUDIENCES = [
  ["Individuals", "Check a device before buying, selling, upgrading or troubleshooting."],
  ["Businesses", "Understand the condition of deployed technology assets."],
  ["IT Teams", "Standardize assessment across supported enterprise devices."],
  ["Refurbishers", "Create consistent device condition assessments."],
  ["ITAD Companies", "Support asset processing with structured device assessment."],
  ["Resellers & Marketplaces", "Provide better device-condition information for downstream processes."],
  ["Service Providers", "Use assessment results to support service decisions."],
] as const;

const FAQS = [
  ["What is DevicePulse?", "DevicePulse is a device health and intelligence platform designed to assess supported laptops, desktops, mobiles, tablets, servers, IoT devices and enterprise technology assets."],
  ["What devices does DevicePulse support?", "DevicePulse is designed as a multi-device platform covering personal computing, mobile devices, servers, IoT and enterprise environments, with exact capabilities depending on device type and deployment."],
  ["What does DevicePulse check?", "DevicePulse organizes supported diagnostics and device information into areas such as hardware, performance, battery, storage, connectivity, system configuration and other applicable indicators."],
  ["Does DevicePulse repair my device?", "No. DevicePulse is primarily an assessment and reporting platform. It can help identify areas that may require further investigation or service."],
  ["Can I generate a device report?", "Yes, subject to the capabilities of your DevicePulse version and account."],
  ["Is DevicePulse for companies?", "Yes. DevicePulse is designed with both individual and enterprise use cases in mind."],
  ["Why is KYC required?", "KYC may be required for particular services, workflows or access levels. The specific requirement is explained during registration."],
  ["Can DevicePulse support ITAD and refurbishment?", "Its device assessment capabilities are intended to support device lifecycle workflows such as service, reuse, resale, refurbishment and IT asset processing."],
] as const;

const FOOTER_COLS = [
  ["Product", ["Laptop", "Desktop", "Mobile", "Tablet", "Server", "IoT", "Enterprise"]],
  ["Platform", ["How It Works", "What We Check", "Device Health Score", "Device Reports", "User Zone"]],
  ["Business", ["Enterprise", "IT Teams", "Refurbishers", "ITAD", "Partners"]],
  ["Company", ["About CYVORIQ Solutions", "Contact", "Careers"]],
  ["Legal", ["Privacy Policy", "Terms of Use", "Data Policy", "Cookie Policy"]],
  ["Support", ["Help Centre", "Contact Support"]],
] as const;

function ScoreRing() {
  return (
    <div className="dp-score-visual">
      <div className="dp-score-ring">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="414 553"
            transform="rotate(-90 100 100)"
          />
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2b8cff" />
              <stop offset="100%" stopColor="#1a6fd4" />
            </linearGradient>
          </defs>
        </svg>
        <div className="dp-score-center">
          <span className="dp-score-label">Device Health</span>
          <div className="dp-score-value">
            92<small>/100</small>
          </div>
        </div>
      </div>
      <div className="dp-score-chips">
        {["Hardware", "Performance", "Battery", "Storage", "Connectivity", "System", "Security"].map((c) => (
          <span key={c} className="dp-chip">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function LandingJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "CYVORIQ Solutions Pvt Ltd.",
        url: "https://cyvoriq.com",
      },
      {
        "@type": "SoftwareApplication",
        name: "DevicePulse",
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Windows, Android, iOS",
        description:
          "Device health and diagnostics platform for laptops, desktops, mobiles, tablets, servers, IoT and enterprise assets.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      },
      {
        "@type": "WebSite",
        name: "DevicePulse",
        url: "https://devicepulse.cyvoriq.com",
      },
    ],
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export function LandingPage() {
  useEffect(() => {
    document.title = "DevicePulse | Device Health & Diagnostics Platform";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "Assess laptop, desktop, mobile, tablet, server, IoT and enterprise device health with structured reports.",
      );
    }
    return () => {
      document.title = "DevicePulse";
    };
  }, []);

  return (
    <div className="dp-landing" id="top">
      <LandingJsonLd />

      <header className="dp-header">
        <div className="dp-header-inner">
          <a href="#top" className="dp-logo-link">
            <img src={LOGO} alt="CYVORIQ" width={36} height={36} />
            <span className="dp-logo-text">
              Device<span>Pulse</span>
            </span>
          </a>
          <nav className="dp-nav" aria-label="Main">
            {NAV_LINKS.map(([href, label]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="dp-header-ctas">
            <Link to="/account/login" className="dp-btn dp-btn-ghost">
              Login
            </Link>
            <Link to="/account/register" className="dp-btn dp-btn-primary dp-btn-get">
              Get DevicePulse
            </Link>
          </div>
        </div>
      </header>

      <section className="dp-hero">
        <div className="dp-hero-inner">
          <div>
            <p className="dp-hero-tagline">Know. Check. Understand. Trust Your Device.</p>
            <h1>Know the Health of Every Device.</h1>
            <p className="dp-hero-lede">
              DevicePulse is a device health and intelligence platform that assesses laptops, desktops,
              mobiles, tablets, servers, IoT devices and enterprise technology assets—helping you
              understand device condition, performance and readiness.
            </p>
            <div className="dp-hero-ctas">
              <Link to="/account/register" className="dp-btn dp-btn-primary dp-btn-get">
                Get DevicePulse
              </Link>
              <a href="#how-it-works" className="dp-btn dp-btn-outline-light">
                See How It Works
              </a>
            </div>
            <p className="dp-hero-trust">Powered by CYVORIQ Solutions Pvt Ltd.</p>
          </div>
          <ScoreRing />
        </div>
      </section>

      <section className="dp-section">
        <div className="dp-section-inner">
          <h2>One Platform. Every Device. Clearer Decisions.</h2>
          <p className="dp-section-lede">
            Devices are becoming more complex, distributed and valuable. DevicePulse brings device
            assessment into one structured platform.
          </p>
          <div className="dp-flow">
            {FLOW_STEPS.map(([title, desc]) => (
              <div key={title} className="dp-flow-step">
                <strong>{title}</strong>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dp-section dp-section-alt" id="devices">
        <div className="dp-section-inner">
          <h2>Supported Device Ecosystem</h2>
          <p className="dp-section-lede">
            Built for the devices you use—and the infrastructure you manage.
          </p>
          <div className="dp-device-grid">
            {DEVICES.map(([icon, name, subtitle, desc]) => (
              <article key={name} className="dp-device-card">
                <div className="dp-device-icon" aria-hidden="true">
                  {icon}
                </div>
                <h3>{name}</h3>
                <p>
                  <strong>{subtitle}</strong>
                  <br />
                  {desc}
                </p>
                <a href="#devices">Explore {name} Assessment →</a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="dp-section" id="what-we-check">
        <div className="dp-section-inner">
          <h2>What Does DevicePulse Check?</h2>
          <p className="dp-section-lede">More than a basic device test — organized into meaningful health categories.</p>
          <div className="dp-cat-grid">
            {CATEGORIES.map(([num, title, desc]) => (
              <div key={num} className="dp-cat-card">
                <div className="dp-cat-num">{num}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dp-section dp-section-alt" id="health-score">
        <div className="dp-section-inner">
          <h2>Device Health Score</h2>
          <p className="dp-section-lede">
            Turn complex device data into one clear view — with transparent methodology, not an unexplained AI score.
          </p>
          <div className="dp-score-panel">
            <div className="dp-score-big">
              <div className="dp-score-label">Device Health</div>
              <div className="dp-score-value">
                92<small>/100</small>
              </div>
              <div className="dp-score-verdict">Recommended for Continued Use</div>
            </div>
            <div className="dp-subscores">
              {SUBSCORES.map(([label, value]) => (
                <div key={label} className="dp-subscore">
                  <span>{label}</span>
                  <div className="dp-subscore-bar">
                    <div className="dp-subscore-fill" style={{ width: `${value}%` }} />
                  </div>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="dp-section">
        <div className="dp-section-inner">
          <h2>Findings That Matter</h2>
          <p className="dp-section-lede">Don&apos;t just show data. Explain what it means.</p>
          <div className="dp-findings">
            <div className="dp-finding">
              <div className="dp-finding-icon">✅</div>
              <h4>Healthy</h4>
              <p>The assessed component is operating within the defined assessment criteria.</p>
            </div>
            <div className="dp-finding">
              <div className="dp-finding-icon">⚠️</div>
              <h4>Attention</h4>
              <p>An indicator requires monitoring or further review.</p>
            </div>
            <div className="dp-finding">
              <div className="dp-finding-icon">🔴</div>
              <h4>Warning</h4>
              <p>A potentially significant issue has been detected and should be investigated.</p>
            </div>
            <div className="dp-finding">
              <div className="dp-finding-icon">ℹ️</div>
              <h4>Information</h4>
              <p>The parameter was assessed and recorded for reference.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="dp-section dp-section-alt" id="how-it-works">
        <div className="dp-section-inner">
          <h2>How DevicePulse Works</h2>
          <p className="dp-section-lede">From device detection to device intelligence.</p>
          <div className="dp-steps">
            {HOW_STEPS.map(([title, desc]) => (
              <div key={title} className="dp-step">
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dp-section" id="reports">
        <div className="dp-section-inner">
          <h2>DevicePulse Report</h2>
          <p className="dp-section-lede">A device report you can actually understand.</p>
          <div className="dp-report-preview">
            <h3>Sample Report</h3>
            <div className="dp-report-row">
              <span>Manufacturer</span>
              <span>Dell</span>
            </div>
            <div className="dp-report-row">
              <span>Model</span>
              <span>Latitude 5540</span>
            </div>
            <div className="dp-report-row">
              <span>Operating System</span>
              <span>Windows 11</span>
            </div>
            <div className="dp-report-row">
              <span>Overall Assessment</span>
              <span>
                <strong>92 / 100</strong>
              </span>
            </div>
            <div className="dp-report-row">
              <span>Key Findings</span>
              <span>✓ Hardware · ✓ Performance · ⚠ Battery · ✓ Storage</span>
            </div>
            <div className="dp-report-row">
              <span>Recommended Action</span>
              <span>Continue using / Monitor battery</span>
            </div>
          </div>
        </div>
      </section>

      <section className="dp-section dp-section-alt" id="enterprise">
        <div className="dp-section-inner">
          <h2>DevicePulse for Enterprise</h2>
          <p className="dp-section-lede">Device intelligence for IT teams — from individual diagnostics to enterprise assessment.</p>
          <div className="dp-benefit-grid">
            {[
              ["Device Inventory", "Understand what devices are being assessed."],
              ["Standardized Assessment", "Apply a consistent assessment framework."],
              ["Health Visibility", "View device health indicators across supported assets."],
              ["Reports", "Generate structured assessment reports."],
              ["Lifecycle Support", "Support repair, refresh, redeployment, resale, refurbishment and retirement."],
              ["API & Integration", "Future integrations with ITAM, ITAD, service and lifecycle systems."],
            ].map(([title, desc]) => (
              <div key={title} className="dp-benefit">
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dp-section">
        <div className="dp-section-inner">
          <h2>From Device Health to Device Lifecycle</h2>
          <p className="dp-section-lede">
            DevicePulse helps create the intelligence layer between device condition and lifecycle decisions.
          </p>
          <div className="dp-lifecycle">
            {LIFECYCLE.map(([title, desc], i) => (
              <span key={title} style={{ display: "contents" }}>
                {i > 0 && <span className="dp-lifecycle-arrow" aria-hidden="true">→</span>}
                <div className="dp-lifecycle-item">
                  <strong>{title}</strong>
                  <span>{desc}</span>
                </div>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="dp-section dp-section-alt">
        <div className="dp-section-inner">
          <h2>Why DevicePulse?</h2>
          <p className="dp-section-lede">Built to make device assessment simpler.</p>
          <div className="dp-benefit-grid">
            {BENEFITS.map(([title, desc]) => (
              <div key={title} className="dp-benefit">
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dp-section">
        <div className="dp-section-inner">
          <h2>Who Is DevicePulse For?</h2>
          <p className="dp-section-lede">For everyone who needs to know the condition of a device.</p>
          <div className="dp-audience-grid">
            {AUDIENCES.map(([title, desc]) => (
              <div key={title} className="dp-audience">
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dp-section dp-section-alt">
        <div className="dp-section-inner">
          <h2>Your Device. Your Information. Your Control.</h2>
          <p className="dp-section-lede">Privacy-first positioning with honest, transparent communication.</p>
          <div className="dp-benefit-grid">
            {[
              ["What we collect", "Information necessary for the stated assessment and account functions."],
              ["Why we collect it", "To provide device assessment, reporting and related services."],
              ["What you can control", "Account information, consent preferences and applicable data controls."],
              ["What we don't promise", "DevicePulse never makes blanket claims such as '100% secure' or 'cannot be hacked.'"],
            ].map(([title, desc]) => (
              <div key={title} className="dp-benefit">
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dp-section" id="faq">
        <div className="dp-section-inner">
          <h2>Frequently Asked Questions</h2>
          <div className="dp-faq">
            {FAQS.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="dp-cta-band">
        <h2>Know Your Device Before You Decide Its Future.</h2>
        <p>Assess. Understand. Report. Act.</p>
        <div className="dp-hero-ctas">
          <Link to="/account/register" className="dp-btn dp-btn-primary dp-btn-get">
            Get DevicePulse
          </Link>
          <Link to="/account/login" className="dp-btn dp-btn-outline-light">
            Login
          </Link>
        </div>
        <p className="dp-hero-trust">Powered by CYVORIQ Solutions Pvt Ltd.</p>
      </section>

      <footer className="dp-footer">
        <div className="dp-footer-inner">
          <div className="dp-footer-brand">
            <img src={LOGO} alt="CYVORIQ" width={32} height={32} />
            <span>DevicePulse</span>
          </div>
          <div className="dp-footer-grid">
            {FOOTER_COLS.map(([title, links]) => (
              <div key={title} className="dp-footer-col">
                <h4>{title}</h4>
                {links.map((link) => (
                  <a key={link} href="#top">
                    {link}
                  </a>
                ))}
              </div>
            ))}
          </div>
          <div className="dp-footer-bottom">
            <span>© {new Date().getFullYear()} CYVORIQ Solutions Pvt Ltd.</span>
            <Link to="/app" style={{ color: "inherit" }}>
              Operator console
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
