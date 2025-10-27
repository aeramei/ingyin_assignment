'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'An unexpected error occurred');
            }

            if (data.requiresTOTP) {
                router.push('/reset-password/verify-totp');
            } else if (data.requiresOTP) {
                router.push('/reset-password/verify-otp');
            } else {
                setSuccess('If an account with that email exists, a password reset link has been sent.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 shadow-lg rounded-lg">
                <h2 className="text-center text-3xl font-extrabold">Forgot Password</h2>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && <p className="text-red-500 text-center">{error}</p>}
                    {success && <p className="text-green-500 text-center">{success}</p>}
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg mb-4"
                        required
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                    >
                        {isLoading ? 'Sending...' : 'Send Password Reset Email'}
                    </button>
                </form>
            </div>
        </div>
    );
}
