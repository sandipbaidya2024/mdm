import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db/db';
import type { SchoolProfile } from '../types/mdm';
import {
  getMonthlyRegisterSheet,
  type MonthlyRegisterSheetData,
  type DayLedgerEntry,
} from '../utils/monthlyRegisterBuilder';
import { MonthlyPrintRegister } from './MonthlyPrintRegister';
import {
  formatINR,
  formatKg,
  syncClosingToNextMonth,
  getPreviousMonthKey,
  getNextMonthKey,
} from '../utils/mdmCalculations';
import {
  Calendar,
  Lock,
  Unlock,
  Printer,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  Coins,
  Package,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sun,
  ShieldCheck,
} from 'lucide-react';
import { triggerMonthlyRegisterPrint } from '../utils/reportPrinter';

interface MonthlySheetProps {
  schoolProfile: SchoolProfile;
  initialMonthKey?: string;
  onNavigateToDaily: (date: string) => void;
}

export const MonthlySheet: React.FC<MonthlySheetProps> = ({
  schoolProfile,
  initialMonthKey,
  onNavigateToDaily,
}) => {
  // Academic Year and Month Selector
  const [selectedYear, setSelectedYear] = useState<number>(
    parseInt(initialMonthKey?.split('-')[0] || schoolProfile.academicYear || '2026', 10)
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    parseInt(initialMonthKey?.split('-')[1] || '1', 10)
  );

  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const [registerData, setRegisterData] = useState<MonthlyRegisterSheetData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Quick Inline Status Edit Modal for Single Day
  const [editingDay, setEditingDay] = useState<DayLedgerEntry | null>(null);
  const [editIsHoliday, setEditIsHoliday] = useState<boolean>(false);
  const [editHolidayReason, setEditHolidayReason] = useState<string>('');

  // Print handler using native browser printing (100% reliable in iframes)
  const handlePrint = () => {
    triggerMonthlyRegisterPrint(
      `MDM_Monthly_Register_${schoolProfile.udiseCode}_${monthKey}`
    );
  };

  const loadRegister = async () => {
    setLoading(true);
    try {
      const data = await getMonthlyRegisterSheet(monthKey, schoolProfile);
      setRegisterData(data);
    } catch (err) {
      console.error('Failed to load monthly register:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegister();
  }, [monthKey, schoolProfile.schoolType]);

  const handlePrevMonth = () => {
    let m = selectedMonth - 1;
    let y = selectedYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  const handleNextMonth = () => {
    let m = selectedMonth + 1;
    let y = selectedYear;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  // Month Locking Toggle
  const handleToggleMonthLock = async () => {
    if (!registerData) return;
    const currentLock = registerData.isLocked;
    const confirmMsg = currentLock
      ? `Unlock ${registerData.monthName}? Authorized teachers can then edit historical records.`
      : `Lock ${registerData.monthName}? This strictly prevents accidental modifications and protects closing balances. Proceed?`;

    if (window.confirm(confirmMsg)) {
      const period = await db.monthlyPeriods.where('monthKey').equals(monthKey).first();
      if (period) {
        await db.monthlyPeriods.update(period.id!, {
          isLocked: !currentLock,
          lockedAt: !currentLock ? new Date().toISOString() : undefined,
          lockedBy: !currentLock ? schoolProfile.headTeacherName || 'Admin' : undefined,
          updatedAt: new Date().toISOString(),
        });
        await syncClosingToNextMonth(monthKey);
        await loadRegister();
      }
    }
  };

  // Quick Holiday / Serving Day Toggle Save
  const handleSaveDayStatus = async () => {
    if (!editingDay) return;
    if (registerData?.isLocked) {
      alert('This month is locked. Please unlock first.');
      return;
    }

    const existing = await db.dailyAttendance.where('date').equals(editingDay.date).first();
    if (existing) {
      await db.dailyAttendance.update(existing.id!, {
        isHoliday: editIsHoliday,
        holidayReason: editIsHoliday ? editHolidayReason : '',
        menuItem: editIsHoliday ? '' : existing.menuItem || 'ডাল',
        totalCount: editIsHoliday ? 0 : existing.totalCount,
        smsCode: editIsHoliday ? '-0-' : existing.smsCode,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await db.dailyAttendance.add({
        date: editingDay.date,
        monthKey,
        isHoliday: editIsHoliday,
        holidayReason: editIsHoliday ? editHolidayReason : '',
        menuItem: editIsHoliday ? '' : 'ডাল',
        attendance: {},
        ppCount: 0,
        primaryCount: 0,
        upperCount: 0,
        totalCount: 0,
        smsCode: '-0-',
        ratesUsed: editingDay.ratesUsed,
        cookingCostExpense: { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 },
        riceExpenseKg: { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    await syncClosingToNextMonth(monthKey);
    setEditingDay(null);
    await loadRegister();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="max-w-[98rem] mx-auto space-y-6">
      {/* On-screen interactive view: hidden during active print mode */}
      <div className="monthly-sheet-screen-view space-y-6">
        {/* 1. MONTH SELECTOR & ACTION BAR */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        {/* Academic Year and Month Chooser */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            {/* Academic Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Status Badge */}
          <div className="flex items-center gap-2 ml-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
                registerData?.isLocked
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
            >
              {registerData?.isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Locked
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  Open for Edits
                </>
              )}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Lock / Unlock Toggle Button */}
          <button
            type="button"
            id="btn-monthly-sheet-lock"
            onClick={handleToggleMonthLock}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 border transition-all ${
              registerData?.isLocked
                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            {registerData?.isLocked ? (
              <>
                <Unlock className="w-4 h-4 text-amber-700" />
                Unlock Month
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-slate-600" />
                Lock Month
              </>
            )}
          </button>

          {/* Print Button */}
          <button
            type="button"
            id="btn-print-monthly-register"
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print A4 Register
          </button>
        </div>
      </div>

      {loading || !registerData ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <span className="text-sm font-semibold text-slate-700">
            Calculating continuous monthly register...
          </span>
        </div>
      ) : (
        <>
          {/* 2. GRAND ACCORDION BANNER - OPENING & CLOSING BALANCES */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Money Opening */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Money Opening Balance
                </span>
                <span className="text-lg font-bold font-mono text-slate-800">
                  {formatINR(registerData.summary.money.opening.total)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  PP: {formatINR(registerData.summary.money.opening.PP)} | Pri: {formatINR(registerData.summary.money.opening.PRIMARY)}
                </span>
              </div>
            </div>

            {/* Money Closing */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-emerald-700 text-white rounded-xl">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                  Money Closing Balance
                </span>
                <span className="text-lg font-bold font-mono text-emerald-900">
                  {formatINR(registerData.summary.money.closing.total)}
                </span>
                <span className="text-[10px] text-emerald-700 block mt-0.5">
                  Expense: {formatINR(registerData.summary.money.expense.total)}
                </span>
              </div>
            </div>

            {/* Rice Opening */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Rice Opening Stock
                </span>
                <span className="text-lg font-bold font-mono text-slate-800">
                  {formatKg(registerData.summary.rice.opening.total)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  PP: {formatKg(registerData.summary.rice.opening.PP)} | Pri: {formatKg(registerData.summary.rice.opening.PRIMARY)}
                </span>
              </div>
            </div>

            {/* Rice Closing */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-amber-600 text-white rounded-xl">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider block">
                  Rice Closing Stock
                </span>
                <span className="text-lg font-bold font-mono text-amber-950">
                  {formatKg(registerData.summary.rice.closing.total)}
                </span>
                <span className="text-[10px] text-amber-800 block mt-0.5">
                  Consumed: {formatKg(registerData.summary.rice.expense.total)}
                </span>
              </div>
            </div>
          </div>

          {/* 3. FULL SPREADSHEET MASTER REGISTER */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-sm text-slate-900">
                  West Bengal MDM Monthly Daily Register — {registerData.monthName}
                </h3>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Serving Days: <strong className="text-slate-800 font-bold">{registerData.summary.totalServingDays}</strong> |
                Total Meals: <strong className="text-slate-800 font-bold">{registerData.summary.attendance.total}</strong> |
                Avg Daily: <strong className="text-slate-800 font-bold">{registerData.summary.attendance.avgDaily}</strong>
              </div>
            </div>

            {/* Spreadsheet Table with Horizontal Scrolling & Sticky Headers */}
            <div className="overflow-x-auto max-h-[38rem] border-b border-slate-200">
              <table className="w-full border-collapse text-center text-xs">
                {/* Header 1 */}
                <thead className="sticky top-0 z-20 bg-slate-200 text-slate-800 border-b border-slate-300 font-bold text-[11px]">
                  <tr>
                    <th rowSpan={2} className="border-r border-slate-300 px-3 py-2 bg-slate-300/80 sticky left-0 z-30 min-w-[105px]">
                      Date
                    </th>
                    <th colSpan={registerData.classes.length + 2} className="border-r border-slate-300 px-2 py-1.5 bg-blue-100/70 text-blue-900">
                      Attendance Record
                    </th>
                    <th rowSpan={2} className="border-r border-slate-300 px-3 py-2 bg-slate-100 min-w-[110px]">
                      Menu
                    </th>
                    <th colSpan={4} className="border-r border-slate-300 px-2 py-1.5 bg-emerald-100/70 text-emerald-950">
                      Cooking Cost Ledger (₹)
                    </th>
                    <th colSpan={4} className="border-r border-slate-300 px-2 py-1.5 bg-amber-100/70 text-amber-950">
                      Rice Stock Ledger (kg)
                    </th>
                    <th rowSpan={2} className="px-3 py-2 bg-slate-100 min-w-[80px]">
                      Action
                    </th>
                  </tr>

                  {/* Header 2: Sub-columns */}
                  <tr className="bg-slate-100 text-slate-700 text-[10px] uppercase border-b border-slate-300 font-semibold">
                    {/* Classes */}
                    {registerData.classes.map((cls) => (
                      <th key={cls} className="border-r border-slate-300 px-2 py-1.5 min-w-[42px]">
                        {cls}
                      </th>
                    ))}
                    <th className="border-r border-slate-300 px-2 py-1.5 font-bold min-w-[65px]">SMS</th>
                    <th className="border-r border-slate-300 px-2 py-1.5 font-bold text-slate-900 min-w-[50px]">Total</th>

                    {/* Money Ledger */}
                    <th className="border-r border-slate-300 px-2 py-1.5 min-w-[85px]">Opening</th>
                    <th className="border-r border-slate-300 px-2 py-1.5 min-w-[80px] text-emerald-700">+ Received</th>
                    <th className="border-r border-slate-300 px-2 py-1.5 min-w-[80px] text-rose-700">- Expense</th>
                    <th className="border-r border-slate-300 px-2 py-1.5 min-w-[85px] font-bold text-slate-900">= Closing</th>

                    {/* Rice Ledger */}
                    <th className="border-r border-slate-300 px-2 py-1.5 min-w-[75px]">Opening</th>
                    <th className="border-r border-slate-300 px-2 py-1.5 min-w-[70px] text-emerald-700">+ Recv</th>
                    <th className="border-r border-slate-300 px-2 py-1.5 min-w-[70px] text-rose-700">- Cons</th>
                    <th className="border-r border-slate-300 px-2 py-1.5 min-w-[75px] font-bold text-slate-900">= Closing</th>
                  </tr>
                </thead>

                {/* Body Rows */}
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {registerData.days.map((row) => (
                    <tr
                      key={row.date}
                      className={
                        row.isHoliday
                          ? 'bg-rose-50/40 text-slate-500 hover:bg-rose-50/70'
                          : 'hover:bg-slate-50 transition-colors'
                      }
                    >
                      {/* Sticky Date Column */}
                      <td className="border-r border-slate-200 px-3 py-2 font-medium text-left font-sans sticky left-0 z-10 bg-white/95 whitespace-nowrap shadow-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">{row.dayNumber} {row.dayName}</span>
                          {row.isHoliday && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                          )}
                        </div>
                      </td>

                      {/* Class Attendance */}
                      {registerData.classes.map((cls) => (
                        <td key={cls} className="border-r border-slate-200 px-2 py-1.5">
                          {row.isHoliday ? (
                            <span className="text-slate-300">—</span>
                          ) : (
                            row.attendance[cls] || 0
                          )}
                        </td>
                      ))}

                      {/* SMS */}
                      <td className="border-r border-slate-200 px-2 py-1.5 font-bold font-mono text-slate-700">
                        {row.smsCode}
                      </td>

                      {/* Total Attendance */}
                      <td className="border-r border-slate-200 px-2 py-1.5 font-bold text-slate-900 bg-slate-50/60">
                        {row.totalCount || 0}
                      </td>

                      {/* Menu / Holiday Reason */}
                      <td className="border-r border-slate-200 px-3 py-1.5 font-sans text-left truncate max-w-[130px]">
                        {row.isHoliday ? (
                          <span className="text-rose-600 font-semibold text-[10px]">
                            {row.holidayReason || 'Holiday'}
                          </span>
                        ) : (
                          <span className="text-slate-800 font-medium">{row.menuItem || 'ডাল'}</span>
                        )}
                      </td>

                      {/* Money: Opening */}
                      <td className="border-r border-slate-200 px-2 py-1.5 text-right font-mono text-slate-600">
                        {formatINR(row.money.opening.total)}
                      </td>

                      {/* Money: Received */}
                      <td className="border-r border-slate-200 px-2 py-1.5 text-right font-mono text-emerald-700 font-semibold">
                        {row.money.allotment.total > 0 ? formatINR(row.money.allotment.total) : '—'}
                      </td>

                      {/* Money: Expense */}
                      <td className="border-r border-slate-200 px-2 py-1.5 text-right font-mono text-rose-700">
                        {row.money.expense.total > 0 ? formatINR(row.money.expense.total) : '0.00'}
                      </td>

                      {/* Money: Closing */}
                      <td className="border-r border-slate-200 px-2 py-1.5 text-right font-mono font-bold text-slate-900 bg-emerald-50/30">
                        {formatINR(row.money.closing.total)}
                      </td>

                      {/* Rice: Opening */}
                      <td className="border-r border-slate-200 px-2 py-1.5 text-right font-mono text-slate-600">
                        {formatKg(row.rice.opening.total)}
                      </td>

                      {/* Rice: Received */}
                      <td className="border-r border-slate-200 px-2 py-1.5 text-right font-mono text-emerald-700 font-semibold">
                        {row.rice.allotment.total > 0 ? formatKg(row.rice.allotment.total) : '—'}
                      </td>

                      {/* Rice: Expense */}
                      <td className="border-r border-slate-200 px-2 py-1.5 text-right font-mono text-rose-700">
                        {row.rice.expense.total > 0 ? formatKg(row.rice.expense.total) : '0.00 kg'}
                      </td>

                      {/* Rice: Closing */}
                      <td className="border-r border-slate-200 px-2 py-1.5 text-right font-mono font-bold text-slate-900 bg-amber-50/30">
                        {formatKg(row.rice.closing.total)}
                      </td>

                      {/* Action */}
                      <td className="px-2 py-1.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onNavigateToDaily(row.date)}
                            className="p-1 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                            title="Open Daily Entry"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDay(row);
                              setEditIsHoliday(row.isHoliday);
                              setEditHolidayReason(row.holidayReason || '');
                            }}
                            className="p-1 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                            title="Toggle Holiday Status"
                          >
                            <Sun className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Footer Totals */}
                <tfoot className="sticky bottom-0 z-20 bg-slate-200 text-slate-900 font-bold border-t-2 border-slate-300 font-mono text-[11px]">
                  {/* Totals Row */}
                  <tr>
                    <td className="border-r border-slate-300 px-3 py-2 text-left font-sans font-extrabold sticky left-0 bg-slate-200 z-30">
                      Total ({registerData.summary.totalServingDays} d)
                    </td>
                    <td colSpan={registerData.classes.length} className="border-r border-slate-300 px-2 py-2 text-slate-700">
                      PP: {registerData.summary.attendance.pp} | Pri: {registerData.summary.attendance.primary} | UP: {registerData.summary.attendance.upper}
                    </td>
                    <td className="border-r border-slate-300 px-2 py-2 font-mono font-bold">
                      {registerData.summary.attendance.pp}-{registerData.summary.attendance.primary}-{registerData.summary.attendance.upper}
                    </td>
                    <td className="border-r border-slate-300 px-2 py-2 font-extrabold text-slate-950 bg-slate-300/50">
                      {registerData.summary.attendance.total}
                    </td>
                    <td className="border-r border-slate-300 px-3 py-2 font-sans font-medium text-slate-600">—</td>

                    {/* Money Summary */}
                    <td className="border-r border-slate-300 px-2 py-2 text-right">
                      {formatINR(registerData.summary.money.opening.total)}
                    </td>
                    <td className="border-r border-slate-300 px-2 py-2 text-right text-emerald-800 font-extrabold">
                      {formatINR(registerData.summary.money.allotment.total)}
                    </td>
                    <td className="border-r border-slate-300 px-2 py-2 text-right text-rose-800 font-extrabold">
                      {formatINR(registerData.summary.money.expense.total)}
                    </td>
                    <td className="border-r border-slate-300 px-2 py-2 text-right font-black text-blue-950 bg-emerald-100/70">
                      {formatINR(registerData.summary.money.closing.total)}
                    </td>

                    {/* Rice Summary */}
                    <td className="border-r border-slate-300 px-2 py-2 text-right">
                      {formatKg(registerData.summary.rice.opening.total)}
                    </td>
                    <td className="border-r border-slate-300 px-2 py-2 text-right text-emerald-800 font-extrabold">
                      {formatKg(registerData.summary.rice.allotment.total)}
                    </td>
                    <td className="border-r border-slate-300 px-2 py-2 text-right text-rose-800 font-extrabold">
                      {formatKg(registerData.summary.rice.expense.total)}
                    </td>
                    <td className="border-r border-slate-300 px-2 py-2 text-right font-black text-blue-950 bg-amber-100/70">
                      {formatKg(registerData.summary.rice.closing.total)}
                    </td>

                    <td className="px-2 py-2 text-slate-500 font-sans text-[10px]">
                      OK
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Month Continuity Notice */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Continuity Formula: <code>Next Day Opening = Previous Day Closing</code>. No manual mismatch possible.
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Closing rolled over to {getNextMonthKey(monthKey)}
              </span>
            </div>
          </div>
        </>
      )}
      </div>

      {/* Dedicated A4 Print Container: hidden on screen, rendered on demand during print */}
      {registerData && (
        <div
          id="monthly-register-print-container"
          aria-hidden="true"
        >
          <MonthlyPrintRegister data={registerData} />
        </div>
      )}

      {/* Quick Day Status Editor Modal */}
      {editingDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-slate-200">
            <h4 className="font-bold text-sm text-slate-900">
              Update Status for {editingDay.date}
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operational Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditIsHoliday(false)}
                    className={`py-2 rounded-lg font-bold border transition-all ${
                      !editIsHoliday
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Serving Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditIsHoliday(true)}
                    className={`py-2 rounded-lg font-bold border transition-all ${
                      editIsHoliday
                        ? 'border-rose-600 bg-rose-50 text-rose-900'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Holiday / Closed
                  </button>
                </div>
              </div>

              {editIsHoliday && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reason / Holiday Name</label>
                  <input
                    type="text"
                    value={editHolidayReason}
                    onChange={(e) => setEditHolidayReason(e.target.value)}
                    placeholder="e.g. Sunday, Saraswati Puja, Rainy Day"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingDay(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDayStatus}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
              >
                Save Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
