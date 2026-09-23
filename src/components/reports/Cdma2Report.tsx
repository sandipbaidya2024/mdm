import React, { forwardRef } from 'react';
import type { MonthlyRegisterSheetData } from '../../utils/monthlyRegisterBuilder';

interface Cdma2ReportProps {
  data: MonthlyRegisterSheetData;
}

/**
 * PAGE 2: CMDA-2 (ANNEXURE CMDA-2)
 * Exact visual reproduction matching the authoritative CMDA-2 source:
 * - TITLE:
 *   MID-DAY MEAL EXPENDITURE
 * - Header:
 *   Name of the school: [School Name]
 *   Name of the SHG: [Effective SHG Name]
 *   TOTAL: [Source total]
 *   Month: [Selected Month + Year]
 * - Main Daily Table:
 *   Columns:
 *   Sl no | Date | Number of Students Present (PP | I-IV | V) | Expenditure (PP | I-IV | V)
 *   Dates formatted as "1 Aug 2026", without "(Sun/Hol)".
 *   Dates without valid Daily Entry leave attendance & expenditure cells blank.
 *   Dates with valid Daily Entry show actual attendance and daily expenditure.
 * - Table TOTAL row:
 *   PP, I-IV, V student totals and PP, I-IV, V expenditure totals.
 * - Bottom:
 *   Total [number] days
 *   Expenditure:
 *   Rs. [overall expenditure]
 *   Signature of the Head of the Institution
 */
export const Cdma2Report = forwardRef<HTMLDivElement, Cdma2ReportProps>(({ data }, ref) => {
  const { schoolProfile, days, summary, monthName, year, effectiveSHG } = data;
  const shgName = effectiveSHG?.nameOfSHG || schoolProfile.shgDetails?.nameOfSHG || 'Self Help Group';

  // Enrollment for the month (from day 1 applicable enrollment)
  const day1Enrollment = days[0]?.applicableEnrollment || {};
  const enrollPP = day1Enrollment['PP'] || 0;
  const enrollI = day1Enrollment['I'] || 0;
  const enrollII = day1Enrollment['II'] || 0;
  const enrollIII = day1Enrollment['III'] || 0;
  const enrollIV = day1Enrollment['IV'] || 0;
  const enrollV = day1Enrollment['V'] || 0;
  const totalEnroll = enrollPP + enrollI + enrollII + enrollIII + enrollIV + enrollV;
  const sourceTotal = totalEnroll > 0 ? totalEnroll : (summary.attendance.total > 0 ? summary.attendance.total : '');

  // Short month name for Date column (e.g. "Aug")
  const shortMonth = new Date(year, data.month - 1, 1).toLocaleString('en-US', { month: 'short' });

  // Attendance Totals from authoritative monthly summary
  const totalPP = summary.attendance.pp;
  const totalPri = summary.attendance.primary;
  const totalUp = summary.attendance.upper;

  // Expenditure Totals from authoritative monthly summary
  const totalExpPP = summary.money.expense.PP;
  const totalExpPri = summary.money.expense.PRIMARY;
  const totalExpUp = summary.money.expense.UPPER_PRIMARY;
  const overallExp = summary.money.expense.total;

  return (
    <div
      ref={ref}
      id="cdma2-print-container"
      className="bg-white text-black font-sans p-6 text-[10px] leading-tight w-full max-w-[1020px] mx-auto border border-black shadow-sm"
    >
      {/* 1. Title */}
      <div className="text-center font-bold pb-2 mb-2">
        <h1 className="text-sm font-extrabold uppercase tracking-wide">
          MID-DAY MEAL EXPENDITURE
        </h1>
      </div>

      {/* 2. Header Information */}
      <div className="border border-black p-2.5 mb-3 text-[10px] font-medium leading-relaxed">
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
          <div className="space-y-1.5">
            <div className="flex items-baseline">
              <span className="font-bold whitespace-nowrap">Name of the school:</span>
              <span className="font-semibold underline uppercase ml-2">{schoolProfile.schoolName}</span>
            </div>
            <div className="flex items-baseline">
              <span className="font-bold whitespace-nowrap">Name of the SHG:</span>
              <span className="font-semibold underline uppercase ml-2">{shgName}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline">
              <span className="font-bold whitespace-nowrap">TOTAL:</span>
              <span className="font-semibold underline font-mono ml-2">{sourceTotal}</span>
            </div>
            <div className="flex items-baseline">
              <span className="font-bold whitespace-nowrap">Month:</span>
              <span className="font-semibold underline uppercase ml-2">{monthName} {year}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Daily Table */}
      <div className="mb-3">
        <table id="cdma2-daily-table" className="w-full border-collapse border border-black text-center text-[9px]">
          <thead>
            {/* Header Tier 1 */}
            <tr className="bg-slate-100 font-bold">
              <th rowSpan={2} className="border border-black py-1 px-1 w-10">
                Sl no
              </th>
              <th rowSpan={2} className="border border-black py-1 px-1 w-24">
                Date
              </th>
              <th colSpan={3} className="border border-black py-1 px-1 bg-slate-200">
                Number of Students Present
              </th>
              <th colSpan={3} className="border border-black py-1 px-1 bg-slate-200">
                Expenditure
              </th>
            </tr>
            {/* Header Tier 2 */}
            <tr className="bg-slate-50 font-bold text-[8.5px]">
              <th className="border border-black py-0.5 px-1 w-14">PP</th>
              <th className="border border-black py-0.5 px-1 w-16">I-IV</th>
              <th className="border border-black py-0.5 px-1 w-14">V</th>
              <th className="border border-black py-0.5 px-1 w-16">PP</th>
              <th className="border border-black py-0.5 px-1 w-20">I-IV</th>
              <th className="border border-black py-0.5 px-1 w-16">V</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {days.map((d, idx) => {
              const slNo = idx + 1;
              const dateStr = `${d.dayNumber} ${shortMonth} ${year}`;
              const hasValidEntry = !d.isHoliday && (d.totalCount > 0 || (d.ppCount + d.primaryCount + (d.upperCount || 0)) > 0);

              return (
                <tr key={d.date} className="hover:bg-slate-50">
                  <td className="border border-black py-0.5 font-sans font-bold">{slNo}</td>
                  <td className="border border-black py-0.5 font-sans">{dateStr}</td>
                  {/* Number of Students Present */}
                  <td className="border border-black py-0.5">
                    {hasValidEntry ? d.ppCount : ''}
                  </td>
                  <td className="border border-black py-0.5">
                    {hasValidEntry ? d.primaryCount : ''}
                  </td>
                  <td className="border border-black py-0.5">
                    {hasValidEntry ? (d.upperCount || 0) : ''}
                  </td>
                  {/* Expenditure */}
                  <td className="border border-black py-0.5">
                    {hasValidEntry ? d.money.expense.PP.toFixed(2) : ''}
                  </td>
                  <td className="border border-black py-0.5">
                    {hasValidEntry ? d.money.expense.PRIMARY.toFixed(2) : ''}
                  </td>
                  <td className="border border-black py-0.5">
                    {hasValidEntry ? d.money.expense.UPPER_PRIMARY.toFixed(2) : ''}
                  </td>
                </tr>
              );
            })}

            {/* Total Row */}
            <tr id="cdma2-total-row" className="bg-slate-100 font-bold border-t-2 border-black text-black">
              <td colSpan={2} className="border border-black py-1 uppercase text-center font-sans text-[9px] font-bold">
                TOTAL
              </td>
              <td className="border border-black py-1 font-extrabold">{totalPP}</td>
              <td className="border border-black py-1 font-extrabold">{totalPri}</td>
              <td className="border border-black py-1 font-extrabold">{totalUp}</td>
              <td className="border border-black py-1 font-extrabold">{totalExpPP.toFixed(2)}</td>
              <td className="border border-black py-1 font-extrabold">{totalExpPri.toFixed(2)}</td>
              <td className="border border-black py-1 font-extrabold">{totalExpUp.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. Bottom Total Days, Expenditure & Signature */}
      <div className="mt-4 flex justify-between items-start text-[11px] font-sans">
        <div className="space-y-3 pt-1">
          <div id="cdma2-total-days" className="font-bold text-black text-xs">
            <span>Total </span>
            <span className="font-mono underline font-bold">{summary.totalServingDays}</span>
            <span> days</span>
          </div>
          <div id="cdma2-overall-expenditure" className="font-bold text-black text-xs">
            <div>Expenditure:</div>
            <div className="font-mono text-sm underline mt-0.5 font-bold">
              Rs. {overallExp.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div id="cdma2-signature-section" className="text-center w-72 pt-4">
          <div className="h-10"></div>
          <div className="border-t border-black pt-1 font-bold text-[10px]">
            Signature of the Head of the Institution
          </div>
          <div className="text-[9px] text-slate-700">
            {schoolProfile.headTeacherName || ''}
          </div>
        </div>
      </div>
    </div>
  );
});

Cdma2Report.displayName = 'Cdma2Report';
