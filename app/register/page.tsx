"use client";
import React, { useState, ChangeEvent, FormEvent, useMemo } from "react";
import Link from "next/link";
import {
  validatePassword,
  getPasswordStrength,
} from "@/lib/passwordValidation";

// Define the form data type
interface FormData {
  fullName: string;
  email: string;
  company: string;
  password: string;
  confirmPassword: string;
  plan: string;
}

export default function Register() {
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    company: "",
    password: "",
    confirmPassword: "",
    plan: "starter",
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [socialLoading, setSocialLoading] = useState<"google" | "github" | null>(null);
  const [registrationStep, setRegistrationStep] = useState<"form" | "otp">(
    "form"
  );
  const [otpCode, setOtpCode] = useState("");

  // ✅ PASSWORD VISIBILITY STATES
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ✅ PASSWORD STRENGTH CALCULATION
  const passwordStrength = useMemo(() => {
    return getPasswordStrength(formData.password);
  }, [formData.password]);

  // ✅ PASSWORD VALIDATION RESULT
  const passwordValidation = useMemo(() => {
    return validatePassword(formData.password, undefined, {
      email: formData.email,
      name: formData.fullName,
      company: formData.company,
    });
  }, [formData.password, formData.email, formData.fullName, formData.company]);

  // ✅ TOGGLE PASSWORD VISIBILITY FUNCTIONS
  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () =>
    setShowConfirmPassword(!showConfirmPassword);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
    setSuccess("");
  };

  // ✅ STEP 1: Send OTP
  const handleSendOTP = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // ✅ ENHANCED CLIENT-SIDE VALIDATION
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match!");
      setIsLoading(false);
      return;
    }

    // ✅ USE PASSWORD VALIDATION INSTEAD OF BASIC CHECK
    if (!passwordValidation.isValid) {
      setError("Please fix password issues before proceeding");
      setIsLoading(false);
      return;
    }

    if (!formData.fullName || !formData.email || !formData.company) {
      setError("Please fill in all required fields");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.fullName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      setRegistrationStep("otp");
      setSuccess("Verification code sent to your email!");
    } catch (error: any) {
      setError(error.message || "Failed to send verification code");
      console.error("OTP send error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ STEP 2: Verify OTP and Register (UNCHANGED)
  const handleVerifyOTPAndRegister = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.fullName,
          company: formData.company,
          plan: formData.plan,
          otp: otpCode,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setSuccess("Account created successfully! Redirecting to dashboard...");

      // Reset form
      setFormData({
        fullName: "",
        email: "",
        company: "",
        password: "",
        confirmPassword: "",
        plan: "starter",
      });

      // Redirect to dashboard after success
      setTimeout(() => {
        window.location.href = "/authenticated";
      }, 2000);
    } catch (error: any) {
      setError(error.message || "Registration failed. Please try again.");
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ SOCIAL REGISTER HANDLER (mirrors signin page)
  const handleSocialRegister = async (provider: "google" | "github") => {
    try {
      setSocialLoading(provider);
      setError("");
      // Redirect to OAuth provider (server enforces fixed redirect_uri)
      window.location.href = `/api/auth/oauth/${provider}`;
    } catch (e) {
      console.error(`${provider} register error:`, e);
      setError(`Failed to start ${provider} sign up. Please try again.`);
      setSocialLoading(null);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.fullName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend verification code");
      }

      setSuccess("Verification code resent to your email!");
    } catch (error: any) {
      setError(error.message || "Failed to resend verification code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen text-white overflow-hidden"
      style={{
        backgroundImage: "radial-gradient(at 0% 0%, #061121 0%, #000 100%)",
      }}
    >
      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl"></div>
      </div>

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

            <Link href="/">
              <button
                type="button"
                className="px-6 py-2 rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 transition-all font-medium"
              >
                ← Back to Home
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Registration Form */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black mb-4">
              {registrationStep === "form" ? "Create Your " : "Verify Your "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                {registrationStep === "form" ? "Account" : "Email"}
              </span>
            </h1>
            <p className="text-gray-300">
              {registrationStep === "form"
                ? "Join SyncTech and start integrating your business data today"
                : `We sent a 6-digit code to ${formData.email}`}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300">
              {success}
            </div>
          )}

          {/* Registration Card */}
          <div
            className="rounded-3xl p-8 shadow-2xl transition-all"
            style={{
              backdropFilter: "blur(10px)",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(103, 232, 249, 0.2)",
            }}
          >
            {registrationStep === "form" ? (
              /* STEP 1: Registration Form */
              <form onSubmit={handleSendOTP} className="space-y-6">
                {/* Social Sign Up Buttons */}
                <div className="grid grid-cols-2 gap-3 mb-2">
                  {/* Google Sign Up Button */}
                  <button
                    type="button"
                    onClick={() => handleSocialRegister("google")}
                    disabled={!!socialLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-cyan-500/30 rounded-lg text-cyan-300 hover:bg-cyan-500/10 transition-all font-medium disabled:opacity-50 text-sm"
                  >
                    {socialLoading === "google" ? (
                      <svg
                        className="animate-spin h-4 w-4 text-cyan-300"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    Continue with Google
                  </button>

                  {/* GitHub Sign Up Button */}
                  <button
                    type="button"
                    onClick={() => handleSocialRegister("github")}
                    disabled={!!socialLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-cyan-500/30 rounded-lg text-cyan-300 hover:bg-cyan-500/10 transition-all font-medium disabled:opacity-50 text-sm"
                  >
                    {socialLoading === "github" ? (
                      <svg
                        className="animate-spin h-4 w-4 text-cyan-300"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                    )}
                    Continue with GitHub
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 my-2">
                  <div className="h-px bg-cyan-500/20 flex-1" />
                  <span className="text-xs text-gray-400">or</span>
                  <div className="h-px bg-cyan-500/20 flex-1" />
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-black/40 border border-cyan-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-all"
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Work Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-black/40 border border-cyan-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-all"
                    placeholder="your@company.com"
                  />
                </div>

                {/* Company */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-black/40 border border-cyan-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-all"
                    placeholder="Your company name"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 pr-12 bg-black/40 border border-cyan-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-all"
                      placeholder="Create a strong password"
                    />
                    {/* ✅ PASSWORD VISIBILITY TOGGLE */}
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors focus:outline-none"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        // Eye slash icon (visible)
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        // Eye icon (hidden)
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* ✅ PASSWORD STRENGTH METER */}
                  {formData.password && (
                    <div className="mt-3 space-y-2">
                      {/* Strength Bar */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">
                          Password strength:
                        </span>
                        <span
                          className={`font-medium ${
                            passwordStrength.strength === "Very Weak"
                              ? "text-red-400"
                              : passwordStrength.strength === "Weak"
                              ? "text-orange-400"
                              : passwordStrength.strength === "Medium"
                              ? "text-yellow-400"
                              : passwordStrength.strength === "Strong"
                              ? "text-green-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {passwordStrength.strength}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: passwordStrength.width }}
                        ></div>
                      </div>

                      {/* Requirements Checklist */}
                      <div className="text-xs text-gray-400 space-y-1 mt-2">
                        <div
                          className={`flex items-center ${
                            formData.password.length >= 8
                              ? "text-green-400"
                              : ""
                          }`}
                        >
                          {formData.password.length >= 8 ? "✓" : "○"} At least 8
                          characters
                        </div>
                        <div
                          className={`flex items-center ${
                            /[A-Z]/.test(formData.password)
                              ? "text-green-400"
                              : ""
                          }`}
                        >
                          {/[A-Z]/.test(formData.password) ? "✓" : "○"}{" "}
                          Uppercase letter
                        </div>
                        <div
                          className={`flex items-center ${
                            /[a-z]/.test(formData.password)
                              ? "text-green-400"
                              : ""
                          }`}
                        >
                          {/[a-z]/.test(formData.password) ? "✓" : "○"}{" "}
                          Lowercase letter
                        </div>
                        <div
                          className={`flex items-center ${
                            /\d/.test(formData.password) ? "text-green-400" : ""
                          }`}
                        >
                          {/\d/.test(formData.password) ? "✓" : "○"} Number
                        </div>
                        <div
                          className={`flex items-center ${
                            /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
                              formData.password
                            )
                              ? "text-green-400"
                              : ""
                          }`}
                        >
                          {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
                            formData.password
                          )
                            ? "✓"
                            : "○"}{" "}
                          Special character
                        </div>
                      </div>

                      {/* Error Messages */}
                      {passwordValidation.errors.length > 0 && (
                        <div className="text-red-400 text-xs mt-2 space-y-1">
                          {passwordValidation.errors.map((error, index) => (
                            <div key={index}>⚠ {error}</div>
                          ))}
                        </div>
                      )}

                      {/* Suggestions */}
                      {passwordValidation.suggestions.length > 0 && (
                        <div className="text-cyan-400 text-xs mt-2 space-y-1">
                          {passwordValidation.suggestions.map(
                            (suggestion, index) => (
                              <div key={index}>💡 {suggestion}</div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className={`w-full px-4 py-3 pr-12 bg-black/40 border rounded-lg text-white placeholder-gray-400 focus:outline-none transition-all ${
                        formData.confirmPassword &&
                        formData.password !== formData.confirmPassword
                          ? "border-red-500 focus:border-red-400"
                          : "border-cyan-500/30 focus:border-cyan-400"
                      }`}
                      placeholder="Confirm your password"
                    />
                    {/* ✅ CONFIRM PASSWORD VISIBILITY TOGGLE */}
                    <button
                      type="button"
                      onClick={toggleConfirmPasswordVisibility}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors focus:outline-none"
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  {formData.confirmPassword &&
                    formData.password !== formData.confirmPassword && (
                      <div className="text-red-400 text-xs mt-2">
                        ⚠ Passwords do not match
                      </div>
                    )}
                </div>

                {/* Plan Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Choose Your Plan
                  </label>
                  <select
                    name="plan"
                    value={formData.plan}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-black/40 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:border-cyan-400 transition-all"
                  >
                    <option value="starter">Starter - Free 14-day trial</option>
                    <option value="professional">
                      Professional - $49/month
                    </option>
                    <option value="enterprise">
                      Enterprise - Custom pricing
                    </option>
                  </select>
                </div>

                {/* Terms Agreement */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    required
                    className="w-4 h-4 text-cyan-400 bg-black/40 border-cyan-500/30 rounded focus:ring-cyan-400"
                  />
                  <span className="text-sm text-gray-300">
                    I agree to the{" "}
                    <a
                      href="#"
                      className="text-cyan-400 hover:text-cyan-300 transition-colors"
                      onClick={(e) => e.preventDefault()}
                    >
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                      href="#"
                      className="text-cyan-400 hover:text-cyan-300 transition-colors"
                      onClick={(e) => e.preventDefault()}
                    >
                      Privacy Policy
                    </a>
                  </span>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    !passwordValidation.isValid ||
                    formData.password !== formData.confirmPassword
                  }
                  className="w-full py-4 px-6 rounded-xl font-bold text-lg text-black bg-gradient-to-br from-cyan-400 to-teal-500 hover:from-cyan-300 hover:to-teal-400 shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-black"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Sending Code...
                    </span>
                  ) : (
                    "Send Verification Code"
                  )}
                </button>

                {/* Login Link */}
                <div className="text-center">
                  <span className="text-gray-400">
                    Already have an account?{" "}
                  </span>
                  <Link
                    href="/signin"
                    className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                  >
                    Sign In
                  </Link>
                </div>
              </form>
            ) : (
              /* STEP 2: OTP Verification (UNCHANGED) */
              <div className="space-y-6">
                {/* OTP Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Enter Verification Code
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/\D/g, ""))
                    }
                    maxLength={6}
                    className="w-full px-4 py-3 bg-black/40 border border-cyan-500/30 rounded-lg text-white text-center text-xl font-mono focus:outline-none focus:border-cyan-400 transition-all"
                    placeholder="000000"
                  />
                  <p className="text-sm text-gray-400 mt-2 text-center">
                    Enter the 6-digit code sent to your email
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setRegistrationStep("form")}
                    className="flex-1 py-3 px-4 border border-cyan-500/30 text-cyan-300 rounded-lg hover:bg-cyan-500/10 transition-all font-medium"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 border border-cyan-500/30 text-cyan-300 rounded-lg hover:bg-cyan-500/10 transition-all font-medium disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                  <button
                    onClick={handleVerifyOTPAndRegister}
                    disabled={isLoading || otpCode.length !== 6}
                    className="flex-1 py-3 px-4 bg-gradient-to-br from-cyan-400 to-teal-500 text-black font-bold rounded-lg hover:from-cyan-300 hover:to-teal-400 disabled:opacity-50 transition-all"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-black"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Verifying...
                      </span>
                    ) : (
                      "Verify & Create Account"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
