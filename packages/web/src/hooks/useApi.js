import { useCallback } from 'react';
import useAuth from './useAuth.jsx';

export default function useApi() {
  const { token, logout } = useAuth();

  const request = useCallback(
    async (method, path, body) => {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const opts = { method, headers };
      if (body !== undefined) {
        opts.body = JSON.stringify(body);
      }

      const res = await fetch(path, opts);

      if (res.status === 401) {
        logout();
        throw new Error('Session expired. Please log in again.');
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || `Request failed (${res.status})`);
      }

      return data;
    },
    [token, logout]
  );

  const get = useCallback((path) => request('GET', path), [request]);
  const post = useCallback((path, body) => request('POST', path, body), [request]);

  return { get, post };
}
