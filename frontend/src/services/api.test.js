import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  collectFingerprint,
  getUsers,
  getUserDevices,
  getScoringWeights,
  updateScoringWeights,
  getScoringConfig,
  updateScoringConfig,
  previewScoring,
  seedDemoUser,
  getSeedSummary,
  clearSeedData,
  resetScoringWeights,
  resetScoringConfig,
  seedScenario,
  getDeviceInvestigation,
} from './api';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    statusText: 'OK',
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('api service', () => {
  it('collectFingerprint posts to /api/collect with correct headers', async () => {
    const payload = { name: 'testuser', platform: 'Linux' };
    const responseData = { userId: '1', deviceId: 'd1', matchResult: 'NEW_DEVICE' };
    mockFetch.mockResolvedValueOnce(jsonResponse(responseData));

    const result = await collectFingerprint(payload);

    expect(mockFetch).toHaveBeenCalledWith('/api/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual(responseData);
  });

  it('getUsers fetches /api/users', async () => {
    const users = [{ id: '1', name: 'userA', deviceCount: 2 }];
    mockFetch.mockResolvedValueOnce(jsonResponse(users));

    const result = await getUsers();

    expect(mockFetch).toHaveBeenCalledWith('/api/users', {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(result).toEqual(users);
  });

  it('getUserDevices fetches /api/users/{userId}/devices', async () => {
    const devices = [{ id: 'd1', label: 'Chrome on Linux' }];
    mockFetch.mockResolvedValueOnce(jsonResponse(devices));

    const result = await getUserDevices('u1');

    expect(mockFetch).toHaveBeenCalledWith('/api/users/u1/devices', {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(result).toEqual(devices);
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
      statusText: 'Internal Server Error',
    });

    await expect(getUsers()).rejects.toThrow('Request failed (500)');
  });

  it('throws when text() also fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: () => Promise.reject(new Error('stream error')),
      statusText: 'Bad Gateway',
    });

    await expect(getUsers()).rejects.toThrow('Request failed (502): Bad Gateway');
  });

  it('getScoringWeights fetches /api/scoring/weights', async () => {
    const weights = { platform: { weight: 10, enabled: true } };
    mockFetch.mockResolvedValueOnce(jsonResponse(weights));

    const result = await getScoringWeights();
    expect(result).toEqual(weights);
  });

  it('updateScoringWeights puts to /api/scoring/weights', async () => {
    const weights = { platform: { weight: 20, enabled: true } };
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));

    await updateScoringWeights(weights);

    expect(mockFetch).toHaveBeenCalledWith('/api/scoring/weights', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(weights),
    });
  });

  it('getScoringConfig fetches /api/scoring/config', async () => {
    const config = { sameDeviceThreshold: 80, driftThreshold: 50 };
    mockFetch.mockResolvedValueOnce(jsonResponse(config));

    const result = await getScoringConfig();
    expect(result).toEqual(config);
  });

  it('updateScoringConfig puts to /api/scoring/config', async () => {
    const config = { sameDeviceThreshold: 85, driftThreshold: 55 };
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));

    await updateScoringConfig(config);

    expect(mockFetch).toHaveBeenCalledWith('/api/scoring/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  });

  it('previewScoring posts to /api/scoring/preview', async () => {
    const proposed = { sameDeviceThreshold: 90 };
    mockFetch.mockResolvedValueOnce(jsonResponse({ preview: true }));

    await previewScoring(proposed);

    expect(mockFetch).toHaveBeenCalledWith('/api/scoring/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proposed),
    });
  });

  it('seedDemoUser posts to /api/admin/seed', async () => {
    const payload = {
      userName: 'demo-user-alpha',
      browser: 'chrome',
      vpn: false,
      incognito: false,
    };
    mockFetch.mockResolvedValueOnce(jsonResponse({ userId: '1' }));

    await seedDemoUser(payload);

    expect(mockFetch).toHaveBeenCalledWith('/api/admin/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  it('getSeedSummary fetches /api/admin/seed/summary', async () => {
    const summary = { users: 2, devices: 4, fingerprints: 10 };
    mockFetch.mockResolvedValueOnce(jsonResponse(summary));

    const result = await getSeedSummary();
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/seed/summary', {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(result).toEqual(summary);
  });

  it('clearSeedData deletes /api/admin/seed', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ users: 1, devices: 1, fingerprints: 1 }));

    await clearSeedData();
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/seed', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('resetScoringWeights posts to /api/scoring/weights/reset', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ canvas_hash: { weight: 90, enabled: true } }));

    await resetScoringWeights();
    expect(mockFetch).toHaveBeenCalledWith('/api/scoring/weights/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('resetScoringConfig posts to /api/scoring/config/reset', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ sameDeviceThreshold: 85, driftThreshold: 60 }));

    await resetScoringConfig();
    expect(mockFetch).toHaveBeenCalledWith('/api/scoring/config/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('seedScenario posts to /api/admin/seed/scenario', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await seedScenario();
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/seed/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('getDeviceInvestigation fetches the per-device investigation endpoint', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ deviceId: 'd1', visits: [] }));

    await getDeviceInvestigation('u1', 'd1');
    expect(mockFetch).toHaveBeenCalledWith('/api/users/u1/devices/d1/investigation', {
      headers: { 'Content-Type': 'application/json' },
    });
  });
});
