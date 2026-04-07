const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Request failed (${response.status}): ${message}`);
  }
  return response.json();
}

export function collectFingerprint(data) {
  return request('/api/collect', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getUsers() {
  return request('/api/users');
}

export function getUserDevices(userId) {
  return request(`/api/users/${userId}/devices`);
}

export function getScoringWeights() {
  return request('/api/scoring/weights');
}

export function updateScoringWeights(weights) {
  return request('/api/scoring/weights', {
    method: 'PUT',
    body: JSON.stringify(weights),
  });
}

export function getScoringConfig() {
  return request('/api/scoring/config');
}

export function updateScoringConfig(config) {
  return request('/api/scoring/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

export function previewScoring(proposedConfig) {
  return request('/api/scoring/preview', {
    method: 'POST',
    body: JSON.stringify(proposedConfig),
  });
}

export function seedDemoUser(payload) {
  return request('/api/admin/seed', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getSeedSummary() {
  return request('/api/admin/seed/summary');
}

export function clearSeedData() {
  return request('/api/admin/seed', {
    method: 'DELETE',
  });
}

export function resetScoringWeights() {
  return request('/api/scoring/weights/reset', { method: 'POST' });
}

export function resetScoringConfig() {
  return request('/api/scoring/config/reset', { method: 'POST' });
}

export function seedScenario() {
  return request('/api/admin/seed/scenario', { method: 'POST' });
}

export function getDeviceInvestigation(userId, deviceId) {
  return request(`/api/users/${userId}/devices/${deviceId}/investigation`);
}
