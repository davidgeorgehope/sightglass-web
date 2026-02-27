const palette = {
  purple: '#7c7cf0',
  orange: '#c9893a',
  green: '#3b8a6e',
  red: '#c94a4a',
};

// Tools with high market share that agents rarely pick
const MAINSTREAM_TOOLS = {
  'redux': { category: 'State Management', marketPct: 45, desc: 'Agents prefer zustand and jotai over Redux' },
  'axios': { category: 'HTTP Client', marketPct: 60, desc: 'Native fetch or undici preferred by newer models' },
  'moment': { category: 'Date/Time', marketPct: 30, desc: 'Deprecated; agents pick date-fns or dayjs' },
  'express': { category: 'API Framework', marketPct: 65, desc: 'Still dominant but Hono/Fastify gaining' },
  'mongoose': { category: 'ORM/Database', marketPct: 35, desc: 'Prisma and Drizzle overtaking in new projects' },
  'jest': { category: 'Testing', marketPct: 55, desc: 'Vitest gaining momentum for new TypeScript projects' },
  'styled-components': { category: 'CSS/Styling', marketPct: 25, desc: 'Tailwind CSS dominates agent picks' },
};

export default function AgainstTheGrain({ categories = [] }) {
  // Find tools that have low pick rates despite being "mainstream"
  const grainItems = [];

  for (const cat of categories) {
    for (const pick of cat.picks || []) {
      const mainstream = MAINSTREAM_TOOLS[pick.name];
      if (mainstream && pick.pct < mainstream.marketPct * 0.5) {
        grainItems.push({
          name: pick.name,
          category: cat.name,
          agentPct: pick.pct,
          marketPct: mainstream.marketPct,
          desc: mainstream.desc,
        });
      }
    }
  }

  // Also add mainstream tools that don't appear in picks at all
  for (const [name, info] of Object.entries(MAINSTREAM_TOOLS)) {
    const found = grainItems.find((g) => g.name === name);
    if (!found) {
      const cat = categories.find((c) => c.name === info.category);
      const pick = cat?.picks?.find((p) => p.name === name);
      grainItems.push({
        name,
        category: info.category,
        agentPct: pick?.pct ?? 0,
        marketPct: info.marketPct,
        desc: info.desc,
      });
    }
  }

  // Sort by biggest gap between market share and agent picks
  grainItems.sort((a, b) => (b.marketPct - b.agentPct) - (a.marketPct - a.agentPct));

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        Against the Grain
        <span style={headerSubStyle}>Tools agents avoid despite market share</span>
      </div>

      {grainItems.length === 0 ? (
        <div style={{ fontSize: 12, color: '#555', textAlign: 'center', padding: 20 }}>
          No against-the-grain patterns detected yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {grainItems.slice(0, 8).map((item) => (
            <div
              key={item.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 0',
                borderBottom: '1px solid #1a1a24',
              }}
            >
              <div style={{ minWidth: 90 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#d4d4d4',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {item.name}
                </div>
                <div style={{
                  fontSize: 10,
                  color: '#555',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {item.category}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                {/* Market share bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 9, color: '#555', minWidth: 50, fontFamily: "'IBM Plex Mono', monospace" }}>
                    Market
                  </span>
                  <div style={{ flex: 1, height: 4, background: '#1e1e2a', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${item.marketPct}%`, height: '100%', background: '#444', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 9, color: '#555', minWidth: 28, textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {item.marketPct}%
                  </span>
                </div>
                {/* Agent pick bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, color: '#555', minWidth: 50, fontFamily: "'IBM Plex Mono', monospace" }}>
                    Agents
                  </span>
                  <div style={{ flex: 1, height: 4, background: '#1e1e2a', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.max(item.agentPct, 1)}%`,
                      height: '100%',
                      background: item.agentPct < item.marketPct * 0.3 ? palette.red : palette.orange,
                      borderRadius: 2,
                    }} />
                  </div>
                  <span style={{ fontSize: 9, color: '#555', minWidth: 28, textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {item.agentPct}%
                  </span>
                </div>
              </div>
              <div style={{
                fontSize: 10,
                color: '#666',
                maxWidth: 200,
                lineHeight: 1.4,
              }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      )}
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
