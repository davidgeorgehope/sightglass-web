import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.jsx';

const styles = {
  page: {
    background: '#0c0c14',
    color: '#d4d4d4',
    minHeight: '100vh',
    fontFamily: "'IBM Plex Sans', 'Helvetica Neue', sans-serif",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    background: '#111118',
    border: '1px solid #1e1e2a',
    borderRadius: 12,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 420,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 32,
  },
  logoIcon: {
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
  },
  logoText: {
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: -0.3,
    color: '#ececec',
  },
  heading: {
    fontSize: 26,
    fontWeight: 300,
    color: '#ececec',
    fontFamily: "'Instrument Serif', Georgia, serif",
    marginBottom: 8,
  },
  sub: {
    fontSize: 13,
    color: '#666',
    marginBottom: 28,
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: '#0c0c14',
    border: '1px solid #2a2a3a',
    borderRadius: 6,
    color: '#d4d4d4',
    fontSize: 14,
    fontFamily: "'IBM Plex Sans', sans-serif",
    outline: 'none',
    marginBottom: 18,
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '13px 0',
    background: '#c9893a',
    color: '#0c0c14',
    border: 'none',
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: "'IBM Plex Sans', sans-serif",
    marginTop: 4,
  },
  error: {
    fontSize: 12,
    color: '#c94a4a',
    background: '#c94a4a18',
    padding: '10px 14px',
    borderRadius: 6,
    marginBottom: 16,
  },
  footer: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 13,
    color: '#666',
  },
  link: {
    color: '#c9893a',
    textDecoration: 'none',
    fontWeight: 500,
  },
  apiKeyBox: {
    background: '#0c0c14',
    border: '1px solid #3b8a6e44',
    borderRadius: 8,
    padding: '20px',
    marginBottom: 20,
  },
  apiKeyLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#3b8a6e',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: "'IBM Plex Mono', monospace",
    marginBottom: 8,
  },
  apiKeyValue: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 13,
    color: '#d4d4d4',
    background: '#161622',
    padding: '10px 12px',
    borderRadius: 4,
    wordBreak: 'break-all',
    userSelect: 'all',
    cursor: 'text',
  },
  apiKeyNote: {
    fontSize: 11,
    color: '#c9893a',
    marginTop: 10,
    lineHeight: 1.5,
  },
  successCard: {
    background: '#111118',
    border: '1px solid #1e1e2a',
    borderRadius: 12,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 480,
    textAlign: 'center',
  },
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: '#3b8a6e22',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    color: '#3b8a6e',
    marginBottom: 16,
  },
};

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const data = await register(email, password);
      if (data.apiKey || data.api_key) {
        setApiKey(data.apiKey || data.api_key);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // After successful registration, show API key
  if (apiKey) {
    return (
      <div style={styles.page}>
        <div style={styles.successCard}>
          <div style={styles.successIcon}>&#10003;</div>
          <h1 style={{ ...styles.heading, marginBottom: 12 }}>Account created</h1>
          <p style={{ ...styles.sub, marginBottom: 24 }}>
            Save your API key below. You will need it to configure the CLI.
          </p>

          <div style={styles.apiKeyBox}>
            <div style={styles.apiKeyLabel}>Your API Key</div>
            <div style={styles.apiKeyValue}>{apiKey}</div>
            <div style={styles.apiKeyNote}>
              This key is shown only once. Copy it now and store it securely.
              <br />
              Use it with: <span style={{ color: '#d4d4d4' }}>npx sightglass init --key YOUR_KEY</span>
            </div>
          </div>

          <button
            style={styles.button}
            onClick={() => navigate('/dashboard')}
          >
            Continue to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>S</div>
          <span style={styles.logoText}>sightglass</span>
        </div>

        <h1 style={styles.heading}>Create an account</h1>
        <p style={styles.sub}>Get started with agent supply chain intelligence</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            autoComplete="new-password"
          />

          <label style={styles.label}>Confirm Password</label>
          <input
            style={styles.input}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm your password"
            required
            autoComplete="new-password"
          />

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
