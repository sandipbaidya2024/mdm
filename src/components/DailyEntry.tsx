import React, { useState, useEffect } from 'react';
import { db, DEFAULT_MENUS } from '../db/db';
import type { SchoolProfile, DailyAttendanceRecord } from '../types/mdm';
import {
  getClassesForSchoolType,
  classifyClassToCategory,
  getEffectiveEnrollment,
  getEffectiveCookingCostRate,
  getEffectiveRiceRate,
  generateMdmSmsCode,
  formatINR,
  formatKg,
  getMonthKey,
  syncClosingToNextMonth,
} from '../utils/mdmCalculations';
import {
  Calendar,
  Save,
  CheckCircle,
  Copy,
  MessageSquare,
  AlertCircle,
  Utensils,
  Sun,
  Lock,
  RefreshCw,
} from 'lucide-react';

interface DailyEntryProps {
  schoolProfile: SchoolProfile;
  initialDate?: string;
  onEntrySaved?: () => void;
}

export const DailyEntry: React.FC<DailyEntryProps> = ({
  schoolProfile,
  initialDate,
  onEntrySaved,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || new Date().toISOString().split('T')[0]
  );
  const [isHoliday, setIsHoliday] = useState<boolean>(false);
  const [holidayReason, setHolidayReason] = useState<string>('');
  const [menuItem, setMenuItem] = useState<string>('ডাল');
  const [menuOptions, setMenuOptions] = useState<string[]>([]);
  const [customMenuInput, setCustomMenuInput] = useState<string>('');

  // Class-wise attendance inputs
  const [attendance, setAttendance] = useState<Record<string, number>>({});
  const [enrollment, setEnrollment] = useState<Record<string, number>>({});

  // Active rates applicable on this date
  const [cookingCostRates, setCookingCostRates] = useState({ PP: 6.78, PRIMARY: 6.78, UPPER_PRIMARY: 6.78 });
  const [riceRatesKg, setRiceRatesKg] = useState({ PP: 0.1, PRIMARY: 0.1, UPPER_PRIMARY: 0.1 });

  // Month locked state
  const [isMonthLocked, setIsMonthLocked] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [smsCopied, setSmsCopied] = useState<boolean>(false);

  const classes = getClassesForSchoolType(schoolProfile.schoolType);
  const currentMonthKey = getMonthKey(selectedDate);

  // Load menu options
  useEffect(() => {
    db.menuOptions.toArray().then((menus) => {
      if (menus.length > 0) {
        const uniqueNames: string[] = [];
        const seen = new Set<string>();
        for (const m of menus) {
          const trimmed = (m.name || '').trim();
          if (trimmed && !seen.has(trimmed)) {
            seen.add(trimmed);
            uniqueNames.push(trimmed);
          }
        }
        setMenuOptions(uniqueNames);
      } else {
        setMenuOptions(DEFAULT_MENUS);
      }
    });
  }, []);

  // On date change, load effective enrollment, rates, and existing record if any
  useEffect(() => {
    let isMounted = true;

    async function loadDateContext() {
      const monthKey = getMonthKey(selectedDate);
      const period = await db.monthlyPeriods.where('monthKey').equals(monthKey).first();
      if (isMounted) {
        setIsMonthLocked(!!period?.isLocked);
      }

      // Effective enrollment & rates
      const effEnrollment = await getEffectiveEnrollment(selectedDate);
      const effCostRates = await getEffectiveCookingCostRate(selectedDate);
      const effRiceRates = await getEffectiveRiceRate(selectedDate);

      if (isMounted) {
        setEnrollment(effEnrollment);
        setCookingCostRates(effCostRates);
        setRiceRatesKg(effRiceRates);
      }

      // Check existing entry
      const existing = await db.dailyAttendance.where('date').equals(selectedDate).first();
      if (isMounted) {
        if (existing) {
          const hasAttendance =
            (typeof existing.totalCount === 'number' && existing.totalCount > 0) ||
            Object.values(existing.attendance || {}).some((v) => Number(v) > 0);
          setIsHoliday(hasAttendance ? false : existing.isHoliday);
          setHolidayReason(hasAttendance ? '' : (existing.holidayReason || ''));
          setMenuItem(existing.menuItem || 'ডাল');
          setAttendance(existing.attendance || {});
        } else {
          // Check if Sunday - hint only; user can enter attendance without restriction
          const dayOfWeek = new Date(selectedDate).getDay();
          const isSun = dayOfWeek === 0;
          setIsHoliday(isSun);
          setHolidayReason(isSun ? 'Sunday' : '');
          setMenuItem('ডাল');
          // Default empty or 0 attendance
          const initialAtt: Record<string, number> = {};
          classes.forEach((c) => {
            initialAtt[c] = 0;
          });
          setAttendance(initialAtt);
        }
      }
    }

    loadDateContext();

    return () => {
      isMounted = false;
    };
  }, [selectedDate, schoolProfile.schoolType]);

  // Handle individual attendance input with capacity limit
  const handleAttendanceChange = (cls: string, valStr: string) => {
    const val = parseInt(valStr, 10);
    const maxAllowed = enrollment[cls] ?? 999;
    let finalVal = isNaN(val) ? 0 : Math.max(0, val);

    // Strict validation: attendance cannot exceed applicable enrollment
    if (finalVal > maxAllowed) {
      finalVal = maxAllowed;
    }

    if (finalVal > 0 && isHoliday) {
      setIsHoliday(false);
      setHolidayReason('');
    }

    setAttendance((prev) => ({
      ...prev,
      [cls]: finalVal,
    }));
  };

  // Group calculations
  let ppCount = 0;
  let primaryCount = 0;
  let upperCount = 0;

  if (!isHoliday) {
    classes.forEach((cls) => {
      const count = attendance[cls] || 0;
      const cat = classifyClassToCategory(cls, schoolProfile.schoolType);
      if (cat === 'PP') ppCount += count;
      else if (cat === 'PRIMARY') primaryCount += count;
      else if (cat === 'UPPER_PRIMARY') upperCount += count;
    });
  }

  const totalStudents = ppCount + primaryCount + upperCount;

  // Expenses for today
  const dailyCostPP = Number((ppCount * cookingCostRates.PP).toFixed(2));
  const dailyCostPrimary = Number((primaryCount * cookingCostRates.PRIMARY).toFixed(2));
  const dailyCostUpper = Number((upperCount * cookingCostRates.UPPER_PRIMARY).toFixed(2));
  const totalDailyCookingCost = Number((dailyCostPP + dailyCostPrimary + dailyCostUpper).toFixed(2));

  const dailyRicePP = Number((ppCount * riceRatesKg.PP).toFixed(2));
  const dailyRicePrimary = Number((primaryCount * riceRatesKg.PRIMARY).toFixed(2));
  const dailyRiceUpper = Number((upperCount * riceRatesKg.UPPER_PRIMARY).toFixed(2));
  const totalDailyRiceKg = Number((dailyRicePP + dailyRicePrimary + dailyRiceUpper).toFixed(2));

  const mdmSmsCode = generateMdmSmsCode(ppCount, primaryCount, upperCount, isHoliday);

  const handleCopySMS = () => {
    navigator.clipboard.writeText(mdmSmsCode);
    setSmsCopied(true);
    setTimeout(() => setSmsCopied(false), 2000);
  };

  const handleAddCustomMenu = async () => {
    const name = customMenuInput.trim();
    if (!name) return;
    if (!menuOptions.includes(name)) {
      await db.menuOptions.add({ name });
      setMenuOptions((prev) => Array.from(new Set([...prev, name])));
    }
    setMenuItem(name);
    setCustomMenuInput('');
  };

  const handleSaveEntry = async () => {
    if (isMonthLocked) {
      alert('This month is currently locked. Please unlock the month from Month Overview before modifying records.');
      return;
    }

    const monthKey = getMonthKey(selectedDate);

    const effectiveIsHoliday = totalStudents > 0 ? false : isHoliday;

    const recordToSave: DailyAttendanceRecord = {
      date: selectedDate,
      monthKey,
      isHoliday: effectiveIsHoliday,
      holidayReason: effectiveIsHoliday ? holidayReason : '',
      menuItem: effectiveIsHoliday ? '' : menuItem,
      attendance,
      ppCount,
      primaryCount,
      upperCount,
      totalCount: totalStudents,
      smsCode: mdmSmsCode,
      ratesUsed: {
        cookingCost: cookingCostRates,
        riceKg: riceRatesKg,
      },
      cookingCostExpense: {
        PP: dailyCostPP,
        PRIMARY: dailyCostPrimary,
        UPPER_PRIMARY: dailyCostUpper,
        total: totalDailyCookingCost,
      },
      riceExpenseKg: {
        PP: dailyRicePP,
        PRIMARY: dailyRicePrimary,
        UPPER_PRIMARY: dailyRiceUpper,
        total: totalDailyRiceKg,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existing = await db.dailyAttendance.where('date').equals(selectedDate).first();
    if (existing) {
      await db.dailyAttendance.put({ ...recordToSave, id: existing.id });
    } else {
      await db.dailyAttendance.add(recordToSave);
    }

    // Automatically update continuous carry-forward for subsequent months
    await syncClosingToNextMonth(monthKey);

    setSaveSuccessMessage('Record saved successfully into IndexedDB!');
    setTimeout(() => setSaveSuccessMessage(null), 3000);

    if (onEntrySaved) {
      onEntrySaved();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar / Date Picker */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Daily MDM Register Entry</h2>
            <p className="text-xs text-slate-500">Record attendance, calculate cooking expense & generate SMS</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="daily-entry-date" className="text-xs font-semibold text-slate-600">Select Date:</label>
          <input
            id="daily-entry-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {isMonthLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-800 text-xs">
          <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div>
            <strong>Month is Locked:</strong> This month ({currentMonthKey}) has been locked to prevent accidental changes. You can view entries, but editing is disabled until unlocked in Settings/Ledger.
          </div>
        </div>
      )}

      {/* Holiday / Operational Day Switch */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-toggle-serving"
              onClick={() => {
                setIsHoliday(false);
                setHolidayReason('');
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                !isHoliday
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              School Open / Meal Served
            </button>
            <button
              type="button"
              id="btn-toggle-holiday"
              onClick={() => setIsHoliday(true)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                isHoliday
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Holiday / Meal Not Served
            </button>
          </div>

          {isHoliday && (
            <div className="flex-1 max-w-sm">
              <input
                type="text"
                value={holidayReason}
                onChange={(e) => setHolidayReason(e.target.value)}
                placeholder="Reason (e.g., Sunday, Saraswati Puja, Rainy Day)"
                className="w-full px-3 py-1.5 text-xs border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none bg-rose-50/40"
              />
            </div>
          )}
        </div>

        {/* Daily Menu (if meal served) */}
        {!isHoliday && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Utensils className="w-4 h-4 text-emerald-600" />
              <label className="text-xs font-bold text-slate-800">Daily Bengali Menu Item</label>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {menuOptions.map((item, idx) => (
                <button
                  key={`menu-opt-${item}-${idx}`}
                  type="button"
                  onClick={() => setMenuItem(item)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    menuItem === item
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 max-w-md">
              <input
                type="text"
                value={customMenuInput}
                onChange={(e) => setCustomMenuInput(e.target.value)}
                placeholder="Add custom menu (e.g., ডিমের ঝোল, চাটনি)"
                className="px-3 py-1 text-xs border border-slate-300 rounded-lg flex-1"
              />
              <button
                type="button"
                onClick={handleAddCustomMenu}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg"
              >
                + Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Class Attendance Grid */}
      {!isHoliday ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Class-wise Attendance</h3>
            <span className="text-xs text-slate-500">
              * Attendance cannot exceed active enrolled capacity
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {classes.map((cls) => {
              const maxEnrolled = enrollment[cls] ?? 0;
              const currentVal = attendance[cls] ?? 0;
              const isAtCapacity = maxEnrolled > 0 && currentVal === maxEnrolled;

              return (
                <div
                  key={cls}
                  className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col items-center justify-between"
                >
                  <div className="text-center mb-1">
                    <span className="text-xs font-bold text-slate-900 block">Class {cls}</span>
                    <span className="text-[11px] text-slate-500">
                      Enrolled: <strong className="text-slate-700">{maxEnrolled}</strong>
                    </span>
                  </div>

                  <input
                    type="number"
                    min="0"
                    max={maxEnrolled}
                    id={`input-att-${cls}`}
                    value={currentVal || ''}
                    disabled={isMonthLocked}
                    onChange={(e) => handleAttendanceChange(cls, e.target.value)}
                    placeholder="0"
                    className="w-full text-center py-1.5 text-base font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />

                  {isAtCapacity && (
                    <span className="text-[10px] text-emerald-700 font-semibold mt-1">100% Attended</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Group Summary Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100 text-center">
              <span className="text-emerald-800 font-medium block">Pre-Primary (PP)</span>
              <strong className="text-emerald-900 text-base">{ppCount}</strong>
            </div>
            <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100 text-center">
              <span className="text-emerald-800 font-medium block">Primary (I–IV)</span>
              <strong className="text-emerald-900 text-base">{primaryCount}</strong>
            </div>
            <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100 text-center">
              <span className="text-emerald-800 font-medium block">Upper Primary (V)</span>
              <strong className="text-emerald-900 text-base">{upperCount}</strong>
            </div>
            <div className="bg-emerald-700 p-2.5 rounded-lg text-white text-center">
              <span className="text-emerald-100 font-medium block">Total Served</span>
              <strong className="text-xl">{totalStudents}</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-6 text-center text-rose-800">
          <Sun className="w-8 h-8 text-rose-500 mx-auto mb-2 opacity-80" />
          <h4 className="font-bold text-sm">School Closed / Holiday</h4>
          <p className="text-xs text-rose-600 mt-1">
            {holidayReason || 'No mid-day meal served today. Attendance recorded as 0.'}
          </p>
          <div className="inline-block mt-3 px-3 py-1 bg-white border border-rose-200 rounded text-xs font-mono font-bold text-rose-700">
            SMS Code: -0-
          </div>
        </div>
      )}

      {/* Real-time Calculation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* SMS Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                MDM SMS Code
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-medium">
                West Bengal Portal
              </span>
            </div>
            <div className="bg-slate-100 p-3 rounded-lg text-center my-2 font-mono text-xl font-extrabold text-slate-800 tracking-wider">
              {mdmSmsCode}
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Format: <code>PP - Primary - Upper Primary</code>
            </p>
          </div>

          <button
            type="button"
            id="btn-copy-sms"
            onClick={handleCopySMS}
            className="w-full mt-3 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-blue-200"
          >
            {smsCopied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {smsCopied ? 'Copied to Clipboard!' : 'Copy SMS Text'}
          </button>
        </div>

        {/* Cooking Cost Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
            Today's Cooking Cost
          </span>
          <div className="text-2xl font-bold text-emerald-800 font-mono mb-2">
            {formatINR(totalDailyCookingCost)}
          </div>
          <div className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-2">
            {schoolProfile.schoolType === 'PRIMARY' && (
              <div className="flex justify-between">
                <span>PP ({ppCount} × ₹{cookingCostRates.PP}):</span>
                <span className="font-mono">{formatINR(dailyCostPP)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Primary ({primaryCount} × ₹{cookingCostRates.PRIMARY}):</span>
              <span className="font-mono">{formatINR(dailyCostPrimary)}</span>
            </div>
            <div className="flex justify-between">
              <span>Upper ({upperCount} × ₹{cookingCostRates.UPPER_PRIMARY}):</span>
              <span className="font-mono">{formatINR(dailyCostUpper)}</span>
            </div>
          </div>
        </div>

        {/* Rice Consumption Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
            Today's Rice Consumption
          </span>
          <div className="text-2xl font-bold text-amber-800 font-mono mb-2">
            {formatKg(totalDailyRiceKg)}
          </div>
          <div className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-2">
            {schoolProfile.schoolType === 'PRIMARY' && (
              <div className="flex justify-between">
                <span>PP ({ppCount} × {riceRatesKg.PP}kg):</span>
                <span className="font-mono">{formatKg(dailyRicePP)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Primary ({primaryCount} × {riceRatesKg.PRIMARY}kg):</span>
              <span className="font-mono">{formatKg(dailyRicePrimary)}</span>
            </div>
            <div className="flex justify-between">
              <span>Upper ({upperCount} × {riceRatesKg.UPPER_PRIMARY}kg):</span>
              <span className="font-mono">{formatKg(dailyRiceUpper)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Action */}
      <div className="flex items-center justify-between bg-slate-100 p-4 rounded-xl">
        <div>
          {saveSuccessMessage && (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              {saveSuccessMessage}
            </span>
          )}
        </div>

        <button
          type="button"
          id="btn-save-daily-entry"
          disabled={isMonthLocked}
          onClick={handleSaveEntry}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md ${
            isMonthLocked
              ? 'bg-slate-400 text-slate-100 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          <Save className="w-4 h-4" />
          Save Daily Entry
        </button>
      </div>
    </div>
  );
};
