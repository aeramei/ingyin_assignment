"use client";

import { useState, useEffect } from "react";
import TOTPSetup from "@/components/totp-setup";

interface TOTPStatus {
  isTOTPEnabled: boolean;
  totpEnabledAt: string | null;
  lastTOTPUsedAt: string | null;
  remainingBackupCodes: number;
  isLocked: boolean;
  failedAttempts: number;
}

export default function SecuritySettings() {
  const [totpStatus, setTOTPStatus] = useState<TOTPStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTOTPSetup, setShowTOTPSetup] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchTOTPStatus();
  }, []);

  const fetchTOTPStatus = async () => {
    try {
      const response = await fetch("/api/auth/2fa/status", {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch TOTP status");
      }

      setTOTPStatus(data);
    } catch (err: any) {
      setError(err.message || "Failed to load security settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableTOTP = async () => {
    if (
      !confirm(
        "Are you sure you want to disable Two-Factor Authentication? This reduces your account security."
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          // In a real implementation, you'd require the current TOTP code
          token: "TODO", // You'd need to implement this input
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to disable TOTP");
      }

      setSuccess("Two-Factor Authentication has been disabled");
      fetchTOTPStatus();
    } catch (err: any) {
      setError(err.message || "Failed to disable TOTP");
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (
      !confirm(
        "This will generate new backup codes. Your old backup codes will no longer work."
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/auth/2fa/regenerate-backup-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          // In a real implementation, you'd require the current TOTP code
          token: "TODO", // You'd need to implement this input
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to regenerate backup codes");
      }

      setSuccess("Backup codes regenerated successfully");
      // You might want to show the new backup codes to the user
      alert(
        `Your new backup codes:\n\n${data.backupCodes.join(
          "\n"
        )}\n\nPlease save them in a secure place.`
      );
      fetchTOTPStatus();
    } catch (err: any) {
      setError(err.message || "Failed to regenerate backup codes");
    }
  };

  if (showTOTPSetup) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => setShowTOTPSetup(false)}
              className="text-cyan-400 hover:text-cyan-300 mb-4"
            >
              ← Back to Security Settings
            </button>
            <h1 className="text-2xl font-bold">
              Enable Two-Factor Authentication
            </h1>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-cyan-500/30">
            <TOTPSetup
              onSetupComplete={() => {
                setShowTOTPSetup(false);
                setSuccess("Two-Factor Authentication enabled successfully!");
                fetchTOTPStatus();
              }}
              onCancel={() => setShowTOTPSetup(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Security Settings</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300">
            {success}
          </div>
        )}

        {/* TOTP Card */}
        <div className="bg-gray-800 rounded-lg p-6 border border-cyan-500/30 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">
                Two-Factor Authentication
              </h2>
              <p className="text-gray-400 text-sm">
                Add an extra layer of security to your account
              </p>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                totpStatus?.isTOTPEnabled
                  ? "bg-green-500/20 text-green-300 border border-green-500/30"
                  : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
              }`}
            >
              {totpStatus?.isTOTPEnabled ? "Enabled" : "Not Enabled"}
            </div>
          </div>

          {totpStatus?.isTOTPEnabled ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Enabled on:</span>
                  <p className="text-white">
                    {totpStatus.totpEnabledAt
                      ? new Date(totpStatus.totpEnabledAt).toLocaleDateString()
                      : "Unknown"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Last used:</span>
                  <p className="text-white">
                    {totpStatus.lastTOTPUsedAt
                      ? new Date(totpStatus.lastTOTPUsedAt).toLocaleDateString()
                      : "Never"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Remaining backup codes:</span>
                  <p className="text-white">
                    {totpStatus.remainingBackupCodes}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <p
                    className={`${
                      totpStatus.isLocked ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {totpStatus.isLocked ? "Temporarily Locked" : "Active"}
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleRegenerateBackupCodes}
                  className="px-4 py-2 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
                >
                  Regenerate Backup Codes
                </button>
                <button
                  onClick={handleDisableTOTP}
                  className="px-4 py-2 border border-red-500/30 text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Disable 2FA
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-300">
                Two-factor authentication adds an extra layer of security to
                your account. You'll need to enter a code from your
                authenticator app when signing in.
              </p>
              <button
                onClick={() => setShowTOTPSetup(true)}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-medium transition-colors"
              >
                Enable Two-Factor Authentication
              </button>
            </div>
          )}
        </div>

        {/* Security Tips */}
        <div className="bg-gray-800 rounded-lg p-6 border border-blue-500/30">
          <h3 className="text-lg font-semibold mb-3">Security Tips</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• Use a strong, unique password for your account</li>
            <li>• Enable two-factor authentication for extra security</li>
            <li>• Keep your backup codes in a secure place</li>
            <li>• Use a password manager to store your credentials</li>
            <li>• Be cautious of phishing attempts</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
