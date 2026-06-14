import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { LogIn, UserPlus, HelpCircle } from "lucide-react";

export const Login: React.FC = () => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, resetPassword } = useAuth();

  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const clearForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setUsername("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please fill in all credentials");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      setErrorMsg(err?.message || "Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName || !username) {
      setErrorMsg("All fields are required for onboarding");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    try {
      await registerWithEmail(email, password, fullName, username);
      setSuccessMsg("Account created! A verification email has been sent.");
      setTimeout(() => {
        setIsRegistering(false);
        clearForm();
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to register new account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Please enter your registered email address");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSuccessMsg("Invention code or reset link successfully dispatched to mailbox!");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to trigger recovery event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg("");
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMsg(err?.message || "Google Sign-in abandoned or failed");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-[#18191A] flex flex-col md:flex-row items-center justify-center p-4 md:px-12 lg:px-24">
      {/* Left Column: Branding */}
      <div className="md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left space-y-4 mb-8 md:mb-0 md:pr-12">
        <h1 className="font-sans font-extrabold text-[#1877F2] text-5xl md:text-6xl tracking-tight select-none">
          facebook
        </h1>
        <p className="text-xl md:text-2xl text-neutral-800 dark:text-[#E4E6EB] max-w-md font-sans">
          Connect with friends and the world around you on Facebook.
        </p>
      </div>

      {/* Right Column: Interactive Card */}
      <div className="w-full max-w-md h-auto">
        <div className="bg-white dark:bg-[#242526] rounded-xl p-6 shadow-xl border border-neutral-200 dark:border-neutral-800">
          
          {/* Form Header */}
          <div className="mb-6 text-center select-none">
            <h2 className="text-xl font-extrabold text-neutral-900 dark:text-[#E4E6EB]">
              {isForgotPassword
                ? "Find Your Account"
                : isRegistering
                ? "Create a New Account"
                : "Sign In"}
            </h2>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-900 rounded-lg text-sm text-red-700 dark:text-red-400 font-medium">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-900 rounded-lg text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              {successMsg}
            </div>
          )}

          {/* Rendering Flow */}
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-xs text-neutral-600 dark:text-[#B0B3B8] leading-relaxed">
                Please enter your email search index. We will dispatch commands to reset your credential passwords.
              </p>
              <input
                type="email"
                placeholder="Email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-4 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-[#3A3B3C] text-sm text-neutral-900 dark:text-[#E4E6EB] focus:ring-1 focus:ring-[#1877F2] outline-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-[#1877F2] hover:bg-[#1565C0] text-white font-extrabold text-base rounded-lg shadow-md transition disabled:opacity-50"
              >
                {submitting ? "Searching Database..." : "Send Verification Details"}
              </button>
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    clearForm();
                  }}
                  className="text-sm font-semibold text-[#1877F2] hover:underline"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-3">
              <input
                type="text"
                placeholder="Full name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-11 px-4 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-[#3A3B3C] text-sm text-neutral-900 dark:text-[#E4E6EB] focus:ring-1 focus:ring-[#1877F2] outline-none animate-fade-in"
              />
              <input
                type="text"
                placeholder="Username (unique identifier)"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-11 px-4 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-[#3A3B3C] text-sm text-neutral-900 dark:text-[#E4E6EB] focus:ring-1 focus:ring-[#1877F2] outline-none"
              />
              <input
                type="email"
                placeholder="Email Address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-4 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-[#3A3B3C] text-sm text-neutral-900 dark:text-[#E4E6EB] focus:ring-1 focus:ring-[#1877F2] outline-none"
              />
              <input
                type="password"
                placeholder="New Password (min 6 chars)"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-4 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-[#3A3B3C] text-sm text-neutral-900 dark:text-[#E4E6EB] focus:ring-1 focus:ring-[#1877F2] outline-none"
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-extrabold text-base rounded-lg transition disabled:opacity-50 mt-2"
              >
                {submitting ? "Processing Profile..." : "Sign Up"}
              </button>

              <div className="text-center pt-3 border-t border-neutral-200 dark:border-neutral-800 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    clearForm();
                  }}
                  className="text-sm font-semibold text-[#1877F2] hover:underline"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                placeholder="Email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-4 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-[#3A3B3C] text-sm text-neutral-900 dark:text-[#E4E6EB] focus:ring-1 focus:ring-[#1877F2] outline-none"
              />
              <input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-4 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-[#3A3B3C] text-sm text-neutral-900 dark:text-[#E4E6EB] focus:ring-1 focus:ring-[#1877F2] outline-none"
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-[#1877F2] hover:bg-[#1565C0] text-white font-extrabold text-base rounded-lg shadow-md transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <LogIn className="w-5 h-5" />
                <span>{submitting ? "Signing In..." : "Log In"}</span>
              </button>

              {/* Federated Login (Google popup context) */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full h-11 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-[#323334] rounded-lg transition text-neutral-700 dark:text-[#E4E6EB] font-semibold text-sm flex items-center justify-center space-x-2 shadow-sm"
              >
                <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.74 0 3.3.6 4.53 1.78l3.39-3.39C17.84 1.54 15.11 1 12 1 7.24 1 3.21 3.75 1.34 7.74l3.96 3.07C6.27 7.75 8.91 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-1.99 3.41-4.92 3.41-8.6z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.23c-.24-.73-.38-1.52-.38-2.33s.14-1.6.38-2.33L1.34 6.5C.49 8.15 0 10.02 0 12s.49 3.85 1.34 5.5l3.96-3.27z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.96-1.08 7.95-2.92l-3.7-2.87c-1.11.75-2.54 1.19-4.25 1.19-3.09 0-5.73-2.71-6.66-5.77l-3.96 3.07C3.21 20.25 7.24 23 12 23z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-xs text-[#1877F2] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="border-t border-neutral-200 dark:border-neutral-800 my-4 pt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    clearForm();
                  }}
                  className="px-4 h-11 bg-[#42B72A] hover:bg-[#36A420] text-white font-extrabold text-sm rounded-lg transition flex items-center justify-center space-x-1.5 mx-auto"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create New Account</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
