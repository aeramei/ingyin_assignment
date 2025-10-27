'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function VerifyTOTPPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  const redirectTo = searchParams.get('redirectTo') || '/authenticated';

  // Auto-focus first input on component mount
  useEffect(() => {
    const firstInput = document.getElementById('code-0');
    firstInput?.focus();
  }, []);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCodes = value.split('').slice(0, 6);
      const newCode = [...code];
      pastedCodes.forEach((char, i) => {
        if (index + i < 6) {
          newCode[index + i] = char;
        }
      });
      setCode(newCode);

      // Focus next empty input or submit
      const nextEmptyIndex = newCode.findIndex(
        (c, i) => i >= index && c === ''
      );
      if (nextEmptyIndex !== -1) {
        document.getElementById(`code-${nextEmptyIndex}`)?.focus();
      } else {
        document.getElementById('verify-button')?.focus();
      }
      return;
    }

    // Single character input
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      // Move to previous input on backspace
      document.getElementById(`code-${index - 1}`)?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const verificationCode = useBackupCode
      ? code.join('')
      : code.join('').replace(/\s/g, '');

    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    if (!useBackupCode && verificationCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-totp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important to send cookies
        body: JSON.stringify({
          verificationCode,
          useBackupCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Server clears the httpOnly cookie on success.
        // Redirect to the intended destination.
        router.push(redirectTo);
      } else {
        setError(data.error || 'Verification failed');
        // Clear code on error
        setCode(['', '', '', '', '', '']);
        document.getElementById('code-0')?.focus();
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('TOTP verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseBackupCode = () => {
    setUseBackupCode(true);
    setCode(['']); // Single input for backup code
    setError('');
    setTimeout(() => {
      document.getElementById('backup-code-input')?.focus();
    }, 100);
  };

  const handleBackToTOTP = () => {
    setUseBackupCode(false);
    setCode(['', '', '', '', '', '']);
    setError('');
    setTimeout(() => {
      document.getElementById('code-0')?.focus();
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Two-Factor Authentication
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {useBackupCode
              ? 'Enter your backup code'
              : 'Enter the 6-digit code from your authenticator app'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {useBackupCode ? (
            <div>
              <label htmlFor="backup-code-input" className="sr-only">
                Backup Code
              </label>
              <input
                id="backup-code-input"
                name="backupCode"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your backup code"
                value={code[0]}
                onChange={(e) => setCode([e.target.value])}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={handleBackToTOTP}
                className="mt-2 text-sm text-blue-600 hover:text-blue-500"
              >
                ← Use authenticator app instead
              </button>
            </div>
          ) : (
            <div>
              <label htmlFor="code-0" className="sr-only">
                Verification Code
              </label>
              <div className="flex space-x-2 justify-center">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isLoading}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleUseBackupCode}
                className="mt-4 text-sm text-blue-600 hover:text-blue-500"
              >
                Use a backup code instead
              </button>
            </div>
          )}

          <div>
            <button
              id="verify-button"
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                router.push('/signin');
              }}
              className="text-sm text-gray-600 hover:text-gray-500"
            >
              Back to login
            </button>
          </div>
        </form>

        {!useBackupCode && (
          <div className="mt-6 p-4 bg-yellow-50 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Using Google Authenticator?
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Open your authenticator app and enter the 6-digit code
                    shown.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
