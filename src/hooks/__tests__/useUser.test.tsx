import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useUser } from '../useUser';

// Utility to expose hook outside a component
let hook: ReturnType<typeof useUser>;
function Wrapper() {
  hook = useUser();
  return null;
}

const mockFetch = () => jest.spyOn(global, 'fetch' as any);

describe('useUser', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('getUserByEmail success sets user', async () => {
    const user = { id: 'u1', email: 'a@example.com', created_at: '', updated_at: '' };
    mockFetch().mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ user }) } as any);

    render(<Wrapper />);

    const res = await hook.getUserByEmail('a@example.com');
    expect(res.success).toBe(true);

    await waitFor(() => expect(hook.user).toEqual(user));
    expect(hook.error).toBeNull();
  });

  test('getUserByEmail 404 clears user', async () => {
    mockFetch().mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) } as any);

    render(<Wrapper />);
    const res = await hook.getUserByEmail('nope@example.com');

    expect(res.success).toBe(false);
    await waitFor(() => expect(hook.user).toBeNull());
  });

  test('createUser success triggers user fetch and returns id', async () => {
    // POST create
    mockFetch()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ userId: 'new123' }) } as any)
      // GET by email after create
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ user: { id: 'new123', email: 'b@example.com', created_at: '', updated_at: '' } }) } as any);

    render(<Wrapper />);
    const res = await hook.createUser('b@example.com', 'Bee');

    expect(res.success).toBe(true);
    expect(res.userId).toBe('new123');
    await waitFor(() => expect(hook.user?.id).toBe('new123'));
  });

  test('updateUser success refreshes user', async () => {
    // PUT update
    mockFetch()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as any)
      // GET by id after update
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ user: { id: 'u3', email: 'c@example.com', created_at: '', updated_at: '' } }) } as any);

    render(<Wrapper />);
    const res = await hook.updateUser('u3', { email: 'c@example.com' });

    expect(res.success).toBe(true);
    await waitFor(() => expect(hook.user?.email).toBe('c@example.com'));
  });

  test('loginOrCreateUser returns existing user', async () => {
    const user = { id: 'u4', email: 'd@example.com', created_at: '', updated_at: '' };
    // GET by email finds user
    mockFetch().mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ user }) } as any);

    render(<Wrapper />);
    const res = await hook.loginOrCreateUser('d@example.com');

    expect(res.success).toBe(true);
    expect(res.isNewUser).toBe(false);
    expect(res.user).toEqual(user);
  });

  test('loginOrCreateUser creates when not found', async () => {
    // GET by email 404
    const spy = mockFetch()
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) } as any)
      // POST create
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ userId: 'new555' }) } as any)
      // GET after create
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ user: { id: 'new555', email: 'e@example.com', created_at: '', updated_at: '' } }) } as any);

    render(<Wrapper />);
    const res = await hook.loginOrCreateUser('e@example.com');

    expect(res.success).toBe(true);
    expect(res.isNewUser).toBe(true);
    await waitFor(() => expect(hook.user?.id).toBe('new555'));
    expect(spy).toHaveBeenCalled();
  });
});
