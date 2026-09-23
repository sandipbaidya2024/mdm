import React, { useState, useEffect } from 'react';
import { db, initializeDefaultMenus } from './db/db';
import type { SchoolProfile } from './types/mdm';
import { SetupWizard } from './components/SetupWizard';
import { DailyEntry } from './components/DailyEntry';
import { MonthlySheet } from './components/MonthlySheet';
import { LedgerOverview } from './components/LedgerOverview';
import { SettingsPanel } from './components/SettingsPanel';
import { VerificationModal } from './components/VerificationModal';
import { ReportCenter } from './components/reports/ReportCenter';
import { MonthlyOfficialDataPanel } from './components/MonthlyOfficialDataPanel';
import { LoginScreen } from './components/LoginScreen';
import { RegisterScreen } from './components/RegisterScreen';
import {
  subscribeToAuthState,
  logOut,
  getCurrentSchoolIdentity,
  type User,
  type SchoolAuthIdentity,
} from './auth/authService';
import {
  CalendarDays,
  FileSpreadsheet,
  TableProperties,
  Settings,
  Building2,
  Coins,
  Package,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Sparkles,
  FileText,
  HeartPulse,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { calculateMonthSummary, formatINR, formatKg, getMonthKey } from './utils/mdmCalculations';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [schoolIdentity, setSchoolIdentity] = useState<SchoolAuthIdentity | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authScreen, setAuthScreen] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'DAILY' | 'MONTHLY_SHEET' | 'LEDGER' | 'REPORTS' | 'OFFICIAL_DATA' | 'SETTINGS'>('MONTHLY_SHEET');
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('2026-01');

  // Quick header stats
  const [currentMonthSummary, setCurrentMonthSummary] = useState<any>(null);

  // Subscribe to Firebase Authentication state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      setCurrentUser(user);
      setSchoolIdentity(getCurrentSchoolIdentity());
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      await db.open();
      await initializeDefaultMenus();
      const existing = await db.schoolProfile.toCollection().first();
      if (existing && existing.isSetupComplete) {
        setProfile(existing);
        // Load current month summary for top bar
        const nowMonth = getMonthKey(new Date());
        const sum = await calculateMonthSummary(nowMonth);
        setCurrentMonthSummary(sum);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Error loading school profile from Dexie:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleNavigateToDate = (date: string) => {
    setSelectedDailyDate(date);
    setActiveView('DAILY');
  };

  const handleLogout = async () => {
    try {
      await logOut();
      setAuthScreen('LOGIN');
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  // Auth checking loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <span className="text-sm font-semibold text-slate-700">Verifying Authentication...</span>
        </div>
      </div>
    );
  }

  // If user is not signed in to Firebase, render either the Login or Register Screen
  if (!currentUser) {
    if (authScreen === 'REGISTER') {
      return (
        <RegisterScreen
          onSwitchToLogin={() => setAuthScreen('LOGIN')}
        />
      );
    }
    return (
      <LoginScreen
        onSwitchToRegister={() => setAuthScreen('REGISTER')}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <span className="text-sm font-semibold text-slate-700">Loading MDM Local Database...</span>
        </div>
      </div>
    );
  }

  // First-time onboarding wizard
  if (!profile) {
    return <SetupWizard onComplete={loadProfile} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 font-sans">
      {/* Top Application Header */}
      <header className="bg-emerald-800 text-white border-b border-emerald-900 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700/80 rounded-lg text-emerald-100">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold leading-tight">
                  {profile.schoolName}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-600/70 text-emerald-100">
                  {profile.schoolType === 'PRIMARY' ? 'Primary' : 'Upper'}
                </span>
              </div>
              <div className="text-xs text-emerald-200 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span>UDISE: <strong className="font-mono text-white">{profile.udiseCode}</strong></span>
                <span>•</span>
                <span>{profile.blockCircle}, {profile.district}</span>
              </div>
            </div>
          </div>

          {/* Quick Real-Time Balances */}
          {currentMonthSummary && (
            <div className="flex items-center gap-3 bg-emerald-900/60 px-3.5 py-1.5 rounded-xl border border-emerald-700/50 text-xs">
              <div className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-300" />
                <div>
                  <span className="text-[10px] text-emerald-300 block leading-tight">Money Closing</span>
                  <strong className="font-mono text-emerald-100">
                    {formatINR(currentMonthSummary.closingMoney.total)}
                  </strong>
                </div>
              </div>
              <div className="h-6 w-[1px] bg-emerald-700" />
              <div className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-300" />
                <div>
                  <span className="text-[10px] text-amber-300 block leading-tight">Rice Stock</span>
                  <strong className="font-mono text-amber-100">
                    {formatKg(currentMonthSummary.closingRice.total)}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1.5 bg-emerald-900/70 p-1 rounded-xl">
            <button
              type="button"
              id="nav-daily"
              onClick={() => setActiveView('DAILY')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeView === 'DAILY'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-emerald-100 hover:text-white hover:bg-emerald-800/60'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Daily Entry
            </button>

            <button
              type="button"
              id="nav-monthly-sheet"
              onClick={() => setActiveView('MONTHLY_SHEET')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeView === 'MONTHLY_SHEET'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-emerald-100 hover:text-white hover:bg-emerald-800/60'
              }`}
            >
              <TableProperties className="w-4 h-4" />
              Monthly Register Sheet
            </button>

            <button
              type="button"
              id="nav-ledger"
              onClick={() => setActiveView('LEDGER')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeView === 'LEDGER'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-emerald-100 hover:text-white hover:bg-emerald-800/60'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Monthly Ledgers
            </button>

            <button
              type="button"
              id="nav-reports"
              onClick={() => setActiveView('REPORTS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeView === 'REPORTS'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-emerald-100 hover:text-white hover:bg-emerald-800/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              Monthly Report
            </button>

            <button
              type="button"
              id="nav-official-data"
              onClick={() => setActiveView('OFFICIAL_DATA')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeView === 'OFFICIAL_DATA'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-emerald-100 hover:text-white hover:bg-emerald-800/60'
              }`}
              title="Official monthly health & inspection data for PM-MDCF Page 2"
            >
              <HeartPulse className="w-4 h-4" />
              Monthly Official Data
            </button>

            <button
              type="button"
              id="nav-settings"
              onClick={() => setActiveView('SETTINGS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeView === 'SETTINGS'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-emerald-100 hover:text-white hover:bg-emerald-800/60'
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>

            <button
              type="button"
              id="btn-open-verifier"
              onClick={() => setShowVerificationModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-emerald-100 hover:text-white transition-all border border-emerald-600/50"
              title="Run Automated Accounting Verification (Tests A - H)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Verify Rules
            </button>

            {/* User Profile & Sign Out */}
            <div className="h-5 w-[1px] bg-emerald-700/70 mx-1 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 text-[11px] text-emerald-200 border border-emerald-800"
                title={`Authenticated School UDISE: ${schoolIdentity?.udiseCode || profile.udiseCode}`}
              >
                <Building2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate max-w-[140px] font-mono font-medium">
                  UDISE: {schoolIdentity?.udiseCode || profile.udiseCode}
                </span>
              </div>

              <button
                type="button"
                id="btn-app-logout"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-rose-700/90 hover:bg-rose-700 text-white transition-all shadow-xs cursor-pointer border border-rose-600/60"
                title="Sign out of Firebase Account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeView === 'DAILY' && (
          <DailyEntry
            schoolProfile={profile}
            initialDate={selectedDailyDate}
            onEntrySaved={loadProfile}
          />
        )}

        {activeView === 'MONTHLY_SHEET' && (
          <MonthlySheet
            schoolProfile={profile}
            initialMonthKey={selectedMonthKey}
            onNavigateToDaily={handleNavigateToDate}
          />
        )}

        {activeView === 'LEDGER' && (
          <LedgerOverview
            schoolProfile={profile}
            onNavigateToDaily={handleNavigateToDate}
          />
        )}

        {activeView === 'REPORTS' && (
          <ReportCenter
            schoolProfile={profile}
            initialMonthKey={selectedMonthKey}
            onNavigateToOfficialData={(year, month) => {
              setSelectedMonthKey(`${year}-${String(month).padStart(2, '0')}`);
              setActiveView('OFFICIAL_DATA');
            }}
          />
        )}

        {activeView === 'OFFICIAL_DATA' && (
          <MonthlyOfficialDataPanel
            schoolProfile={profile}
            initialYear={parseInt(selectedMonthKey.split('-')[0], 10) || 2026}
            initialMonth={parseInt(selectedMonthKey.split('-')[1], 10) || 8}
          />
        )}

        {activeView === 'SETTINGS' && (
          <SettingsPanel
            schoolProfile={profile}
            onProfileUpdated={loadProfile}
          />
        )}
      </main>

      {/* Verification Modal for Automated Tests A - H */}
      <VerificationModal
        schoolProfile={profile}
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
      />

      {/* Offline Status & Security Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span className="font-semibold text-slate-700">Offline-First IndexedDB Engine Active</span>
            <span>—</span>
            <span>No internet connection required for daily operation</span>
          </div>
          <div>
            <span>PM POSHAN / West Bengal Mid-Day Meal Accounting Rules Preserved</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
