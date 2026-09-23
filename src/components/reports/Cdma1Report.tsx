import React, { forwardRef } from 'react';
import type { MonthlyRegisterSheetData } from '../../utils/monthlyRegisterBuilder';

interface Cdma1ReportProps {
  data: MonthlyRegisterSheetData;
}

/**
 * PAGE 1: CMDA-1 (EXACT SOURCE FORMAT)
 * Matches the official reference template precisely:
 *
 * TITLE:
 * MONTHLY REPORT OF COOKED MID-DAY MEAL
 * (DATA COLLECTION SHEET AT INSTITUTION LEVEL)
 *
 * HEADER INFORMATION:
 * Name of the Block:          YEAR:
 * Name of the Gram Panchayat: Month:
 * Name of the school:
 *
 * ADMISSION REGISTER SECTION:
 * No. of Children as per Admission Register:
 * PP | Class-I | Class-II | Class-III | Class-IV | CLASS-V | Total
 *
 * SERVING CMDA TABLE:
 * Serving CMDA
 * Number of Children Provided Cooked Mid-Day Meal
 * Columns: Date | PP | Class-I | Class-II | Class-III | Class-IV | Class-V | TOTAL | Menu
 *
 * DAILY ROWS:
 * 1 to 31 (all calendar dates of selected month, Sundays/holidays retained)
 *
 * MONTH TOTAL:
 * Total [number] days
 * PP | Class-I | Class-II | Class-III | Class-IV | Class-V | TOTAL
 *
 * AVERAGE:
 * Average number of children provided Cooked Mid-Day Meal during the month : [value]
 *
 * STOCK SECTION:
 * MONTHLY REPORT OF STOCK OF RICE / CONVERSION COST
 * Columns: Item | Opening Balance | Received During the Month | Total | Utilized During the Month | Closing Balance
 * Rows:
 * A | Opening Balance = B | Received During the Month = C | Total = D = B + C | Utilized During the Month = E | Closing Balance = F = D - E
 * Cash (Rs.)
 * Rice(Kg.)
 *
 * SIGNATURE AREAS:
 * Signature of MDM In-Charge / Teacher
 * Signature of the Head of the Institution with Seal
 */
export const Cdma1Report = forwardRef<HTMLDivElement, Cdma1ReportProps>(({ data }, ref) => {
  const { schoolProfile, days, summary, monthName, year } = data;

  // Enrollment for the month (from day 1 applicable enrollment)
  const day1Enrollment = days[0]?.applicableEnrollment || {};
  const enrollPP = day1Enrollment['PP'] || 0;
  const enrollI = day1Enrollment['I'] || 0;
  const enrollII = day1Enrollment['II'] || 0;
  const enrollIII = day1Enrollment['III'] || 0;
  const enrollIV = day1Enrollment['IV'] || 0;
  const enrollV = day1Enrollment['V'] || 0;
  const totalEnroll = enrollPP + enrollI + enrollII + enrollIII + enrollIV + enrollV;

  // Monthly totals across classes calculated directly from daily attendance data
  let totalPP = 0;
  let totalI = 0;
  let totalII = 0;
  let totalIII = 0;
  let totalIV = 0;
  let totalV = 0;
  let grandTotal = 0;

  days.forEach((d) => {
    if (!d.isHoliday) {
      const p = d.attendance['PP'] || 0;
      const c1 = d.attendance['I'] || 0;
      const c2 = d.attendance['II'] || 0;
      const c3 = d.attendance['III'] || 0;
      const c4 = d.attendance['IV'] || 0;
      const c5 = d.attendance['V'] || 0;

      totalPP += p;
      totalI += c1;
      totalII += c2;
      totalIII += c3;
      totalIV += c4;
      totalV += c5;
      grandTotal += (p + c1 + c2 + c3 + c4 + c5);
    }
  });

  // Rice and Cash figures from data.summary (single IndexedDB source of truth)
  const cashB = summary.money.opening.total;
  const cashC = summary.money.allotment.total;
  const cashD = cashB + cashC;
  const cashE = summary.money.expense.total;
  const cashF = cashD - cashE;

  const riceB = summary.rice.opening.total;
  const riceC = summary.rice.allotment.total;
  const riceD = riceB + riceC;
  const riceE = summary.rice.expense.total;
  const riceF = riceD - riceE;

  return (
    <div
      ref={ref}
      id="cdma1-print-container"
      className="bg-white text-black font-sans p-6 text-[10px] leading-tight w-full max-w-[1020px] mx-auto border border-black shadow-sm"
    >
      {/* ======================================================== */}
      {/* 1. CMDA-1 TITLE                                          */}
      {/* ======================================================== */}
      <div className="text-center font-bold pb-2 mb-2">
        <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider">
          MONTHLY REPORT OF COOKED MID-DAY MEAL
        </h1>
        <h2 className="text-[10.5px] sm:text-xs font-bold uppercase tracking-wide mt-0.5">
          (DATA COLLECTION SHEET AT INSTITUTION LEVEL)
        </h2>
      </div>

      {/* ======================================================== */}
      {/* 2. HEADER INFORMATION                                    */}
      {/* ======================================================== */}
      <div className="border border-black p-2.5 mb-3 text-[10px] font-medium leading-relaxed">
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          <div className="flex justify-between">
            <span className="font-bold">Name of the Block:</span>
            <span className="font-semibold underline uppercase flex-1 ml-2">
              {schoolProfile.blockCircle || '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">YEAR:</span>
            <span className="font-semibold underline flex-1 ml-2">
              {year || schoolProfile.academicYear || '2026'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Name of the Gram Panchayat:</span>
            <span className="font-semibold underline uppercase flex-1 ml-2">
              {schoolProfile.mdcfDetails?.panchayatMunicipality || schoolProfile.blockCircle || '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Month:</span>
            <span className="font-semibold underline uppercase flex-1 ml-2">
              {monthName}
            </span>
          </div>
          <div className="col-span-2 flex justify-between">
            <span className="font-bold whitespace-nowrap">Name of the school:</span>
            <span className="font-semibold underline uppercase flex-1 ml-2">
              {schoolProfile.schoolName}
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. ADMISSION REGISTER SECTION                             */}
      {/* ======================================================== */}
      <div className="mb-3">
        <table className="w-full border-collapse border border-black text-center text-[9.5px]">
          <thead>
            <tr className="bg-slate-100 font-bold">
              <th rowSpan={2} className="border border-black py-1 px-3 text-left w-1/4 leading-snug">
                No. of Children as per<br />Admission Register:
              </th>
              <th className="border border-black py-1 px-2">PP</th>
              <th className="border border-black py-1 px-2">Class-I</th>
              <th className="border border-black py-1 px-2">Class-II</th>
              <th className="border border-black py-1 px-2">Class-III</th>
              <th className="border border-black py-1 px-2">Class-IV</th>
              <th className="border border-black py-1 px-2">CLASS-V</th>
              <th className="border border-black py-1 px-2 bg-slate-200">Total</th>
            </tr>
            <tr className="font-mono font-bold">
              <td className="border border-black py-1">{enrollPP}</td>
              <td className="border border-black py-1">{enrollI}</td>
              <td className="border border-black py-1">{enrollII}</td>
              <td className="border border-black py-1">{enrollIII}</td>
              <td className="border border-black py-1">{enrollIV}</td>
              <td className="border border-black py-1">{enrollV}</td>
              <td className="border border-black py-1 bg-slate-100 font-extrabold">{totalEnroll}</td>
            </tr>
          </thead>
        </table>
      </div>

      {/* ======================================================== */}
      {/* 4. SERVING CMDA TABLE                                     */}
      {/* ======================================================== */}
      <div className="mb-2">
        <table className="w-full border-collapse border border-black text-center text-[9px]">
          <thead>
            <tr className="bg-slate-100 font-bold">
              <th colSpan={9} className="border border-black py-0.5 uppercase tracking-wide text-[9.5px]">
                Serving CMDA
                <br />
                <span className="font-semibold text-[8.5px] lowercase">
                  (Number of Children Provided Cooked Mid-Day Meal)
                </span>
              </th>
            </tr>
            <tr className="bg-slate-100 font-bold text-[8.5px]">
              <th className="border border-black py-1 px-1 w-12">Date</th>
              <th className="border border-black py-1 px-1 w-14">PP</th>
              <th className="border border-black py-1 px-1 w-14">Class-I</th>
              <th className="border border-black py-1 px-1 w-14">Class-II</th>
              <th className="border border-black py-1 px-1 w-14">Class-III</th>
              <th className="border border-black py-1 px-1 w-14">Class-IV</th>
              <th className="border border-black py-1 px-1 w-14">Class-V</th>
              <th className="border border-black py-1 px-1 w-16 bg-slate-200 font-black">TOTAL</th>
              <th className="border border-black py-1 px-2 text-left">Menu</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {days.map((row) => {
              const p = row.attendance['PP'] || 0;
              const c1 = row.attendance['I'] || 0;
              const c2 = row.attendance['II'] || 0;
              const c3 = row.attendance['III'] || 0;
              const c4 = row.attendance['IV'] || 0;
              const c5 = row.attendance['V'] || 0;
              const dayTotal = row.isHoliday ? 0 : (p + c1 + c2 + c3 + c4 + c5);

              return (
                <tr
                  key={row.date}
                  className={row.isHoliday ? 'bg-slate-50 text-slate-500' : 'hover:bg-slate-50'}
                >
                  <td className="border border-black py-0.5 font-bold font-sans">{row.dayNumber}</td>
                  <td className="border border-black py-0.5">{row.isHoliday ? '-' : p}</td>
                  <td className="border border-black py-0.5">{row.isHoliday ? '-' : c1}</td>
                  <td className="border border-black py-0.5">{row.isHoliday ? '-' : c2}</td>
                  <td className="border border-black py-0.5">{row.isHoliday ? '-' : c3}</td>
                  <td className="border border-black py-0.5">{row.isHoliday ? '-' : c4}</td>
                  <td className="border border-black py-0.5">{row.isHoliday ? '-' : c5}</td>
                  <td className="border border-black py-0.5 font-bold bg-slate-100">{dayTotal}</td>
                  <td className="border border-black py-0.5 px-2 text-left font-sans text-[8.5px] truncate max-w-[200px]">
                    {row.isHoliday ? (row.holidayReason || 'Sunday / Holiday') : row.menuItem}
                  </td>
                </tr>
              );
            })}

            {/* ======================================================== */}
            {/* MONTH TOTAL ROW                                          */}
            {/* ======================================================== */}
            <tr className="bg-slate-200 font-bold border-t-2 border-black text-black">
              <td className="border border-black py-1 text-center font-sans text-[9px] font-bold">
                Total {summary.totalServingDays} days
              </td>
              <td className="border border-black py-1 font-extrabold">{totalPP}</td>
              <td className="border border-black py-1 font-extrabold">{totalI}</td>
              <td className="border border-black py-1 font-extrabold">{totalII}</td>
              <td className="border border-black py-1 font-extrabold">{totalIII}</td>
              <td className="border border-black py-1 font-extrabold">{totalIV}</td>
              <td className="border border-black py-1 font-extrabold">{totalV}</td>
              <td className="border border-black py-1 bg-slate-300 font-black">{grandTotal}</td>
              <td className="border border-black py-1 text-left px-2 font-sans text-[8.5px] text-slate-600">
                —
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ======================================================== */}
      {/* 5. AVERAGE SECTION                                       */}
      {/* ======================================================== */}
      <div className="py-1.5 px-3 border border-black mb-3 bg-slate-50 text-[10px] font-semibold flex items-center justify-between">
        <div>
          <span>Average number of children provided Cooked Mid-Day Meal during the month : </span>
          <strong className="underline font-mono font-bold text-xs ml-1">
            {summary.attendance.avgDaily.toFixed(2)}
          </strong>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 6. STOCK SECTION                                         */}
      {/* ======================================================== */}
      <div className="mb-4">
        <div className="text-[10px] font-bold uppercase mb-1 text-center border-b border-black pb-0.5">
          MONTHLY REPORT OF STOCK OF RICE / CONVERSION COST
        </div>
        <table className="w-full border-collapse border border-black text-center text-[9px]">
          <thead>
            {/* Header Tier 1: Column Names */}
            <tr className="bg-slate-100 font-bold">
              <th className="border border-black py-1 px-2 text-left w-28">Item</th>
              <th className="border border-black py-1 px-2">Opening Balance</th>
              <th className="border border-black py-1 px-2 leading-tight">
                Received<br />During the Month
              </th>
              <th className="border border-black py-1 px-2">Total</th>
              <th className="border border-black py-1 px-2 leading-tight">
                Utilized<br />During the Month
              </th>
              <th className="border border-black py-1 px-2 font-black">Closing Balance</th>
            </tr>
            {/* Header Tier 2: Reference Formula Row (A, B, C, D = B + C, E, F = D - E) */}
            <tr className="bg-slate-50 font-sans text-[8px] text-slate-700 italic border-b border-black">
              <th className="border border-black py-0.5 px-2 text-left">A</th>
              <th className="border border-black py-0.5 px-2">Opening Balance = B</th>
              <th className="border border-black py-0.5 px-2">Received During the Month = C</th>
              <th className="border border-black py-0.5 px-2">Total = D = B + C</th>
              <th className="border border-black py-0.5 px-2">Utilized During the Month = E</th>
              <th className="border border-black py-0.5 px-2">Closing Balance = F = D - E</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            <tr>
              <td className="border border-black py-1 px-2 text-left font-sans font-bold">
                Cash (Rs.)
              </td>
              <td className="border border-black py-1 px-2">{cashB.toFixed(2)}</td>
              <td className="border border-black py-1 px-2">{cashC.toFixed(2)}</td>
              <td className="border border-black py-1 px-2 font-bold">{cashD.toFixed(2)}</td>
              <td className="border border-black py-1 px-2">{cashE.toFixed(2)}</td>
              <td className="border border-black py-1 px-2 font-black bg-slate-50">{cashF.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="border border-black py-1 px-2 text-left font-sans font-bold">
                Rice(Kg.)
              </td>
              <td className="border border-black py-1 px-2">{riceB.toFixed(2)}</td>
              <td className="border border-black py-1 px-2">{riceC.toFixed(2)}</td>
              <td className="border border-black py-1 px-2 font-bold">{riceD.toFixed(2)}</td>
              <td className="border border-black py-1 px-2">{riceE.toFixed(2)}</td>
              <td className="border border-black py-1 px-2 font-black bg-slate-50">{riceF.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ======================================================== */}
      {/* 7. SIGNATURE AREAS                                       */}
      {/* ======================================================== */}
      <div className="mt-8 pt-4 grid grid-cols-2 gap-8 text-center text-[10px]">
        <div>
          <div className="h-10"></div>
          <div className="border-t border-black pt-1 font-semibold">
            Signature of MDM In-Charge / Teacher
          </div>
        </div>
        <div>
          <div className="h-10"></div>
          <div className="border-t border-black pt-1 font-bold">
            Signature of the Head of the Institution with Seal
          </div>
          <div className="text-[9px] text-slate-700">
            {schoolProfile.headTeacherName || 'Head Teacher'}
          </div>
        </div>
      </div>
    </div>
  );
});

Cdma1Report.displayName = 'Cdma1Report';
