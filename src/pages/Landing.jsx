import { useState, useEffect, useRef } from "react";

// --- Animated counter ---
function AnimCounter({ end, duration = 1800, suffix = "", prefix = "" }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(Math.round(eased * end));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {val}
      {suffix}
    </span>
  );
}

// --- Simulated live feed ---
function LiveFeed() {
  const events = [
    { agent: "claude-code", action: "install", target: "express@4.21.0", type: "TRAINING_RECALL", confidence: 94, risk: "low" },
    { agent: "cursor", action: "install", target: "lodash@4.17.21", type: "TRAINING_RECALL", confidence: 88, risk: "medium", flag: "Consider lodash-es for tree-shaking" },
    { agent: "claude-code", action: "install", target: "jsonwebtoken@9.0.0", type: "TRAINING_RECALL", confidence: 91, risk: "high", flag: "CVE-2024-33663 \u2014 consider jose instead" },
    { agent: "windsurf", action: "search", target: "lightweight pdf nodejs", type: "REACTIVE_SEARCH", confidence: 30, risk: "low" },
    { agent: "cursor", action: "install", target: "pg@8.13.0", type: "CONTEXT_INHERIT", confidence: 99, risk: "low" },
    { agent: "claude-code", action: "install", target: "puppeteer@23.0.0", type: "TRAINING_RECALL", confidence: 85, risk: "medium", flag: "Chrome binary 280MB \u2014 consider playwright for smaller footprint" },
    { agent: "copilot", action: "install", target: "moment@2.30.1", type: "TRAINING_RECALL", confidence: 78, risk: "high", flag: "Deprecated \u2014 agents still recommend due to training weight. Use date-fns." },
    { agent: "claude-code", action: "install", target: "@elastic/elasticsearch@8.15.0", type: "USER_DIRECTED", confidence: 99, risk: "low" },
    { agent: "cursor", action: "install", target: "axios@1.7.0", type: "TRAINING_RECALL", confidence: 82, risk: "medium", flag: "Native fetch available \u2014 0 dependency alternative" },
    { agent: "windsurf", action: "install", target: "bcrypt@5.1.0", type: "SUB_DECISION", confidence: 55, risk: "low" },
  ];

  const [visible, setVisible] = useState([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((prev) => {
        const next = (prev + 1) % events.length;
        setVisible((v) => [events[next], ...v].slice(0, 6));
        return next;
      });
    }, 2200);
    setVisible(events.slice(0, 3));
    return () => clearInterval(timer);
  }, []);

  const riskColors = { low: "#3b8a6e", medium: "#c9893a", high: "#c94a4a" };
  const typeColors = {
    TRAINING_RECALL: "#7c7cf0",
    CONTEXT_INHERIT: "#c9893a",
    REACTIVE_SEARCH: "#c94a4a",
    USER_DIRECTED: "#3b8a6e",
    SUB_DECISION: "#a07cd4",
  };
  const typeLabels = {
    TRAINING_RECALL: "recall",
    CONTEXT_INHERIT: "context",
    REACTIVE_SEARCH: "search",
    USER_DIRECTED: "directed",
    SUB_DECISION: "sub-decision",
  };

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
      {visible.map((evt, i) => (
        <div
          key={`${evt.target}-${i}`}
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            padding: "10px 0",
            borderBottom: "1px solid #1e1e2a",
            opacity: i === 0 ? 1 : 0.5 + (1 - i / visible.length) * 0.5,
            animation: i === 0 ? "fadeSlide 0.4s ease" : "none",
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: riskColors[evt.risk], marginTop: 5, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ color: "#555", fontSize: 10 }}>{evt.agent}</span>
              <span style={{ color: "#888" }}>{evt.action}</span>
              <span style={{ color: "#d4d4d4", fontWeight: 600 }}>{evt.target}</span>
              <span
                style={{
                  fontSize: 9,
                  padding: "1px 6px",
                  borderRadius: 3,
                  background: typeColors[evt.type] + "18",
                  color: typeColors[evt.type],
                  fontWeight: 600,
                }}
              >
                {typeLabels[evt.type]}
              </span>
            </div>
            {evt.flag && (
              <div style={{ fontSize: 11, color: riskColors[evt.risk], marginTop: 4, lineHeight: 1.4 }}>
                \u21b3 {evt.flag}
              </div>
            )}
          </div>
          <div style={{ fontSize: 10, color: "#555", flexShrink: 0, textAlign: "right" }}>
            <div>{evt.confidence}%</div>
            <div style={{ color: riskColors[evt.risk], fontSize: 9 }}>{evt.risk}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Architecture diagram ---
function ArchDiagram() {
  const layers = [
    {
      label: "Your Agent",
      items: ["Claude Code", "Cursor", "Windsurf", "Copilot"],
      color: "#555",
      bg: "#15151f",
    },
    {
      label: "Sightglass SDK",
      items: ["Intercepts tool calls", "Classifies decisions", "Zero-latency passthrough"],
      color: "#c9893a",
      bg: "#1a1812",
    },
    {
      label: "Analysis Engine",
      items: ["Decision chain mapping", "Risk scoring", "Alternative matching", "Confidence estimation"],
      color: "#7c7cf0",
      bg: "#161622",
    },
    {
      label: "Community Intelligence",
      items: ["Aggregated patterns", "Anonymized benchmarks", "Emerging tool signals", "Vulnerability feeds"],
      color: "#3b8a6e",
      bg: "#121a16",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {layers.map((layer, i) => (
        <div key={i}>
          <div
            style={{
              background: layer.bg,
              border: `1px solid ${layer.color}33`,
              borderRadius: 8,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: layer.color, minWidth: 140, textTransform: "uppercase", letterSpacing: 1 }}>
              {layer.label}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {layer.items.map((item, j) => (
                <span key={j} style={{ fontSize: 11, color: "#888", padding: "2px 8px", background: "#ffffff06", borderRadius: 3 }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
          {i < layers.length - 1 && (
            <div style={{ textAlign: "center", color: "#333", fontSize: 14, padding: "2px 0" }}>{"\u2193"}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// --- Pricing concept ---
function PricingCard({ name, price, unit, features, accent, cta, highlighted, href }) {
  return (
    <div
      style={{
        background: highlighted ? "#161622" : "#111118",
        border: `1px solid ${highlighted ? accent + "44" : "#1e1e2a"}`,
        borderRadius: 10,
        padding: "28px 24px",
        flex: 1,
        minWidth: 220,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {highlighted && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent }} />
      )}
      <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
        {name}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 32, fontWeight: 700, color: "#e0e0e0", fontFamily: "'Instrument Serif', Georgia, serif" }}>{price}</span>
        {unit && <span style={{ fontSize: 12, color: "#555" }}>{unit}</span>}
      </div>
      <div style={{ marginTop: 16 }}>
        {features.map((f, i) => (
          <div key={i} style={{ fontSize: 12, color: "#888", lineHeight: 1.6, padding: "3px 0", display: "flex", gap: 8 }}>
            <span style={{ color: accent, flexShrink: 0 }}>{"\u00b7"}</span>
            {f}
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 20,
          padding: "10px 0",
          textAlign: "center",
          fontSize: 12,
          fontWeight: 600,
          color: highlighted ? "#111" : accent,
          background: highlighted ? accent : "transparent",
          border: highlighted ? "none" : `1px solid ${accent}44`,
          borderRadius: 6,
          letterSpacing: 0.5,
          cursor: "pointer",
        }}
      >
        <a href={href || "/register"} style={{ textDecoration: "none", color: "inherit" }}>{cta}</a>
      </div>
    </div>
  );
}

// --- Main ---
export default function Landing() {
  return (
    <div
      style={{
        background: "#0c0c14",
        color: "#d4d4d4",
        minHeight: "100vh",
        fontFamily: "'IBM Plex Sans', 'Helvetica Neue', sans-serif",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap');

        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Nav */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 40px",
          borderBottom: "1px solid #1a1a24",
          position: "sticky",
          top: 0,
          background: "#0c0c14ee",
          backdropFilter: "blur(12px)",
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "linear-gradient(135deg, #c9893a, #7c7cf0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: "#0c0c14",
            }}
          >
            S
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.3 }}>sightglass</span>
          <span style={{ fontSize: 9, padding: "2px 6px", background: "#c9893a22", color: "#c9893a", borderRadius: 3, fontWeight: 600, marginLeft: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
            BETA
          </span>
        </div>
        <div style={{ display: "flex", gap: 28, fontSize: 13, color: "#666" }}>
          <a href="#how-it-works" style={{ cursor: "pointer", textDecoration: "none", color: "inherit" }}>How it works</a>
          <a href="#community" style={{ cursor: "pointer", textDecoration: "none", color: "inherit" }}>Community</a>
          <a href="#pricing" style={{ cursor: "pointer", textDecoration: "none", color: "inherit" }}>Pricing</a>
          <span
            style={{
              padding: "6px 16px",
              background: "#c9893a",
              color: "#0c0c14",
              borderRadius: 5,
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
            }}
           onClick={() => window.location.href="/register"}>
            Get early access
          </span>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "100px 40px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ maxWidth: 720 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#c9893a",
              textTransform: "uppercase",
              letterSpacing: 2,
              marginBottom: 20,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            Agent supply chain intelligence
          </div>
          <h1
            style={{
              fontSize: 52,
              fontWeight: 300,
              lineHeight: 1.12,
              letterSpacing: -1.5,
              color: "#ececec",
              fontFamily: "'Instrument Serif', Georgia, serif",
              marginBottom: 24,
            }}
          >
            Your AI agents make{" "}
            <span
              style={{
                fontStyle: "italic",
                background: "linear-gradient(135deg, #c9893a, #7c7cf0)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              hundreds of dependency decisions
            </span>{" "}
            you never see.
          </h1>
          <p style={{ fontSize: 17, color: "#777", lineHeight: 1.7, maxWidth: 560, fontWeight: 300 }}>
            Sightglass instruments your AI coding agents to capture every tool selection, every dependency install, every
            architectural choice &mdash; then surfaces the risks, biases, and better alternatives they missed.
          </p>

          <div style={{ display: "flex", gap: 12, marginTop: 36 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 20px",
                background: "#161622",
                border: "1px solid #2a2a3a",
                borderRadius: 8,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                color: "#888",
                flex: 1,
                maxWidth: 400,
              }}
            >
              <span style={{ color: "#c9893a" }}>$</span>
              <span>npx sightglass init</span>
            </div>
            <div
              style={{
                padding: "12px 24px",
                background: "#c9893a",
                color: "#0c0c14",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              Install free
            </div>
          </div>

          <div style={{ display: "flex", gap: 24, marginTop: 24, fontSize: 11, color: "#555", fontFamily: "'IBM Plex Mono', monospace" }}>
            <span>Works with Claude Code, Cursor, Windsurf</span>
            <span>{"\u00b7"}</span>
            <span>Zero performance overhead</span>
            <span>{"\u00b7"}</span>
            <span>Your data stays local</span>
          </div>
        </div>
      </section>

      {/* Live feed demo */}
      <section style={{ padding: "0 40px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            background: "#111118",
            border: "1px solid #1e1e2a",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid #1e1e2a",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b8a6e", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#888", fontFamily: "'IBM Plex Mono', monospace" }}>
                LIVE AGENT FEED
              </span>
            </div>
            <span style={{ fontSize: 10, color: "#444", fontFamily: "'IBM Plex Mono', monospace" }}>
              simulated {"\u00b7"} 3 agents connected
            </span>
          </div>
          <div style={{ padding: "8px 20px 16px" }}>
            <LiveFeed />
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section
        style={{
          padding: "40px",
          borderTop: "1px solid #1a1a24",
          borderBottom: "1px solid #1a1a24",
          background: "#0e0e18",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          {[
            { value: <AnimCounter end={73} suffix="%" />, label: "of agent dependency choices are pure training recall", sub: "no alternatives considered" },
            { value: <AnimCounter end={12} suffix="%" />, label: "of auto-installed packages have known vulnerabilities", sub: "agents don't check CVE databases" },
            { value: <AnimCounter end={340} />, label: "average unnecessary dependencies per AI-built project", sub: "compared to human-authored equivalents" },
            { value: <AnimCounter end={0} />, label: "tools exist to audit this today", sub: "until now" },
          ].map((stat, i) => (
            <div key={i} style={{ flex: 1, minWidth: 180, textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#ececec", fontFamily: "'Instrument Serif', Georgia, serif" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 4, lineHeight: 1.5 }}>{stat.label}</div>
              <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Three problems */}
      <section style={{ padding: "80px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#7c7cf0", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace" }}>
          The problem
        </div>
        <h2 style={{ fontSize: 34, fontWeight: 300, color: "#ececec", fontFamily: "'Instrument Serif', Georgia, serif", marginBottom: 48, maxWidth: 600, lineHeight: 1.2 }}>
          AI agents don&rsquo;t choose tools. They <span style={{ fontStyle: "italic" }}>replay</span> whatever was popular when they were trained.
        </h2>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[
            {
              icon: "\u25ce",
              title: "Invisible decisions",
              body: "Your agent installed 47 dependencies in the last session. You reviewed zero of them. Each one is an attack surface, a license obligation, and an architectural commitment made without deliberation.",
              color: "#c94a4a",
            },
            {
              icon: "\u25c7",
              title: "Training data incumbency",
              body: "Agents recommend moment.js because it dominated Stack Overflow in 2020. They choose Puppeteer when Playwright is lighter. They install axios when native fetch works. The training corpus decides, not fitness for purpose.",
              color: "#c9893a",
            },
            {
              icon: "\u25b3",
              title: "Zero supply chain audit",
              body: "SBOMs exist for human-authored code. Nothing exists for AI-generated dependency trees. Your compliance team can't audit what they can't see. Your CISO can't approve what has no trail.",
              color: "#7c7cf0",
            },
          ].map((card, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                minWidth: 260,
                background: "#111118",
                border: `1px solid ${card.color}22`,
                borderRadius: 10,
                padding: 28,
              }}
            >
              <div style={{ fontSize: 24, color: card.color, marginBottom: 14 }}>{card.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#ddd", marginBottom: 10 }}>{card.title}</div>
              <div style={{ fontSize: 13, color: "#777", lineHeight: 1.7 }}>{card.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section style={{ padding: "60px 40px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#c9893a", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace" }}>
          How it works
        </div>
        <h2 style={{ fontSize: 30, fontWeight: 300, color: "#ececec", fontFamily: "'Instrument Serif', Georgia, serif", marginBottom: 36, maxWidth: 500 }}>
          Four layers. Zero latency. Full visibility.
        </h2>
        <ArchDiagram />
        <div style={{ marginTop: 28, padding: 20, background: "#111118", border: "1px solid #1e1e2a", borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#c9893a", marginBottom: 8 }}>Privacy-first by design</div>
          <div style={{ fontSize: 12, color: "#777", lineHeight: 1.7 }}>
            Sightglass runs locally by default. Your code, your dependencies, your decisions &mdash; all analyzed on your machine.
            Community intelligence uses only anonymized, aggregated patterns: &ldquo;70% of projects using Express also install helmet&rdquo; not &ldquo;David&rsquo;s project at Elastic uses Express.&rdquo;
            Opt-in at every level. Air-gapped mode for enterprise.
          </div>
        </div>
      </section>

      {/* Community angle */}
      <section style={{ padding: "60px 40px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#3b8a6e", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace" }}>
          Community intelligence
        </div>
        <h2 style={{ fontSize: 30, fontWeight: 300, color: "#ececec", fontFamily: "'Instrument Serif', Georgia, serif", marginBottom: 20, maxWidth: 600 }}>
          Every install is a signal. Together, we map the agent economy.
        </h2>
        <p style={{ fontSize: 14, color: "#777", lineHeight: 1.7, maxWidth: 560, marginBottom: 36 }}>
          When thousands of developers instrument their agents, we build the first real-time map of how AI
          makes technical decisions. Which tools are rising? Which are being abandoned? Where are agents
          consistently making poor choices? This data doesn&rsquo;t exist anywhere else.
        </p>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            { metric: "Tool velocity", desc: "Which packages are agents adopting or abandoning fastest?", example: "polars \u2191 340% \u00b7 moment.js \u2193 12% per month" },
            { metric: "Decision patterns", desc: "Common decision chains across the community", example: "85% of Express projects: agent adds cors \u2192 helmet \u2192 morgan in that order" },
            { metric: "Alternative signals", desc: "When agents search for alternatives, what do they find?", example: "After puppeteer fails: 60% \u2192 pdfkit, 25% \u2192 pdf-lib, 15% \u2192 other" },
            { metric: "Risk surface", desc: "Aggregate vulnerability exposure from agent decisions", example: "jsonwebtoken CVE affects ~23% of agent-built Node.js APIs" },
          ].map((item, i) => (
            <div key={i} style={{ flex: "1 1 45%", minWidth: 260, background: "#111118", border: "1px solid #1e1e2a", borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#ddd", marginBottom: 6 }}>{item.metric}</div>
              <div style={{ fontSize: 12, color: "#777", marginBottom: 10 }}>{item.desc}</div>
              <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#3b8a6e", padding: "6px 10px", background: "#3b8a6e11", borderRadius: 4 }}>
                {item.example}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Vendor angle */}
      <section style={{ padding: "60px 40px 80px", maxWidth: 1100, margin: "0 auto", borderTop: "1px solid #1a1a24" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#a07cd4", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace" }}>
          For tool vendors
        </div>
        <h2 style={{ fontSize: 30, fontWeight: 300, color: "#ececec", fontFamily: "'Instrument Serif', Georgia, serif", marginBottom: 20, maxWidth: 600 }}>
          The new competitive intelligence.
        </h2>
        <p style={{ fontSize: 14, color: "#777", lineHeight: 1.7, maxWidth: 560, marginBottom: 28 }}>
          How often do agents choose your tool? When do they choose a competitor instead? At which decision
          point are you winning or losing? Sightglass gives tool vendors the data to compete in the agent economy.
        </p>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            { title: "Agent share of choice", desc: "Like market share, but measured at the moment of agent decision, not after human review" },
            { title: "Insertion point analysis", desc: "Know exactly when in the decision chain your tool is considered, chosen, or bypassed" },
            { title: "Competitive displacement", desc: "See which tools displace yours after failures and which tools you displace" },
          ].map((item, i) => (
            <div key={i} style={{ flex: 1, minWidth: 200, padding: "16px 20px", background: "#161622", border: "1px solid #a07cd422", borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#ddd", marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "#777", lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: "60px 40px 80px", maxWidth: 1100, margin: "0 auto", borderTop: "1px solid #1a1a24" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#c9893a", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace" }}>
          Pricing
        </div>
        <h2 style={{ fontSize: 30, fontWeight: 300, color: "#ececec", fontFamily: "'Instrument Serif', Georgia, serif", marginBottom: 40 }}>
          Free to see. Pay to act.
        </h2>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <PricingCard
            name="Developer"
            price="Free"
            unit="forever"
            accent="#3b8a6e"
            cta="Install now" href="/register"
            features={[
              "Full local analysis of all agent decisions",
              "Decision chain visualization",
              "Vulnerability flagging",
              "Contribute anonymous data to community intelligence",
            ]}
          />
          <PricingCard
            name="Team"
            price="$29"
            unit="/seat/mo"
            accent="#c9893a"
            highlighted
            cta="Start trial" href="/register"
            features={[
              "Everything in Developer",
              "Team-wide agent decision dashboard",
              "Policy enforcement (block deprecated packages, require approval)",
              "SBOM generation for AI-authored code",
              "Community intelligence access",
            ]}
          />
          <PricingCard
            name="Vendor"
            price="Custom"
            unit=""
            accent="#7c7cf0"
            cta="Talk to us" href="mailto:email.djhope@gmail.com?subject=Sightglass%20Vendor%20Plan"
            features={[
              "Agent share-of-choice analytics for your tool",
              "Competitive displacement tracking",
              "Insertion point analysis",
              "Promote your tool at decision moments (ethical, transparent, user-controlled)",
            ]}
          />
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: "80px 40px",
          textAlign: "center",
          borderTop: "1px solid #1a1a24",
        }}
      >
        <h2 style={{ fontSize: 36, fontWeight: 300, color: "#ececec", fontFamily: "'Instrument Serif', Georgia, serif", marginBottom: 16 }}>
          Your agents are already deciding.
          <br />
          <span style={{ fontStyle: "italic", color: "#c9893a" }}>Start watching.</span>
        </h2>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 28px",
            background: "#161622",
            border: "1px solid #2a2a3a",
            borderRadius: 8,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 14,
            color: "#888",
            marginTop: 20,
          }}
        >
          <span style={{ color: "#c9893a" }}>$</span>
          npx sightglass init
        </div>
        <div style={{ fontSize: 11, color: "#444", marginTop: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
          Open source {"\u00b7"} Local-first {"\u00b7"} 30 seconds to first insight
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "24px 40px", borderTop: "1px solid #1a1a24", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#444" }}>
        <span>sightglass &mdash; agent supply chain intelligence</span>
        <span>Built by David Hope {"\u00b7"} 2026</span>
      </footer>
    </div>
  );
}
