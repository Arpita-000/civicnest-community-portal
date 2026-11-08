"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { authErrorMessage } from "../../lib/format";

export default function RegisterPage() {
  const { user, loading, registerUser, signInGoogle } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const prefill = new URLSearchParams(window.location.search).get("email");
      if (prefill) setEmail(prefill);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/profile");
    }
  }, [user, loading, router]);
  const [password, setPassword] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [agreePledge, setAgreePledge] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "",
    message: "",
    description: "",
  });
  const [isToastVisible, setIsToastVisible] = useState(false);

  const showToastMessage = (type: string, message: string, description: string) => {
    setToast({ show: true, type, message, description });
    setTimeout(() => setIsToastVisible(true), 50);
    setTimeout(() => {
      setIsToastVisible(false);
      setTimeout(
        () => setToast({ show: false, type: "", message: "", description: "" }),
        400
      );
    }, 4000);
  };

  const handleCloseToast = () => {
    setIsToastVisible(false);
    setTimeout(
      () => setToast({ show: false, type: "", message: "", description: "" }),
      400
    );
  };

  const hasMin = password.length >= 6;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      showToastMessage("error", "Missing Information", "Please fill in all required fields.");
      return;
    }
    if (!hasMin) {
      showToastMessage("error", "Weak Password", "Password must be at least 6 characters.");
      return;
    }
    if (!agreePledge) {
      showToastMessage("error", "Pledge Required", "Please agree to the Community Cleanliness Pledge.");
      return;
    }

    setIsLoading(true);
    try {
      await registerUser(email.trim(), password, name.trim(), photoURL.trim() || undefined);
      showToastMessage("success", "Registration Successful", "Welcome to CivicNest! Your resident account is ready.");
      setTimeout(() => router.push("/profile"), 1400);
    } catch (err: any) {
      showToastMessage("error", "Registration Error", authErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInGoogle();
      showToastMessage("success", "Registered with Google", `Welcome, ${result.user.displayName || "Resident"}!`);
      setTimeout(() => router.push("/"), 900);
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        showToastMessage("error", "Google Sign-Up Error", authErrorMessage(err));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex bg-white dark:bg-[#0a120e] overflow-hidden"
      style={{ fontFamily: "'Raleway', sans-serif", fontWeight: 500 }}
    >
      {/* ── LEFT SIDE - FORM (42%) ── */}
      <div className="w-full lg:w-[42%] flex flex-col justify-center px-6 md:px-10 lg:px-12 xl:px-16 bg-white dark:bg-[#0a120e] relative py-12">
        <div className="absolute top-8 left-6 md:left-10 lg:left-12 xl:left-16">
          <Link
            href="/"
            className="flex items-center gap-2 text-[13px] font-bold text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Home
          </Link>
        </div>

        <div className="w-full max-w-[400px] mx-auto mt-12">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-12 h-12 rounded-[14px] bg-slate-100 dark:bg-[#1e3040] border-2 border-slate-200 dark:border-[#1e3040] shadow-sm overflow-hidden flex-shrink-0">
              <img
                src="/logo.png"
                alt="CivicNest Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span
                className="text-[28px] text-[#0f172a] dark:text-white tracking-tight leading-none"
                style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900 }}
              >
                Civic<span className="text-[#0f766e]">Nest</span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#0f766e] mt-0.5">
                Apply for Residency
              </span>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-[30px] font-black text-slate-900 dark:text-white leading-tight mb-1.5 tracking-tight">
              Create an Account
            </h2>
            <p className="text-[#64748b] text-[13px]">
              Already verified?{" "}
              <Link
                href="/login"
                className="text-[#0f766e] dark:text-[#2dd4bf] font-semibold hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#94a3b8]">
                Full Legal Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Rivera"
                required
                className="w-full h-12 px-4 bg-slate-50 dark:bg-[#0b1215] border-2 border-slate-100 dark:border-slate-800 rounded-xl text-[14px] font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#0a120e] transition-all"
              />
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#94a3b8]">
                E-mail Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@civicnest.org"
                required
                className="w-full h-12 px-4 bg-slate-50 dark:bg-[#0b1215] border-2 border-slate-100 dark:border-slate-800 rounded-xl text-[14px] font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#0a120e] transition-all"
              />
            </div>

            {/* Photo URL */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#94a3b8]">
                Profile Photo URL (Optional)
              </label>
              <input
                type="url"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full h-12 px-4 bg-slate-50 dark:bg-[#0b1215] border-2 border-slate-100 dark:border-slate-800 rounded-xl text-[14px] font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#0a120e] transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#94a3b8]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-12 px-4 bg-slate-50 dark:bg-[#0b1215] border-2 border-slate-100 dark:border-slate-800 rounded-xl text-[14px] font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#0a120e] transition-all"
              />

              {/* Password strength indicators */}
              <div className="flex items-center gap-2 pt-1 text-[10px]">
                <span className={`px-2 py-0.5 rounded-md font-bold ${hasMin ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                  6+ chars {hasMin ? "✓" : "○"}
                </span>
                <span className={`px-2 py-0.5 rounded-md font-bold ${hasUpper ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                  Uppercase {hasUpper ? "✓" : "○"}
                </span>
                <span className={`px-2 py-0.5 rounded-md font-bold ${hasLower ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                  Lowercase {hasLower ? "✓" : "○"}
                </span>
              </div>
            </div>

            {/* Pledge */}
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400 pt-1">
              <input
                type="checkbox"
                checked={agreePledge}
                onChange={(e) => setAgreePledge(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span>
                I agree to uphold community cleanliness and follow CivicNest neighborhood rules.
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || googleLoading}
              className="w-full h-[48px] bg-[#0f172a] hover:bg-[#1e293b] text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-[13px] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Creating Account…
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e2e8f0] dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white dark:bg-[#0a120e] text-[#94a3b8] text-xs font-medium">
                Or register with
              </span>
            </div>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleRegister}
            disabled={isLoading || googleLoading}
            className="w-full h-[48px] flex items-center justify-center gap-3 bg-white dark:bg-[#0b1215] border border-[#e2e8f0] dark:border-slate-800 rounded-xl text-[13px] hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-[#334155] dark:text-slate-200 font-medium text-[13px]">
              {googleLoading ? "Registering..." : "Continue with Google"}
            </span>
          </button>
        </div>
      </div>

      {/* ── RIGHT SIDE - HERO (58%) ── */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f766e]/35 via-[#0f766e]/15 to-transparent z-10"></div>
        <img
          alt="Volunteers smiling"
          className="absolute inset-0 w-full h-full object-cover"
          src="https://images.pexels.com/photos/9543414/pexels-photo-9543414.jpeg?auto=compress&cs=tinysrgb&w=900&q=80"
        />

        <div className="relative z-20 flex flex-col justify-end p-12 xl:p-16 w-full">
          <div className="max-w-md">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-[10px] font-extrabold uppercase tracking-widest inline-block mb-3">
              Join the Movement
            </span>
            <h2 className="text-white text-3xl xl:text-4xl font-bold leading-tight mb-3 drop-shadow-sm font-display">
              Build a cleaner tomorrow, together.
            </h2>
            <p className="text-white/90 text-[13px] font-medium drop-shadow-sm">
              Thousands of citizens are already reporting issues, funding cleanups, and transforming neighborhoods.
            </p>

            <div className="flex items-center gap-6 mt-8">
              <div>
                <p className="text-white text-2xl font-bold font-display">15k+</p>
                <p className="text-white/70 text-[11px] uppercase tracking-wider">Active Members</p>
              </div>
              <div className="w-px h-8 bg-white/30"></div>
              <div>
                <p className="text-white text-2xl font-bold font-display">8,920</p>
                <p className="text-white/70 text-[11px] uppercase tracking-wider">Issues Resolved</p>
              </div>
              <div className="w-px h-8 bg-white/30"></div>
              <div>
                <p className="text-white text-2xl font-bold font-display">4.9★</p>
                <p className="text-white/70 text-[11px] uppercase tracking-wider">Community Rating</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Toast */}
      {toast.show && (
        <div
          className={`fixed top-5 right-5 z-[100] transition-all duration-500 ease-out ${
            isToastVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
          }`}
        >
          <div
            className={`flex items-center gap-4 bg-white dark:bg-[#0a120e] pl-5 pr-6 py-4 rounded-lg shadow-2xl border ${
              toast.type === "error" ? "border-[#ffcdd2]" : "border-[#c8e6c9]"
            } min-w-[360px]`}
          >
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-full ${
                toast.type === "error"
                  ? "bg-[#ba1a1a]/10 text-[#ba1a1a]"
                  : "bg-[#10b981]/10 text-[#10b981]"
              }`}
            >
              <span className="font-bold text-sm">
                {toast.type === "error" ? "✕" : "✓"}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-[#0f172a] dark:text-white font-bold text-[13px]">
                {toast.message}
              </p>
              <p className="text-[#475569] dark:text-slate-300 text-xs mt-0.5">
                {toast.description}
              </p>
            </div>
            <button
              className="text-[#94a3b8] hover:text-[#475569] transition-colors"
              onClick={handleCloseToast}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
