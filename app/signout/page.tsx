"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignOutConfirm() {
  const [countdown, setCountdown] = useState(5);
  const [isLoggingOut, setIsLoggingOut] = useState(true);
  const router = useRouter();

  // Perform logout on component mount
  useEffect(() => {
    const performLogout = async () => {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        setIsLoggingOut(false);
      } catch (error) {
        console.error("Logout error:", error);
        setIsLoggingOut(false);
      }
    };

    performLogout();
  }, []);

  // Auto-redirect countdown
  useEffect(() => {
    if (!isLoggingOut) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push("/");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isLoggingOut, router]);

  const handleReturnHome = () => {
    router.push("/");
  };

  return (
    <div
      className="min-h-screen text-white flex items-center justify-center"
      style={{
        backgroundImage: "radial-gradient(at 0% 0%, #061121 0%, #000 100%)",
      }}
    >
      <div className="max-w-md w-full mx-4 text-center">
        {/* Loading or Success State */}
        {isLoggingOut ? (
          <>
            <div className="mb-6">
              <div className="w-20 h-20 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              </div>
            </div>
            <h1 className="text-3xl font-black mb-4">Signing You Out...</h1>
            <p className="text-gray-300">
              Please wait while we securely terminate your session.
            </p>
          </>
        ) : (
          <>
            {/* Success Icon */}
            <div className="mb-6">
              <div className="w-20 h-20 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            {/* Message */}
            <h1 className="text-3xl font-black mb-4">
              Signed Out{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-500">
                Successfully
              </span>
            </h1>

            <p className="text-gray-300 mb-2">
              Your session has been terminated and all authentication tokens
              have been cleared.
            </p>

            <p className="text-sm text-gray-400 mb-8">
              {countdown > 0 ? (
                <>
                  Redirecting to home page in {countdown} second
                  {countdown !== 1 ? "s" : ""}...
                </>
              ) : (
                "Ready to redirect..."
              )}
            </p>

            {/* Security Information */}
            <div className="bg-black/40 border border-green-500/20 rounded-lg p-4 mb-8">
              <h3 className="font-semibold text-green-300 mb-2 flex items-center justify-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Security Actions Performed
              </h3>
              <ul className="text-sm text-gray-300 space-y-1 text-left">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  User session terminated
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Authentication data cleared
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Local storage sanitized
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Secure redirect initiated
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleReturnHome}
                className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 font-semibold transition-all"
              >
                Return to Home Page Now
              </button>

              <Link
                href="/signin"
                className="block py-3 px-6 rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 transition-all"
              >
                Sign In Again
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
