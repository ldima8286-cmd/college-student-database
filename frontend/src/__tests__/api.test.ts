import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApi, handlers } = vi.hoisted(() => {
  const handlers: { request: any[]; response: any[] } = { request: [], response: [] };
  const api = {
    interceptors: {
      request: { use: (fn: any) => { handlers.request.push(fn); } },
      response: { use: (ok: any, err: any) => { handlers.response.push(ok); handlers.response.push(err); } },
    },
    defaults: { headers: {} },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
  };
  return { mockApi: api, handlers };
});

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockApi),
  },
}));

import { login, getRole, isAuthenticated, isAdmin, getStudents, tryRefresh, getCookie, setCookie, clearLocalCookies } from '../api';

function clearAllCookies() {
  document.cookie.split('; ').forEach((c) => {
    const name = c.split('=')[0];
    document.cookie = `${name}=; path=/; max-age=0`;
  });
}

describe('api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAllCookies();
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    mockApi.request.mockReset();
    mockApi.get.mockResolvedValue({ data: { success: true, data: [] } });
    mockApi.post.mockResolvedValue({ data: { success: true, data: {} } });
    mockApi.request.mockImplementation((cfg: any) => Promise.resolve({ data: { success: true, data: {} }, config: cfg }));
  });

  it('login stores credentials via cookies, not localStorage', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { success: true, data: { role: 'admin' } } });
    const result = await login('admin@college.local', 'admin123');
    expect(result.role).toBe('admin');
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_role')).toBeNull();
  });

  it('getRole / isAuthenticated / isAdmin read the role cookie', () => {
    expect(isAuthenticated()).toBe(false);
    setCookie('role', 'admin');
    expect(getRole()).toBe('admin');
    expect(isAuthenticated()).toBe(true);
    expect(isAdmin()).toBe(true);
    clearLocalCookies();
    expect(isAuthenticated()).toBe(false);
  });

  it('attach X-CSRF-Token header to mutating requests when cookie present', () => {
    const requestHandler = handlers.request[0];
    setCookie('x_csrf', 'csrf-123');
    const cfg: any = { method: 'post', url: '/students', headers: {} };
    requestHandler(cfg);
    expect(cfg.headers['X-CSRF-Token']).toBe('csrf-123');
  });

  it('does not attach CSRF header when cookie absent', () => {
    const requestHandler = handlers.request[0];
    const cfg: any = { method: 'post', url: '/students', headers: {} };
    requestHandler(cfg);
    expect(cfg.headers['X-CSRF-Token']).toBeUndefined();
  });

  it('on 401 performs one refresh and retries the original request', async () => {
    const errorHandler = handlers.response[1];
    setCookie('x_csrf', 'csrf-123');
    const error: any = {
      response: { status: 401, data: { error: 'Необходима авторизация' } },
      config: { url: '/students', method: 'get', headers: {} },
    };
    const refreshSpy = mockApi.post.mockResolvedValueOnce({ data: { success: true, data: { role: 'user' } } });
    const retrySpy = mockApi.request.mockImplementationOnce((cfg: any) => Promise.resolve({ data: [], config: cfg }));

    const result = await errorHandler(error);
    expect(refreshSpy).toHaveBeenCalledWith('/auth/refresh', null);
    expect(retrySpy).toHaveBeenCalled();
    expect(result).toEqual({ data: [], config: expect.anything() });
  });

  it('on 401 without valid refresh clears session and rejects', async () => {
    const errorHandler = handlers.response[1];
    setCookie('role', 'user');
    mockApi.post.mockRejectedValueOnce(new Error('Invalid refresh'));
    const error: any = {
      response: { status: 401, data: { error: 'Необходима авторизация' } },
      config: { url: '/students', method: 'get', headers: {} },
    };
    await expect(errorHandler(error)).rejects.toThrow();
    expect(getCookie('role')).toBeUndefined();
    expect(mockApi.request).not.toHaveBeenCalled();
  });

  it('tryRefresh coalesces concurrent refresh calls into a single request', async () => {
    setCookie('x_csrf', 'csrf-123');
    mockApi.post.mockResolvedValue({ data: { success: true, data: { role: 'user' } } });
    await Promise.all([tryRefresh(), tryRefresh(), tryRefresh()]);
    expect(mockApi.post).toHaveBeenCalledTimes(1);
    expect(mockApi.post).toHaveBeenCalledWith('/auth/refresh', null);
  });

  it('getStudents passes params and returns data', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [{ id: '1' }], total: 1 } });
    const res = await getStudents({ page: 1, limit: 20, search: 'Иван' });
    expect(mockApi.get).toHaveBeenCalledWith('/students', { params: { page: 1, limit: 20, search: 'Иван' } });
    expect(res.data).toEqual([{ id: '1' }]);
  });
});