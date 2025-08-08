'use client';

import { useState } from 'react';
import { Button, TextInput, NumberInput, Switch, Group, Stack, Card, Text, Alert, Loader } from '@mantine/core';
import { useUser } from '@/hooks/useUser';
import { useUserConfig } from '@/hooks/useUserConfig';

export function UserConfigTest() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const { user, loading: userLoading, error: userError, loginOrCreateUser } = useUser();
  const { config, loading: configLoading, error: configError, updateConfig, saveConfig } = useUserConfig(user?.id || null);

  const handleLogin = async () => {
    if (!email) return;
    await loginOrCreateUser(email, name);
  };

  const handleConfigUpdate = (field: string, value: any) => {
    updateConfig({ [field]: value });
  };

  const handleManualSave = async () => {
    if (config) {
      await saveConfig(config);
    }
  };

  const initializeDatabase = async () => {
    try {
      const response = await fetch('/api/db-init', { method: 'POST' });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        alert(`HTTP Error ${response.status}: Check console for details`);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        alert('Database initialized successfully!');
      } else {
        console.error('Database init failed:', data);
        alert(`Database initialization failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Full error:', error);
      alert(`Error: ${error}`);
    }
  };

  const testConnection = async () => {
    try {
      const response = await fetch('/api/db-init');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        alert(`HTTP Error ${response.status}: Check console for details`);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        alert('Database connection successful!');
      } else {
        console.error('Connection test failed:', data);
        alert(`Database connection failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Full error:', error);
      alert(`Error: ${error}`);
    }
  };

  return (
    <Stack gap="md" style={{ maxWidth: 600, margin: '0 auto', padding: '20px' }}>
      <Card withBorder>
        <Text size="lg" fw={600} mb="md">Turso Database Test</Text>
        
        <Group mb="md">
          <Button onClick={testConnection} variant="outline">
            Test Connection
          </Button>
          <Button onClick={initializeDatabase} color="blue">
            Initialize Database
          </Button>
        </Group>
      </Card>

      <Card withBorder>
        <Text size="lg" fw={600} mb="md">User Management</Text>
        
        {!user ? (
          <Stack gap="sm">
            <TextInput
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextInput
              label="Name (optional)"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button 
              onClick={handleLogin} 
              loading={userLoading}
              disabled={!email}
            >
              Login / Create User
            </Button>
          </Stack>
        ) : (
          <Stack gap="sm">
            <Text>Welcome, {user.name || user.email}!</Text>
            <Text size="sm" c="dimmed">User ID: {user.id}</Text>
          </Stack>
        )}

        {userError && (
          <Alert color="red" mt="sm">
            {userError}
          </Alert>
        )}
      </Card>

      {user && (
        <Card withBorder>
          <Text size="lg" fw={600} mb="md">Laser Cutting Configuration</Text>
          
          {configLoading ? (
            <Loader size="sm" />
          ) : config ? (
            <Stack gap="sm">
              <NumberInput
                label="Laser Cutter Width (mm)"
                value={config.laserCutterWidth}
                onChange={(value) => handleConfigUpdate('laserCutterWidth', value || 300)}
                min={50}
                max={1000}
              />
              
              <NumberInput
                label="Laser Cutter Height (mm)"
                value={config.laserCutterHeight}
                onChange={(value) => handleConfigUpdate('laserCutterHeight', value || 200)}
                min={50}
                max={1000}
              />
              
              <NumberInput
                label="Kerf (mm)"
                value={config.kerf}
                onChange={(value) => handleConfigUpdate('kerf', value || 0.1)}
                step={0.01}
                min={0.01}
                max={1.0}
                decimalScale={2}
              />
              
              <NumberInput
                label="Layer Height (mm)"
                value={config.layerHeight}
                onChange={(value) => handleConfigUpdate('layerHeight', value || 3.0)}
                step={0.1}
                min={0.1}
                max={50}
                decimalScale={1}
              />
              
              <NumberInput
                label="Material Thickness (mm)"
                value={config.materialThickness}
                onChange={(value) => handleConfigUpdate('materialThickness', value || 3.0)}
                step={0.1}
                min={0.1}
                max={50}
                decimalScale={1}
              />
              
              <NumberInput
                label="Cut Speed (mm/s)"
                value={config.cutSpeed}
                onChange={(value) => handleConfigUpdate('cutSpeed', value || 10)}
                min={1}
                max={100}
              />
              
              <NumberInput
                label="Cut Power (%)"
                value={config.cutPower}
                onChange={(value) => handleConfigUpdate('cutPower', value || 80)}
                min={1}
                max={100}
              />
              
              <NumberInput
                label="Part Spacing (mm)"
                value={config.partSpacing}
                onChange={(value) => handleConfigUpdate('partSpacing', value || 2.0)}
                step={0.1}
                min={0}
                max={20}
                decimalScale={1}
              />
              
              <Switch
                label="Optimize Layout"
                checked={config.optimizeLayout}
                onChange={(event) => handleConfigUpdate('optimizeLayout', event.currentTarget.checked)}
              />
              
              <Switch
                label="Show Kerf Preview"
                checked={config.showKerfPreview}
                onChange={(event) => handleConfigUpdate('showKerfPreview', event.currentTarget.checked)}
              />
              
              <Switch
                label="Auto Save"
                checked={config.autoSave}
                onChange={(event) => handleConfigUpdate('autoSave', event.currentTarget.checked)}
              />
              
              <Group mt="md">
                <Button onClick={handleManualSave} disabled={config.autoSave}>
                  Save Configuration
                </Button>
                <Text size="sm" c="dimmed">
                  {config.autoSave ? 'Auto-save enabled' : 'Manual save required'}
                </Text>
              </Group>
            </Stack>
          ) : (
            <Text>No configuration found</Text>
          )}

          {configError && (
            <Alert color="red" mt="sm">
              {configError}
            </Alert>
          )}
        </Card>
      )}
    </Stack>
  );
}
