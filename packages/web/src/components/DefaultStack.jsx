const palette = {
  purple: '#7c7cf0',
  orange: '#c9893a',
  green: '#3b8a6e',
  red: '#c94a4a',
  lavender: '#a07cd4',
};

const accentColors = [palette.purple, palette.orange, palette.green, palette.red, palette.lavender];

export default function DefaultStack({ categories = [] }) {
  // Take the top 10 categories by total picks
  const top10 = categories.slice(0, 10);

  if (top10.length === 0) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          The Default Stack
          <span style={headerSubStyle}>Top tool per category</span>
        </div>
        <div style={{ fontSize: 12, color: '#555', textAlign: 'center', padding: 20 }}>
          No category data available yet. Start collecting agent sessions.
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        The Default Stack
        <span style={headerSubStyle}>What AI agents actually pick</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {top10.map((cat, i) => (
          <div
            key={cat.name}
            style={{
              background: '#0c0c14',
              border: '1px solid #1e1e2a',
              borderRadius: 8,
              padding: '14px 16px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: accentColors[i % accentColors.length],
              }}
            />
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              marginBottom: 6,
            }}>
              <span style={{
                fontSize: 22,
                fontWeight: 700,
                color: accentColors[i % accentColors.length],
                fontFamily: "'Instrument Serif', Georgia, serif",
                lineHeight: 1,
              }}>
                {i + 1}
              </span>
              <span style={{
                fontSize: 10,
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {cat.name}
              </span>
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#ececec',
              fontFamily: "'IBM Plex Mono', monospace",
              marginBottom: 4,
            }}>
              {cat.winner.name}
            </div>
            <div style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#ececec',
              fontFamily: "'Instrument Serif', Georgia, serif",
            }}>
              {cat.winner.pct}%
            </div>
            <div style={{
              fontSize: 10,
              color: '#555',
              fontFamily: "'IBM Plex Mono', monospace",
              marginTop: 2,
            }}>
              {cat.totalPicks} picks
              {cat.runnerUp && ` · runner-up: ${cat.runnerUp.name}`}
            </div>
          </div>
        ))}
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
