"use client";

import React from "react";
import Link from "next/link";

export default function Home() {
  // Changed from "App" to "Home"
  // Function to simulate the click for the Register button
  const handleRegisterClick = () => {
    // Using a custom alert substitute as per file generation rules.
    alert(
      "This is where the user registration process begins! Redirecting to the sign-up form..."
    );
    console.log("Registration button clicked.");
  };

  return (
    <div
      className="min-h-screen text-white overflow-hidden"
      style={{
        // radial-gradient-bg replacement
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
            {/* Logo: SYNCTECH */}
            <Link href="/" className="flex items-center space-x-3">
              {" "}
              {/* Added Link wrapper */}
              {/* glow-gradient replacement */}
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-black font-bold text-lg">🔗</span>
              </div>
              {/* gradient-text replacement */}
              <span className="text-xl font-black tracking-tight">
                SYNC
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  TECH
                </span>
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#platform"
                className="text-gray-300 hover:text-cyan-300 transition-colors font-medium"
              >
                Platform
              </a>
              <a
                href="#pricing"
                className="text-gray-300 hover:text-cyan-300 transition-colors font-medium"
              >
                Pricing
              </a>
              <a
                href="#connectors"
                className="text-gray-300 hover:text-cyan-300 transition-colors font-medium"
              >
                Connectors
              </a>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              <Link href="/signin">
                <button className="px-6 py-2 rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 transition-all font-medium">
                  Sign In
                </button>
              </Link>

              {/* REGISTER NEW USER BUTTON - Uses btn-glow replacement */}
              <Link href="/register">
                <button className="px-6 py-2 rounded-lg font-bold text-black bg-gradient-to-br from-cyan-400 to-teal-500 hover:from-cyan-300 hover:to-teal-400 shadow-lg transition-all">
                  Register New User
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="relative z-10">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-sm font-bold mb-8 shadow-lg">
              ☁️ FUTURE-PROOF CLOUD PLATFORM
            </div>

            <h1 className="text-6xl lg:text-7xl font-black leading-tight mb-6">
              Data Integration
              {/* gradient-text replacement */}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                Simplified
              </span>
              and Scaled
            </h1>

            <p className="text-xl text-gray-300 mb-10 leading-relaxed max-w-2xl">
              Seamlessly connect your business applications and data sources.
              Our platform provides unified data pipelines, ensuring reliability
              and high-speed synchronization across all environments.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 mb-12">
              {/* btn-glow replacement */}
              <Link href="/register">
                {" "}
                {/* Added Link wrapper */}
                <button className="px-10 py-5 rounded-xl font-bold text-lg text-black flex items-center justify-center space-x-3 bg-gradient-to-br from-cyan-400 to-teal-500 hover:from-cyan-300 hover:to-teal-400 shadow-xl transition-all">
                  <span>🚀</span>
                  <span>Start Free Trial</span>
                </button>
              </Link>
              <button className="px-10 py-5 rounded-xl border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 transition-all font-bold text-lg flex items-center justify-center space-x-3">
                <span>📽️</span>
                <span>Watch Demo</span>
              </button>
            </div>

            {/* Feature Badges */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-3 text-cyan-300">
                <div className="w-3 h-3 bg-cyan-400 rounded-full shadow-lg"></div>
                <span className="font-semibold">Real-time Data Sync</span>
              </div>
              <div className="flex items-center space-x-3 text-teal-300">
                <div className="w-3 h-3 bg-teal-400 rounded-full shadow-lg"></div>
                <span className="font-semibold">Unified API Layer</span>
              </div>
              <div className="flex items-center space-x-3 text-blue-300">
                <div className="w-3 h-3 bg-blue-400 rounded-full shadow-lg"></div>
                <span className="font-semibold">Serverless Scalability</span>
              </div>
            </div>
          </div>

          {/* Right Content - Data Pipeline Visualization */}
          <div className="relative">
            {/* card-glass replacement with inline styles */}
            <div
              className="rounded-3xl p-8 transform rotate-2 shadow-2xl transition-all"
              style={{
                backdropFilter: "blur(10px)",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
              }}
            >
              <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl p-8 border border-cyan-500/20">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-4 h-4 bg-cyan-400 rounded-full shadow-lg"></div>
                  {/* gradient-text replacement */}
                  <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                    DATA PIPELINE
                  </h3>
                </div>

                {/* Data Flow Visualization */}
                <div className="space-y-4 mb-6">
                  <div className="bg-black/40 rounded-lg p-4">
                    <div className="text-cyan-400 font-mono text-sm">
                      Source.CRM_Database.extract...
                    </div>
                  </div>
                  <div className="bg-black/40 rounded-lg p-4">
                    <div className="text-teal-400 font-mono text-sm">
                      Transform.Mapping_Engine.process...
                    </div>
                  </div>
                  <div className="bg-black/40 rounded-lg p-4">
                    <div className="text-blue-400 font-mono text-sm">
                      Load.Warehouse_Staging.commit...
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">
                    LATENCY: <span className="text-cyan-300">1.2ms</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-lg"></div>
                    <span className="text-cyan-300 font-bold">STREAMING</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-cyan-500/20 rounded-full blur-xl"></div>
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-blue-500/20 rounded-full blur-xl"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="platform" className="relative py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black mb-6">
              Core Platform{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                Capabilities
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Our integration backbone is built for performance, reliability,
              and ease of deployment across complex enterprise environments.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div
              className="rounded-2xl p-8 hover:transform hover:scale-105 transition-all duration-300 border border-cyan-500/10 hover:border-cyan-500/30"
              style={{
                backdropFilter: "blur(10px)",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
              }}
            >
              {/* glow-gradient replacement */}
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <span className="text-2xl">⚡</span>
              </div>
              {/* gradient-text replacement */}
              <h3 className="text-2xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                High-Speed Sync
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Real-time data synchronization with built-in conflict resolution
                and zero downtime deployment capabilities.
              </p>
            </div>

            {/* Feature 2 */}
            <div
              className="rounded-2xl p-8 hover:transform hover:scale-105 transition-all duration-300 border border-teal-500/10 hover:border-teal-500/30"
              style={{
                backdropFilter: "blur(10px)",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
              }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <span className="text-2xl">🧩</span>
              </div>
              <h3 className="text-2xl font-black mb-4 bg-gradient-to-br from-teal-400 to-blue-500 bg-clip-text text-transparent">
                Universal Connectivity
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Connect instantly to hundreds of applications using our
                universal API and a growing library of pre-built connectors.
              </p>
            </div>

            {/* Feature 3 */}
            <div
              className="rounded-2xl p-8 hover:transform hover:scale-105 transition-all duration-300 border border-blue-500/10 hover:border-blue-500/30"
              style={{
                backdropFilter: "blur(10px)",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
              }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <span className="text-2xl">⚖️</span>
              </div>
              <h3 className="text-2xl font-black mb-4 bg-gradient-to-br from-blue-400 to-cyan-500 bg-clip-text text-transparent">
                Serverless Scalability
              </h3>
              <p className="text-gray-300 leading-relaxed">
                A fully serverless backend that scales automatically from pilot
                projects to enterprise workloads instantly and efficiently.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-black mb-6">
            Ready to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              Integrate
            </span>{" "}
            Your Business?
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join thousands of modern businesses using our platform to unify
            their operations and drive digital transformation.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            {/* btn-glow replacement */}
            <Link href="/register">
              <button className="px-12 py-5 rounded-xl font-black text-lg text-black bg-gradient-to-br from-cyan-400 to-teal-500 hover:from-cyan-300 hover:to-teal-400 shadow-xl transition-all">
                Create Free Account
              </button>
            </Link>

            <button className="px-12 py-5 rounded-xl border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 transition-all font-bold text-lg">
              Contact Sales Team
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            {/* glow-gradient replacement */}
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-black font-bold text-lg">🔗</span>
            </div>
            {/* gradient-text replacement */}
            <span className="text-2xl font-black">
              SYNC
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                TECH
              </span>
            </span>
          </div>
          <p className="text-gray-400 max-w-md mx-auto">
            Unified data integration platform for modern enterprises. Reliable,
            scalable, and simple.
          </p>
        </div>
      </footer>
    </div>
  );
}
