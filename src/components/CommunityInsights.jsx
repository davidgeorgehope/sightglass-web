const palette = {
  green: '#3b8a6e',
  orange: '#c9893a',
  purple: '#7c7cf0',
  red: '#c94a4a',
  lavender: '#a07cd4',
};

const classificationColors = {
  'TRAINING_RECALL': palette.purple,
  'CONTEXT_INHERITANCE': palette.orange,
  'REACTIVE_SEARCH': palette.red,
  'PROACTIVE_SEARCH': palette.green,
  'USER_DIRECTED': palette.lavender,
  'UNKNOWN': '#555',
};

const classificationLabels = {
  'TRAINING_RECALL': 'Training Recall',
  'CONTEXT_INHERITANCE': 'Context Inherit',
  'REACTIVE_SEARCH': 'Reactive Search',
  'PROACTIVE_SEARCH': 'Proactive Search',
  'USER_DIRECTED': 'User Directed',
  'UNKNOWN': 'Unknown',
};

function CSSBar({ value, max, color, label }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <span style={{ fontSize: 11, color: '#888', minWidth: 100, fontFamily: "'IBM Plex Mono', monospace" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 6, background: '#1e1e2a', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.max(pct, 2)}%`,
            height: '100%',
            background: color,
            borderRadius: 3,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <span style={{ fontSize: 10, color: '#666', fontFamily: "'IBM Plex Mono', monospace", minWidth: 36, textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

function CSSPieChart({ data }) {
  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  let cumulative = 0;
  const gradientParts = data.map((d) => {
    const start = (cumulative / total) * 100;
    cumulative += d.value;
    const end = (cumulative / total) * 100;
    return `${d.color} ${start}% ${end}%`;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: `conic-gradient(${gradientParts.join(', ')})`,
          flexShrink: 0,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <span style={{ color: '#888' }}>{d.label}</span>
            <span style={{ color: '#555', fontFamily: "'IBM Plex Mono', monospace" }}>
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VelocityItem({ name, direction, pct }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
      <span
        style={{
          fontSize: 14,
          color: direction === 'up' ? palette.green : palette.red,
          fontWeight: 700,
        }}
      >
        {direction === 'up' ? '\u2191' : '\u2193'}
      </span>
      <span style={{ fontSize: 12, color: '#d4d4d4', fontFamily: "'IBM Plex Mono', monospace", flex: 1 }}>
        {name}
      </span>
      <span
        style={{
          fontSize: 11,
          fontFamily: "'IBM Plex Mono', monospace",
          color: direction === 'up' ? palette.green : palette.red,
        }}
      >
        {direction === 'up' ? '+' : '-'}{pct}%
      </span>
    </div>
  );
}

export default function CommunityInsights({ stats = {} }) {
  // Wire real velocity data from API — transform from API format if needed
  const rawVelocity = stats.velocity || stats.tool_velocity || [];
  const velocity = rawVelocity.length > 0
    ? rawVelocity.map((v) => ({
        name: v.name || v.package_name,
        direction: v.direction,
        pct: v.pct || Math.abs(v.velocity || 0),
      }))
    : [];

  // Wire real classification distribution from API
  const rawDistribution = stats.classificationDistribution || stats.classification_distribution || {};
  let classificationDistribution;
  if (typeof rawDistribution === 'object' && !Array.isArray(rawDistribution) && Object.keys(rawDistribution).length > 0) {
    classificationDistribution = Object.entries(rawDistribution).map(([key, value]) => ({
      label: classificationLabels[key] || key,
      value: typeof value === 'number' ? value : 0,
      color: classificationColors[key] || '#555',
    }));
  } else if (Array.isArray(rawDistribution) && rawDistribution.length > 0) {
    classificationDistribution = rawDistribution;
  } else if (stats.distributions && Array.isArray(stats.distributions)) {
    classificationDistribution = stats.distributions;
  } else {
    classificationDistribution = [];
  }

  // Wire real top packages from API
  const rawTopPackages = stats.topPackages || stats.top_packages || [];
  const topPackages = rawTopPackages.map((pkg) => ({
    name: pkg.name || pkg.package_name,
    installs: pkg.installs || pkg.install_count || pkg.count || 0,
  }));

  const maxInstalls = topPackages.length > 0 ? topPackages[0].installs : 1;

  const barColors = [palette.purple, palette.orange, palette.green, palette.red, palette.lavender];

  const hasData = velocity.length > 0 || classificationDistribution.length > 0 || topPackages.length > 0;

  if (!hasData) {
    return (
      <div style={{
        background: '#111118',
        border: '1px solid #1e1e2a',
        borderRadius: 10,
        padding: '16px 20px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: '#555', padding: 20 }}>
          No community data available yet. Start collecting and syncing agent sessions.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Tool Velocity */}
      {velocity.length > 0 && (
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
              fontSize: 11,
              fontWeight: 600,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontFamily: "'IBM Plex Mono', monospace",
              marginBottom: 14,
              paddingBottom: 10,
              borderBottom: '1px solid #1e1e2a',
            }}
          >
            Tool Velocity
            <span style={{ color: '#555', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>
              Trending packages this month
            </span>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 10, color: '#3b8a6e', marginBottom: 8, fontWeight: 600 }}>RISING</div>
              {velocity
                .filter((v) => v.direction === 'up')
                .map((v, i) => (
                  <VelocityItem key={i} {...v} />
                ))}
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 10, color: '#c94a4a', marginBottom: 8, fontWeight: 600 }}>DECLINING</div>
              {velocity
                .filter((v) => v.direction === 'down')
                .map((v, i) => (
                  <VelocityItem key={i} {...v} />
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Classification Distribution + Top Packages side by side */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Classification Distribution */}
        {classificationDistribution.length > 0 && (
          <div
            style={{
              background: '#111118',
              border: '1px solid #1e1e2a',
              borderRadius: 10,
              padding: '16px 20px',
              flex: 1,
              minWidth: 260,
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
                marginBottom: 16,
                paddingBottom: 10,
                borderBottom: '1px solid #1e1e2a',
              }}
            >
              Classification Distribution
            </div>
            <CSSPieChart data={classificationDistribution} />
          </div>
        )}

        {/* Top Packages */}
        {topPackages.length > 0 && (
          <div
            style={{
              background: '#111118',
              border: '1px solid #1e1e2a',
              borderRadius: 10,
              padding: '16px 20px',
              flex: 1,
              minWidth: 260,
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
                paddingBottom: 10,
                borderBottom: '1px solid #1e1e2a',
              }}
            >
              Top Packages by Install Count
            </div>
            {topPackages.map((pkg, i) => (
              <CSSBar
                key={i}
                label={pkg.name}
                value={pkg.installs}
                max={maxInstalls}
                color={barColors[i % barColors.length]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
