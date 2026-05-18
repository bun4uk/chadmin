import React, { useContext } from 'react';
import { ClickThemeContext } from '../ClickThemeProvider';

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const ThemeToggle: React.FC = () => {
  const { theme, toggle } = useContext(ClickThemeContext);
  const title = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  const isDark = theme === 'dark';

  return (
    <span className="inline-flex items-center gap-1.5" title={title}>
      <span className="inline" style={{ opacity: isDark ? 0.4 : 1 }}><SunIcon /></span>
      <button
        type="button"
        onClick={toggle}
        aria-label={title}
        aria-pressed={isDark}
        className="relative inline-block cursor-pointer"
        style={{
          width: 36,
          height: 20,
          borderRadius: 999,
          background: 'var(--accent)',
          border: '1px solid var(--border-1)',
          transition: 'background var(--dur-1) var(--ease-std)',
          padding: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: isDark ? 18 : 2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: 'var(--bg-0)',
            transition: 'left var(--dur-1) var(--ease-std)',
          }}
        />
      </button>
      <span className="inline" style={{ opacity: isDark ? 1 : 0.4 }}><MoonIcon /></span>
    </span>
  );
};

export default ThemeToggle;
