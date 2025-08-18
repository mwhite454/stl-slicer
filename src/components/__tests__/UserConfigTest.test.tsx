import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { UserConfigTest } from '../UserConfigTest';

jest.mock('@/hooks/useUser', () => ({
  useUser: jest.fn(),
}));

jest.mock('@/hooks/useUserConfig', () => ({
  useUserConfig: jest.fn(),
}));

const useUser = require('@/hooks/useUser').useUser as jest.Mock;
const useUserConfig = require('@/hooks/useUserConfig').useUserConfig as jest.Mock;

describe('UserConfigTest component', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('login flow triggers loginOrCreateUser with entered email', async () => {
    const loginOrCreateUser = jest.fn();
    useUser.mockReturnValue({
      user: null,
      loading: false,
      error: null,
      loginOrCreateUser,
    });
    useUserConfig.mockReturnValue({
      config: null,
      loading: false,
      error: null,
      updateConfig: jest.fn(),
      saveConfig: jest.fn(),
      deleteConfig: jest.fn(),
    });

    render(
      <MantineProvider>
        <UserConfigTest />
      </MantineProvider>
    );

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

    const button = screen.getByRole('button', { name: /login \/\s*create user/i });
    fireEvent.click(button);

    expect(loginOrCreateUser).toHaveBeenCalledWith('user@example.com', '');
  });

  test('manual save calls saveConfig when autoSave is disabled', async () => {
    useUser.mockReturnValue({
      user: { id: 'u1', email: 'user@example.com' },
      loading: false,
      error: null,
      loginOrCreateUser: jest.fn(),
    });

    const saveConfig = jest.fn();
    useUserConfig.mockReturnValue({
      config: {
        configName: 'default',
        laserCutterWidth: 300,
        laserCutterHeight: 200,
        kerf: 0.1,
        layerHeight: 3,
        defaultAxis: 'z',
        materialThickness: 3,
        cutSpeed: 10,
        cutPower: 80,
        partSpacing: 2,
        margin: 5,
        optimizeLayout: true,
        theme: 'light',
        units: 'mm',
        autoSave: false,
        showKerfPreview: true,
        customSettings: {},
        userId: 'u1',
      },
      loading: false,
      error: null,
      updateConfig: jest.fn(),
      saveConfig,
      deleteConfig: jest.fn(),
    });

    render(
      <MantineProvider>
        <UserConfigTest />
      </MantineProvider>
    );

    const saveBtn = screen.getByRole('button', { name: /save configuration/i });
    fireEvent.click(saveBtn);

    expect(saveConfig).toHaveBeenCalled();
  });

  test('toggling Optimize Layout calls updateConfig', async () => {
    useUser.mockReturnValue({
      user: { id: 'u2', email: 'a@b.com' },
      loading: false,
      error: null,
      loginOrCreateUser: jest.fn(),
    });

    const updateConfig = jest.fn();
    useUserConfig.mockReturnValue({
      config: {
        configName: 'default',
        laserCutterWidth: 300,
        laserCutterHeight: 200,
        kerf: 0.1,
        layerHeight: 3,
        defaultAxis: 'z',
        materialThickness: 3,
        cutSpeed: 10,
        cutPower: 80,
        partSpacing: 2,
        margin: 5,
        optimizeLayout: false,
        theme: 'light',
        units: 'mm',
        autoSave: false,
        showKerfPreview: true,
        customSettings: {},
        userId: 'u2',
      },
      loading: false,
      error: null,
      updateConfig,
      saveConfig: jest.fn(),
      deleteConfig: jest.fn(),
    });

    render(
      <MantineProvider>
        <UserConfigTest />
      </MantineProvider>
    );

    const optimizeSwitch = screen.getByLabelText('Optimize Layout');
    fireEvent.click(optimizeSwitch);

    expect(updateConfig).toHaveBeenCalled();
  });
});
