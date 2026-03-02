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
    maxWidth: 400,
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
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>S</div>
          <span style={styles.logoText}>sightglass</span>
        </div>

        <h1 style={styles.heading}>Welcome back</h1>
        <p style={styles.sub}>Sign in to your dashboard</p>

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
            placeholder="Your password"
            required
            autoComplete="current-password"
          />

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
