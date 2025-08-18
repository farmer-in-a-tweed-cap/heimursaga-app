'use client';

import { useState } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function SentryTestPage() {
  const [message, setMessage] = useState('');

  const throwClientError = () => {
    throw new Error('Test client-side error from Next.js');
  };

  const throwServerError = async () => {
    try {
      const response = await fetch('/api/sentry-test');
      const data = await response.json();
      setMessage(data.message || 'Server error triggered');
    } catch (error) {
      setMessage('Failed to trigger server error');
    }
  };

  const captureMessage = () => {
    Sentry.captureMessage('Test message from Sentry', 'info');
    setMessage('Message sent to Sentry!');
  };

  const captureException = () => {
    try {
      throw new Error('Test captured exception');
    } catch (error) {
      Sentry.captureException(error);
      setMessage('Exception captured and sent to Sentry!');
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Sentry Test Page</h1>
      
      {message && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {message}
        </div>
      )}

      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="text-xl font-semibold mb-4">Client-Side Tests</h2>
          
          <button
            onClick={throwClientError}
            className="mr-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Throw Client Error
          </button>
          
          <button
            onClick={captureMessage}
            className="mr-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Send Test Message
          </button>
          
          <button
            onClick={captureException}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Capture Exception
          </button>
        </div>

        <div className="p-4 border rounded">
          <h2 className="text-xl font-semibold mb-4">Server-Side Tests</h2>
          
          <button
            onClick={throwServerError}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Trigger Server Error
          </button>
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold text-yellow-800">Instructions:</h3>
        <ol className="list-decimal list-inside text-yellow-700 mt-2">
          <li>Make sure your Sentry DSN is configured in environment variables</li>
          <li>Click the buttons above to test different Sentry features</li>
          <li>Check your Sentry dashboard to see the errors and messages</li>
          <li>Remove this page before going to production!</li>
        </ol>
      </div>
    </div>
  );
}