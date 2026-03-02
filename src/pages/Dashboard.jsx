import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.jsx";
import useApi from "../hooks/useApi.js";
import CommunityInsights from "../components/CommunityInsights.jsx";
import DefaultStack from "../components/DefaultStack.jsx";
import BuildVsBuy from "../components/BuildVsBuy.jsx";

const navItems = [
  { id: "overview", label: "Overview", icon: "\u25a3" },
  { id: "sessions", label: "Sessions", icon: "\u25ce" },
  { id: "community", label: "Community", icon: "\u25c7" },
  { id: "settings", label: "Settings", icon: "\u2699" },
];

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: "#111118", border: "1px solid #1e1e2a", borderRadius: 10, padding: "20px 22px", flex: 1, minWidth: 180, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 1, fontFamily: "monospace", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: "#ececec", fontFamily: "monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SessionCard({ session, onSelect }) {
  const project = (session.project || "unknown").replace(/^-root-?/, "").replace(/^claudeuser--root-?/, "") || "root";
  const lastDate = session.last_event ? new Date(session.last_event).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
  const duration = session.first_event && session.last_event
    ? Math.round((new Date(session.last_event) - new Date(session.first_event)) / 60000)
    : 0;

  return (
    <div onClick={() => onSelect && onSelect(session)} style={{ background: "#111118", border: "1px solid #1e1e2a", borderRadius: 8, padding: "16px 20px", cursor: "pointer", transition: "border-color 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#2a2a3a"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e1e2a"; }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d4" }}>{project}</span>
        <span style={{ fontSize: 10, color: "#555", fontFamily: "monospace" }}>{lastDate}</span>
        {session.model && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "#7c7cf018", color: "#7c7cf0", fontWeight: 600 }}>{session.model}</span>}
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#666" }}>
        <span><strong style={{ color: "#888" }}>{session.total_entries}</strong> events</span>
        <span><strong style={{ color: "#888" }}>{session.tool_uses}</strong> tool calls</span>
        <span><strong style={{ color: "#888" }}>{session.user_messages}</strong> prompts</span>
        {session.installs > 0 && <span><strong style={{ color: "#c9893a" }}>{session.installs}</strong> installs</span>}
        {duration > 0 && <span style={{ color: "#555" }}>{duration < 60 ? duration + "m" : Math.round(duration / 60) + "h"}</span>}
      </div>
      <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", marginTop: 10, background: "#1a1a24" }}>
        {session.user_messages > 0 && <div style={{ width: (session.user_messages / session.total_entries) * 100 + "%", background: "#3b8a6e", minWidth: 2 }} title="User messages" />}
        {session.tool_uses > 0 && <div style={{ width: (session.tool_uses / session.total_entries) * 100 + "%", background: "#c9893a", minWidth: 2 }} title="Tool calls" />}
        {session.assistant_messages > 0 && <div style={{ width: ((session.assistant_messages - session.tool_uses) / session.total_entries) * 100 + "%", background: "#7c7cf0", minWidth: 2 }} title="Text responses" />}
      </div>
    </div>
  );
}

function SessionDetail({ session, onBack, api }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/ingest/sessions/" + session.session_id).then(function(data) {
      setEntries(data.entries || []);
      setLoading(false);
    }).catch(function() { setLoading(false); });
  }, [session.session_id, api]);

  const project = (session.project || "unknown").replace(/^-root-?/, "").replace(/^claudeuser--root-?/, "") || "root";

  return (
    <div>
      <div onClick={onBack} style={{ fontSize: 12, color: "#7c7cf0", cursor: "pointer", marginBottom: 16 }}>{"\u2190"} Back to sessions</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#ececec", marginBottom: 4 }}>{project}</div>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 20 }}>
        {session.model || "unknown model"} {"\u00b7"} {session.total_entries} events {"\u00b7"} {session.tool_uses} tool calls
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#666" }}>Loading session...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {entries.map(function(entry, i) {
            var isUser = entry.entry_type === "user";
            var isAssistant = entry.entry_type === "assistant";
            var isSystem = entry.entry_type === "system";
            var time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";

            return (
              <div key={entry.id || i} style={{ display: "flex", gap: 10, padding: "6px 12px", background: isUser ? "#0e1a14" : isSystem ? "#1a1418" : "#111118", borderLeft: "2px solid " + (isUser ? "#3b8a6e" : isAssistant ? (entry.is_tool_use ? "#c9893a" : "#7c7cf0") : "#333"), fontSize: 12 }}>
                <span style={{ color: "#555", fontFamily: "monospace", flexShrink: 0, width: 70 }}>{time}</span>
                <span style={{ color: isUser ? "#3b8a6e" : isAssistant ? "#7c7cf0" : "#666", fontWeight: 600, flexShrink: 0, width: 70 }}>
                  {isUser ? "user" : isAssistant ? "agent" : entry.subtype || "system"}
                </span>
                <span style={{ color: "#aaa", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {entry.tool_name && <span style={{ color: "#c9893a", marginRight: 6 }}>{entry.tool_name}</span>}
                  {entry.tool_input_summary && <span style={{ color: "#888" }}>{entry.tool_input_summary.slice(0, 120)}</span>}
                  {entry.is_install === 1 && <span style={{ color: "#c94a4a", marginLeft: 6, fontSize: 10, fontWeight: 600 }}>INSTALL</span>}
                  {entry.package_name && <span style={{ color: "#d4d4d4", marginLeft: 4, fontWeight: 600 }}>{entry.package_name}</span>}
                  {!entry.tool_name && !isSystem && <span style={{ color: "#666" }}>{isUser ? "prompt" : "response"}</span>}
                  {isSystem && entry.subtype === "turn_duration" && <span style={{ color: "#666" }}>Turn completed</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SettingsPanel({ user }) {
  return (
    <div style={{ background: "#111118", border: "1px solid #1e1e2a", borderRadius: 10, padding: "24px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 1, fontFamily: "monospace", marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid #1e1e2a" }}>Account Settings</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "#666", fontWeight: 600, marginBottom: 4 }}>EMAIL</div>
          <div style={{ fontSize: 14, color: "#d4d4d4" }}>{user ? user.email : "N/A"}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#666", fontWeight: 600, marginBottom: 4 }}>PLAN</div>
          <div style={{ fontSize: 14, color: "#d4d4d4" }}>Developer (Free)</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#666", fontWeight: 600, marginBottom: 4 }}>QUICK START</div>
          <div style={{ fontFamily: "monospace", fontSize: 13, color: "#888", background: "#0c0c14", padding: "10px 12px", borderRadius: 4, border: "1px solid #1e1e2a" }}>
            $ npx @sightglass/cli init
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const api = useApi();
  const { get } = api;
  const [activeNav, setActiveNav] = useState("overview");
  const [sessions, setSessions] = useState([]);
  const [communityStats, setCommunityStats] = useState({});
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [globalStats, setGlobalStats] = useState({});

  useEffect(function() {
    var cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        var results = await Promise.allSettled([
          get("/api/ingest/sessions?page=" + page + "&limit=10"),
          get("/api/community/stats"),
          get("/api/community/categories"),
          get("/api/ingest/stats"),
        ]);
        if (cancelled) return;
        if (results[0].status === "fulfilled") {
          var d = results[0].value;
          setSessions(d.sessions || []);
          setTotalPages(d.pages || 1);
          setTotalSessions(d.total || 0);
        }
        if (results[1].status === "fulfilled") setCommunityStats(results[1].value.stats || results[1].value || {});
        if (results[2].status === "fulfilled") setCategoryData(results[2].value.categories || []);
        if (results[3].status === "fulfilled") setGlobalStats(results[3].value || {});
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return function() { cancelled = true; };
  }, [get, page]);

  var handleLogout = function() { logout(); navigate("/login"); };

  var totalEvents = globalStats.total_entries || 0;
  var totalInstalls = globalStats.total_installs || 0;
  var totalToolCalls = globalStats.total_tool_uses || 0;

  var byProject = {};
  sessions.forEach(function(s) {
    var p = (s.project || "unknown").replace(/^-root-?/, "").replace(/^claudeuser--root-?/, "") || "root";
    byProject[p] = (byProject[p] || 0) + 1;
  });
  var topProjects = Object.entries(byProject).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 8);

  var renderContent = function() {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ width: 32, height: 32, border: "2px solid #1e1e2a", borderTop: "2px solid #c9893a", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <div style={{ fontSize: 13, color: "#666" }}>Loading your data...</div>
        </div>
      );
    }

    if (activeNav === "overview") {
      return (
        <>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
            <StatCard label="Sessions" value={totalSessions} sub="Across all projects" color="#7c7cf0" />
            <StatCard label="Events" value={totalEvents.toLocaleString()} sub="Total captured" color="#c9893a" />
            <StatCard label="Tool Calls" value={totalToolCalls.toLocaleString()} sub="Agent actions" color="#3b8a6e" />
            <StatCard label="Installs" value={totalInstalls} sub="Package decisions" color={totalInstalls > 0 ? "#c94a4a" : "#3b8a6e"} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={sectionHeading}>Projects</div>
            <div style={{ background: "#111118", border: "1px solid #1e1e2a", borderRadius: 10, padding: "16px 20px" }}>
              {topProjects.map(function(entry) {
                return (
                  <div key={entry[0]} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1a1a24", fontSize: 13 }}>
                    <span style={{ color: "#d4d4d4" }}>{entry[0]}</span>
                    <span style={{ color: "#666", fontFamily: "monospace" }}>{entry[1]} sessions</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={Object.assign({}, sectionHeading, { marginBottom: 0 })}>Recent Sessions</div>
              <div onClick={function() { setActiveNav("sessions"); }} style={{ fontSize: 11, color: "#7c7cf0", cursor: "pointer" }}>View all {totalSessions} →</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sessions.slice(0, 5).map(function(s, i) {
                return <SessionCard key={s.session_id || i} session={s} onSelect={function(s) { setSelectedSession(s); setActiveNav("session-detail"); }} />;
              })}
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={sectionHeading}>Community Intelligence</div>
            <CommunityInsights stats={communityStats} />
          </div>
        </>
      );
    }

    if (activeNav === "sessions" || activeNav === "session-detail") {
      if (selectedSession) {
        return <SessionDetail session={selectedSession} onBack={function() { setSelectedSession(null); setActiveNav("sessions"); }} api={api} />;
      }
      return (
        <div>
          <div style={sectionHeading}>All Sessions ({totalSessions})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sessions.map(function(s, i) {
              return <SessionCard key={s.session_id || i} session={s} onSelect={function(s) { setSelectedSession(s); setActiveNav("session-detail"); }} />;
            })}
          </div>
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 20, paddingTop: 16, borderTop: "1px solid #1e1e2a" }}>
              <button onClick={function() { setPage(function(p) { return Math.max(1, p - 1); }); }} disabled={page <= 1}
                style={{ background: page <= 1 ? "#1a1a24" : "#1e1e2a", color: page <= 1 ? "#444" : "#888", border: "1px solid #2a2a3a", borderRadius: 6, padding: "6px 14px", cursor: page <= 1 ? "default" : "pointer", fontSize: 12, fontFamily: "monospace" }}>
                {"<"} Prev
              </button>
              <span style={{ fontSize: 12, color: "#666", fontFamily: "monospace" }}>
                {page} / {totalPages}
              </span>
              <button onClick={function() { setPage(function(p) { return Math.min(totalPages, p + 1); }); }} disabled={page >= totalPages}
                style={{ background: page >= totalPages ? "#1a1a24" : "#1e1e2a", color: page >= totalPages ? "#444" : "#888", border: "1px solid #2a2a3a", borderRadius: 6, padding: "6px 14px", cursor: page >= totalPages ? "default" : "pointer", fontSize: 12, fontFamily: "monospace" }}>
                Next {">"}
              </button>
            </div>
          )}
        </div>
      );
    }

    if (activeNav === "community") {
      return (
        <div>
          <div style={{ marginBottom: 24 }}>
            <div style={sectionHeading}>The Default Stack</div>
            <DefaultStack categories={categoryData} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={sectionHeading}>Build vs Buy</div>
            <BuildVsBuy categories={categoryData} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={sectionHeading}>Community Intelligence</div>
            <CommunityInsights stats={communityStats} />
          </div>
        </div>
      );
    }

    if (activeNav === "settings") {
      return <SettingsPanel user={user} />;
    }

    return null;
  };

  return (
    <div style={{ background: "#0c0c14", color: "#d4d4d4", minHeight: "100vh", fontFamily: "system-ui, sans-serif", display: "flex" }}>
      <style>{"@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } * { box-sizing: border-box; margin: 0; padding: 0; }"}</style>

      <aside style={{ width: 220, minHeight: "100vh", background: "#0e0e18", borderRight: "1px solid #1a1a24", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 20px 24px", borderBottom: "1px solid #1a1a24" }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg, #c9893a, #7c7cf0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#0c0c14" }}>S</div>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3, color: "#ececec" }}>sightglass</span>
        </div>
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {navItems.map(function(item) {
            var isActive = activeNav === item.id || (activeNav === "session-detail" && item.id === "sessions");
            return (
              <div key={item.id} onClick={function() { setActiveNav(item.id); if (item.id !== "sessions") setSelectedSession(null); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? "#d4d4d4" : "#666", background: isActive ? "#1e1e2a" : "transparent", marginBottom: 2, transition: "background 0.15s, color 0.15s" }}>
                <span style={{ fontSize: 15, opacity: isActive ? 1 : 0.6 }}>{item.icon}</span>
                {item.label}
              </div>
            );
          })}
        </nav>
        <div style={{ padding: "16px 20px", borderTop: "1px solid #1a1a24" }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user ? user.email : "user@example.com"}</div>
          <div onClick={handleLogout} style={{ fontSize: 12, color: "#c94a4a", cursor: "pointer", fontWeight: 500 }}>Sign out</div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
        <header style={{ padding: "18px 32px", borderBottom: "1px solid #1a1a24", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0c0c14", position: "sticky", top: 0, zIndex: 10 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#ececec", margin: 0 }}>
            {activeNav === "session-detail" ? "Session Detail" : (navItems.find(function(n) { return n.id === activeNav; }) || {}).label || "Dashboard"}
          </h1>
          <div style={{ fontSize: 11, fontFamily: "monospace", color: "#555", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b8a6e" }} />
            {totalSessions} sessions
          </div>
        </header>
        <div style={{ padding: "28px 32px" }}>
          {error && <div style={{ fontSize: 12, color: "#c94a4a", background: "#c94a4a18", padding: "10px 14px", borderRadius: 6, marginBottom: 20 }}>{error}</div>}
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

var sectionHeading = {
  fontSize: 11,
  fontWeight: 600,
  color: "#888",
  textTransform: "uppercase",
  letterSpacing: 1.5,
  fontFamily: "monospace",
  marginBottom: 12,
};
