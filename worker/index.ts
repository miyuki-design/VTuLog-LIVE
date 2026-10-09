import { createRemoteJWKSet, jwtVerify } from 'jose';

interface Env {
  CONTROL_API: Fetcher;
  CONTROL_TOKEN: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({ success: true, service: 'vtulog-live', message: 'Worker is running' });
    }

    if (url.pathname !== '/api/target') return new Response('Not Found', { status: 404 });
    if (!['GET', 'POST'].includes(request.method)) return new Response('Method Not Allowed', { status: 405 });

    const token = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!token || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
      return Response.json({ success: false, error: 'Authentication required' }, { status: 403 });
    }
    try {
      const teamDomain = env.ACCESS_TEAM_DOMAIN.replace(/\/+$/, '');
      const keys = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
      await jwtVerify(token, keys, { issuer: teamDomain, audience: env.ACCESS_AUD });
    } catch {
      return Response.json({ success: false, error: 'Invalid authentication' }, { status: 403 });
    }

    // After a top-level Access login, return to the PWA instead of showing raw JSON.
    if (request.method === 'GET' && url.searchParams.get('login') === '1') {
      return Response.redirect(`${url.origin}/`, 303);
    }

    let body: { target: 'youtube' | 'twitch' } | undefined;
    if (request.method === 'POST') {
      if (request.headers.get('Origin') !== url.origin) {
        return Response.json({ success: false, error: 'Forbidden origin' }, { status: 403 });
      }
      try {
        const input: unknown = await request.json();
        if (!input || typeof input !== 'object' || !('target' in input) || (input.target !== 'youtube' && input.target !== 'twitch')) {
          return Response.json({ success: false, error: 'Invalid target' }, { status: 400 });
        }
        body = { target: input.target };
      } catch {
        return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
      }
    }

    try {
      const response = await env.CONTROL_API.fetch('http://127.0.0.1:8765/target', {
        method: request.method,
        headers: { Authorization: `Bearer ${env.CONTROL_TOKEN}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await response.json();
      return Response.json(data, { status: response.status, headers: { 'Cache-Control': 'no-store' } });
    } catch {
      return Response.json({ success: false, error: 'Control API connection failed' }, { status: 502 });
    }
  },
};
