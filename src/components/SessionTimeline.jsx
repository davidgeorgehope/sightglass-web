import { useState } from 'react';

const typeColors = {
  TRAINING_RECALL: '#7c7cf0',
  CONTEXT_INHERIT: '#c9893a',
  REACTIVE_SEARCH: '#c94a4a',
  USER_DIRECTED: '#3b8a6e',
  SUB_DECISION: '#a07cd4',
};

const typeLabels = {
  TRAINING_RECALL: 'recall',
  CONTEXT_INHERIT: 'context',
  REACTIVE_SEARCH: 'search',
  USER_DIRECTED: 'directed',
  SUB_DECISION: 'sub-decision',
};

const riskColors = { low: '#3b8a6e', medium: '#c9893a', high: '#c94a4a', critical: '#c94a4a' };

function ClassificationBar({ events }) {
  if (!events || events.length === 0) return null;

  const counts = {};
  events.forEach((evt) => {
    const type = evt.classification || evt.type || 'UNKNOWN';
    counts[type] = (counts[type] || 0) + 1;
  });

  const total = events.length;

  return (
    <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', flex: 1, minWidth: 80, maxWidth: 200 }}>
      {Object.entries(counts).map(([type, count]) => (
        <div
          key={type}
          style={{
            width: `${(count / total) * 100}%`,
            background: typeColors[type] || '#555',
            minWidth: 2,
          }}
          title={`${typeLabels[type] || type}: ${count}`}
        />
      ))}
    </div>
  );
}

function EventRow({ event }) {
  const type = event.classification || event.type || 'UNKNOWN';
  const risk = event.risk_level || event.risk || 'low';

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: '8px 0',
        borderBottom: '1px solid #1a1a24',
        fontSize: 12,
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: riskColors[risk] || '#555',
          marginTop: 5,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#888' }}>{event.action || 'install'}</span>
          <span style={{ color: '#d4d4d4', fontWeight: 600 }}>
            {event.package_name || event.target || 'unknown'}
          </span>
          <span
            style={{
              fontSize: 9,
              padding: '1px 6px',
              borderRadius: 3,
              background: (typeColors[type] || '#555') + '18',
              color: typeColors[type] || '#555',
              fontWeight: 600,
            }}
          >
            {typeLabels[type] || type}
          </span>
          {event.confidence && (
            <span style={{ fontSize: 10, color: '#555' }}>{event.confidence}%</span>
          )}
        </div>
        {event.flag && (
          <div style={{ fontSize: 11, color: riskColors[risk] || '#888', marginTop: 4 }}>
            &#8627; {event.flag}
          </div>
        )}
      </div>
      <span style={{ fontSize: 10, color: riskColors[risk] || '#555', flexShrink: 0 }}>
        {risk}
      </span>
    </div>
  );
}

export default function SessionTimeline({ sessions = [] }) {
  const [expanded, setExpanded] = useState({});

  const toggle = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!sessions || sessions.length === 0) {
    return (
      <div
        style={{
          background: '#111118',
          border: '1px solid #1e1e2a',
          borderRadius: 10,
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 32, color: '#333', marginBottom: 12 }}>&#9673;</div>
        <div style={{ fontSize: 15, color: '#888', fontWeight: 500, marginBottom: 8 }}>
          No sessions yet
        </div>
        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
          Once you connect your agent with the Sightglass SDK, sessions will appear here.
          Run <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#c9893a' }}>npx sightglass init</span> to get started.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sessions.map((session, idx) => {
        const id = session.id || session.session_id || idx;
        const events = session.events || [];
        const isOpen = expanded[id];
        const agent = session.agent || session.agent_name || 'unknown';
        const date = session.created_at || session.date || '';
        const formattedDate = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

        return (
          <div
            key={id}
            style={{
              background: '#111118',
              border: '1px solid #1e1e2a',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              onClick={() => toggle(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 18px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: '#555',
                  transition: 'transform 0.2s',
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  display: 'inline-block',
                }}
              >
                &#9654;
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#888',
                  fontFamily: "'IBM Plex Mono', monospace",
                  textTransform: 'uppercase',
                }}
              >
                {agent}
              </span>
              <span style={{ fontSize: 11, color: '#555' }}>{formattedDate}</span>
              <span
                style={{
                  fontSize: 10,
                  color: '#666',
                  fontFamily: "'IBM Plex Mono', monospace",
                  background: '#1e1e2a',
                  padding: '2px 8px',
                  borderRadius: 3,
                }}
              >
                {events.length} event{events.length !== 1 ? 's' : ''}
              </span>
              <div style={{ flex: 1 }} />
              <ClassificationBar events={events} />
            </div>

            {isOpen && events.length > 0 && (
              <div style={{ padding: '0 18px 14px', borderTop: '1px solid #1a1a24' }}>
                {events.map((evt, i) => (
                  <EventRow key={evt.id || i} event={evt} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
