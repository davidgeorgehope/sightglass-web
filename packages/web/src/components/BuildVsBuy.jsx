const palette = {
  purple: '#7c7cf0',
  orange: '#c9893a',
  green: '#3b8a6e',
  red: '#c94a4a',
};

export default function BuildVsBuy({ categories = [] }) {
  // Filter to categories that have both custom builds and package installs
  const relevant = categories
    .filter((cat) => cat.totalPicks > 0)
    .sort((a, b) => b.customBuildPct - a.customBuildPct);

  if (relevant.length === 0) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          Build vs Buy
          <span style={headerSubStyle}>Custom code vs installing a package</span>
        </div>
        <div style={{ fontSize: 12, color: '#555', textAlign: 'center', padding: 20 }}>
          No build vs buy data available yet.
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        Build vs Buy
        <span style={headerSubStyle}>Custom code vs installing a package</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {relevant.map((cat) => {
          const buyPct = 100 - cat.customBuildPct;
          return (
            <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 11,
                color: '#888',
                minWidth: 110,
                fontFamily: "'IBM Plex Mono', monospace",
                textAlign: 'right',
              }}>
                {cat.name}
              </span>
              <div style={{
                flex: 1,
                height: 16,
                background: '#1e1e2a',
                borderRadius: 4,
                overflow: 'hidden',
                display: 'flex',
              }}>
                <div
                  style={{
                    width: `${buyPct}%`,
                    height: '100%',
                    background: palette.purple,
                    transition: 'width 0.6s ease',
                  }}
                />
                <div
                  style={{
                    width: `${cat.customBuildPct}%`,
                    height: '100%',
                    background: palette.orange,
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>
              <span style={{
                fontSize: 10,
                color: '#666',
                fontFamily: "'IBM Plex Mono', monospace",
                minWidth: 48,
                textAlign: 'right',
              }}>
                {cat.customBuildPct > 0 ? `${cat.customBuildPct}% DIY` : '100% pkg'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 12, paddingTop: 10, borderTop: '1px solid #1e1e2a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#888' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: palette.purple }} />
          Package Install
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#888' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: palette.orange }} />
          Custom / DIY
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: '#111118',
  border: '1px solid #1e1e2a',
  borderRadius: 10,
  padding: '16px 20px',
};

const headerStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: 1,
  fontFamily: "'IBM Plex Mono', monospace",
  marginBottom: 14,
  paddingBottom: 10,
  borderBottom: '1px solid #1e1e2a',
};

const headerSubStyle = {
  color: '#555',
  fontWeight: 400,
  textTransform: 'none',
  letterSpacing: 0,
  marginLeft: 8,
};
