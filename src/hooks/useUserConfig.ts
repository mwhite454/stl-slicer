import { useState, useEffect, useCallback } from 'react';

export interface UserConfig {
  id?: string;
  userId: string;
  configName: string;
  laserCutterWidth: number;
  laserCutterHeight: number;
  kerf: number;
  layerHeight: number;
  defaultAxis: 'x' | 'y' | 'z';
  materialThickness: number;
  cutSpeed: number;
  cutPower: number;
  partSpacing: number;
  margin: number;
  optimizeLayout: boolean;
  theme: 'light' | 'dark';
  units: 'mm' | 'inch';
  autoSave: boolean;
  showKerfPreview: boolean;
  customSettings: Record<string, any>;
}

export const defaultConfig: Omit<UserConfig, 'id' | 'userId'> = {
  configName: 'default',
  laserCutterWidth: 300.0,
  laserCutterHeight: 200.0,
  kerf: 0.1,
  layerHeight: 3.0,
  defaultAxis: 'z',
  materialThickness: 3.0,
  cutSpeed: 10.0,
  cutPower: 80.0,
  partSpacing: 2.0,
  margin: 5.0,
  optimizeLayout: true,
  theme: 'light',
  units: 'mm',
  autoSave: true,
  showKerfPreview: true,
  customSettings: {},
};

export function useUserConfig(userId: string | null, configName: string = 'default') {
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/user-config?userId=${userId}&configName=${configName}`);
      
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      } else if (response.status === 404) {
        // Config doesn't exist, use default
        setConfig({ ...defaultConfig, userId, configName });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load configuration');
      }
    } catch (err) {
      setError('Network error while loading configuration');
      console.error('Error loading config:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, configName]);

  const saveConfig = useCallback(async (newConfig: Partial<UserConfig>) => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const configToSave: UserConfig = { 
        ...defaultConfig, 
        ...config, 
        ...newConfig, 
        userId, 
        configName 
      };
      
      const response = await fetch('/api/user-config', {
        method: config?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configToSave),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(configToSave);
        return { success: true, data };
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save configuration');
        return { success: false, error: errorData.error };
      }
    } catch (err) {
      const errorMessage = 'Network error while saving configuration';
      setError(errorMessage);
      console.error('Error saving config:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [config, userId, configName]);

  const updateConfig = useCallback((updates: Partial<UserConfig>) => {
    if (config) {
      const updatedConfig = { ...config, ...updates };
      setConfig(updatedConfig);
      
      // Auto-save if enabled
      if (updatedConfig.autoSave) {
        saveConfig(updates);
      }
    }
  }, [config, saveConfig]);

  const deleteConfig = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/user-config?userId=${userId}&configName=${configName}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConfig(null);
        return { success: true };
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete configuration');
        return { success: false, error: errorData.error };
      }
    } catch (err) {
      const errorMessage = 'Network error while deleting configuration';
      setError(errorMessage);
      console.error('Error deleting config:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [userId, configName]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    loading,
    error,
    loadConfig,
    saveConfig,
    updateConfig,
    deleteConfig,
  };
}
