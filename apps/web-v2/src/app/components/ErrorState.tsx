import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * ErrorState - A reusable error display component
 * Shows when API calls fail or data cannot be loaded
 */
export function ErrorState({
  title = 'Something went wrong',
  message = 'Failed to load data. Please try again.',
  onRetry,
  retryLabel = 'TRY AGAIN',
}: ErrorStateProps) {
  return (
    <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
      <AlertTriangle
        className="w-16 h-16 text-[#ac6d46] mx-auto mb-4"
        aria-hidden="true"
      />
      <h3 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#616161] text-white font-bold hover:bg-[#4676ac] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
