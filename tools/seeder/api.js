const cfg = require('./config');

const TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 1 hour per auth.service.ts
const TOKEN_REFRESH_MARGIN_MS = 10 * 60 * 1000; // refresh when <10 min remaining

class ApiClient {
  constructor() {
    this.baseUrl = cfg.BASE_URL.replace(/\/$/, '') + cfg.API_PREFIX;
    this.token = null;
    this.refreshToken = null;
    this.tokenExpiresAt = 0;
    this.requestCount = 0;
  }

  async login(email, password) {
    const res = await this._fetch('POST', '/auth/mobile/login', {
      body: { login: email, password },
      auth: false,
      retry: false,
    });
    if (!res?.success || !res.data?.token) {
      throw new Error(`Login failed: ${JSON.stringify(res).slice(0, 300)}`);
    }
    this.token = res.data.token;
    this.refreshToken = res.data.refreshToken;
    this.tokenExpiresAt = Date.now() + TOKEN_LIFETIME_MS;
    return { user: res.data.user };
  }

  async refresh() {
    if (!this.refreshToken) throw new Error('No refresh token available');
    const res = await this._fetch('POST', '/auth/mobile/refresh', {
      body: { refreshToken: this.refreshToken },
      auth: false,
      retry: false,
    });
    if (!res?.success || !res.data?.token) {
      throw new Error(`Refresh failed: ${JSON.stringify(res).slice(0, 300)}`);
    }
    this.token = res.data.token;
    if (res.data.refreshToken) this.refreshToken = res.data.refreshToken;
    this.tokenExpiresAt = Date.now() + TOKEN_LIFETIME_MS;
  }

  async _ensureFreshToken() {
    if (!this.token) throw new Error('Not logged in');
    const remaining = this.tokenExpiresAt - Date.now();
    if (remaining < TOKEN_REFRESH_MARGIN_MS) {
      console.log(`[api] token expiring in ${Math.round(remaining / 1000)}s — refreshing`);
      await this.refresh();
    }
  }

  async createExpedition(payload) {
    await this._ensureFreshToken();
    return this._fetch('POST', '/trips', { body: payload });
  }

  async createEntry(payload) {
    await this._ensureFreshToken();
    return this._fetch('POST', '/posts', { body: payload });
  }

  async _fetch(method, path, opts = {}) {
    const { body, auth = true, retry = true } = opts;
    const url = this.baseUrl + path;
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      if (!this.token) throw new Error('Auth required but no token');
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const init = {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    };

    const attempt = async (delayMs, attemptNum) => {
      if (delayMs > 0) await sleep(delayMs);
      const res = await fetch(url, init);
      const text = await res.text();
      let json;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = { _raw: text };
      }

      if (res.ok) return json;

      const status = res.status;
      const summary = `${method} ${path} → ${status}: ${text.slice(0, 300)}`;

      if (!retry) throw new HttpError(status, summary, json);

      // 401: refresh once and retry once
      if (status === 401 && auth && attemptNum === 0 && this.refreshToken) {
        console.log(`[api] 401 on ${method} ${path} — refreshing token and retrying`);
        await this.refresh();
        init.headers['Authorization'] = `Bearer ${this.token}`;
        return attempt(0, attemptNum + 1);
      }

      // 429: throttle backoff up to 3 attempts
      if (status === 429 && attemptNum < 3) {
        const backoff = [5000, 15000, 45000][attemptNum];
        console.log(`[api] 429 on ${method} ${path} — backoff ${backoff}ms`);
        return attempt(backoff, attemptNum + 1);
      }

      // 5xx: retry once after 5s
      if (status >= 500 && attemptNum === 0) {
        console.log(`[api] ${status} on ${method} ${path} — retry after 5s`);
        return attempt(5000, attemptNum + 1);
      }

      throw new HttpError(status, summary, json);
    };

    this.requestCount++;
    return attempt(0, 0);
  }
}

class HttpError extends Error {
  constructor(status, message, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { ApiClient, HttpError, sleep };
