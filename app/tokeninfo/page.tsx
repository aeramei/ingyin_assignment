"use client";
import React, { useState } from "react";
import Link from "next/link";

interface TokenPayload {
  userId: string;
  role: string;
  email: string;
  name?: string;
  exp: number;
  iat: number;
}

export default function TokenInfo() {
  const [rawToken, setRawToken] = useState<string>("");
  const [validationResult, setValidationResult] = useState<string>("");
  const [testToken, setTestToken] = useState<string>("");
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"structure" | "validation">(
    "structure"
  );

  // Mock current user data
  const currentUser = {
    email: "ingyinaera@gmail.com",
    role: "‌admin",
    name: "Admin",
  };

  // Mock token for demonstration
  const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(
    JSON.stringify({
      userId: "user_12345",
      role: "user",
      email: "demo@example.com",
      name: "Demo User",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  )}.mock_signature_for_demo`;

  React.useEffect(() => {
    setRawToken(mockToken);
  }, []);

  const handleValidateToken = async () => {
    if (!testToken.trim()) {
      setValidationResult("❌ Please enter a token to validate");
      return;
    }

    setIsValidating(true);

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (testToken.includes("eyJhbGciOiJ")) {
        if (testToken.includes("expired")) {
          setValidationResult(
            "❌ Token Validation Failed: Token expired. Please refresh your session."
          );
        } else if (testToken.includes("invalid")) {
          setValidationResult(
            "❌ Token Validation Failed: Invalid signature - possible tampering detected."
          );
        } else {
          const timeLeft = Math.floor(Math.random() * 30) + 1;
          setValidationResult(
            `✅ Token is valid. Expires in ${timeLeft} minutes.`
          );
        }
      } else {
        setValidationResult(
          "❌ Token Validation Failed: Malformed token structure. Expected JWT format."
        );
      }
    } catch (error) {
      setValidationResult("❌ Validation error occurred. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleGetCurrentSession = async () => {
    setIsValidating(true);
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setValidationResult(
        `✅ Active Session: ${currentUser.email} (${currentUser.role})`
      );
      setActiveTab("validation");
    } catch (error) {
      setValidationResult("❌ Unable to fetch session information.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleTestToken = (tokenType: string) => {
    const tokens = {
      valid:
        rawToken ||
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzEyMzQ1Iiwicm9sZSI6InVzZXIiLCJzeXN0ZW0iOiJzeW5jdGVjaC1wcm9kIiwiaWF0IjoxNzA0MDQwMDAwLCJleHAiOjE3MDQwNDA3MjB9.valid_signature_example",
      expired:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzEyMzQ1Iiwicm9sZSI6InVzZXIiLCJzeXN0ZW0iOiJzeW5jdGVjaC1wcm9kIiwiaWF0IjoxNzA0MDQwMDAwLCJleHAiOjE2OTAwMDAwMDB9.expired_token_example",
      invalid:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzEyMzQ1Iiwicm9sZSI6InVzZXIiLCJzeXN0ZW0iOiJzeW5jdGVjaC1wcm9kIiwiaWF0IjoxNzA0MDQwMDAwLCJleHAiOjE3MDQwNDA3MjB9.invalid_signature_here",
    };

    setTestToken(tokens[tokenType as keyof typeof tokens]);
    setActiveTab("validation");
  };

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
              <Link
                href="/admindashboard"
                className="px-4 py-2 rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 transition-all"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4">
            JWT Token{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Inspector
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Educational demonstration of JSON Web Token structure, validation,
            and security features
          </p>
          <div className="mt-4 inline-flex items-center px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
            🔒 Security Education & Demonstration
          </div>
        </div>

        {/* Current Session Info */}
        {currentUser && (
          <div className="mb-8 rounded-2xl p-6 border border-blue-500/20 bg-black/20">
            <h3 className="text-xl font-bold mb-4 text-blue-300 flex items-center">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
              Current Session
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Email:</strong> {currentUser.email}
              </div>
              <div>
                <strong>Role:</strong> {currentUser.role}
              </div>
              <div>
                <strong>Name:</strong> {currentUser.name || "N/A"}
              </div>
              <div>
                <strong>Status:</strong>{" "}
                <span className="text-green-400">Active</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-black/20 rounded-2xl p-1 border border-cyan-500/20 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab("structure")}
            className={`flex-1 py-3 px-4 rounded-xl transition-all ${
              activeTab === "structure"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Token Structure
          </button>
          <button
            onClick={() => setActiveTab("validation")}
            className={`flex-1 py-3 px-4 rounded-xl transition-all ${
              activeTab === "validation"
                ? "bg-green-500/20 text-green-300 border border-green-500/30"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Validation
          </button>
        </div>

        {/* Token Structure Section */}
        {activeTab === "structure" && (
          <div className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Section A: Raw JWT */}
              <div className="rounded-2xl p-6 border border-cyan-500/20 bg-black/20">
                <h3 className="text-xl font-bold mb-4 text-cyan-300 flex items-center">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full mr-3"></span>
                  Encoded JWT Token
                </h3>
                <div className="space-y-4">
                  <p className="text-gray-300 text-sm">
                    The complete token string as transmitted in HTTP headers:
                  </p>
                  <div className="bg-black/40 border border-cyan-500/20 rounded-lg p-4">
                    <code className="text-cyan-200 text-sm break-all font-mono">
                      {rawToken}
                    </code>
                  </div>
                  <div className="flex space-x-2 text-xs text-gray-400">
                    <span className="px-2 py-1 bg-cyan-500/20 rounded">
                      Header
                    </span>
                    <span className="px-2 py-1 bg-purple-500/20 rounded">
                      Payload
                    </span>
                    <span className="px-2 py-1 bg-green-500/20 rounded">
                      Signature
                    </span>
                  </div>
                </div>
              </div>

              {/* Section B: JWT Parts Explanation */}
              <div className="rounded-2xl p-6 border border-purple-500/20 bg-black/20">
                <h3 className="text-xl font-bold mb-4 text-purple-300 flex items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
                  JWT Components
                </h3>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                      <h4 className="font-semibold text-cyan-300 mb-1">
                        Header
                      </h4>
                      <p className="text-sm text-gray-300">
                        Contains token type and signing algorithm (e.g., HS256)
                      </p>
                    </div>
                    <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <h4 className="font-semibold text-purple-300 mb-1">
                        Payload
                      </h4>
                      <p className="text-sm text-gray-300">
                        Contains claims (user data, roles, expiration)
                      </p>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <h4 className="font-semibold text-green-300 mb-1">
                        Signature
                      </h4>
                      <p className="text-sm text-gray-300">
                        Verifies token integrity and authenticity
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* JWT Flow Diagram */}
            <div className="rounded-2xl p-6 border border-yellow-500/20 bg-black/20">
              <h3 className="text-xl font-bold mb-4 text-yellow-300 flex items-center">
                <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
                JWT Authentication Flow
              </h3>
              <div className="grid md:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="text-2xl mb-2">1️⃣</div>
                  <div className="font-semibold text-blue-300">Login</div>
                  <p className="text-xs text-gray-400 mt-1">
                    User credentials verified
                  </p>
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="text-2xl mb-2">2️⃣</div>
                  <div className="font-semibold text-green-300">
                    Token Issued
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    JWT created and signed
                  </p>
                </div>
                <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <div className="text-2xl mb-2">3️⃣</div>
                  <div className="font-semibold text-purple-300">
                    API Requests
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Token sent in headers
                  </p>
                </div>
                <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                  <div className="text-2xl mb-2">4️⃣</div>
                  <div className="font-semibold text-cyan-300">Validation</div>
                  <p className="text-xs text-gray-400 mt-1">
                    Server verifies token
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Section */}
        {activeTab === "validation" && (
          <div className="rounded-2xl p-6 border border-green-500/20 bg-black/20">
            <h3 className="text-xl font-bold mb-4 text-green-300 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
              Token Validation
            </h3>
            <div className="space-y-6">
              <div className="flex space-x-4 mb-4">
                <button
                  onClick={handleGetCurrentSession}
                  disabled={isValidating}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition-all disabled:opacity-50"
                >
                  Check Current Session
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Enter JWT Token to Validate
                  </label>
                  <textarea
                    value={testToken}
                    onChange={(e) => setTestToken(e.target.value)}
                    placeholder="Paste JWT token here (starts with 'eyJhbGciOiJ...')"
                    className="w-full h-24 px-4 py-3 bg-black/40 border border-green-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-400 transition-all resize-none font-mono text-sm"
                    rows={3}
                  />
                </div>

                <button
                  onClick={handleValidateToken}
                  disabled={isValidating}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full"
                >
                  {isValidating ? "Validating Token..." : "Validate Token"}
                </button>

                {validationResult && (
                  <div
                    className={`p-4 rounded-lg border ${
                      validationResult.includes("✅")
                        ? "bg-green-500/20 border-green-500/30 text-green-300"
                        : "bg-red-500/20 border-red-500/30 text-red-300"
                    }`}
                  >
                    {validationResult}
                  </div>
                )}
              </div>

              {/* Test Tokens Helper */}
              <div className="bg-black/40 border border-yellow-500/20 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-300 mb-3">
                  🧪 Test Token Examples
                </h4>
                <div className="grid md:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleTestToken("valid")}
                    className="p-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg transition-all text-left group"
                  >
                    <div className="font-medium text-green-300 group-hover:text-green-200">
                      Valid Token
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Properly signed and active
                    </div>
                  </button>
                  <button
                    onClick={() => handleTestToken("expired")}
                    className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all text-left group"
                  >
                    <div className="font-medium text-red-300 group-hover:text-red-200">
                      Expired Token
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Past expiration time
                    </div>
                  </button>
                  <button
                    onClick={() => handleTestToken("invalid")}
                    className="p-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg transition-all text-left group"
                  >
                    <div className="font-medium text-orange-300 group-hover:text-orange-200">
                      Invalid Signature
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Tampered or corrupted
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Relevance Section */}
        <div className="mt-12 rounded-2xl p-6 border border-yellow-500/20 bg-black/20">
          <h3 className="text-xl font-bold mb-4 text-yellow-300 flex items-center">
            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
            Security Best Practices Demonstrated
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-gray-300">
            <div className="space-y-3">
              <p className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span>
                  <strong>Cryptographic Signing:</strong> Tokens are digitally
                  signed to prevent tampering
                </span>
              </p>
              <p className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span>
                  <strong>Expiration:</strong> Automatic session termination for
                  security
                </span>
              </p>
              <p className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span>
                  <strong>Stateless:</strong> No server-side session storage
                  required
                </span>
              </p>
            </div>
            <div className="space-y-3">
              <p className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span>
                  <strong>Role-Based Access:</strong> Authorization through
                  token claims
                </span>
              </p>
              <p className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span>
                  <strong>Secure Transmission:</strong> Tokens sent via HTTP
                  headers
                </span>
              </p>
              <p className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span>
                  <strong>Validation:</strong> Every request verified for
                  integrity
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Demo Mode Notice */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
            🎨 <strong>Demo Mode:</strong> This is a UI-only demonstration with
            mock data
          </div>
        </div>
      </section>
    </div>
  );
}
