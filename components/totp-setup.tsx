"use client";

import { useState, useEffect } from "react";

interface TOTPSetupProps {
  onSetupComplete: () => void;
  onCancel: () => void;
}

interface SetupData {
  qrCodeUrl: string;
  secret: string;
  backupCodes: string[];
  tempData: {
    encryptedSecret: string;
    encryptedBackupCodes: string[];
  };
}

export default function TOTPSetup({
  onSetupComplete,
  onCancel,
}: TOTPSetupProps) {
  const [step, setStep] = useState<"qr" | "verify">("qr");
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Initialize TOTP setup
  useEffect(() => {
    if (step === "qr") {
      initializeTOTPSetup();
    }
  }, [step]);

  const initializeTOTPSetup = async () => {
    try {
      setIsLoading(true);
      setError("");
      console.log("Starting TOTP setup...");

      const response = await fetch("/api/auth/2fa/setup", {
        method: "GET",
        credentials: "include",
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      const data = await response.json();
      console.log("Response data:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize TOTP setup");
      }

      setSetupData(data);
      console.log("Setup data set successfully");
    } catch (err: any) {
      console.error("TOTP setup error:", err);
      setError(err.message || "Failed to initialize TOTP setup");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCodes = value.split("").slice(0, 6);
      const newCode = [...verificationCode];
      pastedCodes.forEach((char, i) => {
        if (index + i < 6) {
          newCode[index + i] = char;
        }
      });
      setVerificationCode(newCode);

      // Focus next empty input or submit
      const nextEmptyIndex = newCode.findIndex(
        (c, i) => i >= index && c === ""
      );
      if (nextEmptyIndex !== -1) {
        document.getElementById(`verify-code-${nextEmptyIndex}`)?.focus();
      } else {
        document.getElementById("verify-button")?.focus();
      }
      return;
    }

    // Single character input
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      document.getElementById(`verify-code-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      document.getElementById(`verify-code-${index - 1}`)?.focus();
    }
  };

  const verifyTOTP = async () => {
    const code = verificationCode.join("").replace(/\s/g, "");

    if (code.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    if (!setupData?.tempData) {
      setError("Setup data missing. Please try again.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          token: code,
          encryptedSecret: setupData.tempData.encryptedSecret,
          encryptedBackupCodes: setupData.tempData.encryptedBackupCodes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      onSetupComplete();
    } catch (err: any) {
      setError(err.message || "Verification failed");
      setVerificationCode(["", "", "", "", "", ""]);
      document.getElementById("verify-code-0")?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;

    const codesText = `SyncTech Backup Codes\n\nIMPORTANT: Save these codes in a secure place. Each code can be used once.\n\n${setupData.backupCodes.join(
      "\n"
    )}\n\nGenerated: ${new Date().toLocaleString()}`;
    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "synctech-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (step === "qr") {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-white mb-2">
            Set Up Two-Factor Authentication
          </h3>
          <p className="text-gray-300 text-sm">
            Scan the QR code with your authenticator app like Google
            Authenticator or Authy
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
            <span className="ml-3 text-gray-300">Generating QR code...</span>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-white rounded-lg border-2 border-cyan-500/30">
                {setupData?.qrCodeUrl ? (
                  <img
                    src={setupData.qrCodeUrl}
                    alt="TOTP QR Code"
                    className="w-48 h-48"
                    onError={(e) => {
                      console.error("QR Code image failed to load");
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-500">QR code not available</span>
                  </div>
                )}
              </div>

              <button
                onClick={initializeTOTPSetup}
                className="px-4 py-2 text-sm border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Regenerate QR Code
              </button>
            </div>

            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
              <h4 className="font-medium text-yellow-300 mb-2">Manual Setup</h4>
              <p className="text-yellow-200 text-sm mb-2">
                If you can't scan the QR code, enter this secret key manually:
              </p>
              <code className="block bg-black/40 p-3 rounded text-yellow-100 text-sm font-mono break-all">
                {setupData?.secret || "Loading..."}
              </code>
            </div>

            {setupData?.backupCodes && setupData.backupCodes.length > 0 && (
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <h4 className="font-medium text-blue-300 mb-2">Backup Codes</h4>
                <p className="text-blue-200 text-sm mb-3">
                  Save these backup codes in a secure place. You can use them if
                  you lose access to your authenticator app.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {setupData.backupCodes.map((code, index) => (
                    <code
                      key={index}
                      className="bg-black/40 p-2 rounded text-blue-100 text-sm font-mono text-center"
                    >
                      {code}
                    </code>
                  ))}
                </div>
                <button
                  onClick={downloadBackupCodes}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  Download Backup Codes
                </button>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2 px-4 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep("verify")}
                disabled={!setupData}
                className="flex-1 py-2 px-4 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                I've Scanned the QR Code
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-2">
          Verify TOTP Setup
        </h3>
        <p className="text-gray-300 text-sm">
          Enter the 6-digit code from your authenticator app to verify setup
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-center space-x-2">
        {verificationCode.map((digit, index) => (
          <input
            key={index}
            id={`verify-code-${index}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            className="w-12 h-12 text-center text-xl font-semibold border border-cyan-500/30 rounded-lg bg-black/40 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            value={digit}
            onChange={(e) => handleCodeChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={isLoading}
          />
        ))}
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => setStep("qr")}
          className="flex-1 py-2 px-4 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
          disabled={isLoading}
        >
          Back
        </button>
        <button
          id="verify-button"
          onClick={verifyTOTP}
          disabled={isLoading || verificationCode.join("").length !== 6}
          className="flex-1 py-2 px-4 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Verifying..." : "Verify & Enable"}
        </button>
      </div>
    </div>
  );
}
