import React, { useRef } from 'react';
import type { MonthlyRegisterData } from '../utils/monthlyRegisterService';
import { formatINR, formatKg, formatMonthDisplay } from '../utils/mdmCalculations';

interface MonthlyPrintLayoutProps {
  data: MonthlyRegisterData;
}

export const MonthlyPrintLayout = React.forwardRef<HTMLDivElement, MonthlyPrintLayoutProps>(
  ({ data }, ref) => {
    const { schoolProfile, rows, totals, classes } = data;

    return (
      <div ref={ref} className="print-container bg-white text-black p-4 text-[9px] leading-tight font-sans">
        {/* Printable Header */}
        <div className="text-center border-b border-black pb-2 mb-2">
          <h1 className="text-base font-bold uppercase tracking-wide">
            {schoolProfile.schoolName}
          </h1>
          <p className="text-xs">
            District: <strong>{schoolProfile.district}</strong> | Circle/Block:{' '}
            <strong>{schoolProfile.blockCircle}</strong> | UDISE:{' '}
            <strong>{schoolProfile.udiseCode}</strong>
          </p>
          <h2 className="text-xs font-bold mt-1 uppercase underline">
            Mid-Day Meal (PM POSHAN) Monthly Daily Register & Stock Ledger —{' '}
            {formatMonthDisplay(data.monthKey)}
          </h2>
          <div className="flex justify-between items-center text-[10px] mt-1 font-semibold px-2">
            <span>School Category: {schoolProfile.schoolType === 'PRIMARY' ? 'Primary' : 'Upper Primary'}</span>
            <span>Total Serving Days: {totals.totalServingDays} days</span>
            <span>Total Meals Served: {totals.attendance.total}</span>
            <span>Status: {data.isLocked ? 'LOCKED' : 'OPEN'}</span>
          </div>
        </div>

        {/* Master Daily Sheet Table (Exact Google Sheet Structure) */}
        <table className="w-full border-collapse border border-black text-center text-[8px]">
          <thead>
            {/* Super Header Row */}
            <tr className="bg-slate-200 font-bold border-b border-black">
              <th rowSpan={2} className="border border-black px-1 py-1 w-12">Date</th>
              <th colSpan={classes.length} className="border border-black px-1 py-0.5">Class-wise Attendance</th>
              <th rowSpan={2} className="border border-black px-1 py-1 w-14">MDM Code</th>
              <th rowSpan={2} className="border border-black px-1 py-1 w-10">Total</th>
              <th rowSpan={2} className="border border-black px-1 py-1 w-14">Menu</th>

              {/* Money Section */}
              <th colSpan={4} className="border border-black px-1 py-0.5 bg-emerald-100">
                Cooking Cost / Money (₹)
              </th>

              {/* Rice Section */}
              <th colSpan={4} className="border border-black px-1 py-0.5 bg-amber-100">
                Rice Stock Ledger (kg)
              </th>
            </tr>

            {/* Sub-Header Row */}
            <tr className="bg-slate-100 font-semibold border-b border-black text-[7.5px]">
              {classes.map((cls) => (
                <th key={cls} className="border border-black px-0.5 py-0.5 w-6">
                  {cls}
                </th>
              ))}
              {/* Money Columns */}
              <th className="border border-black px-0.5 py-0.5 w-14 bg-emerald-50">Opening</th>
              <th className="border border-black px-0.5 py-0.5 w-12 bg-emerald-50">Received</th>
              <th className="border border-black px-0.5 py-0.5 w-12 bg-emerald-50">Expense</th>
              <th className="border border-black px-0.5 py-0.5 w-14 bg-emerald-50">Closing</th>
              {/* Rice Columns */}
              <th className="border border-black px-0.5 py-0.5 w-12 bg-amber-50">Opening</th>
              <th className="border border-black px-0.5 py-0.5 w-11 bg-amber-50">Received</th>
              <th className="border border-black px-0.5 py-0.5 w-11 bg-amber-50">Expense</th>
              <th className="border border-black px-0.5 py-0.5 w-12 bg-amber-50">Closing</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.date}
                className={row.isHoliday ? 'bg-slate-50 font-normal' : 'hover:bg-slate-50'}
              >
                <td className="border border-black px-0.5 py-0.5 whitespace-nowrap font-mono">
                  {row.dayNumber} ({row.dayOfWeek})
                </td>

                {classes.map((cls) => (
                  <td key={cls} className="border border-black px-0.5 py-0.5 font-mono">
                    {row.isHoliday ? '' : row.attendance[cls] || ''}
                  </td>
                ))}

                <td className="border border-black px-0.5 py-0.5 font-mono font-bold text-[7px]">
                  {row.smsCode}
                </td>

                <td className="border border-black px-0.5 py-0.5 font-mono font-bold">
                  {row.totalCount || 0}
                </td>

                <td className="border border-black px-0.5 py-0.5 text-left truncate max-w-[80px]">
                  {row.isHoliday ? row.holidayReason || 'Holiday' : row.menuItem}
                </td>

                {/* Money Ledger Daily Chain */}
                <td className="border border-black px-0.5 py-0.5 font-mono text-right">
                  {row.openingMoney.total.toFixed(2)}
                </td>
                <td className="border border-black px-0.5 py-0.5 font-mono text-right">
                  {row.allotmentMoney.total > 0 ? row.allotmentMoney.total.toFixed(2) : '-'}
                </td>
                <td className="border border-black px-0.5 py-0.5 font-mono text-right">
                  {row.expenseMoney.total > 0 ? row.expenseMoney.total.toFixed(2) : '0.00'}
                </td>
                <td className="border border-black px-0.5 py-0.5 font-mono text-right font-bold">
                  {row.closingMoney.total.toFixed(2)}
                </td>

                {/* Rice Ledger Daily Chain */}
                <td className="border border-black px-0.5 py-0.5 font-mono text-right">
                  {row.openingRice.total.toFixed(2)}
                </td>
                <td className="border border-black px-0.5 py-0.5 font-mono text-right">
                  {row.allotmentRice.total > 0 ? row.allotmentRice.total.toFixed(2) : '-'}
                </td>
                <td className="border border-black px-0.5 py-0.5 font-mono text-right">
                  {row.expenseRice.total > 0 ? row.expenseRice.total.toFixed(2) : '0.00'}
                </td>
                <td className="border border-black px-0.5 py-0.5 font-mono text-right font-bold">
                  {row.closingRice.total.toFixed(2)}
                </td>
              </tr>
            ))}

            {/* Total Row */}
            <tr className="bg-slate-200 font-bold border-t-2 border-black">
              <td className="border border-black px-1 py-1 text-left">
                Total ({totals.totalServingDays} days)
              </td>

              {classes.map((cls) => (
                <td key={cls} className="border border-black px-0.5 py-1 font-mono">
                  {totals.attendance.byClass[cls]}
                </td>
              ))}

              <td className="border border-black px-0.5 py-1 font-mono text-[7px]">
                {totals.attendance.pp}-{totals.attendance.primary}-{totals.attendance.upper}
              </td>

              <td className="border border-black px-0.5 py-1 font-mono">
                {totals.attendance.total}
              </td>

              <td className="border border-black px-0.5 py-1 text-center">—</td>

              {/* Money Totals */}
              <td className="border border-black px-0.5 py-1 font-mono text-right">
                {totals.money.opening.total.toFixed(2)}
              </td>
              <td className="border border-black px-0.5 py-1 font-mono text-right text-emerald-800">
                {totals.money.allotment.total.toFixed(2)}
              </td>
              <td className="border border-black px-0.5 py-1 font-mono text-right text-rose-800">
                {totals.money.expense.total.toFixed(2)}
              </td>
              <td className="border border-black px-0.5 py-1 font-mono text-right font-extrabold">
                {totals.money.closing.total.toFixed(2)}
              </td>

              {/* Rice Totals */}
              <td className="border border-black px-0.5 py-1 font-mono text-right">
                {totals.rice.opening.total.toFixed(2)}
              </td>
              <td className="border border-black px-0.5 py-1 font-mono text-right text-emerald-800">
                {totals.rice.allotment.total.toFixed(2)}
              </td>
              <td className="border border-black px-0.5 py-1 font-mono text-right text-rose-800">
                {totals.rice.expense.total.toFixed(2)}
              </td>
              <td className="border border-black px-0.5 py-1 font-mono text-right font-extrabold">
                {totals.rice.closing.total.toFixed(2)}
              </td>
            </tr>

            {/* Category Breakdown Totals (PP, Primary, Upper) */}
            <tr className="bg-slate-100 font-semibold border-t border-black text-[7.5px]">
              <td colSpan={classes.length + 4} className="border border-black px-2 py-0.5 text-left">
                Category Split (PP / Primary I–IV / Upper V):
              </td>
              {/* Money Breakdown */}
              <td colSpan={4} className="border border-black px-1 py-0.5 text-right font-mono">
                PP: {totals.money.closing.PP.toFixed(2)} | I-IV:{' '}
                {totals.money.closing.PRIMARY.toFixed(2)} | Upper:{' '}
                {totals.money.closing.UPPER_PRIMARY.toFixed(2)}
              </td>
              {/* Rice Breakdown */}
              <td colSpan={4} className="border border-black px-1 py-0.5 text-right font-mono">
                PP: {totals.rice.closing.PP.toFixed(2)} kg | I-IV:{' '}
                {totals.rice.closing.PRIMARY.toFixed(2)} kg | Upper:{' '}
                {totals.rice.closing.UPPER_PRIMARY.toFixed(2)} kg
              </td>
            </tr>
          </tbody>
        </table>

        {/* Signatures Footer */}
        <div className="flex justify-between items-end mt-8 pt-4 px-4 text-[9px]">
          <div className="text-center">
            <div className="border-t border-black w-36 pt-1 font-semibold">
              Prepared By (MDM Teacher)
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-black w-44 pt-1 font-semibold">
              Verified By (VEC / SMC Secretary)
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-black w-48 pt-1 font-bold">
              Signature of Head Teacher / TIC with Seal
            </div>
          </div>
        </div>
      </div>
    );
  }
);
