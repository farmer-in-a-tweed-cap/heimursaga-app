'use client';

import { useState, useEffect } from 'react';
import { Button } from '@repo/ui/components';
import { ArrowClockwise, XCircleIcon } from '@repo/ui/icons';

import { useSession } from '@/hooks';
import { sessionDebugger } from '@/lib/session-debug';

interface SessionRecoveryProps {
  onRecovered?: () => void;
}

export const SessionRecovery: React.FC<SessionRecoveryProps> = ({ 
  onRecovered 
}) => {
  const session = useSession();
  const [isRecovering, setIsRecovering] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  useEffect(() => {
    if (session.logged && onRecovered) {
      onRecovered();
    }
  }, [session.logged, onRecovered]);

  const handleRetry = async () => {
    setIsRecovering(true);
    setRetryCount(prev => prev + 1);
    
    sessionDebugger.log('Manual session recovery attempt', { retryCount: retryCount + 1 });
    
    try {
      await session.refreshSession();
      
      // Wait a moment for the session to update
      setTimeout(() => {
        if (session.logged) {
          sessionDebugger.log('Session recovery successful');
          onRecovered?.();
        } else {
          sessionDebugger.log('Session recovery failed - still not logged in');
        }
        setIsRecovering(false);
      }, 1000);
    } catch (error) {
      sessionDebugger.log('Session recovery error', null, error);
      setIsRecovering(false);
    }
  };

  const handleClearAndRetry = async () => {
    sessionDebugger.log('Clearing session and retrying');
    session.clearSession();
    
    // Wait a moment then retry
    setTimeout(() => {
      handleRetry();
    }, 500);
  };

  const handleShowDebug = () => {
    setShowDebugInfo(!showDebugInfo);
    if (!showDebugInfo) {
      console.log('Session Debug Logs:', sessionDebugger.getLogs());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <XCircleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Session Issue Detected
          </h2>
          <p className="text-gray-600 text-sm">
            We're having trouble verifying your session. This might be due to a temporary network issue or expired session.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleRetry}
            disabled={isRecovering}
            className="w-full"
            variant="default"
          >
            {isRecovering ? (
              <ArrowClockwise className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ArrowClockwise className="w-4 h-4 mr-2" />
            )}
            {isRecovering ? 'Recovering...' : 'Retry Connection'}
          </Button>

          {retryCount > 0 && (
            <Button
              onClick={handleClearAndRetry}
              disabled={isRecovering}
              className="w-full"
              variant="outline"
            >
              Clear Cache & Retry
            </Button>
          )}

          <Button
            onClick={() => window.location.href = '/login'}
            className="w-full"
            variant="ghost"
          >
            Go to Login
          </Button>
        </div>

        {retryCount > 1 && (
          <div className="mt-4 text-center">
            <button
              onClick={handleShowDebug}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              {showDebugInfo ? 'Hide' : 'Show'} Debug Info
            </button>
          </div>
        )}

        {showDebugInfo && (
          <div className="mt-4 text-xs bg-gray-100 p-3 rounded">
            <p><strong>Session Error:</strong> {session.error?.message || 'Unknown error'}</p>
            <p><strong>Retry Count:</strong> {retryCount}</p>
            <p><strong>Loading:</strong> {session.isLoading ? 'Yes' : 'No'}</p>
            <p className="mt-2 text-gray-600">
              Check browser console for detailed logs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};