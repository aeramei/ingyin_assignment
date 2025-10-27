'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyTOTPPage() {
    const router = useRouter();
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/reset-password/verify-totp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ token: code }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'An unexpected error occurred');
            }

            router.push('/reset-password/confirm');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 shadow-lg rounded-lg">
                <h2 className="text-center text-3xl font-extrabold">Verify 2FA</h2>
                <p className="text-center text-sm text-gray-400">Enter the code from your authenticator app to continue.</p>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && <p className="text-red-500 text-center">{error}</p>}
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="6-digit code"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg mb-4"
                        required
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                    >
                        {isLoading ? 'Verifying...' : 'Verify'}
                    </button>
                </form>
            </div>
        </div>
    );
}
