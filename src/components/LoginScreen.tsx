import React, { useState } from 'react';
import { signInWithUdise, sendPasswordResetForUdise } from '../auth/authService';
import {
  LogIn,
  AlertCircle,
  Loader2,
  Lock,
  Building2,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface LoginScreenProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSuccess,
  onSwitchToRegister,
}) => {
  // Screen mode: 'LOGIN' or 'FORGOT_PASSWORD'
  const [mode, setMode] = useState<'LOGIN' | 'FORGOT_PASSWORD'>('LOGIN');

  // Login form state
  const [udiseCode, setUdiseCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password form state
  const [forgotUdise, setForgotUdise] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState<string | null>(null);
  const [forgotErrorMessage, setForgotErrorMessage] = useState<string | null>(null);

  const formatFirebaseError = (error: any): string => {
    const code = error?.code || '';
    switch (code) {
      case 'auth/invalid-udise':
        return error?.message || 'Please enter a valid numeric UDISE Code.';
      case 'auth/user-not-found':
        return 'No school found with this UDISE Code. Please verify your UDISE Code or register your school.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid password for this school account. Please verify and try again.';
      case 'auth/too-many-requests':
        return 'Access to this account has been temporarily disabled due to multiple failed attempts. Please use Forgot Password or try again later.';
      case 'auth/user-disabled':
        return 'This school account has been disabled by an administrator.';
      case 'auth/network-request-failed':
        return 'Network connection error. Please verify your internet connection.';
      default:
        return error?.message || 'Authentication failed. Please verify your UDISE Code and password.';
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUdise = udiseCode.trim();
    if (!trimmedUdise || !password) {
      setErrorMessage('Please provide both your school UDISE Code and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await signInWithUdise(trimmedUdise, password);
      onSuccess?.();
    } catch (err: any) {
      console.error('UDISE Login failed:', err);
      setErrorMessage(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUdise = forgotUdise.trim();
    if (!trimmedUdise) {
      setForgotErrorMessage('Please enter your school UDISE Code.');
      return;
    }

    setForgotLoading(true);
    setForgotErrorMessage(null);
    setForgotSuccessMessage(null);

    try {
      const res = await sendPasswordResetForUdise(trimmedUdise);
      // Requirement 10: Show generic success message that does not reveal whether a particular UDISE exists
      setForgotSuccessMessage(res.message);
    } catch (err: any) {
      console.error('Password reset request error:', err);
      if (err?.code === 'auth/network-request-failed') {
        setForgotErrorMessage('Network error. Please check your internet connection.');
      } else {
        // Fallback generic confirmation to prevent user enumeration
        setForgotSuccessMessage(
          'If this UDISE Code is registered in the system, a password reset link has been dispatched to the recovery email address. Please check your inbox and spam folder.'
        );
      }
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50/40 to-slate-200 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-emerald-800 text-white px-6 py-6 text-center border-b border-emerald-900 relative">
          <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-700/80 flex items-center justify-center mb-3 shadow-inner text-emerald-100">
            {mode === 'LOGIN' ? <Lock className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
          </div>
          <h1 className="text-xl font-bold tracking-tight">MDM Cloud Portal</h1>
          <p className="text-xs text-emerald-200 mt-1">
            মধাহ্ন ভোজন প্রকল্প ব্যবস্থাপনা • Official Mid-Day Meal Management
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-900/60 text-emerald-200 text-[11px] font-medium border border-emerald-700/50">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>UDISE Verified Access</span>
          </div>
        </div>

        {/* View 1: Standard Login Form */}
        {mode === 'LOGIN' && (
          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-base font-bold text-slate-800 flex items-center justify-between">
                <span>School Login • বিদ্যালয় লগইন</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Sign in using your school’s 11-digit UDISE Code and password.
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed font-medium">
                  {errorMessage}
                </div>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* UDISE Code Field (No Email field allowed) */}
              <div>
                <label
                  htmlFor="login-udise"
                  className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide"
                >
                  UDISE Code / ইউডাইস কোড
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    id="login-udise"
                    type="text"
                    required
                    autoComplete="username"
                    value={udiseCode}
                    onChange={(e) => setUdiseCode(e.target.value.trim())}
                    placeholder="e.g. 19180100101"
                    disabled={loading}
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all disabled:opacity-60"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  11-digit unique school identification number.
                </p>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wide"
                  >
                    Password / পাসওয়ার্ড
                  </label>
                  <button
                    type="button"
                    id="btn-forgot-password"
                    onClick={() => {
                      setForgotUdise(udiseCode);
                      setForgotSuccessMessage(null);
                      setForgotErrorMessage(null);
                      setMode('FORGOT_PASSWORD');
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-login-submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In • প্রবেশ করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Switch to Register Link */}
            {onSwitchToRegister && (
              <div className="mt-5 text-center">
                <p className="text-xs text-slate-600">
                  New school?{' '}
                  <button
                    type="button"
                    id="btn-switch-to-register"
                    onClick={onSwitchToRegister}
                    disabled={loading}
                    className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer disabled:opacity-60"
                  >
                    Register School (স্কুল নিবন্ধন)
                  </button>
                </p>
              </div>
            )}

            {/* Benchmark School Quick Hint */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-[11px] text-slate-600">
                <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-700">Pre-seeded School UDISE:</span>{' '}
                  <span className="font-mono font-bold text-emerald-800">19180100101</span>{' '}
                  (Joypur Primary School).
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View 2: Forgot Password Screen */}
        {mode === 'FORGOT_PASSWORD' && (
          <div className="p-6 sm:p-8 animate-in fade-in duration-200">
            <div className="mb-5">
              <button
                type="button"
                id="btn-back-to-login"
                onClick={() => {
                  setErrorMessage(null);
                  setMode('LOGIN');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 mb-3 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In (লগইনে ফিরে যান)</span>
              </button>
              <h2 className="text-base font-bold text-slate-800">
                Password Recovery • পাসওয়ার্ড পুনরুদ্ধার
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Enter your school’s UDISE Code. If registered, a password reset link will be dispatched to the associated recovery email.
              </p>
            </div>

            {/* Error Banner */}
            {forgotErrorMessage && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed font-medium">
                  {forgotErrorMessage}
                </div>
              </div>
            )}

            {/* Generic Success Banner (Prevents enumeration) */}
            {forgotSuccessMessage && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  <p className="font-bold mb-1">অনুরোধ সম্পন্ন হয়েছে (Request Dispatched)</p>
                  <p>{forgotSuccessMessage}</p>
                </div>
              </div>
            )}

            {!forgotSuccessMessage ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="forgot-udise"
                    className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide"
                  >
                    School UDISE Code / ইউডাইস কোড
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      id="forgot-udise"
                      type="text"
                      required
                      value={forgotUdise}
                      onChange={(e) => setForgotUdise(e.target.value.trim())}
                      placeholder="e.g. 19180100101"
                      disabled={forgotLoading}
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all disabled:opacity-60"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    The reset link will be sent to the school’s registered recovery email address.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    id="btn-send-reset-link"
                    disabled={forgotLoading}
                    className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Sending Recovery Link...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Send Reset Link • লিঙ্ক পাঠান</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setForgotSuccessMessage(null);
                    setMode('LOGIN');
                  }}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 transition-colors"
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
