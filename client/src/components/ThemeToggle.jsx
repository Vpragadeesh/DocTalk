import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ variant = 'icon', className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'light' ? 'dark' : 'light';

  const baseClasses = 'inline-flex items-center justify-center rounded-lg border border-[var(--border-light)] bg-[var(--bg-tertiary)] text-[var(--accent-primary)] transition-colors duration-200 hover:bg-[var(--bg-hover)]';
  const variantClasses = {
    icon: 'h-10 w-10 p-2',
    header: 'h-9 w-9 p-2',
    pill: 'gap-2 px-3 py-2 text-sm font-medium',
  };

  const resolvedClasses = `${baseClasses} ${variantClasses[variant] || variantClasses.icon} ${className}`.trim();

  return (
    <button
      onClick={toggleTheme}
      className={resolvedClasses}
      aria-label="Toggle theme"
      title={`Switch to ${nextTheme} theme`}
    >
      {theme === 'light' ? (
        <Moon size={20} />
      ) : (
        <Sun size={20} />
      )}
      {variant === 'pill' && (
        <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
      )}
    </button>
  );
}
