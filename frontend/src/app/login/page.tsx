"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { authErrorMessage } from "../../lib/format";

export default function LoginPage() {
  const { user, loading, signInUser, signInGoogle } = useAuth();
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [stats, setStats] = useState<{ activeMembers: number; openIssues: number; issuesResolved: number } | null>(null);
  const [redirectPath, setRedirectPath] = useState("/");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const dest = sp.get("redirect") || sp.get("from");
      if (dest && dest.startsWith("/") && !dest.startsWith("//")) setRedirectPath(dest); // in-app paths only
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectPath);
    }
  }, [user, loading, router, redirectPath]);

  useEffect(() => {
    api.get("/public/stats").then((r) => r.data?.success && setStats(r.data.data)).catch(() => {});
  }, []);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const target = e.currentTarget;
    const email = (target.elements.namedItem("email") as HTMLInputElement)?.value.trim();
    const password = (target.elements.namedItem("password") as HTMLInputElement)?.value;

    if (!email || !password) {
      showToastMessage("error", "Missing Fields", "Please enter your email and password.");
      return;
    }

    setChecking(true);
    try {
      setEmailLoading(true);
      await signInUser(email, password);
      showToastMessage("success", "Login Successful", "Welcome back to CivicNest!");
      setTimeout(() => router.push(redirectPath), 900);
    } catch (err: any) {
      if (err?.code === "auth/user-not-found") {
        showToastMessage("error", "Account Not Found", "No account registered with this email. Redirecting to sign up...");
        setTimeout(() => router.push(`/register?email=${encodeURIComponent(email)}`), 1500);
        return;
      }
      if (err?.code === "auth/invalid-credential") {
        try {
          const checkRes = await api.get("/users/check-email", { params: { email }, fresh: true });
          if (checkRes.data && checkRes.data.exists === false) {
            showToastMessage("error", "Account Not Found", "No account registered with this email. Redirecting to sign up...");
            setTimeout(() => router.push(`/register?email=${encodeURIComponent(email)}`), 1500);
            return;
          }
        } catch {}
      }
      showToastMessage("error", "Authentication Failed", authErrorMessage(err));
    } finally {
      setChecking(false);
      setEmailLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement | null;
    const email = emailInput?.value.trim() || "";
    if (!email) {
      showToastMessage("error", "Email Required", "Please enter your email address first to receive a password reset link.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      showToastMessage("success", "Reset Link Sent", `A password reset link has been sent to ${email}.`);
    } catch (err: any) {
      showToastMessage("error", "Reset Failed", authErrorMessage(err));
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInGoogle();
      const firebaseUser = result.user;
      showToastMessage("success", "Login Successful", `Welcome, ${firebaseUser.displayName ?? "neighbour"}!`);
      setTimeout(() => router.push(redirectPath), 900);
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        showToastMessage("error", "Google Sign-In Failed", authErrorMessage(err));
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
      {/* ── LEFT SIDE - FORM SECTION (42%) ── */}
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
          <div className="flex items-center gap-2.5 mb-10">
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
                Sustainable Urban Living
              </span>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-[32px] font-black text-slate-900 dark:text-white leading-tight mb-2 tracking-tight">
              Sign in
            </h2>
            <p className="text-[#64748b] text-[13px] mt-1.5">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="text-[#0f766e] dark:text-[#2dd4bf] font-semibold hover:underline transition-all"
              >
                Create now
              </Link>
            </p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#94a3b8]">
                E-mail
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] text-[15px]">
                  mail
                </span>
                <input
                  type="email"
                  name="email"
                  placeholder="name@email.com"
                  className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-[#0b1215] border-2 border-slate-100 dark:border-slate-800 rounded-xl text-[15px] font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#0a120e] transition-all duration-300"
                  required
                  disabled={emailLoading || googleLoading || checking}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#94a3b8]">
                Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] text-[15px]">
                  lock
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  className="w-full h-14 pl-12 pr-12 bg-slate-50 dark:bg-[#0b1215] border-2 border-slate-100 dark:border-slate-800 rounded-xl text-[15px] font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#0a120e] transition-all duration-300"
                  required
                  disabled={emailLoading || googleLoading || checking}
                />
                <button
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="text-xs font-bold text-slate-400">
                    {showPassword ? "Hide" : "Show"}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setRememberMe(!rememberMe)}
              >
                <div
                  className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-slate-300 dark:border-slate-700 flex items-center justify-center transition-all ${
                    rememberMe ? "bg-[#0f172a] border-transparent" : "bg-[#f8fafc] dark:bg-slate-900"
                  }`}
                >
                  {rememberMe && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <polyline
                        points="1.5,5 4,7.5 8.5,2.5"
                        stroke="white"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-[13px] text-[#475569] dark:text-slate-400 group-hover:text-[#0f172a] dark:group-hover:text-white transition-colors select-none">
                  Remember me
                </span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[13px] font-medium text-[#0f766e] dark:text-teal-400 hover:underline transition-all bg-transparent border-0 p-0 cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* Sign In Button */}
            <button
              className="w-full h-[48px] bg-[#0f172a] hover:bg-[#1e293b] text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-[13px] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              type="submit"
              disabled={emailLoading || googleLoading || checking}
            >
              {checking ? (
                <>
                  <svg
                    className="animate-spin"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Checking account…
                </>
              ) : emailLoading ? (
                <>
                  <svg
                    className="animate-spin"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e2e8f0] dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white dark:bg-[#0a120e] text-[#94a3b8] text-xs font-medium">
                Or continue with
              </span>
            </div>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={emailLoading || googleLoading}
              className="w-full h-[48px] flex items-center justify-center gap-3 bg-white dark:bg-[#0b1215] border border-[#e2e8f0] dark:border-slate-800 rounded-xl text-[13px] hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {googleLoading ? (
                <svg
                  className="animate-spin"
                  style={{ stroke: "#475569", marginRight: "8px" }}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              <span className="text-[#334155] dark:text-slate-200 font-medium text-[13px]">
                {googleLoading ? "Signing in..." : "Continue with Google"}
              </span>
            </button>

            <button
              type="button"
              disabled
              className="w-full h-[48px] flex items-center justify-center gap-3 bg-white dark:bg-[#0b1215] border border-[#e2e8f0] dark:border-slate-800 rounded-xl text-[13px] opacity-50 cursor-not-allowed"
              title="Facebook sign-in coming soon"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span className="text-[#334155] dark:text-slate-400 font-medium text-[13px]">
                Continue with Facebook
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDE - HERO IMAGE (58%) ── */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f766e]/30 via-[#0f766e]/15 to-transparent z-10"></div>
        <img
          alt="Community volunteers cleaning a park"
          className="absolute inset-0 w-full h-full object-cover"
          src="https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?q=80&w=1470&auto=format&fit=crop"
        />

        <div className="relative z-20 flex flex-col justify-end p-12 xl:p-16 w-full">
          <div className="max-w-md">
            <h2 className="text-white text-3xl xl:text-4xl font-bold leading-tight mb-3 drop-shadow-sm font-display">
              Restore your local sanctuary.
            </h2>
            <p className="text-white/90 text-[13px] font-medium drop-shadow-sm">
              Join {stats ? stats.activeMembers.toLocaleString() : "our"} neighbors curating the cleanliness and beauty of our shared public spaces.
            </p>

            <div className="flex items-center gap-4 mt-8">
              <div>
                <p className="text-white/70 text-xs uppercase tracking-wider">
                  Active Issues
                </p>
                <p className="text-white text-2xl font-bold font-display">{stats ? stats.openIssues.toLocaleString() : "–"}</p>
              </div>
              <div className="w-px h-8 bg-white/30"></div>
              <div>
                <p className="text-white/70 text-xs uppercase tracking-wider">
                  Resolved
                </p>
                <p className="text-white text-2xl font-bold font-display">{stats ? stats.issuesResolved.toLocaleString() : "–"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Toast Notification */}
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
