const typeColors = {
  TRAINING_RECALL: '#7c7cf0',
  CONTEXT_INHERIT: '#c9893a',
  REACTIVE_SEARCH: '#c94a4a',
  USER_DIRECTED: '#3b8a6e',
  SUB_DECISION: '#a07cd4',
  ABANDONED: '#c94a4a',
  SEARCH: '#c9893a',
  SELECTED: '#3b8a6e',
};

const typeLabels = {
  TRAINING_RECALL: 'recall',
  CONTEXT_INHERIT: 'context',
  REACTIVE_SEARCH: 'search',
  USER_DIRECTED: 'directed',
  SUB_DECISION: 'sub-decision',
  ABANDONED: 'abandoned',
  SEARCH: 'search',
  SELECTED: 'selected',
};

function StatusIcon({ status }) {
  if (status === 'abandoned' || status === 'ABANDONED') {
    return (
      <span style={{ color: '#c94a4a', fontSize: 14, fontWeight: 700, lineHeight: 1 }}>&#10005;</span>
    );
  }
  if (status === 'selected' || status === 'SELECTED' || status === 'installed') {
    return (
      <span style={{ color: '#3b8a6e', fontSize: 14, fontWeight: 700, lineHeight: 1 }}>&#10003;</span>
    );
  }
  // search / intermediate
  return (
    <span style={{ color: '#c9893a', fontSize: 12, lineHeight: 1 }}>&#9679;</span>
  );
}

function ClassificationBadge({ classification }) {
  const color = typeColors[classification] || '#555';
  const label = typeLabels[classification] || classification || 'unknown';

  return (
    <span
      style={{
        fontSize: 9,
        padding: '1px 6px',
        borderRadius: 3,
        background: color + '18',
        color: color,
        fontWeight: 600,
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      {label}
    </span>
  );
}

function ChainNode({ node, depth = 0 }) {
  const status = node.status || node.action || 'search';
  const children = node.children || node.sub_decisions || [];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 0',
          paddingLeft: depth * 24,
        }}
      >
        {/* Vertical line connector */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: 20,
          }}
        >
          <StatusIcon status={status} />
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 13,
              color: '#d4d4d4',
              fontWeight: status === 'selected' || status === 'SELECTED' || status === 'installed' ? 600 : 400,
            }}
          >
            {node.package_name || node.target || node.query || node.label || 'Unknown'}
          </span>
          {node.version && (
            <span style={{ fontSize: 11, color: '#555', fontFamily: "'IBM Plex Mono', monospace" }}>
              @{node.version}
            </span>
          )}
          {node.classification && <ClassificationBadge classification={node.classification} />}
        </div>

        {node.confidence && (
          <span style={{ fontSize: 10, color: '#555', fontFamily: "'IBM Plex Mono', monospace" }}>
            {node.confidence}%
          </span>
        )}
      </div>

      {/* Connector line between nodes */}
      {children.length > 0 && (
        <div style={{ paddingLeft: depth * 24 + 10, borderLeft: '1px solid #1e1e2a', marginLeft: depth * 24 + 10 }}>
          {children.map((child, i) => (
            <ChainNode key={child.id || i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DecisionChain({ chain = [] }) {
  if (!chain || chain.length === 0) {
    return (
      <div
        style={{
          background: '#111118',
          border: '1px solid #1e1e2a',
          borderRadius: 10,
          padding: 24,
          fontSize: 13,
          color: '#555',
          textAlign: 'center',
        }}
      >
        No decision chain data available
      </div>
    );
  }

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
          fontSize: 11,
          fontWeight: 600,
          color: '#888',
          textTransform: 'uppercase',
          letterSpacing: 1,
          fontFamily: "'IBM Plex Mono', monospace",
          marginBottom: 12,
          paddingBottom: 10,
          borderBottom: '1px solid #1e1e2a',
        }}
      >
        Decision Chain
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: 10, color: '#666' }}>
        <span><span style={{ color: '#c94a4a' }}>&#10005;</span> Abandoned</span>
        <span><span style={{ color: '#c9893a' }}>&#9679;</span> Search</span>
        <span><span style={{ color: '#3b8a6e' }}>&#10003;</span> Selected</span>
      </div>

      <div>
        {chain.map((node, i) => (
          <div key={node.id || i}>
            <ChainNode node={node} />
            {i < chain.length - 1 && (
              <div
                style={{
                  width: 1,
                  height: 8,
                  background: '#1e1e2a',
                  marginLeft: 10,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
