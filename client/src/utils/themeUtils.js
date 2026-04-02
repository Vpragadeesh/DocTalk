/**
 * Theme Utilities and Helper Functions
 * Provides utilities for working with the light/dark theme system
 */

/**
 * Get the current theme from localStorage
 * @returns {string} 'light' or 'dark'
 */
export const getStoredTheme = () => {
  return localStorage.getItem('theme') || 'light';
};

/**
 * Get the current theme from the DOM
 * @returns {string} 'light' or 'dark'
 */
export const getCurrentTheme = () => {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
};

/**
 * Get color based on current theme
 * @param {object} colors - Object with 'light' and 'dark' keys
 * @returns {string} Appropriate color for current theme
 */
export const getThemeColor = (colors) => {
  const theme = getCurrentTheme();
  return colors[theme] || colors.light;
};

/**
 * Theme color palettes for different themes
 */
export const themeColors = {
  light: {
    // backgrounds
    bgPrimary: '#f8f5f2',
    bgSecondary: '#ffffff',
    bgTertiary: '#fafaf9',
    bgHover: '#e7e5e4',
    
    // text colors
    textPrimary: '#1c1917',
    textSecondary: '#57534e',
    textTertiary: '#78716c',
    textPlaceholder: '#a8a29e',
    
    // accents & status
    accentPrimary: '#d97706',
    accentHover: '#b45309',
    accentLight: '#fef3c7',
    borderLight: '#e7e5e4',
    borderMedium: '#d6d3d1',
    
    // message bubbles
    aiBg: '#f5f5f4',
    userBg: '#e7dac6',
    
    // status colors
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
  },
  dark: {
    // backgrounds
    bgPrimary: '#020617',
    bgSecondary: '#1e293b',
    bgTertiary: '#0f172a',
    bgHover: '#334155',
    
    // text colors
    textPrimary: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textTertiary: '#94a3b8',
    textPlaceholder: '#64748b',
    
    // accents & status
    accentPrimary: '#7c3aed',
    accentHover: '#06b6d4',
    accentLight: '#6d28d9',
    borderLight: '#334355',
    borderMedium: '#475569',
    
    // message bubbles
    aiBg: '#1e293b',
    userBg: '#1e2f4a',
    
    // status colors
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
  },
};

/**
 * Check if current theme is light
 * @returns {boolean}
 */
export const isLightTheme = () => {
  return getCurrentTheme() === 'light';
};

/**
 * Check if current theme is dark
 * @returns {boolean}
 */
export const isDarkTheme = () => {
  return getCurrentTheme() === 'dark';
};

/**
 * Get all theme colors for current theme
 * @returns {object} Theme colors object
 */
export const getCurrentThemeColors = () => {
  const theme = getCurrentTheme();
  return themeColors[theme];
};

/**
 * Apply theme-specific CSS class names
 * Useful for conditional styling in React
 * @param {string} lightClass - Class for light theme
 * @param {string} darkClass - Class for dark theme
 * @returns {string} Appropriate class name(s)
 */
export const getThemeClass = (lightClass, darkClass) => {
  return getCurrentTheme() === 'light' ? lightClass : darkClass;
};

/**
 * Debounced theme change listener
 * Use in useEffect to listen to theme changes
 */
export const createThemeChangeListener = (callback) => {
  const handleChange = () => {
    callback(getCurrentTheme());
  };
  
  window.addEventListener('themechange', handleChange);
  return () => window.removeEventListener('themechange', handleChange);
};

export default {
  getStoredTheme,
  getCurrentTheme,
  getThemeColor,
  themeColors,
  isLightTheme,
  isDarkTheme,
  getCurrentThemeColors,
  getThemeClass,
  createThemeChangeListener,
};
