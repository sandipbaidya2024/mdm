import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import type { MonthlyOfficialData, HealthActivityLog, SchoolProfile } from '../types/mdm';
import { getMonthlyOfficialData, saveMonthlyOfficialData, formatINR } from '../utils/mdmCalculations';
import {
  Calendar,
  HeartPulse,
  ShieldCheck,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  AlertCircle,
  Lock,
  FileSpreadsheet,
  Activity,
  Calculator,
} from 'lucide-react';

interface MonthlyOfficialDataPanelProps {
  schoolProfile: SchoolProfile;
  initialYear?: number;
  initialMonth?: number;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MonthlyOfficialDataPanel: React.FC<MonthlyOfficialDataPanelProps> = ({
  schoolProfile,
  initialYear = 2026,
  initialMonth = 8,
}) => {
  // Selector state
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(
    schoolProfile.academicYear || '2026-2027'
  );
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);

  useEffect(() => {
    if (initialYear) setSelectedYear(initialYear);
    if (initialMonth) setSelectedMonth(initialMonth);
  }, [initialYear, initialMonth]);

  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const monthName = MONTH_NAMES[selectedMonth - 1];

  // Form state
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Health Status Fields (Section 6)
  const [boysIga, setBoysIga] = useState<string>('');
  const [girlsIga, setGirlsIga] = useState<string>('');
  const [screenedRbsk, setScreenedRbsk] = useState<string>('');
  const [referredRbsk, setReferredRbsk] = useState<string>('');
  const [deworming, setDeworming] = useState<'YES' | 'NO' | ''>('YES');

  // School Inspection Fields (Section 7)
  const [districtOfficials, setDistrictOfficials] = useState<'YES' | 'NO' | ''>('NO');
  const [rbskTeam, setRbskTeam] = useState<'YES' | 'NO' | ''>('NO');
  const [smcMembers, setSmcMembers] = useState<'YES' | 'NO' | ''>('YES');
  const [untowardIncidents, setUntowardIncidents] = useState<string>('0');
  const [smcChairpersonName, setSmcChairpersonName] = useState<string>('');

  // Optional Health Activity Logs for this month
  const [activityLogs, setActivityLogs] = useState<HealthActivityLog[]>([]);
  const [showAddLogModal, setShowAddLogModal] = useState<boolean>(false);

  // New Log Modal Form
  const [logDate, setLogDate] = useState<string>(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-15`);
  const [logType, setLogType] = useState<string>('RBSK Screening');
  const [logScreened, setLogScreened] = useState<number>(0);
  const [logReferred, setLogReferred] = useState<number>(0);
  const [logIgaBoys, setLogIgaBoys] = useState<number>(0);
  const [logIgaGirls, setLogIgaGirls] = useState<number>(0);
  const [logRemarks, setLogRemarks] = useState<string>('');

  // Load record whenever year/month changes
  const loadData = async () => {
    setLoading(true);
    setSavedSuccess(false);
    try {
      // 1. Check if month is locked in monthlyPeriods
      const period = await db.monthlyPeriods.where('monthKey').equals(monthKey).first();
      const locked = !!period?.isLocked;
      setIsLocked(locked);

      // 2. Fetch monthly official data
      const official = await getMonthlyOfficialData(monthKey);
      if (official) {
        setBoysIga(official.boysReceivedIga !== null && official.boysReceivedIga !== undefined ? String(official.boysReceivedIga) : '');
        setGirlsIga(official.girlsReceivedIga !== null && official.girlsReceivedIga !== undefined ? String(official.girlsReceivedIga) : '');
        setScreenedRbsk(official.screenedByRbsk !== null && official.screenedByRbsk !== undefined ? String(official.screenedByRbsk) : '');
        setReferredRbsk(official.referredByRbsk !== null && official.referredByRbsk !== undefined ? String(official.referredByRbsk) : '');
        setDeworming(official.dewormingConducted || 'YES');

        setDistrictOfficials(official.inspectedByDistrictOfficials || 'NO');
        setRbskTeam(official.inspectedByRbskTeam || 'NO');
        setSmcMembers(official.inspectedBySmcMembers || 'YES');
        setUntowardIncidents(
          official.untowardIncidentsOccurred !== null && official.untowardIncidentsOccurred !== undefined
            ? String(official.untowardIncidentsOccurred)
            : '0'
        );
        setSmcChairpersonName(official.smcChairpersonName || '');
      } else {
        // Fallback or empty defaults
        setBoysIga('');
        setGirlsIga('');
        setScreenedRbsk('');
        setReferredRbsk('');
        setDeworming('YES');

        setDistrictOfficials('NO');
        setRbskTeam('NO');
        setSmcMembers('YES');
        setUntowardIncidents('0');
        setSmcChairpersonName(schoolProfile.mdcfDetails?.smcChairpersonName || '');
      }

      // 3. Fetch optional activity logs for this month
      const logs = await db.healthActivityLogs
        .where('monthKey')
        .equals(monthKey)
        .sortBy('date');
      setActivityLogs(logs);

      // Update date default for modal
      setLogDate(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-15`);
    } catch (err) {
      console.error('Error loading monthly official data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [monthKey]);

  // Save handler
  const handleSave = async () => {
    if (isLocked) return;

    const dataToSave: Partial<MonthlyOfficialData> & { monthKey: string; academicYear: string } = {
      monthKey,
      academicYear: selectedAcademicYear,
      boysReceivedIga: boysIga.trim() !== '' ? parseInt(boysIga, 10) : null,
      girlsReceivedIga: girlsIga.trim() !== '' ? parseInt(girlsIga, 10) : null,
      screenedByRbsk: screenedRbsk.trim() !== '' ? parseInt(screenedRbsk, 10) : null,
      referredByRbsk: referredRbsk.trim() !== '' ? parseInt(referredRbsk, 10) : null,
      dewormingConducted: (deworming as 'YES' | 'NO') || null,

      inspectedByDistrictOfficials: (districtOfficials as 'YES' | 'NO') || null,
      inspectedByRbskTeam: (rbskTeam as 'YES' | 'NO') || null,
      inspectedBySmcMembers: (smcMembers as 'YES' | 'NO') || null,
      untowardIncidentsOccurred: untowardIncidents.trim() !== '' ? parseInt(untowardIncidents, 10) : 0,
      smcChairpersonName: smcChairpersonName.trim() || undefined,
    };

    await saveMonthlyOfficialData(dataToSave);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Add Health Activity Log
  const handleAddActivityLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    await db.healthActivityLogs.add({
      date: logDate,
      monthKey,
      academicYear: selectedAcademicYear,
      activityType: logType,
      childrenScreened: logScreened,
      childrenReferred: logReferred,
      igaBoys: logIgaBoys,
      igaGirls: logIgaGirls,
      remarks: logRemarks.trim() || undefined,
      createdAt: new Date().toISOString(),
    });

    setShowAddLogModal(false);
    // Reset form
    setLogScreened(0);
    setLogReferred(0);
    setLogIgaBoys(0);
    setLogIgaGirls(0);
    setLogRemarks('');

    // Reload logs
    const logs = await db.healthActivityLogs
      .where('monthKey')
      .equals(monthKey)
      .sortBy('date');
    setActivityLogs(logs);
  };

  // Delete Health Activity Log
  const handleDeleteActivityLog = async (id?: number) => {
    if (isLocked || !id) return;
    if (confirm('Delete this health activity entry?')) {
      await db.healthActivityLogs.delete(id);
      const logs = await db.healthActivityLogs
        .where('monthKey')
        .equals(monthKey)
        .sortBy('date');
      setActivityLogs(logs);
    }
  };

  // Calculate totals from activity logs into monthly fields
  const handleCalculateFromLogs = () => {
    if (isLocked || activityLogs.length === 0) return;

    let totScreened = 0;
    let totReferred = 0;
    let totIgaBoys = 0;
    let totIgaGirls = 0;

    activityLogs.forEach((log) => {
      totScreened += log.childrenScreened || 0;
      totReferred += log.childrenReferred || 0;
      totIgaBoys += log.igaBoys || 0;
      totIgaGirls += log.igaGirls || 0;
    });

    setScreenedRbsk(String(totScreened));
    setReferredRbsk(String(totReferred));
    setBoysIga(String(totIgaBoys));
    setGirlsIga(String(totIgaGirls));
  };

  // Total IGA calculated preview
  const calculatedTotalIga =
    (boysIga.trim() !== '' ? parseInt(boysIga, 10) : 0) +
    (girlsIga.trim() !== '' ? parseInt(girlsIga, 10) : 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Month Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-50 text-rose-700 rounded-lg">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Monthly Official Data</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Month-specific records for <strong>PM-MDCF Page 2</strong> (Children Health Status & School Inspection).
              Each month has its own isolated record; changes made here will never affect other historical months.
            </p>
          </div>

          {/* Academic Year and Month Selectors */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Academic Year</label>
              <select
                id="select-academic-year"
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                className="font-bold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 text-xs mt-0.5"
              >
                <option value="2026-2027">2026-2027</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Month & Year</label>
              <div className="flex items-center gap-1 mt-0.5">
                <select
                  id="select-month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  className="font-bold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  id="select-year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="font-bold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </select>
              </div>
            </div>

            {isLocked && (
              <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-bold text-[11px]">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                Locked Month (Read-Only)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Entry Panel */}
      <div className="space-y-6">
        {/* ======================================================== */}
        {/* SECTION 1: CHILDREN HEALTH STATUS                        */}
        {/* ======================================================== */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                6
              </span>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Children Health Status for {monthName} {selectedYear}
                </h3>
                <span className="text-[11px] text-slate-500">
                  Directly populates PM-MDCF Page 2 (Section 6)
                </span>
              </div>
            </div>

            {activityLogs.length > 0 && !isLocked && (
              <button
                type="button"
                onClick={handleCalculateFromLogs}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-rose-200"
                title="Populate totals from the health activity logs below"
              >
                <Calculator className="w-3.5 h-3.5" />
                Sum from Health Activity Logs ({activityLogs.length})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* 1. Boys Received IFA */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="block font-semibold text-slate-700 mb-1 leading-snug">
                1. Boys received 4 IFA tablets (Class 1-8)
              </label>
              <input
                type="number"
                min={0}
                disabled={isLocked}
                placeholder="Leave blank if not administered"
                value={boysIga}
                onChange={(e) => setBoysIga(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">WIFS Weekly Iron-Folic Acid</span>
            </div>

            {/* 2. Girls Received IFA */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="block font-semibold text-slate-700 mb-1 leading-snug">
                2. Girls received 4 IFA tablets (Class 1-8)
              </label>
              <input
                type="number"
                min={0}
                disabled={isLocked}
                placeholder="Leave blank if not administered"
                value={girlsIga}
                onChange={(e) => setGirlsIga(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">WIFS Weekly Iron-Folic Acid</span>
            </div>

            {/* Total IFA (Auto Calculated) */}
            <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-200">
              <label className="block font-semibold text-rose-800 mb-1 leading-snug">
                Total children received 4 IFA tablets
              </label>
              <div className="px-3 py-1.5 bg-white border border-rose-200 rounded font-mono font-extrabold text-sm text-rose-900">
                {boysIga.trim() !== '' || girlsIga.trim() !== '' ? calculatedTotalIga : '— (Auto Sum)'}
              </div>
              <span className="text-[10px] text-rose-600/80 mt-1 block">Boys + Girls automatically combined</span>
            </div>

            {/* Deworming */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="block font-semibold text-slate-700 mb-1 leading-snug">
                National Deworming Day Administered?
              </label>
              <select
                disabled={isLocked}
                value={deworming}
                onChange={(e) => setDeworming(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-semibold text-sm"
              >
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">Albendazole administered</span>
            </div>

            {/* 3. Screened by RBSK */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="block font-semibold text-slate-700 mb-1 leading-snug">
                3. Screened by Mobile Health (RBSK) Team
              </label>
              <input
                type="number"
                min={0}
                disabled={isLocked}
                placeholder="Leave blank if no screening"
                value={screenedRbsk}
                onChange={(e) => setScreenedRbsk(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Rashtriya Bal Swasthya Karyakram</span>
            </div>

            {/* 4. Referred by RBSK */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="block font-semibold text-slate-700 mb-1 leading-snug">
                4. Referred by Mobile Health (RBSK) Team
              </label>
              <input
                type="number"
                min={0}
                disabled={isLocked}
                placeholder="Leave blank if none referred"
                value={referredRbsk}
                onChange={(e) => setReferredRbsk(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Higher facility medical referral</span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* OPTIONAL HEALTH ACTIVITY LOG                             */}
        {/* ======================================================== */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Optional Health Activity Log for {monthName} {selectedYear}
                </h3>
                <span className="text-[11px] text-slate-500">
                  Log individual camps/screenings to record exact dates and remarks. PM-MDCF will show only monthly totals.
                </span>
              </div>
            </div>

            {!isLocked && (
              <button
                type="button"
                id="btn-add-health-activity"
                onClick={() => setShowAddLogModal(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Health Visit
              </button>
            )}
          </div>

          {activityLogs.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
              No health visits or camps logged for {monthName} {selectedYear}. You can either enter the monthly numbers directly in Section 6 above or record individual visits here.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Activity Type</th>
                    <th className="py-2 px-3 text-right">Screened</th>
                    <th className="py-2 px-3 text-right">Referred</th>
                    <th className="py-2 px-3 text-right">IFA (Boys)</th>
                    <th className="py-2 px-3 text-right">IFA (Girls)</th>
                    <th className="py-2 px-3">Remarks</th>
                    {!isLocked && <th className="py-2 px-3 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {activityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold font-sans">{log.date}</td>
                      <td className="py-2 px-3 font-sans">{log.activityType}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{log.childrenScreened}</td>
                      <td className="py-2 px-3 text-right font-bold text-rose-700">{log.childrenReferred}</td>
                      <td className="py-2 px-3 text-right">{log.igaBoys}</td>
                      <td className="py-2 px-3 text-right">{log.igaGirls}</td>
                      <td className="py-2 px-3 font-sans text-slate-500 text-[11px] truncate max-w-[160px]">
                        {log.remarks || '—'}
                      </td>
                      {!isLocked && (
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteActivityLog(log.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* SECTION 2: SCHOOL INSPECTION                             */}
        {/* ======================================================== */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              7
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                School Inspection Records for {monthName} {selectedYear}
              </h3>
              <span className="text-[11px] text-slate-500">
                Directly populates PM-MDCF Page 2 (Section 7)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {/* District Officials */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="block font-semibold text-slate-700 mb-1">
                District Officials Inspected?
              </label>
              <select
                disabled={isLocked}
                value={districtOfficials}
                onChange={(e) => setDistrictOfficials(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-semibold text-sm"
              >
                <option value="NO">NO</option>
                <option value="YES">YES</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">District / Block MDM officials</span>
            </div>

            {/* RBSK Team */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="block font-semibold text-slate-700 mb-1">
                RBSK Team Inspected?
              </label>
              <select
                disabled={isLocked}
                value={rbskTeam}
                onChange={(e) => setRbskTeam(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-semibold text-sm"
              >
                <option value="NO">NO</option>
                <option value="YES">YES</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">Mobile health team visit</span>
            </div>

            {/* SMC Members */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="block font-semibold text-slate-700 mb-1">
                SMC Members Inspected?
              </label>
              <select
                disabled={isLocked}
                value={smcMembers}
                onChange={(e) => setSmcMembers(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-semibold text-sm"
              >
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">School Management Committee</span>
            </div>

            {/* Untoward Incidents */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="block font-semibold text-slate-700 mb-1">
                Untoward Incidents Occurred
              </label>
              <input
                type="number"
                min={0}
                disabled={isLocked}
                value={untowardIncidents}
                onChange={(e) => setUntowardIncidents(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">0 = None occurred during month</span>
            </div>

            {/* SMC Chairperson / Signatory for the Month */}
            <div className="sm:col-span-2 md:col-span-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="block font-semibold text-slate-700 mb-1">
                SMC Chairperson / Gram Pradhan Name (Signatory for {monthName})
              </label>
              <input
                type="text"
                disabled={isLocked}
                placeholder="e.g. Chairperson, SMC / Gram Pradhan"
                value={smcChairpersonName}
                onChange={(e) => setSmcChairpersonName(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Prints on PM-MDCF Page 2 signature block for this specific month
              </span>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div>
            {savedSuccess && (
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Monthly Official Data for {monthName} {selectedYear} saved successfully!
              </span>
            )}
            {isLocked && (
              <span className="text-xs text-amber-700 font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                This month is locked. Unlock via Monthly Register Sheet to edit.
              </span>
            )}
          </div>

          <button
            type="button"
            id="btn-save-monthly-official-data"
            disabled={isLocked}
            onClick={handleSave}
            className={`px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all ${
              isLocked
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
            }`}
          >
            <Save className="w-4 h-4" />
            Save {monthName} Official Data
          </button>
        </div>
      </div>

      {/* Modal: Add Health Visit */}
      {showAddLogModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                Add Health Visit Log
              </h3>
              <button
                type="button"
                onClick={() => setShowAddLogModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddActivityLog} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Activity Type</label>
                <select
                  value={logType}
                  onChange={(e) => setLogType(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                >
                  <option value="RBSK Screening">RBSK Mobile Health Screening</option>
                  <option value="WIFS IFA Distribution">WIFS IFA Tablet Distribution</option>
                  <option value="Deworming Camp">National Deworming Day Camp</option>
                  <option value="General Health Checkup">General Health Checkup</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Children Screened</label>
                  <input
                    type="number"
                    min={0}
                    value={logScreened}
                    onChange={(e) => setLogScreened(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Children Referred</label>
                  <input
                    type="number"
                    min={0}
                    value={logReferred}
                    onChange={(e) => setLogReferred(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IFA Tablets (Boys)</label>
                  <input
                    type="number"
                    min={0}
                    value={logIgaBoys}
                    onChange={(e) => setLogIgaBoys(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IFA Tablets (Girls)</label>
                  <input
                    type="number"
                    min={0}
                    value={logIgaGirls}
                    onChange={(e) => setLogIgaGirls(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks (Doctor / Team details)</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Sen, Joypur BPHC Mobile Team"
                  value={logRemarks}
                  onChange={(e) => setLogRemarks(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddLogModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-sm"
                >
                  Add Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
