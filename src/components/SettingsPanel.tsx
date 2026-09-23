import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import type { SchoolProfile, EnrollmentHistory, CookingCostRateHistory, RiceRateHistory, SHGHistory } from '../types/mdm';
import { getClassesForSchoolType, PRIMARY_CLASSES, HIGHER_SECONDARY_CLASSES } from '../utils/mdmCalculations';
import {
  exportDatabaseBackup,
  importDatabaseBackup,
  seedGoogleSheetSampleData,
} from '../utils/backupRestore';
import {
  Settings,
  Building2,
  Users,
  Percent,
  Package,
  HardDriveDownload,
  HardDriveUpload,
  Database,
  History,
  CheckCircle,
  Save,
  AlertTriangle,
  TestTube,
  FileText,
  Plus,
  Trash2,
  Lock,
} from 'lucide-react';
import { runComprehensiveMDMTests, type TestResult } from '../utils/mdmTestingSuite';
import { MonthlyOfficialDataPanel } from './MonthlyOfficialDataPanel';
import { HeartPulse } from 'lucide-react';

/**
 * Safe update function for School Profile.
 * Enforces strict immutability of the UDISE Code (permanent unique school key).
 * Any attempt to alter udiseCode through updated fields is discarded.
 */
export async function updateSchoolProfileSafe(
  currentProfile: SchoolProfile,
  updatedFields: Partial<SchoolProfile>
): Promise<SchoolProfile> {
  const safeData: Partial<SchoolProfile> = {
    ...updatedFields,
    udiseCode: currentProfile.udiseCode, // Strictly immutable permanent school key
    updatedAt: new Date().toISOString(),
  };
  if (currentProfile.id) {
    await db.schoolProfile.update(currentProfile.id, safeData);
  }
  return {
    ...currentProfile,
    ...safeData,
    udiseCode: currentProfile.udiseCode,
  };
}

interface SettingsPanelProps {
  schoolProfile: SchoolProfile;
  onProfileUpdated: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  schoolProfile,
  onProfileUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'REPORTS_CONFIG' | 'MONTHLY_OFFICIAL_DATA' | 'ENROLLMENT' | 'RATES' | 'BACKUP' | 'TESTS'>('PROFILE');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);

  // Profile Form State
  const [profileForm, setProfileForm] = useState<SchoolProfile>({ ...schoolProfile });
  const [profileSaved, setProfileSaved] = useState<boolean>(false);

  // Enrollment History State
  const [enrollmentList, setEnrollmentList] = useState<EnrollmentHistory[]>([]);
  const [newEffectiveDate, setNewEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [newEnrollments, setNewEnrollments] = useState<Record<string, number>>({});
  const [enrollmentNote, setEnrollmentNote] = useState<string>('');
  const [enrollmentSaved, setEnrollmentSaved] = useState<boolean>(false);

  // Rates State
  const [cookingRateList, setCookingRateList] = useState<CookingCostRateHistory[]>([]);
  const [newRateEffectiveDate, setNewRateEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [newCookingRates, setNewCookingRates] = useState({ PP: 6.78, PRIMARY: 6.78, UPPER_PRIMARY: 6.78 });
  const [newRiceRates, setNewRiceRates] = useState({ PP: 0.1, PRIMARY: 0.1, UPPER_PRIMARY: 0.1 });
  const [ratesSaved, setRatesSaved] = useState<boolean>(false);

  // SHG History State
  const [shgHistoryList, setShgHistoryList] = useState<SHGHistory[]>([]);
  const [newShgEffectiveDate, setNewShgEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [newShgName, setNewShgName] = useState<string>('');
  const [newShgLeader, setNewShgLeader] = useState<string>('');
  const [newShgBank, setNewShgBank] = useState<string>('');
  const [newShgAccount, setNewShgAccount] = useState<string>('');
  const [newShgIfsc, setNewShgIfsc] = useState<string>('');
  const [newShgCooks, setNewShgCooks] = useState<number>(2);
  const [newShgHonorarium, setNewShgHonorarium] = useState<number>(1500);
  const [shgHistorySaved, setShgHistorySaved] = useState<boolean>(false);

  // Backup State
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  const classes = getClassesForSchoolType(profileForm.schoolType);

  const loadHistory = async () => {
    const enrollments = await db.enrollmentHistory.orderBy('effectiveFrom').reverse().toArray();
    const costRates = await db.cookingCostRateHistory.orderBy('effectiveFrom').reverse().toArray();
    const shgRecords = await db.shgHistory.orderBy('effectiveFrom').reverse().toArray();
    setEnrollmentList(enrollments);
    setCookingRateList(costRates);
    setShgHistoryList(shgRecords);

    if (enrollments.length > 0) {
      setNewEnrollments({ ...enrollments[0].enrollments });
    } else {
      const initial: Record<string, number> = {};
      classes.forEach((c) => (initial[c] = 0));
      setNewEnrollments(initial);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [profileForm.schoolType]);

  const handleSaveProfile = async () => {
    if (!profileForm.schoolName.trim()) {
      alert('Please enter school name.');
      return;
    }
    // UDISE Code is the permanent UNIQUE SCHOOL KEY and must NEVER be modified
    await updateSchoolProfileSafe(schoolProfile, profileForm);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
    onProfileUpdated();
  };

  const handleAddEnrollmentRevision = async () => {
    if (!newEffectiveDate) {
      alert('Please enter an effective date.');
      return;
    }

    await db.enrollmentHistory.add({
      effectiveFrom: newEffectiveDate,
      enrollments: newEnrollments,
      note: enrollmentNote.trim() || undefined,
      createdAt: new Date().toISOString(),
    });

    setEnrollmentSaved(true);
    setEnrollmentNote('');
    setTimeout(() => setEnrollmentSaved(false), 3000);
    await loadHistory();
  };

  const handleAddRateRevision = async () => {
    if (!newRateEffectiveDate) {
      alert('Please enter an effective date.');
      return;
    }

    await db.cookingCostRateHistory.add({
      effectiveFrom: newRateEffectiveDate,
      rates: newCookingRates,
      note: 'Government rate revision',
      createdAt: new Date().toISOString(),
    });

    await db.riceRateHistory.add({
      effectiveFrom: newRateEffectiveDate,
      ratesKg: newRiceRates,
      note: 'Rice norm revision',
      createdAt: new Date().toISOString(),
    });

    setRatesSaved(true);
    setTimeout(() => setRatesSaved(false), 3000);
    await loadHistory();
  };

  const handleAddShgHistory = async () => {
    if (!newShgEffectiveDate) {
      alert('Please enter an effective date.');
      return;
    }
    if (!newShgName.trim()) {
      alert('Please enter SHG / Cooking Agency name.');
      return;
    }

    await db.shgHistory.add({
      effectiveFrom: newShgEffectiveDate,
      nameOfSHG: newShgName.trim(),
      leaderName: newShgLeader.trim() || undefined,
      bankName: newShgBank.trim() || undefined,
      accountNumber: newShgAccount.trim() || undefined,
      ifscCode: newShgIfsc.trim() || undefined,
      numberOfCooks: newShgCooks,
      cookHonorariumMonthly: newShgHonorarium,
      createdAt: new Date().toISOString(),
    });

    setShgHistorySaved(true);
    setNewShgName('');
    setNewShgLeader('');
    setNewShgBank('');
    setNewShgAccount('');
    setNewShgIfsc('');
    setTimeout(() => setShgHistorySaved(false), 3000);
    await loadHistory();
  };

  const handleDeleteShgHistory = async (id?: number) => {
    if (!id) return;
    if (confirm('Delete this historical SHG record? Historical reports matching this period will fall back to default profile.')) {
      await db.shgHistory.delete(id);
      await loadHistory();
    }
  };

  // Export JSON Backup
  const handleExportBackup = async () => {
    const jsonStr = await exportDatabaseBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MDM_Backup_${profileForm.udiseCode || 'School'}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupStatus('Backup exported and downloaded successfully.');
  };

  // Import JSON Backup
  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        await importDatabaseBackup(text);
        setBackupStatus('Database restored successfully from backup file!');
        onProfileUpdated();
      } catch (err: any) {
        alert('Failed to restore backup: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Quick Seed Demo Data from Sheet
  const handleSeedDemo = async () => {
    if (
      window.confirm(
        'Load the authentic January 2026 data from your Google Sheet (Joypur Primary School)? This will populate 31 days of attendance, balances, and allotments.'
      )
    ) {
      await seedGoogleSheetSampleData();
      alert('January 2026 Google Sheet data loaded successfully!');
      onProfileUpdated();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header and Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Application Settings & Configurations</h2>
            <p className="text-xs text-slate-500">
              Manage school profile, effective enrollment histories, government rates, and offline backups
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pt-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('PROFILE')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'PROFILE'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            School Profile
          </button>

          <button
            type="button"
            id="tab-btn-reports-config"
            onClick={() => setActiveTab('REPORTS_CONFIG')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'REPORTS_CONFIG'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            SHG Details & Official Reports (CMDA / MDCF)
          </button>

          <button
            type="button"
            id="tab-btn-monthly-official-data"
            onClick={() => setActiveTab('MONTHLY_OFFICIAL_DATA')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'MONTHLY_OFFICIAL_DATA'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <HeartPulse className="w-4 h-4 text-rose-500" />
            Monthly Official Data (Health & Inspection)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ENROLLMENT')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'ENROLLMENT'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Enrollment History (Effective Dates)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RATES')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'RATES'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Percent className="w-4 h-4" />
            Government Rates & Norms
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BACKUP')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'BACKUP'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Database className="w-4 h-4" />
            Backup & Restore
          </button>

          <button
            type="button"
            onClick={async () => {
              setActiveTab('TESTS');
              setIsRunningTests(true);
              const res = await runComprehensiveMDMTests(schoolProfile);
              setTestResults(res);
              setIsRunningTests(false);
            }}
            className={`pb-2.5 px-3 flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'TESTS'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <TestTube className="w-4 h-4" />
            Verification Tests (A–H)
          </button>
        </div>
      </div>

      {/* TAB 1: SCHOOL PROFILE */}
      {activeTab === 'PROFILE' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5 animate-fadeIn">
          <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-2">
            Institutional Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">School Name</label>
              <input
                type="text"
                value={profileForm.schoolName}
                onChange={(e) => setProfileForm({ ...profileForm, schoolName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="settings-udise-code" className="block font-semibold text-slate-700">
                  UDISE Code
                </label>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <Lock className="w-3 h-3 text-amber-600" />
                  <span>Permanent Key • Read only</span>
                </span>
              </div>
              <div className="relative">
                <input
                  id="settings-udise-code"
                  type="text"
                  readOnly
                  disabled
                  value={schoolProfile.udiseCode}
                  tabIndex={-1}
                  onKeyDown={(e) => e.preventDefault()}
                  onPaste={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  onChange={() => {}}
                  title="UDISE Code is the permanent unique school key and cannot be modified."
                  className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg font-mono text-sm bg-slate-100/90 text-slate-600 cursor-not-allowed select-all shadow-inner focus:outline-none"
                />
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Permanent unique school key registered in MDM Cloud. Read-only.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">School Type</label>
              <select
                value={profileForm.schoolType}
                onChange={(e) => setProfileForm({ ...profileForm, schoolType: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="PRIMARY">Primary (PP, I, II, III, IV, V)</option>
                <option value="HIGHER_SECONDARY">Higher Secondary (V, VI, VII, VIII)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Academic Year</label>
              <input
                type="text"
                value={profileForm.academicYear}
                onChange={(e) => setProfileForm({ ...profileForm, academicYear: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">District</label>
              <input
                type="text"
                value={profileForm.district}
                onChange={(e) => setProfileForm({ ...profileForm, district: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Block / Circle</label>
              <input
                type="text"
                value={profileForm.blockCircle}
                onChange={(e) => setProfileForm({ ...profileForm, blockCircle: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Head Teacher / TIC Name</label>
              <input
                type="text"
                value={profileForm.headTeacherName}
                onChange={(e) => setProfileForm({ ...profileForm, headTeacherName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">School Full Address</label>
              <input
                type="text"
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {profileSaved ? (
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Profile changes saved!
              </span>
            ) : (
              <div />
            )}
            <button
              type="button"
              id="btn-save-profile"
              onClick={handleSaveProfile}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save Profile Changes
            </button>
          </div>
        </div>
      )}

      {/* TAB: SHG DETAILS & OFFICIAL REPORTS CONFIGURATION (CMDA-2 & PM-MDCF) */}
      {activeTab === 'REPORTS_CONFIG' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 animate-fadeIn">
          <div>
            <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-2">
              Official Reporting Settings (Self Help Group & PM-MDCF Details)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure official metadata for <strong>CMDA-2 (SHG Monthly Bill)</strong> and <strong>PM-MDCF (POSHAN Format)</strong>. These values populate official report headers and declarations without inventing or fabricating data.
            </p>
          </div>

          {/* Section A: Self Help Group (SHG) / Cooking Agency (For CMDA-2) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-800 tracking-wide">
                1. Self Help Group (SHG) Profile (Used in CMDA-2 Bill)
              </span>
              <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Annexure CMDA-2
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Name of Self Help Group (SHG)
                </label>
                <input
                  type="text"
                  value={profileForm.shgDetails?.nameOfSHG || ''}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      shgDetails: { ...(profileForm.shgDetails || {}), nameOfSHG: e.target.value },
                    })
                  }
                  placeholder="e.g. Maa Sarada Swanirbhar Dal"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  SHG President / Secretary / Leader Name
                </label>
                <input
                  type="text"
                  value={profileForm.shgDetails?.shgLeaderName || ''}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      shgDetails: { ...(profileForm.shgDetails || {}), shgLeaderName: e.target.value },
                    })
                  }
                  placeholder="e.g. Anjali Mondal"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  SHG Bank Name & Branch
                </label>
                <input
                  type="text"
                  value={profileForm.shgDetails?.shgBankName || ''}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      shgDetails: { ...(profileForm.shgDetails || {}), shgBankName: e.target.value },
                    })
                  }
                  placeholder="e.g. State Bank of India, Joypur Branch"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  SHG Bank Account Number
                </label>
                <input
                  type="text"
                  value={profileForm.shgDetails?.shgAccountNumber || ''}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      shgDetails: { ...(profileForm.shgDetails || {}), shgAccountNumber: e.target.value },
                    })
                  }
                  placeholder="e.g. 30291823901"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bank IFSC Code
                </label>
                <input
                  type="text"
                  value={profileForm.shgDetails?.shgIfscCode || ''}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      shgDetails: { ...(profileForm.shgDetails || {}), shgIfscCode: e.target.value },
                    })
                  }
                  placeholder="e.g. SBIN0001234"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Number of Cooks Engaged
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={profileForm.shgDetails?.numberOfCooks ?? 2}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      shgDetails: {
                        ...(profileForm.shgDetails || {}),
                        numberOfCooks: parseInt(e.target.value, 10) || 2,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Names of Cooks (comma separated)
                </label>
                <input
                  type="text"
                  value={profileForm.shgDetails?.cookNames || ''}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      shgDetails: { ...(profileForm.shgDetails || {}), cookNames: e.target.value },
                    })
                  }
                  placeholder="e.g. Maya Roy, Sandhya Das"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section A2: Effective-Dated SHG / Cooking Agency History */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-slate-800 tracking-wide flex items-center gap-1.5">
                  <History className="w-4 h-4 text-emerald-600" />
                  Effective-Dated SHG / Cooking Agency History
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Changing the cooking agency in October must <strong>not</strong> change August or September historical reports.
                  Define when an SHG became effective below; each monthly report automatically resolves the active SHG for its historical period.
                </p>
              </div>
              <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Audit Trail & Historical Integrity
              </span>
            </div>

            {/* Add New SHG Revision Form */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Add New SHG Revision:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Effective From Date</label>
                  <input
                    type="date"
                    value={newShgEffectiveDate}
                    onChange={(e) => setNewShgEffectiveDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">SHG / Agency Name</label>
                  <input
                    type="text"
                    placeholder="e.g. ANANNYA SHG"
                    value={newShgName}
                    onChange={(e) => setNewShgName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Leader / President</label>
                  <input
                    type="text"
                    placeholder="e.g. Maya Roy"
                    value={newShgLeader}
                    onChange={(e) => setNewShgLeader(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. SBI Joypur"
                    value={newShgBank}
                    onChange={(e) => setNewShgBank(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 30291823901"
                    value={newShgAccount}
                    onChange={(e) => setNewShgAccount(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. SBIN0001234"
                    value={newShgIfsc}
                    onChange={(e) => setNewShgIfsc(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {shgHistorySaved ? (
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> SHG revision recorded!
                  </span>
                ) : <div />}

                <button
                  type="button"
                  id="btn-add-shg-history"
                  onClick={handleAddShgHistory}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Save Effective SHG
                </button>
              </div>
            </div>

            {/* List of existing historical SHG entries */}
            {shgHistoryList.length > 0 && (
              <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Effective From</th>
                      <th className="py-2 px-3">SHG Name</th>
                      <th className="py-2 px-3">Leader</th>
                      <th className="py-2 px-3">Bank & A/C</th>
                      <th className="py-2 px-3">IFSC</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shgHistoryList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-emerald-800">{item.effectiveFrom}</td>
                        <td className="py-2 px-3 font-semibold">{item.nameOfSHG}</td>
                        <td className="py-2 px-3 text-slate-600">{item.leaderName || '—'}</td>
                        <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                          {item.bankName || ''} {item.accountNumber ? `(${item.accountNumber})` : '—'}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{item.ifscCode || '—'}</td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteShgHistory(item.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded"
                            title="Delete historical entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section B: PM-MDCF Infrastructure & Health Monitoring Details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-800 tracking-wide">
                2. PM-MDCF Infrastructure, Sanitation & Health Information
              </span>
              <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                Official MDCF Form
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Gram Panchayat / Municipality Ward
                </label>
                <input
                  type="text"
                  value={profileForm.mdcfDetails?.panchayatMunicipality || ''}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      mdcfDetails: {
                        ...(profileForm.mdcfDetails || {}),
                        panchayatMunicipality: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. Joypur GP / Ward 04"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kitchen Shed Available?
                </label>
                <select
                  value={profileForm.mdcfDetails?.kitchenShedAvailable || 'YES'}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      mdcfDetails: {
                        ...(profileForm.mdcfDetails || {}),
                        kitchenShedAvailable: e.target.value as any,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="YES">YES (Pucca Kitchen Shed)</option>
                  <option value="NO">NO (Classroom / Temporary)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Potable Drinking Water Available?
                </label>
                <select
                  value={profileForm.mdcfDetails?.potableWaterAvailable || 'YES'}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      mdcfDetails: {
                        ...(profileForm.mdcfDetails || {}),
                        potableWaterAvailable: e.target.value as any,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="YES">YES (Piped / Tube-well)</option>
                  <option value="NO">NO</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Weighing Machine Available?
                </label>
                <select
                  value={profileForm.mdcfDetails?.weighingMachineAvailable || 'YES'}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      mdcfDetails: {
                        ...(profileForm.mdcfDetails || {}),
                        weighingMachineAvailable: e.target.value as any,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="YES">YES (Functional)</option>
                  <option value="NO">NO</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Iron Folic Acid (IFA) Distributed?
                </label>
                <select
                  value={profileForm.mdcfDetails?.ironFolicAcidDistributed || 'YES'}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      mdcfDetails: {
                        ...(profileForm.mdcfDetails || {}),
                        ironFolicAcidDistributed: e.target.value as any,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="YES">YES (Weekly Distribution)</option>
                  <option value="NO">NO</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Deworming Conducted?
                </label>
                <select
                  value={profileForm.mdcfDetails?.dewormingConducted || 'YES'}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      mdcfDetails: {
                        ...(profileForm.mdcfDetails || {}),
                        dewormingConducted: e.target.value as any,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="YES">YES (National Deworming Day)</option>
                  <option value="NO">NO</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section C: PM-MDCF Page 2 Health Status & Inspection Details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-800 tracking-wide">
                3. PM-MDCF Page 2: Children Health Status & Inspection Records
              </span>
              <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                PM-MDCF Page 2 (Sec 6 & 7)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Boys Received 4 IFA Tablets (Class 1-8)
                </label>
                <input
                  type="number"
                  min={0}
                  value={profileForm.mdcfDetails?.boysReceivedIga ?? 0}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      mdcfDetails: {
                        ...(profileForm.mdcfDetails || {}),
                        boysReceivedIga: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Girls Received 4 IFA Tablets (Class 1-8)
                </label>
                <input
                  type="number"
                  min={0}
                  value={profileForm.mdcfDetails?.girlsReceivedIga ?? 0}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      mdcfDetails: {
                        ...(profileForm.mdcfDetails || {}),
                        girlsReceivedIga: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Screened by Mobile Health (RBSK)
                </label>
                <input
                  type="number"
                  min={0}
                  value={profileForm.mdcfDetails?.screenedByRbsk ?? 0}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      mdcfDetails: {
                        ...(profileForm.mdcfDetails || {}),
                        screenedByRbsk: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Referred by Mobile Health (RBSK)
                </label>
                <input
                  type="number"
                  min={0}
                  value={profileForm.mdcfDetails?.referredByRbsk ?? 0}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      mdcfDetails: {
                        ...(profileForm.mdcfDetails || {}),
                        referredByRbsk: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Inspected by District Officials?
                </label>
                <select
                  value={profileForm.mdcfDetails?.inspectedByDistrictOfficials || 'NO'}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      mdcfDetails: {
                        ...(profileForm.mdcfDetails || {}),
                        inspectedByDistrictOfficials: e.target.value as any,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="NO">NO</option>
                  <option value="YES">YES</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Inspected by RBSK Team?
                </label>
                <select
                  value={profileForm.mdcfDetails?.inspectedByRbskTeam || 'NO'}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      mdcfDetails: {
                        ...(profileForm.mdcfDetails || {}),
                        inspectedByRbskTeam: e.target.value as any,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="NO">NO</option>
                  <option value="YES">YES</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Inspected by SMC Members?
                </label>
                <select
                  value={profileForm.mdcfDetails?.inspectedBySmcMembers || 'YES'}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      mdcfDetails: {
                        ...(profileForm.mdcfDetails || {}),
                        inspectedBySmcMembers: e.target.value as any,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Untoward Incidents Occurred
                </label>
                <input
                  type="number"
                  min={0}
                  value={profileForm.mdcfDetails?.untowardIncidentsOccurred ?? 0}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      mdcfDetails: {
                        ...(profileForm.mdcfDetails || {}),
                        untowardIncidentsOccurred: parseInt(e.target.value, 10) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  SMC Chairperson / Gram Pradhan Name
                </label>
                <input
                  type="text"
                  value={profileForm.mdcfDetails?.smcChairpersonName || ''}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      mdcfDetails: {
                        ...(profileForm.mdcfDetails || {}),
                        smcChairpersonName: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. Chairperson, SMC"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {profileSaved ? (
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Report settings saved successfully!
              </span>
            ) : (
              <div />
            )}
            <button
              type="button"
              id="btn-save-reports-config"
              onClick={handleSaveProfile}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save Report Settings
            </button>
          </div>
        </div>
      )}

      {/* TAB: MONTHLY OFFICIAL DATA (HEALTH & INSPECTIONS PER MONTH) */}
      {activeTab === 'MONTHLY_OFFICIAL_DATA' && (
        <div className="space-y-4 animate-fadeIn">
          <MonthlyOfficialDataPanel schoolProfile={schoolProfile} />
        </div>
      )}

      {/* TAB 2: ENROLLMENT HISTORY WITH EFFECTIVE DATE */}
      {activeTab === 'ENROLLMENT' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 animate-fadeIn">
          <div>
            <h3 className="font-bold text-sm text-slate-800">Class Enrollment Revisions</h3>
            <p className="text-xs text-slate-500">
              Enrollments use strict <strong>Effective Dates</strong>. When enrollment changes (e.g. on 15 September), records before that date retain the prior enrollment, preventing retroactive calculation errors.
            </p>
          </div>

          {/* New Enrollment Form */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <span className="block text-xs font-bold text-slate-800">
              Record New Enrollment Revision
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Effective From Date *</label>
                <input
                  type="date"
                  value={newEffectiveDate}
                  onChange={(e) => setNewEffectiveDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Revision Reason / Note</label>
                <input
                  type="text"
                  value={enrollmentNote}
                  onChange={(e) => setEnrollmentNote(e.target.value)}
                  placeholder="e.g. Mid-term admission, class V update"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* Class Inputs */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Class-wise Headcount</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {classes.map((cls) => (
                  <div key={cls} className="bg-white p-2 border border-slate-200 rounded-lg text-center">
                    <span className="block text-[11px] font-bold text-slate-600 mb-1">Class {cls}</span>
                    <input
                      type="number"
                      min="0"
                      value={newEnrollments[cls] ?? 0}
                      onChange={(e) =>
                        setNewEnrollments({
                          ...newEnrollments,
                          [cls]: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="w-full text-center py-1 border border-slate-300 rounded font-bold text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                id="btn-save-enrollment-revision"
                onClick={handleAddEnrollmentRevision}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Add Enrollment Revision
              </button>
            </div>
            {enrollmentSaved && (
              <span className="text-xs text-emerald-700 font-semibold block text-right">
                Revision recorded with effective date {newEffectiveDate}!
              </span>
            )}
          </div>

          {/* Historical List */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-500" />
              Enrollment Revision History
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="px-3 py-2">Effective From</th>
                    <th className="px-3 py-2">Enrollments by Class</th>
                    <th className="px-3 py-2">Total Enrolled</th>
                    <th className="px-3 py-2">Note</th>
                    <th className="px-3 py-2">Recorded At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {enrollmentList.map((item, idx) => {
                    const total = Object.values(item.enrollments || {}).reduce((a, b) => a + b, 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-bold text-emerald-800">{item.effectiveFrom}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1 font-sans">
                            {Object.entries(item.enrollments || {}).map(([cls, val]) => (
                              <span key={cls} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px]">
                                {cls}: <strong>{val}</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-900">{total}</td>
                        <td className="px-3 py-2.5 font-sans text-slate-600">{item.note || '—'}</td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GOVERNMENT RATES & NORMS */}
      {activeTab === 'RATES' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 animate-fadeIn">
          <div>
            <h3 className="font-bold text-sm text-slate-800">Government Rate History</h3>
            <p className="text-xs text-slate-500">
              When government notifications revise cooking cost or rice norms, add a revision here with its <strong>Effective Date</strong>. Historical entries prior to this date will never be modified.
            </p>
          </div>

          {/* New Rate Revision Form */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <span className="block text-xs font-bold text-slate-800">
              Add Rate Revision Notification
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">Effective From Date *</label>
                <input
                  type="date"
                  value={newRateEffectiveDate}
                  onChange={(e) => setNewRateEffectiveDate(e.target.value)}
                  className="w-full sm:w-60 px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              {/* Cooking cost */}
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="block font-bold text-emerald-800 mb-2">Cooking Cost (₹ / child)</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span>PP:</span>
                    <input
                      type="number"
                      step="0.01"
                      value={newCookingRates.PP}
                      onChange={(e) => setNewCookingRates({ ...newCookingRates, PP: parseFloat(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 border rounded text-right font-mono"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Primary:</span>
                    <input
                      type="number"
                      step="0.01"
                      value={newCookingRates.PRIMARY}
                      onChange={(e) => setNewCookingRates({ ...newCookingRates, PRIMARY: parseFloat(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 border rounded text-right font-mono"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Upper:</span>
                    <input
                      type="number"
                      step="0.01"
                      value={newCookingRates.UPPER_PRIMARY}
                      onChange={(e) => setNewCookingRates({ ...newCookingRates, UPPER_PRIMARY: parseFloat(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 border rounded text-right font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Rice norms */}
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="block font-bold text-amber-800 mb-2">Rice Norm (kg / child)</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span>PP:</span>
                    <input
                      type="number"
                      step="0.005"
                      value={newRiceRates.PP}
                      onChange={(e) => setNewRiceRates({ ...newRiceRates, PP: parseFloat(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 border rounded text-right font-mono"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Primary:</span>
                    <input
                      type="number"
                      step="0.005"
                      value={newRiceRates.PRIMARY}
                      onChange={(e) => setNewRiceRates({ ...newRiceRates, PRIMARY: parseFloat(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 border rounded text-right font-mono"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Upper:</span>
                    <input
                      type="number"
                      step="0.005"
                      value={newRiceRates.UPPER_PRIMARY}
                      onChange={(e) => setNewRiceRates({ ...newRiceRates, UPPER_PRIMARY: parseFloat(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 border rounded text-right font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                id="btn-save-rate-revision"
                onClick={handleAddRateRevision}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Apply Rate Revision
              </button>
            </div>
            {ratesSaved && (
              <span className="text-xs text-emerald-700 font-semibold block text-right">
                Rates recorded with effective date {newRateEffectiveDate}!
              </span>
            )}
          </div>

          {/* Historical Rate Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-500" />
              Cooking Cost Rate History
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="px-3 py-2">Effective From</th>
                    <th className="px-3 py-2">PP Rate</th>
                    <th className="px-3 py-2">Primary Rate</th>
                    <th className="px-3 py-2">Upper Primary Rate</th>
                    <th className="px-3 py-2">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {cookingRateList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-bold text-emerald-800">{item.effectiveFrom}</td>
                      <td className="px-3 py-2">₹{item.rates.PP.toFixed(2)}</td>
                      <td className="px-3 py-2">₹{item.rates.PRIMARY.toFixed(2)}</td>
                      <td className="px-3 py-2">₹{item.rates.UPPER_PRIMARY.toFixed(2)}</td>
                      <td className="px-3 py-2 font-sans text-slate-600">{item.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BACKUP & RESTORE */}
      {activeTab === 'BACKUP' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6 animate-fadeIn">
          <div>
            <h3 className="font-bold text-sm text-slate-800">Data Safety, Backup & Disaster Recovery</h3>
            <p className="text-xs text-slate-500">
              The application uses Dexie.js (IndexedDB) locally on the device. Export backups regularly to preserve monthly ledgers, historical attendances, and stock registers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export Card */}
            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 text-slate-900 font-bold text-sm">
                  <HardDriveDownload className="w-5 h-5 text-emerald-600" />
                  Export Full System Backup
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  Downloads a self-contained JSON backup file containing all your school settings, daily records, ledger transactions, and opening/closing balances.
                </p>
              </div>

              <button
                type="button"
                id="btn-export-backup"
                onClick={handleExportBackup}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <HardDriveDownload className="w-4 h-4" />
                Download JSON Backup
              </button>
            </div>

            {/* Restore Card */}
            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 text-slate-900 font-bold text-sm">
                  <HardDriveUpload className="w-5 h-5 text-blue-600" />
                  Restore from JSON Backup
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  Restore your entire database on any device or after changing phones. Select your exported JSON file to restore immediately.
                </p>
              </div>

              <label className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm">
                <HardDriveUpload className="w-4 h-4" />
                Select Backup File to Restore
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {backupStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              {backupStatus}
            </div>
          )}

          {/* Seed Sample Google Sheet Data */}
          <div className="p-4 border border-amber-200 rounded-xl bg-amber-50/60 flex items-center justify-between gap-4">
            <div>
              <span className="font-bold text-amber-900 text-xs block">
                Load Google Sheet Sample Dataset (January 2026)
              </span>
              <span className="text-[11px] text-amber-700">
                Instantly populate the exact 31 days, 22 serving days, allotments, and ₹11,993.82 cooking cost from your original sheet.
              </span>
            </div>
            <button
              type="button"
              id="btn-seed-sample-data"
              onClick={handleSeedDemo}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold whitespace-nowrap shadow-sm"
            >
              Seed Sheet Data
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: COMPREHENSIVE TESTS (SCENARIOS A-H) */}
      {activeTab === 'TESTS' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                Verification & Acceptance Test Suite (Scenarios A through H)
              </h3>
              <p className="text-xs text-slate-500">
                Runs mathematical and rule assertions directly against local Dexie database ledgers.
              </p>
            </div>
            <button
              type="button"
              disabled={isRunningTests}
              onClick={async () => {
                setIsRunningTests(true);
                const res = await runComprehensiveMDMTests(schoolProfile);
                setTestResults(res);
                setIsRunningTests(false);
              }}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
            >
              {isRunningTests ? 'Running Tests...' : 'Re-Run All Tests'}
            </button>
          </div>

          <div className="space-y-3">
            {testResults.map((t, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                  t.passed
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                {t.passed ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-bold">{t.name}</div>
                  <div className="text-[11px] font-mono text-slate-600 leading-relaxed">
                    {t.message}
                  </div>
                </div>
              </div>
            ))}

            {testResults.length === 0 && !isRunningTests && (
              <div className="p-4 text-center text-xs text-slate-500">
                Click "Re-Run All Tests" to execute scenarios A through H.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
