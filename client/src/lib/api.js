const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, { status = 0, errors, code } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors; // { fieldName: "message" } for inline form errors
    this.code = code;
  }
}

async function request(path, { method = 'GET', body, token, signal, blob = false } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError('Network error. Please check your connection and try again.');
  }

  if (blob && res.ok) return res.blob();

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (!res.ok) {
    throw new ApiError(data?.message || `Request failed (${res.status})`, {
      status: res.status,
      errors: data?.errors,
      code: data?.code,
    });
  }
  return data;
}

const qs = (params) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export const api = {
  // public
  getConfig: (signal) => request('/config', { signal }),
  lookupTicketByEmail: (email) => request(`/ticket/${encodeURIComponent(email)}`),
  register: (payload) => request('/register', { method: 'POST', body: payload }),
  verifyRegistration: (payload) => request('/register/verify', { method: 'POST', body: payload }),

  // admin
  login: (email, password) => request('/admin/login', { method: 'POST', body: { email, password } }),
  stats: (token, signal) => request('/admin/stats', { token, signal }),
  participants: (token, params, signal) => request(`/admin/participants${qs(params)}`, { token, signal }),
  exportCsv: (token, params) => request(`/admin/participants/export${qs(params)}`, { token, blob: true }),
  resetParticipantStatus: (token, participantId) => request(`/admin/participants/${participantId}/status`, { method: 'PATCH', body: { status: 'eligible' }, token }),
  resetAllParticipants: (token) => request('/admin/participants/reset-all', { method: 'PATCH', token }),
  deleteParticipant: (token, participantId) => request(`/admin/participants/${participantId}`, { method: 'DELETE', token }),
  deleteAllParticipants: (token) => request('/admin/participants', { method: 'DELETE', token }),
  drawState: (token, signal) => request('/admin/draw/state', { token, signal }),
  drawHistory: (token, signal) => request('/admin/draw/history', { token, signal }),
  draw: (token, prizeId) => request('/admin/draw', { method: 'POST', body: { prizeId }, token }),
};
