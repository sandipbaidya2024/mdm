import React, { useState } from 'react';
import { signUpWithUdise } from '../auth/authService';
import {
  UserPlus,
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Info,
} from 'lucide-react';

interface RegisterScreenProps {
  onSwitchToLogin: () => void;
  onSuccess?: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onSwitchToLogin,
  onSuccess,
}) => {
  const [udiseCode, setUdiseCode] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatFirebaseError = (error: any): string => {
    const code = error?.code || '';
    switch (code) {
      case 'auth/udise-already-in-use':
        return error?.message || 'This UDISE Code is already registered for another school.';
      case 'auth/email-already-in-use':
        return 'This Recovery Email is already in use by an existing account. Please sign in or use a different recovery email.';
      case 'auth/invalid-email':
        return 'Please enter a valid recovery email address.';
      case 'auth/invalid-udise':
        return error?.message || 'Please enter a valid numeric UDISE Code.';
      case 'auth/invalid-school-name':
        return 'Please enter the official name of your school.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters.';
      case 'auth/operation-not-allowed':
        return 'Authentication is not enabled in Firebase Authentication. Please check Firebase Console.';
      case 'auth/network-request-failed':
        return 'Network connection error. Please verify your internet connection.';
      case 'auth/too-many-requests':
        return 'Too many requests. Please try again in a few moments.';
      default:
        return error?.message || 'Failed to create school account. Please try again.';
    }
  };

  const validateForm = (): string | null => {
    const trimmedUdise = udiseCode.trim();
    if (!trimmedUdise) {
      return 'UDISE Code is required.';
    }
    if (trimmedUdise.length < 8) {
      return 'UDISE Code must be at least 8 digits (typically 11 digits).';
    }
    if (!/^\d+$/.test(trimmedUdise)) {
      return 'UDISE Code must contain only numbers.';
    }

    const trimmedSchoolName = schoolName.trim();
    if (!trimmedSchoolName) {
      return 'School Name is required.';
    }

    const trimmedEmail = recoveryEmail.trim();
    if (!trimmedEmail) {
      return 'Recovery Email is required for password recovery.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return 'Please enter a valid email format for Recovery Email (e.g., teacher@school.edu.in).';
    }

    if (!password) {
      return 'Password is required.';
    }

    if (password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match. Please verify both password fields.';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const clientValidationError = validateForm();
    if (clientValidationError) {
      setErrorMessage(clientValidationError);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await signUpWithUdise({
        udiseCode: udiseCode.trim(),
        schoolName: schoolName.trim(),
        recoveryEmail: recoveryEmail.trim(),
        password,
      });

      // Firebase automatically signs in the user upon successful creation.
      onSuccess?.();
    } catch (err: any) {
      console.error('School Registration failed:', err);
      setErrorMessage(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50/40 to-slate-200 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
        {/* Header Ribbon */}
        <div className="bg-emerald-800 text-white px-6 py-6 text-center border-b border-emerald-900 relative">
          <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-700/80 flex items-center justify-center mb-3 shadow-inner text-emerald-100">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">MDM Cloud Portal</h1>
          <p className="text-xs text-emerald-200 mt-1">
            বিদ্যালয় নিবন্ধন • Official School Registration
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-900/60 text-emerald-200 text-[11px] font-medium border border-emerald-700/50">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Unique UDISE Identification</span>
          </div>
        </div>

        {/* Registration Form Body */}
        <div className="p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-base font-bold text-slate-800">
              Register New School • নতুন বিদ্যালয় নিবন্ধন
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Enter your official UDISE Code and school details. UDISE Code is unique to your school.
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. UDISE Code Field */}
            <div>
              <label
                htmlFor="register-udise"
                className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide"
              >
                UDISE Code / ইউডাইস কোড (Unique School Key)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  id="register-udise"
                  type="text"
                  required
                  value={udiseCode}
                  onChange={(e) => setUdiseCode(e.target.value.trim())}
                  placeholder="e.g. 19180100101"
                  disabled={loading}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all disabled:opacity-60"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Unique 11-digit code assigned to your school. Two schools cannot share the same code.
              </p>
            </div>

            {/* 2. School Name Field */}
            <div>
              <label
                htmlFor="register-school-name"
                className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide"
              >
                School Name / বিদ্যালয়ের নাম
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  id="register-school-name"
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. Joypur Primary School"
                  disabled={loading}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* 3. Recovery Email Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="register-recovery-email"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wide"
                >
                  Recovery Email / রিকভারি ইমেল
                </label>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Password Recovery Only
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="register-recovery-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value.trim())}
                  placeholder="e.g. headteacher@school.edu.in"
                  disabled={loading}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all disabled:opacity-60"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
                <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>This email is NOT used for normal login; it is used only if you need to reset your password.</span>
              </div>
            </div>

            {/* 4. Password Field */}
            <div>
              <label
                htmlFor="register-password"
                className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide"
              >
                Password / পাসওয়ার্ড
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="register-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  disabled={loading}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* 5. Confirm Password Field */}
            <div>
              <label
                htmlFor="register-confirm-password"
                className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide"
              >
                Confirm Password / পাসওয়ার্ড নিশ্চিত করুন
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="register-confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  disabled={loading}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                id="btn-register-submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Registering School...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Register School • বিদ্যালয় নিবন্ধন</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Switch to Login Link */}
          <div className="mt-5 text-center">
            <p className="text-xs text-slate-600">
              Already registered?{' '}
              <button
                type="button"
                id="btn-switch-to-login"
                onClick={onSwitchToLogin}
                disabled={loading}
                className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer disabled:opacity-60"
              >
                Sign in with UDISE Code (ইউডাইস কোড দিয়ে লগইন)
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
