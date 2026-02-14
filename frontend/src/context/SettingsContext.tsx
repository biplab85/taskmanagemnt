import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface AppSettings {
  brandColor: string;
  fontFamily: string;
  defaultTheme: 'light' | 'dark';
  logoText: string;
  logoUrl: string | null;
  projectName: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  brandColor: '#2563eb',
  fontFamily: 'Inter',
  defaultTheme: 'light',
  logoText: 'S',
  logoUrl: null,
  projectName: 'SKLENTR',
};

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter', stack: "'Inter', system-ui, sans-serif" },
  { value: 'Poppins', label: 'Poppins', stack: "'Poppins', system-ui, sans-serif" },
  { value: 'DM Sans', label: 'DM Sans', stack: "'DM Sans', system-ui, sans-serif" },
  { value: 'Outfit', label: 'Outfit', stack: "'Outfit', system-ui, sans-serif" },
  { value: 'System', label: 'System Default', stack: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
];

const COLOR_PRESETS = [
  { value: '#2563eb', label: 'Blue' },
  { value: '#7c3aed', label: 'Violet' },
  { value: '#059669', label: 'Emerald' },
  { value: '#dc2626', label: 'Red' },
  { value: '#ea580c', label: 'Orange' },
  { value: '#0891b2', label: 'Cyan' },
  { value: '#d946ef', label: 'Fuchsia' },
  { value: '#4f46e5', label: 'Indigo' },
];

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
  fontOptions: typeof FONT_OPTIONS;
  colorPresets: typeof COLOR_PRESETS;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

function generateColorScale(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const lighten = (amount: number) => {
    const lr = Math.round(r + (255 - r) * amount);
    const lg = Math.round(g + (255 - g) * amount);
    const lb = Math.round(b + (255 - b) * amount);
    return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
  };

  const darken = (amount: number) => {
    const dr = Math.round(r * (1 - amount));
    const dg = Math.round(g * (1 - amount));
    const db = Math.round(b * (1 - amount));
    return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
  };

  return {
    50: lighten(0.95),
    100: lighten(0.9),
    200: lighten(0.75),
    300: lighten(0.55),
    400: lighten(0.3),
    500: hex,
    600: darken(0.1),
    700: darken(0.25),
    800: darken(0.4),
    900: darken(0.55),
    950: darken(0.75),
  };
}

function applySettings(settings: AppSettings) {
  const root = document.documentElement;

  // Apply brand color scale as CSS variables
  const scale = generateColorScale(settings.brandColor);
  Object.entries(scale).forEach(([key, value]) => {
    root.style.setProperty(`--color-brand-${key}`, value);
  });

  // Apply primary color to shadcn variables
  root.style.setProperty('--primary', settings.brandColor);
  root.style.setProperty('--ring', settings.brandColor);

  // Apply font family
  const fontOption = FONT_OPTIONS.find((f) => f.value === settings.fontFamily);
  if (fontOption) {
    root.style.setProperty('--font-family', fontOption.stack);
    document.body.style.fontFamily = fontOption.stack;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  // Read stored settings after hydration to avoid mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem('app-settings');
      if (stored) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  useEffect(() => {
    applySettings(settings);
    if (mounted) {
      localStorage.setItem('app-settings', JSON.stringify(settings));
    }
  }, [settings, mounted]);

  // Load Google Fonts dynamically
  useEffect(() => {
    if (settings.fontFamily !== 'System') {
      const linkId = 'google-font-link';
      let link = document.getElementById(linkId) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      link.href = `https://fonts.googleapis.com/css2?family=${settings.fontFamily.replace(' ', '+')}:wght@300;400;500;600;700&display=swap`;
    }
  }, [settings.fontFamily]);

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('app-settings');
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, fontOptions: FONT_OPTIONS, colorPresets: COLOR_PRESETS }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}
