import React, { useState } from 'react';
import {
  registerSchoolWithBackend,
  formatRegistrationError,
  type FormattedRegistrationError,
} from '../services/schoolRegistrationClient';
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
  ArrowRight,
  LogIn,
} from 'lucide-react';

interface RegisterScreenProps {
  onSwitchToLogin: () => void;
  onSuccess?: (registeredUdise: string) => void;
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
  const [formattedError, setFormattedError] = useState<FormattedRegistrationError | null>(null);

  // Successful registration state
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredSchool, setRegisteredSchool] = useState<{
    udiseCode: string;
    schoolName: string;
  } | null>(null);

  const validateClientInputs = (): string | null => {
    const trimmedUdise = udiseCode.trim();
    if (!trimmedUdise) {
      return 'ইউডাইস কোড আবশ্যক। (UDISE Code is required.)';
    }
    if (trimmedUdise.length !== 11 || !/^\d{11}$/.test(trimmedUdise)) {
      return 'ইউডাইস কোডটি অবশ্যই ১১-সংখ্যার সংখ্যাসূচক হতে হবে। (UDISE Code must be exactly 11 digits.)';
    }

    const trimmedSchoolName = schoolName.trim();
    if (!trimmedSchoolName || trimmedSchoolName.length < 2) {
      return 'বিদ্যালয়ের নাম আবশ্যক (কমপক্ষে ২টি অক্ষর)। (School Name is required.)';
    }

    const trimmedEmail = recoveryEmail.trim();
    if (!trimmedEmail) {
      return 'পাসওয়ার্ড রিকভারির জন্য রিকভারি ইমেল আবশ্যক। (Recovery Email is required.)';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return 'অনুগ্রহ করে একটি সঠিক ইমেল অ্যাড্রেস দিন (e.g., teacher@school.gov.in)।';
    }

    if (!password) {
      return 'পাসওয়ার্ড আবশ্যক। (Password is required.)';
    }

    if (password.length < 6) {
      return 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে। (Password must be at least 6 characters.)';
    }

    if (password !== confirmPassword) {
      return 'পাসওয়ার্ড দুটি মেলেনি। অনুগ্রহ করে নিশ্চিতকরণ পাসওয়ার্ড চেক করুন। (Passwords do not match.)';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submissions while in progress
    if (loading) {
      return;
    }

    // Client-side pre-validation
    const clientErr = validateClientInputs();
    if (clientErr) {
      setFormattedError({
        bengali: clientErr,
        english: 'Please review and correct the highlighted field.',
        code: 'VALIDATION_ERROR',
        canRetrySafely: true,
      });
      return;
    }

    setLoading(true);
    setFormattedError(null);

    try {
      // Dispatch registration payload to trusted server-side provisioning engine
      const result = await registerSchoolWithBackend({
        udiseCode: udiseCode.trim(),
        schoolName: schoolName.trim(),
        recoveryEmail: recoveryEmail.trim(),
        password,
        confirmPassword,
      });

      if (result.success) {
        setIsSuccess(true);
        setRegisteredSchool({
          udiseCode: result.udiseCode || udiseCode.trim(),
          schoolName: schoolName.trim(),
        });
        onSuccess?.(result.udiseCode || udiseCode.trim());
      } else {
        const parsedError = formatRegistrationError({
          code: result.code,
          message: result.error,
          rollbackExecuted: !result.canRetrySafely ? false : true,
        });
        setFormattedError(parsedError);
      }
    } catch (err: any) {
      console.error('School registration submission failed:', err);
      const parsedError = formatRegistrationError(err);
      setFormattedError(parsedError);
    } finally {
      setLoading(false);
    }
  };

  // SUCCESS SCREEN VIEW
  if (isSuccess && registeredSchool) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50/50 to-slate-200 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-emerald-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-emerald-800 text-white px-6 py-6 text-center border-b border-emerald-900">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-600/90 flex items-center justify-center mb-3 shadow-lg text-white">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">বিদ্যালয় নিবন্ধন সম্পন্ন হয়েছে!</h1>
            <p className="text-xs text-emerald-200 mt-1">School Registration Successfully Provisioned</p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* School details pill */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-2">
                <Building2 className="w-4 h-4" />
                <span>নিবন্ধিত বিদ্যালয়ের বিবরণ • Registered School</span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between border-b border-emerald-100 pb-1.5">
                  <span className="text-slate-600">বিদ্যালয়ের নাম (School Name):</span>
                  <span className="font-bold text-slate-800">{registeredSchool.schoolName}</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-slate-600">ইউডাইস কোড (UDISE Code):</span>
                  <span className="font-mono font-bold text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded text-xs">
                    {registeredSchool.udiseCode}
                  </span>
                </div>
              </div>
            </div>

            {/* Login Instructions */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-bold text-slate-900">কীভাবে লগইন করবেন? • How to Log In:</p>
                  <p className="mt-1">
                    ১. লগইন স্ক্রিনে আপনার <strong>১১-সংখ্যার ইউডাইস কোড ({registeredSchool.udiseCode})</strong> এবং <strong>পাসওয়ার্ড</strong> ব্যবহার করুন।
                  </p>
                  <p className="mt-1 text-slate-500">
                    (Use your UDISE Code and Password to log in. The Recovery Email is never used for login.)
                  </p>
                </div>
              </div>
            </div>

            {/* Proceed to Login Button */}
            <button
              type="button"
              id="btn-proceed-to-login"
              onClick={onSwitchToLogin}
              className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>লগইন স্ক্রিনে যান • Proceed to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STANDARD REGISTRATION FORM
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

          {/* Formatted Error Banner */}
          {formattedError && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="font-semibold text-rose-900 leading-snug">
                  {formattedError.bengali}
                </div>
                <div className="text-rose-600 text-[11px] leading-relaxed">
                  {formattedError.english}
                </div>
                {formattedError.canRetrySafely && (
                  <div className="text-[10px] text-emerald-700 font-medium pt-0.5">
                    ✓ আপনি বিবরণ সংশোধন করে নিরাপদে পুনরায় চেষ্টা করতে পারেন (You may retry safely).
                  </div>
                )}
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
                  maxLength={11}
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
                  placeholder="e.g. headteacher@school.gov.in"
                  disabled={loading}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all disabled:opacity-60"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
                <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  This email is NOT used for normal login; it is used solely if you ever need to reset your password.
                </span>
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
                    <span>বিদ্যালয় নিবন্ধন প্রক্রিয়াধীন... • Provisioning...</span>
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
