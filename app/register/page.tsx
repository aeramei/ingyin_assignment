"use client";
import React, { useState, ChangeEvent, FormEvent } from "react";
import Link from "next/link";

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

  //

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match!");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    if (!formData.fullName || !formData.email || !formData.company) {
      setError("Please fill in all required fields");
      setIsLoading(false);
      return;
    }

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
              Create Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                Account
              </span>
            </h1>
            <p className="text-gray-300">
              Join SyncTech and start integrating your business data today
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
            <form onSubmit={handleSubmit} className="space-y-6">
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
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-black/40 border border-cyan-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-all"
                  placeholder="Create a strong password"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-black/40 border border-cyan-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-all"
                  placeholder="Confirm your password"
                />
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
                  <option value="professional">Professional - $49/month</option>
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
                disabled={isLoading}
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
                    Creating Account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </button>

              {/* Login Link */}
              <div className="text-center">
                <span className="text-gray-400">Already have an account? </span>
                <Link
                  href="/signin"
                  className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                >
                  Sign In
                </Link>
              </div>
            </form>
          </div>

          {/* Demo Note */}
          <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <p className="text-sm text-cyan-300 text-center">
              <strong>Demo Mode:</strong> This is a UI-only demonstration. Form
              validation works, but no data is sent to any server.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
