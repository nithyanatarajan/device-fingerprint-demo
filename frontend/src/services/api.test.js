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
});
