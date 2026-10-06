import { useCallback } from 'react';
import { getAllSettings, getSetting, type SettingKey, type SettingsMap } from '@/db/repos/settings';
import { useActions } from '../actions';
import { useLiveData } from '@/data/use-live-data';

export function useSettings(): SettingsMap {
  return useLiveData(['settings'], '', getAllSettings);
}

export function useSetting<K extends SettingKey>(key: K): readonly [SettingsMap[K], (value: SettingsMap[K]) => void] {
  const value = useLiveData(['settings'], key, (db) => getSetting(db, key));
  const actions = useActions();
  const set = useCallback((next: SettingsMap[K]) => actions.settings.set(key, next), [actions, key]);
  return [value, set] as const;
}
