import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { defaultConfig, useUserConfig } from '../useUserConfig';

// Expose hook instance for assertions
let hook: ReturnType<typeof useUserConfig>;
function Wrapper({ userId, configName = 'default' }: { userId: string | null; configName?: string }) {
  hook = useUserConfig(userId, configName);
  return null;
}

const mockFetch = () => jest.spyOn(global, 'fetch' as any);

describe('useUserConfig', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('loadConfig success sets config', async () => {
    const userId = 'u1';
    const serverConfig = { ...defaultConfig, userId, configName: 'default', kerf: 0.15 };
    mockFetch().mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ config: serverConfig }) } as any);

    render(<Wrapper userId={userId} />);

    await waitFor(() => expect(hook.config).toEqual(serverConfig));
    expect(hook.error).toBeNull();
  });

  test('loadConfig 404 uses default config', async () => {
    const userId = 'u2';
    mockFetch().mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) } as any);

    render(<Wrapper userId={userId} configName="custom" />);

    await waitFor(() =>
      expect(hook.config).toEqual({ ...defaultConfig, userId, configName: 'custom' })
    );
  });

  test('saveConfig POST when no id, updates state', async () => {
    const userId = 'u3';
    // Initial load 404 -> default
    const spy = mockFetch()
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) } as any)
      // Save POST
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ saved: true }) } as any);

    render(<Wrapper userId={userId} />);
    await waitFor(() => expect(hook.config).toBeTruthy());

    const res = await hook.saveConfig({ kerf: 0.2 });
    expect(res?.success).toBe(true);
    await waitFor(() => expect(hook.config?.kerf).toBe(0.2));
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('saveConfig PUT when config has id', async () => {
    const userId = 'u4';
    const existing = { ...defaultConfig, userId, configName: 'default', id: 'cfg1' } as any;
    const spy = mockFetch()
      // Initial load success with existing config (has id)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ config: existing }) } as any)
      // Save PUT
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ saved: true }) } as any);

    render(<Wrapper userId={userId} />);
    await waitFor(() => expect(hook.config?.id).toBe('cfg1'));

    const res = await hook.saveConfig({ cutPower: 70 });
    expect(res?.success).toBe(true);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('updateConfig merges and triggers autoSave when enabled', async () => {
    const userId = 'u5';
    const loaded = { ...defaultConfig, userId, configName: 'default', autoSave: true };
    const spy = mockFetch()
      // load success
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ config: loaded }) } as any)
      // autoSave call
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ saved: true }) } as any);

    render(<Wrapper userId={userId} />);
    await waitFor(() => expect(hook.config).toBeTruthy());

    hook.updateConfig({ kerf: 0.12 });
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(hook.config?.kerf).toBe(0.12));
  });

  test('deleteConfig success clears config', async () => {
    const userId = 'u6';
    const spy = mockFetch()
      // load 404 -> default
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) } as any)
      // delete OK
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as any);

    render(<Wrapper userId={userId} />);
    await waitFor(() => expect(hook.config).toBeTruthy());

    const res = await hook.deleteConfig();
    expect(res?.success).toBe(true);
    await waitFor(() => expect(hook.config).toBeNull());
  });
});
