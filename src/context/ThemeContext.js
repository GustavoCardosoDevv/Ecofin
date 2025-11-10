import React, { createContext, useContext, useState, useMemo } from 'react';
import { Appearance } from 'react-native';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemScheme = Appearance.getColorScheme();
  const [theme, setTheme] = useState(systemScheme || 'light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const colors = useMemo(
    () =>
      theme === 'dark'
        ? {
            bg: '#0F172A',
            card: '#1E293B',
            text: '#F1F5F9',
            sub: '#94A3B8',
            primary: '#3B82F6',
            border: '#334155',
            red: '#DC2626',
            green: '#16A34A',
          }
        : {
            bg: '#F5F7FB',
            card: '#FFFFFF',
            text: '#0F2D52',
            sub: '#6B7280',
            primary: '#588DB0',
            border: '#E5E7EB',
            red: '#DC2626',
            green: '#16A34A',
          },
    [theme]
  );

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
