import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRole, isAdmin, isAuthenticated } from '../api';

beforeEach(() => {
  localStorage.clear();
});

describe('auth helpers', () => {
  it('getRole returns null when not logged in', () => {
    expect(getRole()).toBeNull();
  });

  it('isAdmin returns false when not logged in', () => {
    expect(isAdmin()).toBe(false);
  });

  it('isAuthenticated returns false when not logged in', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('isAdmin returns true when role is admin', () => {
    localStorage.setItem('auth_role', 'admin');
    expect(isAdmin()).toBe(true);
  });

  it('isAuthenticated returns true when token exists', () => {
    localStorage.setItem('auth_token', 'test-token');
    expect(isAuthenticated()).toBe(true);
  });
});
