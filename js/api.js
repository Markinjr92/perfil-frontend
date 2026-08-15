const API_BASE = (window.PERFIL_API_BASE || '').replace(/\/$/, '');

async function request(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Erro ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  stats: () => request('/v1/cards/stats'),
  soloStart: (payload) => request('/v1/solo/start', { method: 'POST', body: payload }),
  soloState: (token) => request(`/v1/solo/${token}`),
  soloReveal: (token) => request(`/v1/solo/${token}/reveal`, { method: 'POST', body: {} }),
  soloGuess: (token, guess) =>
    request(`/v1/solo/${token}/guess`, { method: 'POST', body: { guess } }),
  soloGiveUp: (token) => request(`/v1/solo/${token}/give-up`, { method: 'POST', body: {} }),
  createRoom: (nickname) => request('/v1/rooms', { method: 'POST', body: { nickname } }),
  joinRoom: (code, nickname) =>
    request(`/v1/rooms/${code}/join`, { method: 'POST', body: { nickname } }),
  roomState: (code, playerToken) =>
    request(`/v1/rooms/${code}`, {
      headers: playerToken ? { 'X-Player-Token': playerToken } : {},
    }),
  roomStart: (code, hostToken, category) =>
    request(`/v1/rooms/${code}/start`, {
      method: 'POST',
      headers: { 'X-Host-Token': hostToken },
      body: { category },
    }),
  roomReveal: (code, hostToken) =>
    request(`/v1/rooms/${code}/reveal`, {
      method: 'POST',
      headers: { 'X-Host-Token': hostToken },
      body: {},
    }),
  roomGuess: (code, playerToken, guess) =>
    request(`/v1/rooms/${code}/guess`, {
      method: 'POST',
      headers: { 'X-Player-Token': playerToken },
      body: { guess },
    }),
};
