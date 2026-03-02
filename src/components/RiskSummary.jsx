import { useState } from 'react';

const riskConfig = {
  critical: { color: '#c94a4a', bg: '#c94a4a18', order: 0, label: 'CRITICAL' },
  high: { color: '#c94a4a', bg: '#c94a4a18', order: 1, label: 'HIGH' },
  medium: { color: '#c9893a', bg: '#c9893a18', order: 2, label: 'MEDIUM' },
  low: { color: '#3b8a6e', bg: '#3b8a6e18', order: 3, label: 'LOW' },
};

function RiskBadge({ level }) {
  const config = riskConfig[level] || riskConfig.low;
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 3,
        background: config.bg,
        color: config.color,
        fontFamily: "'IBM Plex Mono', monospace",
        letterSpacing: 0.5,
        flexShrink: 0,
      }}
    >
      {config.label}
    </span>
  );
}

export default function RiskSummary({ risks = [] }) {
  const [sortAsc, setSortAsc] = useState(false);

  if (!risks || risks.length === 0) {
    return (
      <div
        style={{
          background: '#111118',
          border: '1px solid #1e1e2a',
          borderRadius: 10,
          padding: 24,
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
            marginBottom: 14,
          }}
        >
          Risk Summary
        </div>
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 24, color: '#3b8a6e', marginBottom: 8 }}>&#10003;</div>
          <div style={{ fontSize: 13, color: '#888' }}>No risk flags detected</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
            All dependencies passed risk assessment
          </div>
        </div>
      </div>
    );
  }

  const sorted = [...risks].sort((a, b) => {
    const aOrder = (riskConfig[a.risk_level || a.level] || riskConfig.low).order;
    const bOrder = (riskConfig[b.risk_level || b.level] || riskConfig.low).order;
    return sortAsc ? bOrder - aOrder : aOrder - bOrder;
  });

  return (
    <div
      style={{
        background: '#111118',
        border: '1px solid #1e1e2a',
        borderRadius: 10,
        padding: '16px 20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: '1px solid #1e1e2a',
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
          }}
        >
          Risk Summary
          <span
            style={{
              marginLeft: 8,
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 3,
              background: '#c94a4a18',
              color: '#c94a4a',
            }}
          >
            {risks.length} flag{risks.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={() => setSortAsc(!sortAsc)}
          style={{
            background: 'none',
            border: '1px solid #2a2a3a',
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: 10,
            color: '#888',
            cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          Risk {sortAsc ? '\u2191' : '\u2193'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((risk, i) => {
          const level = risk.risk_level || risk.level || 'low';
          const levelConfig = riskConfig[level] || riskConfig.low;

          return (
            <div
              key={risk.id || i}
              style={{
                padding: '12px 14px',
                background: '#0c0c14',
                border: `1px solid ${levelConfig.color}22`,
                borderRadius: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <RiskBadge level={level} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#d4d4d4' }}>
                  {risk.package_name || risk.package || risk.target || 'Unknown'}
                </span>
                {risk.version && (
                  <span style={{ fontSize: 11, color: '#555', fontFamily: "'IBM Plex Mono', monospace" }}>
                    @{risk.version}
                  </span>
                )}
              </div>

              {(risk.factor || risk.detail || risk.reason) && (
                <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6, marginBottom: 4 }}>
                  {risk.factor || risk.detail || risk.reason}
                </div>
              )}

              {(risk.alternative || risk.suggested_alternative) && (
                <div style={{ fontSize: 11, color: '#3b8a6e', fontFamily: "'IBM Plex Mono', monospace", marginTop: 6 }}>
                  &#8627; Suggested: {risk.alternative || risk.suggested_alternative}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
