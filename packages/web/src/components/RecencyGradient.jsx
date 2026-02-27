const palette = {
  purple: '#7c7cf0',
  orange: '#c9893a',
  green: '#3b8a6e',
  red: '#c94a4a',
  lavender: '#a07cd4',
};

const modelColors = {
  'claude-sonnet-4-5': palette.purple,
  'claude-opus-4-6': palette.orange,
  'claude-haiku-4-5': palette.green,
  'gpt-4o': palette.red,
  'gpt-4-turbo': palette.lavender,
};

function getModelColor(model) {
  return modelColors[model] || palette.lavender;
}

function ModelPicksCard({ category, models }) {
  const modelNames = Object.keys(models);
  if (modelNames.length < 1) return null;

  return (
    <div style={{
      background: '#0c0c14',
      border: '1px solid #1e1e2a',
      borderRadius: 8,
      padding: '14px 16px',
      minWidth: 240,
      flex: 1,
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontFamily: "'IBM Plex Mono', monospace",
        marginBottom: 10,
      }}>
        {category}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {modelNames.map((model) => {
          const picks = models[model];
          const entries = Object.entries(picks).sort((a, b) => b[1] - a[1]);
          const total = entries.reduce((sum, [, count]) => sum + count, 0);

          return (
            <div key={model} style={{ flex: 1, minWidth: 100 }}>
              <div style={{
                fontSize: 10,
                color: getModelColor(model),
                fontWeight: 600,
                marginBottom: 6,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {model}
              </div>
              {entries.slice(0, 4).map(([pkg, count]) => (
                <div key={pkg} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '2px 0',
                  fontSize: 11,
                }}>
                  <span style={{ color: '#d4d4d4', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {pkg}
                  </span>
                  <span style={{
                    color: '#555',
                    fontFamily: "'IBM Plex Mono', monospace",
                    marginLeft: 8,
                  }}>
                    {total > 0 ? Math.round((count / total) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RecencyGradient({ modelData = {} }) {
  const categoryNames = Object.keys(modelData);

  if (categoryNames.length === 0) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          Recency Gradient
          <span style={headerSubStyle}>How picks shift between model versions</span>
        </div>
        <div style={{ fontSize: 12, color: '#555', textAlign: 'center', padding: 20 }}>
          No model comparison data available yet. Events need model metadata.
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        Recency Gradient
        <span style={headerSubStyle}>How picks shift between model versions</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {categoryNames.slice(0, 8).map((category) => (
          <ModelPicksCard
            key={category}
            category={category}
            models={modelData[category]}
          />
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
