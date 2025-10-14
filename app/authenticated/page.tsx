"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Define user type
interface User {
  name: string;
  email: string;
  role: "user" | "admin";
}

// Define token payload interface
interface TokenPayload {
  userId: string;
  role: string;
  system: string;
  exp: number;
  iat: number;
}

export default function Dashboard() {
  const [user, setUser] = useState<User>({
    name: "Demo User",
    email: "demo@example.com",
    role: "user",
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const router = useRouter();

  // Mock token data for demonstration
  const decodedPayload: TokenPayload = {
    userId: "user_12345",
    role: "user",
    system: "synctech-prod",
    iat: 1704040000, // Sun, 31 Dec 2023 16:26:40 GMT
    exp: 1704040720, // Sun, 31 Dec 2023 16:38:40 GMT
  };

  const handleLogout = () => {
    console.log("Logout clicked - redirecting to landing page");
    setShowLogoutConfirm(false);

    // Redirect to landing page after a brief delay for better UX
    setTimeout(() => {
      router.push("/");
    }, 500);
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp * 1000).toUTCString();
  };

  const getTimeUntilExpiry = (exp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = exp - now;
    if (diff <= 0) return "Expired";
    const minutes = Math.floor(diff / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  };

  const isAdmin = user?.role === "admin";

  return (
    <div
      className="min-h-screen text-white overflow-hidden"
      style={{
        backgroundImage: "radial-gradient(at 0% 0%, #061121 0%, #000 100%)",
      }}
    >
      {/* Navigation */}
      <nav className="relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-black font-bold text-lg">🔗</span>
              </div>
              <span className="text-xl font-black tracking-tight">
                SYNC
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  TECH
                </span>
              </span>
            </Link>

            <div className="flex items-center space-x-4">
              <span className="text-cyan-300">Welcome, {user?.name}</span>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="px-4 py-2 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center mr-3">
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Confirm Sign Out</h3>
            </div>

            <p className="text-gray-300 mb-6">
              Are you sure you want to sign out? You will be redirected to the
              landing page.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 px-4 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 px-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-all font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4">
            {isAdmin ? "Admin" : "User"}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Dashboard
            </span>
          </h1>
          <p className="text-xl text-gray-300">
            {isAdmin
              ? "Welcome to the administrative control panel"
              : "Welcome to your personal workspace"}
          </p>
        </div>

        {/* Status Card */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="rounded-2xl p-6 border border-blue-500/20 bg-black/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-blue-300">
                    Session Status
                  </h3>
                  <p className="text-gray-300">
                    Your current connection status
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2 justify-end mb-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-300 font-semibold">
                    Active Now
                  </span>
                </div>
                <p className="text-sm text-gray-400">Connected to SyncTech</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cards Section - Centered for users, normal grid for admins */}
        <div
          className={`grid gap-8 mb-12 ${
            isAdmin
              ? "md:grid-cols-2 lg:grid-cols-3"
              : "md:grid-cols-2 max-w-2xl mx-auto"
          }`}
        >
          {/* User Profile Card */}
          <div className="rounded-2xl p-6 border border-cyan-500/20 bg-black/20">
            <h3 className="text-xl font-bold mb-4 text-cyan-300">
              👤 Your Profile
            </h3>
            <div className="space-y-2">
              <p>
                <strong>Name:</strong> {user?.name}
              </p>
              <p>
                <strong>Email:</strong> {user?.email}
              </p>
              <p>
                <strong>Role:</strong>
                <span
                  className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    isAdmin
                      ? "bg-purple-500/20 text-purple-300"
                      : "bg-cyan-500/20 text-cyan-300"
                  }`}
                >
                  {user?.role}
                </span>
              </p>
              {/* Status in Profile Card */}
              <div className="flex items-center space-x-2 pt-2">
                <span className="text-gray-400">Status:</span>
                <span className="flex items-center space-x-1 text-green-300">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">Active</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl p-6 border border-green-500/20 bg-black/20">
            <h3 className="text-xl font-bold mb-4 text-green-300">
              ⚡ Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => console.log("View Data Pipelines clicked")}
                className="w-full py-2 px-4 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-all"
              >
                View Data Pipelines
              </button>
              <button
                onClick={() => console.log("API Documentation clicked")}
                className="w-full py-2 px-4 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-all"
              >
                API Documentation
              </button>
              {/* Status Check Button */}
              <button
                className="w-full py-2 px-4 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-all flex items-center justify-center space-x-2"
                onClick={() => setIsOnline(!isOnline)}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? "bg-green-400" : "bg-gray-400"
                  }`}
                ></div>
                <span>Check Connection</span>
              </button>
            </div>
          </div>

          {/* Admin Access (if user is admin) */}
          {isAdmin && (
            <div className="rounded-2xl p-6 border border-purple-500/20 bg-black/20">
              <h3 className="text-xl font-bold mb-4 text-purple-300">
                ⚡ Admin Access
              </h3>
              <Link
                href="/admindashboard"
                className="block w-full py-3 px-4 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-all text-center"
              >
                Go to Admin Panel
              </Link>
            </div>
          )}
        </div>

        {/* Token Information Section - Only show for users, not admins */}
        {!isAdmin && decodedPayload && (
          <div className="rounded-2xl p-6 border border-purple-500/20 bg-black/20 mb-8 max-w-4xl mx-auto">
            <h3 className="text-xl font-bold mb-4 text-purple-300 flex items-center">
              <span className="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
              Session Token Information
            </h3>
            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                Your current session token claims and metadata:
              </p>
              <div className="bg-black/40 border border-purple-500/20 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">User ID:</span>
                  <code className="text-purple-300">
                    {decodedPayload.userId}
                  </code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Role:</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      decodedPayload.role === "admin"
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-cyan-500/20 text-cyan-300"
                    }`}
                  >
                    {decodedPayload.role}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">System:</span>
                  <code className="text-green-300">
                    {decodedPayload.system}
                  </code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Issued At:</span>
                  <code className="text-yellow-300 text-sm">
                    {formatTime(decodedPayload.iat)}
                  </code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Expires At:</span>
                  <code className="text-red-300 text-sm">
                    {formatTime(decodedPayload.exp)}
                  </code>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                  <span className="text-gray-400">Time Until Expiry:</span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      getTimeUntilExpiry(decodedPayload.exp) === "Expired"
                        ? "bg-red-500/20 text-red-300"
                        : "bg-green-500/20 text-green-300"
                    }`}
                  >
                    {getTimeUntilExpiry(decodedPayload.exp)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
