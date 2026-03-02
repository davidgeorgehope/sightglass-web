import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.jsx';
import useApi from '../hooks/useApi.js';
import SessionTimeline from '../components/SessionTimeline.jsx';
import RiskSummary from '../components/RiskSummary.jsx';
import CommunityInsights from '../components/CommunityInsights.jsx';
import DefaultStack from '../components/DefaultStack.jsx';
import BuildVsBuy from '../components/BuildVsBuy.jsx';
import RecencyGradient from '../components/RecencyGradient.jsx';
import AgainstTheGrain from '../components/AgainstTheGrain.jsx';

const navItems = [
  { id: 'overview', label: 'Overview', icon: '\u25a3' },
  { id: 'sessions', label: 'Sessions', icon: '\u25ce' },
  { id: 'community', label: 'Community', icon: '\u25c7' },
  { id: 'settings', label: 'Settings', icon: '\u2699' },
];

function StatCard({ label, value, sub, color }) {
  return (
    <div
      style={{
        background: '#111118',
        border: '1px solid #1e1e2a',
        borderRadius: 10,
        padding: '20px 22px',
        flex: 1,
        minWidth: 180,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#888',
          textTransform: 'uppercase',
          letterSpacing: 1,
          fontFamily: "'IBM Plex Mono', monospace",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: '#ececec',
          fontFamily: "'Instrument Serif', Georgia, serif",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

function SettingsPanel({ user }) {
  return (
    <div
      style={{
        background: '#111118',
        border: '1px solid #1e1e2a',
        borderRadius: 10,
        padding: '24px',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#888',
          textTransform: 'uppercase',
          letterSpacing: 1,
          fontFamily: "'IBM Plex Mono', monospace",
          marginBottom: 20,
          paddingBottom: 12,
          borderBottom: '1px solid #1e1e2a',
        }}
      >
        Account Settings
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: '#666', fontWeight: 600, marginBottom: 4 }}>EMAIL</div>
          <div style={{ fontSize: 14, color: '#d4d4d4' }}>{user?.email || 'N/A'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#666', fontWeight: 600, marginBottom: 4 }}>PLAN</div>
          <div style={{ fontSize: 14, color: '#d4d4d4' }}>{user?.plan || 'Developer (Free)'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#666', fontWeight: 600, marginBottom: 4 }}>API KEY</div>
          <div
            style={{
              fontSize: 13,
              fontFamily: "'IBM Plex Mono', monospace",
              color: '#888',
              background: '#0c0c14',
              padding: '10px 12px',
              borderRadius: 4,
              border: '1px solid #1e1e2a',
            }}
          >
            {user?.api_key_preview || 'sg_****...****'}
          </div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 6 }}>
            API key is only shown at registration. Contact support to regenerate.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { get } = useApi();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('overview');
  const [events, setEvents] = useState([]);
  const [communityStats, setCommunityStats] = useState({});
  const [categoryData, setCategoryData] = useState([]);
  const [modelData, setModelData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const [eventsData, statsData, catData, modelCmpData] = await Promise.allSettled([
          get('/api/events'),
          get('/api/community/stats'),
          get('/api/community/categories'),
          get('/api/community/model-comparison'),
        ]);
        if (cancelled) return;
        if (eventsData.status === 'fulfilled') {
          setEvents(eventsData.value.events || eventsData.value || []);
        }
        if (statsData.status === 'fulfilled') {
          setCommunityStats(statsData.value.stats || statsData.value || {});
        }
        if (catData.status === 'fulfilled') {
          setCategoryData(catData.value.categories || []);
        }
        if (modelCmpData.status === 'fulfilled') {
          setModelData(modelCmpData.value.categories || {});
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [get]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Derive data for display
  const allEvents = Array.isArray(events) ? events : [];

  // Group events into sessions
  const sessionsMap = {};
  allEvents.forEach((evt) => {
    const sid = evt.session_id || evt.sessionId || 'default';
    if (!sessionsMap[sid]) {
      sessionsMap[sid] = {
        id: sid,
        agent: evt.agent || evt.agent_name || 'unknown',
        created_at: evt.created_at || evt.timestamp || '',
        events: [],
      };
    }
    sessionsMap[sid].events.push(evt);
  });
  const sessions = Object.values(sessionsMap);

  // Stat calculations
  const totalEvents = allEvents.length;
  const installEvents = allEvents.filter(
    (e) => e.action === 'install' || e.event_type === 'install'
  ).length;
  const recallEvents = allEvents.filter(
    (e) =>
      e.classification === 'TRAINING_RECALL' || e.type === 'TRAINING_RECALL'
  ).length;
  const recallPct = totalEvents > 0 ? Math.round((recallEvents / totalEvents) * 100) : 0;

  const risks = allEvents
    .filter((e) => {
      const risk = e.risk_level || e.risk;
      return risk === 'high' || risk === 'critical' || risk === 'medium';
    })
    .map((e) => ({
      id: e.id,
      package_name: e.package_name || e.target,
      version: e.version,
      level: e.risk_level || e.risk,
      factor: e.flag || e.risk_detail || e.factor,
      alternative: e.suggested_alternative || e.alternative,
    }));

  const riskFlagCount = risks.length;

  // Render active section
  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: '2px solid #1e1e2a',
              borderTop: '2px solid #c9893a',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <div style={{ fontSize: 13, color: '#666' }}>Loading your data...</div>
        </div>
      );
    }

    switch (activeNav) {
      case 'overview':
        return (
          <>
            {/* Stat cards */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
              <StatCard label="Total Events" value={totalEvents} sub="Across all sessions" color="#7c7cf0" />
              <StatCard label="Install Events" value={installEvents} sub="Package installations" color="#c9893a" />
              <StatCard label="Training Recall" value={`${recallPct}%`} sub="Decisions from training data" color="#7c7cf0" />
              <StatCard label="Risk Flags" value={riskFlagCount} sub="Packages flagged" color={riskFlagCount > 0 ? '#c94a4a' : '#3b8a6e'} />
            </div>

            {/* Session Timeline */}
            <div style={{ marginBottom: 24 }}>
              <div style={sectionHeading}>Recent Sessions</div>
              <SessionTimeline sessions={sessions} />
            </div>

            {/* Risk Summary */}
            <div style={{ marginBottom: 24 }}>
              <div style={sectionHeading}>Risk Assessment</div>
              <RiskSummary risks={risks} />
            </div>

            {/* Community Insights */}
            <div style={{ marginBottom: 24 }}>
              <div style={sectionHeading}>Community Intelligence</div>
              <CommunityInsights stats={communityStats} />
            </div>
          </>
        );

      case 'sessions':
        return (
          <div>
            <div style={sectionHeading}>All Sessions</div>
            <SessionTimeline sessions={sessions} />
          </div>
        );

      case 'community':
        return (
          <div>
            {/* The Default Stack */}
            <div style={{ marginBottom: 24 }}>
              <div style={sectionHeading}>The Default Stack</div>
              <DefaultStack categories={categoryData} />
            </div>

            {/* Build vs Buy */}
            <div style={{ marginBottom: 24 }}>
              <div style={sectionHeading}>Build vs Buy</div>
              <BuildVsBuy categories={categoryData} />
            </div>

            {/* Recency Gradient */}
            <div style={{ marginBottom: 24 }}>
              <div style={sectionHeading}>Recency Gradient</div>
              <RecencyGradient modelData={modelData} />
            </div>

            {/* Against the Grain */}
            <div style={{ marginBottom: 24 }}>
              <div style={sectionHeading}>Against the Grain</div>
              <AgainstTheGrain categories={categoryData} />
            </div>

            {/* Community Insights */}
            <div style={{ marginBottom: 24 }}>
              <div style={sectionHeading}>Community Intelligence</div>
              <CommunityInsights stats={communityStats} />
            </div>
          </div>
        );

      case 'settings':
        return (
          <div>
            <div style={sectionHeading}>Settings</div>
            <SettingsPanel user={user} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        background: '#0c0c14',
        color: '#d4d4d4',
        minHeight: '100vh',
        fontFamily: "'IBM Plex Sans', 'Helvetica Neue', sans-serif",
        display: 'flex',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap');
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Sidebar */}
      <aside
        style={{
          width: 220,
          minHeight: '100vh',
          background: '#0e0e18',
          borderRight: '1px solid #1a1a24',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '20px 20px 24px',
            borderBottom: '1px solid #1a1a24',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #c9893a, #7c7cf0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              color: '#0c0c14',
            }}
          >
            S
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3, color: '#ececec' }}>
            sightglass
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#d4d4d4' : '#666',
                  background: isActive ? '#1e1e2a' : 'transparent',
                  marginBottom: 2,
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                <span style={{ fontSize: 15, opacity: isActive ? 1 : 0.6 }}>{item.icon}</span>
                {item.label}
              </div>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #1a1a24',
          }}
        >
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email || 'user@example.com'}
          </div>
          <div
            onClick={handleLogout}
            style={{
              fontSize: 12,
              color: '#c94a4a',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Sign out
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        {/* Top bar */}
        <header
          style={{
            padding: '18px 32px',
            borderBottom: '1px solid #1a1a24',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#0c0c14ee',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#ececec', margin: 0 }}>
              {navItems.find((n) => n.id === activeNav)?.label || 'Dashboard'}
            </h1>
          </div>
          <div
            style={{
              fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
              color: '#555',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#3b8a6e',
              }}
            />
            Connected
          </div>
        </header>

        {/* Content area */}
        <div style={{ padding: '28px 32px' }}>
          {error && (
            <div
              style={{
                fontSize: 12,
                color: '#c94a4a',
                background: '#c94a4a18',
                padding: '10px 14px',
                borderRadius: 6,
                marginBottom: 20,
              }}
            >
              {error}
            </div>
          )}
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

const sectionHeading = {
  fontSize: 11,
  fontWeight: 600,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: 1.5,
  fontFamily: "'IBM Plex Mono', monospace",
  marginBottom: 12,
};
