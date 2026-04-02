import React from 'react';
import { AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4 text-[var(--text-primary)]">
          <div className="max-w-md w-full card text-center">
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{
                background: 'color-mix(in srgb, var(--error) 18%, transparent)',
                border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)',
              }}
            >
              <AlertCircle className="h-8 w-8 text-[var(--error)]" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
              Something went wrong
            </h2>
            <p className="mb-4 text-[var(--text-secondary)]">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
