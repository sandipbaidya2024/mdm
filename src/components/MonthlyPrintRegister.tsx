import React, { forwardRef } from 'react';
import type { MonthlyRegisterSheetData } from '../utils/monthlyRegisterBuilder';
import { formatINR } from '../utils/mdmCalculations';

interface MonthlyPrintRegisterProps {
  data: MonthlyRegisterSheetData;
}

export const MonthlyPrintRegister = forwardRef<HTMLDivElement, MonthlyPrintRegisterProps>(
  ({ data }, ref) => {
    const { schoolProfile, days, summary, classes, monthName } = data;

    return (
      <div ref={ref} className="p-4 bg-white text-slate-900 font-sans print:p-2 print:m-0 text-[10px]">
        {/* Print Header */}
        <div className="border-b-2 border-slate-900 pb-3 mb-3 text-center">
          <h1 className="text-base font-bold uppercase tracking-wide">
            Government of West Bengal — School Education Department
          </h1>
          <h2 className="text-sm font-extrabold uppercase mt-0.5">
            PM POSHAN / Mid-Day Meal (MDM) Monthly Daily Register
          </h2>
          <div className="flex flex-wrap items-center justify-between text-xs mt-2 px-2 border-t border-slate-300 pt-1.5 font-medium">
            <span>
              School: <strong>{schoolProfile.schoolName}</strong>
            </span>
            <span>
              UDISE Code: <strong className="font-mono">{schoolProfile.udiseCode}</strong>
            </span>
            <span>
              Circle / Block: <strong>{schoolProfile.blockCircle}</strong>
            </span>
            <span>
              District: <strong>{schoolProfile.district}</strong>
            </span>
            <span>
              Month & Year: <strong className="font-bold underline">{monthName}</strong>
            </span>
          </div>
        </div>

        {/* Master Daily Sheet Table formatted identical to the Google Sheet */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-700 text-center text-[9px] leading-tight">
            <thead>
              {/* Main Top Header Tier */}
              <tr className="bg-slate-200 border-b border-slate-700 font-bold">
                <th rowSpan={3} className="border border-slate-700 px-1 py-1">Date</th>
                <th colSpan={classes.length + 2} className="border border-slate-700 px-1 py-1 bg-blue-50">
                  Attendance Record
                </th>
                <th rowSpan={3} className="border border-slate-700 px-1 py-1">Menu</th>
                <th colSpan={12} className="border border-slate-700 px-1 py-1 bg-emerald-50">
                  Cooking Cost / Money Ledger (₹)
                </th>
                <th colSpan={12} className="border border-slate-700 px-1 py-1 bg-amber-50">
                  Rice Stock Ledger (kg)
                </th>
              </tr>

              {/* Sub-Header Tier 2 */}
              <tr className="bg-slate-100 border-b border-slate-700 font-semibold text-[8.5px]">
                {/* Attendance Classes */}
                {classes.map((cls) => (
                  <th key={cls} className="border border-slate-700 px-0.5 py-0.5">
                    {cls}
                  </th>
                ))}
                <th className="border border-slate-700 px-0.5 py-0.5 font-bold">SMS</th>
                <th className="border border-slate-700 px-0.5 py-0.5 font-bold">Total</th>

                {/* Money Groups */}
                <th colSpan={3} className="border border-slate-700 px-0.5 py-0.5">Opening Balance</th>
                <th colSpan={3} className="border border-slate-700 px-0.5 py-0.5">Allotment Received</th>
                <th colSpan={3} className="border border-slate-700 px-0.5 py-0.5">Expense</th>
                <th colSpan={3} className="border border-slate-700 px-0.5 py-0.5 font-bold">Closing Balance</th>

                {/* Rice Groups */}
                <th colSpan={3} className="border border-slate-700 px-0.5 py-0.5">Opening Stock</th>
                <th colSpan={3} className="border border-slate-700 px-0.5 py-0.5">Allotment Received</th>
                <th colSpan={3} className="border border-slate-700 px-0.5 py-0.5">Consumed</th>
                <th colSpan={3} className="border border-slate-700 px-0.5 py-0.5 font-bold">Closing Stock</th>
              </tr>

              {/* Category Tier 3 */}
              <tr className="bg-slate-50 border-b border-slate-700 text-[8px] font-medium">
                {/* Attendance Enrolled baseline */}
                {classes.map((cls) => (
                  <th key={cls} className="border border-slate-700 px-0.5 py-0.5 text-slate-600">
                    {days[0]?.applicableEnrollment[cls] ?? ''}
                  </th>
                ))}
                <th className="border border-slate-700 px-0.5 py-0.5 text-slate-500">Code</th>
                <th className="border border-slate-700 px-0.5 py-0.5 text-slate-500">Meals</th>

                {/* Money Categories: PP, I-IV, V */}
                <th className="border border-slate-700 px-0.5 py-0.5">PP</th>
                <th className="border border-slate-700 px-0.5 py-0.5">I-IV</th>
                <th className="border border-slate-700 px-0.5 py-0.5">V</th>

                <th className="border border-slate-700 px-0.5 py-0.5">PP</th>
                <th className="border border-slate-700 px-0.5 py-0.5">I-IV</th>
                <th className="border border-slate-700 px-0.5 py-0.5">V</th>

                <th className="border border-slate-700 px-0.5 py-0.5">PP</th>
                <th className="border border-slate-700 px-0.5 py-0.5">I-IV</th>
                <th className="border border-slate-700 px-0.5 py-0.5">V</th>

                <th className="border border-slate-700 px-0.5 py-0.5">PP</th>
                <th className="border border-slate-700 px-0.5 py-0.5">I-IV</th>
                <th className="border border-slate-700 px-0.5 py-0.5">V</th>

                {/* Rice Categories: PP, I-IV, V */}
                <th className="border border-slate-700 px-0.5 py-0.5">PP</th>
                <th className="border border-slate-700 px-0.5 py-0.5">I-IV</th>
                <th className="border border-slate-700 px-0.5 py-0.5">V</th>

                <th className="border border-slate-700 px-0.5 py-0.5">PP</th>
                <th className="border border-slate-700 px-0.5 py-0.5">I-IV</th>
                <th className="border border-slate-700 px-0.5 py-0.5">V</th>

                <th className="border border-slate-700 px-0.5 py-0.5">PP</th>
                <th className="border border-slate-700 px-0.5 py-0.5">I-IV</th>
                <th className="border border-slate-700 px-0.5 py-0.5">V</th>

                <th className="border border-slate-700 px-0.5 py-0.5">PP</th>
                <th className="border border-slate-700 px-0.5 py-0.5">I-IV</th>
                <th className="border border-slate-700 px-0.5 py-0.5">V</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-300 font-mono">
              {days.map((row) => (
                <tr
                  key={row.date}
                  className={
                    row.isHoliday
                      ? 'bg-rose-50/50 text-slate-500'
                      : 'hover:bg-slate-50'
                  }
                >
                  {/* Date */}
                  <td className="border border-slate-700 px-1 py-0.5 whitespace-nowrap font-medium text-left font-sans">
                    {row.dayNumber} {row.dayName}
                  </td>

                  {/* Attendance */}
                  {classes.map((cls) => (
                    <td key={cls} className="border border-slate-700 px-0.5 py-0.5">
                      {row.isHoliday ? '' : row.attendance[cls] || ''}
                    </td>
                  ))}
                  <td className="border border-slate-700 px-0.5 py-0.5 font-bold font-mono">
                    {row.smsCode}
                  </td>
                  <td className="border border-slate-700 px-0.5 py-0.5 font-bold text-slate-900">
                    {row.totalCount || 0}
                  </td>

                  {/* Menu */}
                  <td className="border border-slate-700 px-1 py-0.5 font-sans truncate max-w-[80px]">
                    {row.isHoliday ? row.holidayReason || 'Holiday' : row.menuItem}
                  </td>

                  {/* Money Ledger: Opening */}
                  <td className="border border-slate-700 px-0.5 py-0.5">{row.money.opening.PP.toFixed(2)}</td>
                  <td className="border border-slate-700 px-0.5 py-0.5">{row.money.opening.PRIMARY.toFixed(2)}</td>
                  <td className="border border-slate-700 px-0.5 py-0.5">{row.money.opening.UPPER_PRIMARY.toFixed(2)}</td>

                  {/* Money Ledger: Allotment */}
                  <td className="border border-slate-700 px-0.5 py-0.5 text-emerald-800">
                    {row.money.allotment.PP > 0 ? row.money.allotment.PP.toFixed(2) : ''}
                  </td>
                  <td className="border border-slate-700 px-0.5 py-0.5 text-emerald-800">
                    {row.money.allotment.PRIMARY > 0 ? row.money.allotment.PRIMARY.toFixed(2) : ''}
                  </td>
                  <td className="border border-slate-700 px-0.5 py-0.5 text-emerald-800">
                    {row.money.allotment.UPPER_PRIMARY > 0 ? row.money.allotment.UPPER_PRIMARY.toFixed(2) : ''}
                  </td>

                  {/* Money Ledger: Expense */}
                  <td className="border border-slate-700 px-0.5 py-0.5 text-rose-800">
                    {row.money.expense.PP > 0 ? row.money.expense.PP.toFixed(2) : '0.00'}
                  </td>
                  <td className="border border-slate-700 px-0.5 py-0.5 text-rose-800">
                    {row.money.expense.PRIMARY > 0 ? row.money.expense.PRIMARY.toFixed(2) : '0.00'}
                  </td>
                  <td className="border border-slate-700 px-0.5 py-0.5 text-rose-800">
                    {row.money.expense.UPPER_PRIMARY > 0 ? row.money.expense.UPPER_PRIMARY.toFixed(2) : '0.00'}
                  </td>

                  {/* Money Ledger: Closing */}
                  <td className="border border-slate-700 px-0.5 py-0.5 font-bold">{row.money.closing.PP.toFixed(2)}</td>
                  <td className="border border-slate-700 px-0.5 py-0.5 font-bold">{row.money.closing.PRIMARY.toFixed(2)}</td>
                  <td className="border border-slate-700 px-0.5 py-0.5 font-bold">{row.money.closing.UPPER_PRIMARY.toFixed(2)}</td>

                  {/* Rice Ledger: Opening */}
                  <td className="border border-slate-700 px-0.5 py-0.5">{row.rice.opening.PP.toFixed(2)}</td>
                  <td className="border border-slate-700 px-0.5 py-0.5">{row.rice.opening.PRIMARY.toFixed(2)}</td>
                  <td className="border border-slate-700 px-0.5 py-0.5">{row.rice.opening.UPPER_PRIMARY.toFixed(2)}</td>

                  {/* Rice Ledger: Allotment */}
                  <td className="border border-slate-700 px-0.5 py-0.5 text-emerald-800">
                    {row.rice.allotment.PP > 0 ? row.rice.allotment.PP.toFixed(2) : ''}
                  </td>
                  <td className="border border-slate-700 px-0.5 py-0.5 text-emerald-800">
                    {row.rice.allotment.PRIMARY > 0 ? row.rice.allotment.PRIMARY.toFixed(2) : ''}
                  </td>
                  <td className="border border-slate-700 px-0.5 py-0.5 text-emerald-800">
                    {row.rice.allotment.UPPER_PRIMARY > 0 ? row.rice.allotment.UPPER_PRIMARY.toFixed(2) : ''}
                  </td>

                  {/* Rice Ledger: Consumed */}
                  <td className="border border-slate-700 px-0.5 py-0.5 text-rose-800">
                    {row.rice.expense.PP > 0 ? row.rice.expense.PP.toFixed(2) : '0.00'}
                  </td>
                  <td className="border border-slate-700 px-0.5 py-0.5 text-rose-800">
                    {row.rice.expense.PRIMARY > 0 ? row.rice.expense.PRIMARY.toFixed(2) : '0.00'}
                  </td>
                  <td className="border border-slate-700 px-0.5 py-0.5 text-rose-800">
                    {row.rice.expense.UPPER_PRIMARY > 0 ? row.rice.expense.UPPER_PRIMARY.toFixed(2) : '0.00'}
                  </td>

                  {/* Rice Ledger: Closing */}
                  <td className="border border-slate-700 px-0.5 py-0.5 font-bold">{row.rice.closing.PP.toFixed(2)}</td>
                  <td className="border border-slate-700 px-0.5 py-0.5 font-bold">{row.rice.closing.PRIMARY.toFixed(2)}</td>
                  <td className="border border-slate-700 px-0.5 py-0.5 font-bold">{row.rice.closing.UPPER_PRIMARY.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>

            {/* Monthly Summary Rows */}
            <tfoot className="border-t-2 border-slate-900 font-bold bg-slate-100 font-mono">
              {/* Cumulative Totals Row */}
              <tr>
                <td className="border border-slate-700 px-1 py-1 font-sans text-left font-extrabold">
                  Total ({summary.totalServingDays} days)
                </td>
                <td colSpan={classes.length} className="border border-slate-700 px-1 py-1">
                  PP: {summary.attendance.pp} | Pri: {summary.attendance.primary} | UP: {summary.attendance.upper}
                </td>
                <td className="border border-slate-700 px-0.5 py-1 text-center font-bold">
                  {summary.attendance.pp}-{summary.attendance.primary}-{summary.attendance.upper}
                </td>
                <td className="border border-slate-700 px-0.5 py-1 text-center font-extrabold text-slate-950">
                  {summary.attendance.total}
                </td>
                <td className="border border-slate-700 px-1 py-1 font-sans">—</td>

                {/* Money: Opening */}
                <td className="border border-slate-700 px-0.5 py-1">{summary.money.opening.PP.toFixed(2)}</td>
                <td className="border border-slate-700 px-0.5 py-1">{summary.money.opening.PRIMARY.toFixed(2)}</td>
                <td className="border border-slate-700 px-0.5 py-1">{summary.money.opening.UPPER_PRIMARY.toFixed(2)}</td>

                {/* Money: Received */}
                <td className="border border-slate-700 px-0.5 py-1 text-emerald-800">{summary.money.allotment.PP.toFixed(2)}</td>
                <td className="border border-slate-700 px-0.5 py-1 text-emerald-800">{summary.money.allotment.PRIMARY.toFixed(2)}</td>
                <td className="border border-slate-700 px-0.5 py-1 text-emerald-800">{summary.money.allotment.UPPER_PRIMARY.toFixed(2)}</td>

                {/* Money: Expense */}
                <td className="border border-slate-700 px-0.5 py-1 text-rose-800">{summary.money.expense.PP.toFixed(2)}</td>
                <td className="border border-slate-700 px-0.5 py-1 text-rose-800">{summary.money.expense.PRIMARY.toFixed(2)}</td>
                <td className="border border-slate-700 px-0.5 py-1 text-rose-800">{summary.money.expense.UPPER_PRIMARY.toFixed(2)}</td>

                {/* Money: Closing */}
                <td className="border border-slate-700 px-0.5 py-1 font-extrabold">{summary.money.closing.PP.toFixed(2)}</td>
                <td className="border border-slate-700 px-0.5 py-1 font-extrabold">{summary.money.closing.PRIMARY.toFixed(2)}</td>
                <td className="border border-slate-700 px-0.5 py-1 font-extrabold">{summary.money.closing.UPPER_PRIMARY.toFixed(2)}</td>

                {/* Rice: Opening */}
                <td className="border border-slate-700 px-0.5 py-1">{summary.rice.opening.PP.toFixed(2)}</td>
                <td className="border border-slate-700 px-0.5 py-1">{summary.rice.opening.PRIMARY.toFixed(2)}</td>
                <td className="border border-slate-700 px-0.5 py-1">{summary.rice.opening.UPPER_PRIMARY.toFixed(2)}</td>

                {/* Rice: Received */}
                <td className="border border-slate-700 px-0.5 py-1 text-emerald-800">{summary.rice.allotment.PP.toFixed(2)}</td>
                <td className="border border-slate-700 px-0.5 py-1 text-emerald-800">{summary.rice.allotment.PRIMARY.toFixed(2)}</td>
                <td className="border border-slate-700 px-0.5 py-1 text-emerald-800">{summary.rice.allotment.UPPER_PRIMARY.toFixed(2)}</td>

                {/* Rice: Consumed */}
                <td className="border border-slate-700 px-0.5 py-1 text-rose-800">{summary.rice.expense.PP.toFixed(2)}</td>
                <td className="border border-slate-700 px-0.5 py-1 text-rose-800">{summary.rice.expense.PRIMARY.toFixed(2)}</td>
                <td className="border border-slate-700 px-0.5 py-1 text-rose-800">{summary.rice.expense.UPPER_PRIMARY.toFixed(2)}</td>

                {/* Rice: Closing */}
                <td className="border border-slate-700 px-0.5 py-1 font-extrabold">{summary.rice.closing.PP.toFixed(2)}</td>
                <td className="border border-slate-700 px-0.5 py-1 font-extrabold">{summary.rice.closing.PRIMARY.toFixed(2)}</td>
                <td className="border border-slate-700 px-0.5 py-1 font-extrabold">{summary.rice.closing.UPPER_PRIMARY.toFixed(2)}</td>
              </tr>

              {/* Total Aggregate Row */}
              <tr className="bg-slate-200 text-slate-900 font-extrabold">
                <td colSpan={classes.length + 4} className="border border-slate-700 px-2 py-1 text-right font-sans">
                  Total Monthly Aggregates:
                </td>
                <td colSpan={3} className="border border-slate-700 px-1 py-1 text-center">
                  ₹{summary.money.opening.total.toFixed(2)}
                </td>
                <td colSpan={3} className="border border-slate-700 px-1 py-1 text-center text-emerald-800">
                  ₹{summary.money.allotment.total.toFixed(2)}
                </td>
                <td colSpan={3} className="border border-slate-700 px-1 py-1 text-center text-rose-800">
                  ₹{summary.money.expense.total.toFixed(2)}
                </td>
                <td colSpan={3} className="border border-slate-700 px-1 py-1 text-center text-blue-900 font-black">
                  ₹{summary.money.closing.total.toFixed(2)}
                </td>

                <td colSpan={3} className="border border-slate-700 px-1 py-1 text-center">
                  {summary.rice.opening.total.toFixed(2)} kg
                </td>
                <td colSpan={3} className="border border-slate-700 px-1 py-1 text-center text-emerald-800">
                  {summary.rice.allotment.total.toFixed(2)} kg
                </td>
                <td colSpan={3} className="border border-slate-700 px-1 py-1 text-center text-rose-800">
                  {summary.rice.expense.total.toFixed(2)} kg
                </td>
                <td colSpan={3} className="border border-slate-700 px-1 py-1 text-center text-blue-900 font-black">
                  {summary.rice.closing.total.toFixed(2)} kg
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Verification Signatures Footer */}
        <div className="mt-8 pt-6 border-t border-slate-400 flex items-center justify-between text-xs px-6 font-semibold">
          <div className="text-center">
            <div className="w-48 border-b border-slate-700 mb-1" />
            <span>MDM In-Charge / Teacher</span>
          </div>
          <div className="text-center">
            <div className="w-48 border-b border-slate-700 mb-1" />
            <span>Verified by VEC / SMC President</span>
          </div>
          <div className="text-center">
            <div className="w-48 border-b border-slate-700 mb-1" />
            <span>Head Teacher / TIC (Seal & Signature)</span>
          </div>
        </div>
      </div>
    );
  }
);

MonthlyPrintRegister.displayName = 'MonthlyPrintRegister';
