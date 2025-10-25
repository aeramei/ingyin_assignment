"use client";
import React, {
  useState,
  ChangeEvent,
  FormEvent,
  useRef,
  useEffect,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Declare grecaptcha for TypeScript
declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoad: () => void;
  }
}

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [socialLoading, setSocialLoading] = useState<
    "google" | "github" | null
  >(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const [isRecaptchaVerified, setIsRecaptchaVerified] = useState(false);

  const recaptchaRef = useRef<HTMLDivElement>(null);
  const recaptchaWidgetId = useRef<number | null>(null);
  const router = useRouter();

  // ✅ LOAD reCAPTCHA v2 SCRIPT
  useEffect(() => {
    const loadRecaptcha = () => {
      // Remove any existing reCAPTCHA script
      const existingScript = document.querySelector('script[src*="recaptcha"]');
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit`;
      script.async = true;
      script.defer = true;

      // Define the callback function
      window.onRecaptchaLoad = () => {
        setRecaptchaReady(true);
        console.log("reCAPTCHA v2 loaded successfully");

        // Render reCAPTCHA widget
        if (recaptchaRef.current) {
          recaptchaWidgetId.current = window.grecaptcha.render(
            recaptchaRef.current,
            {
              sitekey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!,
              callback: onRecaptchaSuccess,
              "error-callback": onRecaptchaError,
              theme: "dark", // Match your dark theme
              size: "normal",
            }
          );
        }
      };

      script.onerror = () => {
        console.error("Failed to load reCAPTCHA");
        setError(
          "Security verification failed to load. Please refresh the page."
        );
      };

      document.head.appendChild(script);
    };

    loadRecaptcha();

    // Cleanup function
    return () => {
      if (recaptchaWidgetId.current !== null && window.grecaptcha) {
        window.grecaptcha.reset(recaptchaWidgetId.current);
      }
    };
  }, []);

  // ✅ reCAPTCHA SUCCESS CALLBACK
  const onRecaptchaSuccess = (token: string) => {
    console.log("reCAPTCHA verified successfully");
    setIsRecaptchaVerified(true);
  };

  // ✅ reCAPTCHA ERROR CALLBACK
  const onRecaptchaError = () => {
    console.error("reCAPTCHA verification failed");
    setIsRecaptchaVerified(false);
    setError("Security verification failed. Please try again.");
  };

  // ✅ RESET reCAPTCHA
  const resetRecaptcha = () => {
    if (recaptchaWidgetId.current !== null && window.grecaptcha) {
      window.grecaptcha.reset(recaptchaWidgetId.current);
      setIsRecaptchaVerified(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
    setSuccess("");
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  // ✅ SOCIAL LOGIN HANDLERS
  const handleSocialLogin = async (provider: "google" | "github") => {
    try {
      setSocialLoading(provider);
      setError("");

      // Redirect to OAuth provider (server enforces fixed redirect_uri)
      window.location.href = `/api/auth/oauth/${provider}`;
    } catch (error) {
      console.error(`${provider} login error:`, error);
      setError(`Failed to start ${provider} login. Please try again.`);
      setSocialLoading(null);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    // Basic validation
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    // Check if reCAPTCHA is ready and verified
    if (!recaptchaReady) {
      setError("Security verification is still loading. Please wait a moment.");
      setIsLoading(false);
      return;
    }

    if (!isRecaptchaVerified) {
      setError("Please complete the security verification.");
      setIsLoading(false);
      return;
    }

    try {
      // ✅ GET reCAPTCHA TOKEN
      const recaptchaToken = window.grecaptcha.getResponse(
        recaptchaWidgetId.current
      );

      if (!recaptchaToken) {
        setError(
          "Security verification failed. Please complete the verification again."
        );
        setIsLoading(false);
        return;
      }

      console.log("reCAPTCHA token obtained");

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          recaptchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Sign in failed");
      }

      setSuccess(
        `Success! Signed in as ${data.user.role === "ADMIN" ? "Admin" : "User"}`
      );

      // Reset form and reCAPTCHA
      setFormData({
        email: "",
        password: "",
      });
      resetRecaptcha();

      // Redirect based on role
      setTimeout(() => {
        if (data.user.role === "ADMIN") {
          window.location.href = "/admindashboard";
        } else {
          window.location.href = "/authenticated";
        }
      }, 1500);
    } catch (error: any) {
      // Reset reCAPTCHA on error
      resetRecaptcha();

      if (
        error.message.includes("reCAPTCHA") ||
        error.message.includes("Security")
      ) {
        setError(
          "Security verification failed. Please complete the verification again."
        );
      } else {
        setError(error.message || "Sign in failed. Please try again.");
      }
      console.error("Sign in error:", error);
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
              <button className="px-6 py-2 rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 transition-all font-medium">
                ← Back to Home
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Login Form Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black mb-4">
              Welcome{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                Back
              </span>
            </h1>
            <p className="text-gray-300">
              Sign in to your SyncTech account to continue
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

          {/* Login Card */}
          <div
            className="rounded-3xl p-8 shadow-2xl transition-all"
            style={{
              backdropFilter: "blur(10px)",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(103, 232, 249, 0.2)",
            }}
          >
            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Google Login Button */}
              <button
                onClick={() => handleSocialLogin("google")}
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
                Google
              </button>

              {/* GitHub Login Button */}
              <button
                onClick={() => handleSocialLogin("github")}
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
                GitHub
              </button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-gray-400">
                  Or continue with email
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-black/40 border border-cyan-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-all"
                  placeholder="Enter your email"
                />
              </div>
              {/* Password Field */}
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
                    placeholder="Enter your password"
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
              </div>
              {/* ✅ reCAPTCHA v2 CHECKBOX */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Security Verification
                </label>
                <div className="flex justify-center">
                  <div
                    ref={recaptchaRef}
                    className="g-recaptcha"
                    data-sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                    data-callback="onRecaptchaSuccess"
                    data-error-callback="onRecaptchaError"
                    data-theme="dark"
                  ></div>
                </div>
                {!recaptchaReady && (
                  <div className="text-yellow-400 text-xs mt-2 text-center">
                    Loading security verification...
                  </div>
                )}
              </div>
              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-cyan-400 bg-black/40 border-cyan-500/30 rounded focus:ring-cyan-400"
                  />
                  <span className="text-sm text-gray-300">Remember me</span>
                </label>
                <a
                  href="#"
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  onClick={(e) => e.preventDefault()}
                >
                  Forgot password?
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !recaptchaReady || !isRecaptchaVerified}
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
                    Signing In...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
              {/* Register Link */}
              <div className="text-center pt-4">
                <span className="text-gray-400">Don't have an account? </span>
                <Link
                  href="/register"
                  className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                >
                  Create account
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
