'use client';

import { Component, type ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-[#202020] border-4 border-[#202020] dark:border-[#616161] max-w-lg w-full p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-[#ac6d46] mx-auto mb-4" />
            <h2 className="text-lg font-bold font-mono text-[#202020] dark:text-[#e5e5e5] mb-2">
              SOMETHING WENT WRONG
            </h2>
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6">
              An unexpected error occurred. Please try again or return to the home page.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] font-bold hover:bg-[#202020] hover:text-white dark:hover:bg-[#4a4a4a] transition-all active:scale-[0.98] text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                TRY AGAIN
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#4676ac] text-white font-bold hover:bg-[#365a87] transition-all active:scale-[0.98] text-sm"
              >
                <Home className="w-4 h-4" />
                HOME
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
