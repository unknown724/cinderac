import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'system' | 'light' | 'dark';

interface SettingsState {
  themeMode: ThemeMode;
  landingPage: string; // The route path, e.g., "/profile"
  setThemeMode: (mode: ThemeMode) => void;
  setLandingPage: (page: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'system', 
      landingPage: '/profile', // Default to Dashboard
      setThemeMode: (mode) => set({ themeMode: mode }),
      setLandingPage: (page) => set({ landingPage: page }),
    }),
    {
      name: 'app-settings', // unique name for storage key
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
