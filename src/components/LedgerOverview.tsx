import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import type { SchoolProfile, MonthlyPeriod, RiceTransaction, MoneyTransaction } from '../types/mdm';
import {
  calculateMonthSummary,
  syncClosingToNextMonth,
  formatINR,
  formatKg,
  formatMonthDisplay,
  getPreviousMonthKey,
  getNextMonthKey,
} from '../utils/mdmCalculations';
import {
  Calendar,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Coins,
  Package,
  PlusCircle,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';

interface LedgerOverviewProps {
  schoolProfile: SchoolProfile;
  initialMonthKey?: string;
  onNavigateToDaily?: (date: string) => void;
}

export const LedgerOverview: React.FC<LedgerOverviewProps> = ({
  schoolProfile,
  initialMonthKey,
  onNavigateToDaily,
}) => {
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    initialMonthKey || '2026-01'
  );
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal for Allotment / Transaction
  const [showAllotmentModal, setShowAllotmentModal] = useState<boolean>(false);
  const [allotmentType, setAllotmentType] = useState<'MONEY' | 'RICE'>('RICE');
  const [allotmentCategory, setAllotmentCategory] = useState<'PP' | 'PRIMARY' | 'UPPER_PRIMARY'>('PRIMARY');
  const [allotmentAmount, setAllotmentAmount] = useState<number>(0);
  const [allotmentDate, setAllotmentDate] = useState<string>(
    `${selectedMonthKey}-01`
  );
  const [allotmentReference, setAllotmentReference] = useState<string>('');
  const [allotmentNote, setAllotmentNote] = useState<string>('');

  // Daily records list
  const [dailyRecords, setDailyRecords] = useState<any[]>([]);

  const loadMonthData = async () => {
    setLoading(true);
    const sum = await calculateMonthSummary(selectedMonthKey);
    const records = await db.dailyAttendance
      .where('monthKey')
      .equals(selectedMonthKey)
      .sortBy('date');

    setSummary(sum);
    setDailyRecords(records);
    setLoading(false);
  };

  useEffect(() => {
    loadMonthData();
  }, [selectedMonthKey]);

  const handlePrevMonth = () => {
    setSelectedMonthKey(getPreviousMonthKey(selectedMonthKey));
  };

  const handleNextMonth = () => {
    setSelectedMonthKey(getNextMonthKey(selectedMonthKey));
  };

  const handleToggleLock = async () => {
    if (!summary?.period) return;
    const currentLock = summary.period.isLocked;
    const confirmMsg = currentLock
      ? 'Are you sure you want to UNLOCK this month? Authorized teachers may edit records.'
      : 'Locking this month will protect all historical records and closing balances from accidental modification. Proceed?';

    if (window.confirm(confirmMsg)) {
      await db.monthlyPeriods.update(summary.period.id!, {
        isLocked: !currentLock,
        lockedAt: !currentLock ? new Date().toISOString() : undefined,
        lockedBy: !currentLock ? schoolProfile.headTeacherName || 'Admin' : undefined,
        updatedAt: new Date().toISOString(),
      });

      // Synchronize closing to next month automatically
      await syncClosingToNextMonth(selectedMonthKey);
      await loadMonthData();
    }
  };

  const handleSaveAllotment = async () => {
    if (allotmentAmount <= 0) {
      alert('Please enter a valid allotment quantity or amount.');
      return;
    }

    const monthKey = selectedMonthKey;

    if (allotmentType === 'RICE') {
      const tx: RiceTransaction = {
        date: allotmentDate,
        monthKey,
        category: allotmentCategory,
        quantityKg: allotmentAmount,
        type: 'ALLOTMENT_RECEIVED',
        reference: allotmentReference,
        note: allotmentNote,
        createdAt: new Date().toISOString(),
      };
      await db.riceTransactions.add(tx);
    } else {
      const tx: MoneyTransaction = {
        date: allotmentDate,
        monthKey,
        category: allotmentCategory,
        amount: allotmentAmount,
        type: 'ALLOTMENT_RECEIVED',
        reference: allotmentReference,
        note: allotmentNote,
        createdAt: new Date().toISOString(),
      };
      await db.moneyTransactions.add(tx);
    }

    // Refresh calculations and propagate
    await syncClosingToNextMonth(monthKey);
    setShowAllotmentModal(false);
    setAllotmentAmount(0);
    setAllotmentReference('');
    setAllotmentNote('');
    await loadMonthData();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Month Navigation & Controls Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              {formatMonthDisplay(selectedMonthKey)}
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Month ID: {selectedMonthKey}
            </span>
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Add Allotment Button */}
          <button
            type="button"
            id="btn-add-allotment"
            onClick={() => {
              setAllotmentDate(`${selectedMonthKey}-01`);
              setShowAllotmentModal(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Add Allotment / Subsidy
          </button>

          {/* Month Lock / Unlock Toggle */}
          <button
            type="button"
            id="btn-toggle-month-lock"
            onClick={handleToggleLock}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors border ${
              summary?.period?.isLocked
                ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            {summary?.period?.isLocked ? (
              <>
                <Lock className="w-4 h-4 text-amber-700" />
                Month Locked (Protected)
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4 text-slate-500" />
                Lock Month
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grand Summaries / Ledgers */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. MONEY LEDGER CARD (₹) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-emerald-800 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-sm tracking-wide">Cooking Cost Ledger (Money ₹)</h3>
              </div>
              <span className="text-xs bg-emerald-700 px-2 py-0.5 rounded text-emerald-100 font-mono">
                {selectedMonthKey}
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Formula Representation */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Opening</span>
                  <strong className="text-slate-800 font-mono text-xs">
                    {formatINR(summary.openingMoney.total)}
                  </strong>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <span className="text-emerald-700 block text-[11px]">+ Received</span>
                  <strong className="text-emerald-900 font-mono text-xs">
                    {formatINR(summary.allotmentMoney.total)}
                  </strong>
                </div>
                <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  <span className="text-rose-700 block text-[11px]">- Expense</span>
                  <strong className="text-rose-900 font-mono text-xs">
                    {formatINR(summary.expenseMoney.total)}
                  </strong>
                </div>
                <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                  <span className="text-blue-700 block text-[11px]">= Closing</span>
                  <strong className="text-blue-900 font-mono text-xs font-bold">
                    {formatINR(summary.closingMoney.total)}
                  </strong>
                </div>
              </div>

              {/* Category Breakdown Table */}
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2 text-right">Opening</th>
                      <th className="px-3 py-2 text-right">Received</th>
                      <th className="px-3 py-2 text-right">Expense</th>
                      <th className="px-3 py-2 text-right">Closing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr>
                      <td className="px-3 py-2 font-sans font-medium text-slate-800">Pre-Primary (PP)</td>
                      <td className="px-3 py-2 text-right">{formatINR(summary.openingMoney.PP)}</td>
                      <td className="px-3 py-2 text-right text-emerald-700">{formatINR(summary.allotmentMoney.PP)}</td>
                      <td className="px-3 py-2 text-right text-rose-700">{formatINR(summary.expenseMoney.PP)}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900">{formatINR(summary.closingMoney.PP)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans font-medium text-slate-800">Primary (I–IV)</td>
                      <td className="px-3 py-2 text-right">{formatINR(summary.openingMoney.PRIMARY)}</td>
                      <td className="px-3 py-2 text-right text-emerald-700">{formatINR(summary.allotmentMoney.PRIMARY)}</td>
                      <td className="px-3 py-2 text-right text-rose-700">{formatINR(summary.expenseMoney.PRIMARY)}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900">{formatINR(summary.closingMoney.PRIMARY)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans font-medium text-slate-800">Upper Primary (V)</td>
                      <td className="px-3 py-2 text-right">{formatINR(summary.openingMoney.UPPER_PRIMARY)}</td>
                      <td className="px-3 py-2 text-right text-emerald-700">{formatINR(summary.allotmentMoney.UPPER_PRIMARY)}</td>
                      <td className="px-3 py-2 text-right text-rose-700">{formatINR(summary.expenseMoney.UPPER_PRIMARY)}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900">{formatINR(summary.closingMoney.UPPER_PRIMARY)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 2. RICE LEDGER CARD (kg) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-amber-800 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-200" />
                <h3 className="font-bold text-sm tracking-wide">Rice Stock Ledger (kg)</h3>
              </div>
              <span className="text-xs bg-amber-700 px-2 py-0.5 rounded text-amber-100 font-mono">
                {selectedMonthKey}
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Formula Representation */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Opening</span>
                  <strong className="text-slate-800 font-mono text-xs">
                    {formatKg(summary.openingRice.total)}
                  </strong>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <span className="text-emerald-700 block text-[11px]">+ Allotment</span>
                  <strong className="text-emerald-900 font-mono text-xs">
                    {formatKg(summary.allotmentRice.total)}
                  </strong>
                </div>
                <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  <span className="text-rose-700 block text-[11px]">- Consumed</span>
                  <strong className="text-rose-900 font-mono text-xs">
                    {formatKg(summary.expenseRice.total)}
                  </strong>
                </div>
                <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                  <span className="text-blue-700 block text-[11px]">= Closing</span>
                  <strong className="text-blue-900 font-mono text-xs font-bold">
                    {formatKg(summary.closingRice.total)}
                  </strong>
                </div>
              </div>

              {/* Category Breakdown Table */}
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2 text-right">Opening</th>
                      <th className="px-3 py-2 text-right">Received</th>
                      <th className="px-3 py-2 text-right">Consumed</th>
                      <th className="px-3 py-2 text-right">Closing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr>
                      <td className="px-3 py-2 font-sans font-medium text-slate-800">Pre-Primary (PP)</td>
                      <td className="px-3 py-2 text-right">{formatKg(summary.openingRice.PP)}</td>
                      <td className="px-3 py-2 text-right text-emerald-700">{formatKg(summary.allotmentRice.PP)}</td>
                      <td className="px-3 py-2 text-right text-rose-700">{formatKg(summary.expenseRice.PP)}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900">{formatKg(summary.closingRice.PP)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans font-medium text-slate-800">Primary (I–IV)</td>
                      <td className="px-3 py-2 text-right">{formatKg(summary.openingRice.PRIMARY)}</td>
                      <td className="px-3 py-2 text-right text-emerald-700">{formatKg(summary.allotmentRice.PRIMARY)}</td>
                      <td className="px-3 py-2 text-right text-rose-700">{formatKg(summary.expenseRice.PRIMARY)}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900">{formatKg(summary.closingRice.PRIMARY)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans font-medium text-slate-800">Upper Primary (V)</td>
                      <td className="px-3 py-2 text-right">{formatKg(summary.openingRice.UPPER_PRIMARY)}</td>
                      <td className="px-3 py-2 text-right text-emerald-700">{formatKg(summary.allotmentRice.UPPER_PRIMARY)}</td>
                      <td className="px-3 py-2 text-right text-rose-700">{formatKg(summary.expenseRice.UPPER_PRIMARY)}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900">{formatKg(summary.closingRice.UPPER_PRIMARY)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance & Serving Stats Pill */}
      {summary && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div>
            <span className="text-slate-500 font-semibold block">Total Serving Days</span>
            <strong className="text-xl font-bold text-slate-800">
              {summary.totalServingDays} days
            </strong>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block">Total Meals Served</span>
            <strong className="text-xl font-bold text-emerald-700">
              {summary.attendance.total} meals
            </strong>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block">Average Daily Attendance</span>
            <strong className="text-xl font-bold text-blue-700">
              {summary.attendance.avgDaily.toFixed(1)} / day
            </strong>
          </div>
          <div className="bg-slate-100 px-4 py-2 rounded-lg text-slate-600 font-medium">
            Next Month ({getNextMonthKey(selectedMonthKey)}) Opening Balances are synced automatically.
          </div>
        </div>
      )}

      {/* Daily Records Register Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-slate-600" />
            Monthly Daily Register Sheet
          </h3>
          <span className="text-xs text-slate-500">
            {dailyRecords.length} days recorded
          </span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Status / Menu</th>
                <th className="px-3 py-2.5 text-center">SMS Code</th>
                <th className="px-3 py-2.5 text-center">PP</th>
                <th className="px-3 py-2.5 text-center">I–IV</th>
                <th className="px-3 py-2.5 text-center">V</th>
                <th className="px-3 py-2.5 text-center">Total</th>
                <th className="px-3 py-2.5 text-right">Cooking Cost</th>
                <th className="px-3 py-2.5 text-right">Rice (kg)</th>
                <th className="px-3 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    No attendance records for this month yet. Use "Daily Entry" to record days.
                  </td>
                </tr>
              ) : (
                dailyRecords.map((r) => {
                  const isSun = new Date(r.date).getDay() === 0;
                  return (
                    <tr
                      key={r.date}
                      className={
                        r.isHoliday
                          ? 'bg-rose-50/40 text-slate-500'
                          : 'hover:bg-slate-50 transition-colors'
                      }
                    >
                      <td className="px-3 py-2 font-mono font-medium text-slate-800">
                        {r.date}
                      </td>
                      <td className="px-3 py-2">
                        {r.isHoliday ? (
                          <span className="text-rose-600 font-medium">
                            {r.holidayReason || (isSun ? 'Sunday' : 'Holiday')}
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-700">{r.menuItem || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-slate-700">
                        {r.smsCode}
                      </td>
                      <td className="px-3 py-2 text-center font-mono">{r.ppCount}</td>
                      <td className="px-3 py-2 text-center font-mono">{r.primaryCount}</td>
                      <td className="px-3 py-2 text-center font-mono">{r.upperCount}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-emerald-800">
                        {r.totalCount}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-800">
                        {formatINR(r.cookingCostExpense.total)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-800">
                        {formatKg(r.riceExpenseKg.total)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => onNavigateToDaily && onNavigateToDaily(r.date)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                        >
                          View / Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Allotment Inflow Entry */}
      {showAllotmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleIn border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Record Allotment Received</h3>
              <button
                type="button"
                onClick={() => setShowAllotmentModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Type Switch */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Allotment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAllotmentType('RICE')}
                    className={`py-2 rounded-lg font-bold border transition-all ${
                      allotmentType === 'RICE'
                        ? 'border-amber-600 bg-amber-50 text-amber-900'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Rice Stock (kg)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllotmentType('MONEY')}
                    className={`py-2 rounded-lg font-bold border transition-all ${
                      allotmentType === 'MONEY'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Cooking Cost (₹)
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Category</label>
                <select
                  value={allotmentCategory}
                  onChange={(e) => setAllotmentCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="PP">Pre-Primary (PP)</option>
                  <option value="PRIMARY">Primary (Class I–IV)</option>
                  <option value="UPPER_PRIMARY">Upper Primary (Class V / VI–VIII)</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {allotmentType === 'RICE' ? 'Quantity (in kg)' : 'Amount (in ₹)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={allotmentAmount || ''}
                  onChange={(e) => setAllotmentAmount(parseFloat(e.target.value) || 0)}
                  placeholder={allotmentType === 'RICE' ? 'e.g. 150.00' : 'e.g. 25000.00'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm font-bold"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date of Receipt</label>
                <input
                  type="date"
                  value={allotmentDate}
                  onChange={(e) => setAllotmentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              {/* Memo / Voucher Reference */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Memo / Voucher No.</label>
                <input
                  type="text"
                  value={allotmentReference}
                  onChange={(e) => setAllotmentReference(e.target.value)}
                  placeholder="e.g. MEMO/MDM/2026/04"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Circle Remarks</label>
                <input
                  type="text"
                  value={allotmentNote}
                  onChange={(e) => setAllotmentNote(e.target.value)}
                  placeholder="e.g. Sub-division quarterly allotment"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAllotmentModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-save-allotment"
                onClick={handleSaveAllotment}
                className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
              >
                Save Allotment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
