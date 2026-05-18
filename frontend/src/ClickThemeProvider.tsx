import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { ClickUIProvider, ThemeName } from '@clickhouse/click-ui';

type ThemeContextValue = {
  theme: ThemeName;
  toggle: () => void;
  setTheme: (next: ThemeName) => void;
};

export const ClickThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggle: () => {},
  setTheme: () => {},
});

const STORAGE_KEY = 'theme';

interface Props {
  children: React.ReactNode;
}

export const ClickThemeProvider: React.FC<Props> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' ? 'light' : 'dark';
  });

  const applyDomClass = useCallback((mode: ThemeName) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (mode === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, []);

  useEffect(() => {
    applyDomClass(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, applyDomClass]);

  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const ctx = useMemo<ThemeContextValue>(() => ({ theme, toggle, setTheme }), [theme, toggle, setTheme]);

  return (
    <ClickThemeContext.Provider value={ctx}>
      <ClickUIProvider theme={theme} config={{ tooltip: { delayDuration: 0 } }}>
        {children}
      </ClickUIProvider>
    </ClickThemeContext.Provider>
  );
};

export default ClickThemeProvider;


