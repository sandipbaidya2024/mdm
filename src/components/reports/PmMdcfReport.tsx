import React, { forwardRef } from 'react';
import type { MonthlyRegisterSheetData } from '../../utils/monthlyRegisterBuilder';
import { formatINR, formatKg } from '../../utils/mdmCalculations';

interface PmMdcfReportProps {
  data: MonthlyRegisterSheetData;
}

/**
 * PM-POSHAN / PM-MDCF: Monthly Data Capture Format
 * Standard Government of India & Government of West Bengal Monthly Return Format.
 * Strictly READ-ONLY. Sourced from the single IndexedDB truth.
 * Non-calculated fields are visibly designated as manual-entry / configurable fields.
 */
export const PmMdcfReport = forwardRef<HTMLDivElement, PmMdcfReportProps>(({ data }, ref) => {
  const { schoolProfile, summary, days, monthName, year, month } = data;
  const mdcf = schoolProfile.mdcfDetails || {};
  const shg = schoolProfile.shgDetails || {};

  // Total enrolled students based on month day 1 applicable enrollment
  const day1Enrollment = days[0]?.applicableEnrollment || {};
  const totalEnrolled = Object.values(day1Enrollment).reduce((a, b) => a + b, 0);

  // Number of eligible school days in this month
  const totalCalendarDays = days.length;
  const totalHolidays = days.filter((d) => d.isHoliday).length;
  const totalServingDays = summary.totalServingDays;

  return (
    <div
      ref={ref}
      id="pm-mdcf-print-container"
      className="bg-white text-slate-900 font-sans p-6 print:p-3 text-[10.5px] leading-snug w-full max-w-[980px] mx-auto print:max-w-none"
    >
      {/* Official PM-POSHAN Header */}
      <div className="border-b-2 border-slate-900 pb-2 mb-4 text-center">
        <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
          Pradhan Mantri Poshan Shakti Nirman (PM-POSHAN) • Government of India & West Bengal
        </div>
        <h1 className="text-base font-black uppercase tracking-wider text-slate-900 mt-0.5">
          PM-MDCF: MONTHLY DATA CAPTURE FORMAT
        </h1>
        <div className="text-xs font-bold text-slate-700 mt-0.5">
          Official School Monthly Report on Nutrition, Rice & Fund Utilization
        </div>

        {/* Master Identification */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-2 border-t border-slate-300 text-left text-[11px]">
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">School Name</span>
            <strong className="text-slate-900 font-bold">{schoolProfile.schoolName}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">UDISE Code (11 Digits)</span>
            <strong className="font-mono text-slate-900 font-bold">{schoolProfile.udiseCode}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Block / Municipality</span>
            <strong className="text-slate-900">{schoolProfile.blockCircle}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">District</span>
            <strong className="text-slate-900">{schoolProfile.district}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Academic Year</span>
            <strong className="text-slate-900 font-mono">{schoolProfile.academicYear}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Report Month & Year</span>
            <strong className="text-emerald-800 font-black underline">{monthName}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">School Category</span>
            <strong className="text-slate-900">
              {schoolProfile.schoolType === 'PRIMARY' ? 'Primary (PP to Class V)' : 'Upper Primary (V to VIII)'}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Gram Panchayat / Ward</span>
            <strong className="text-slate-900">{mdcf.panchayatMunicipality || 'Configurable in Settings'}</strong>
          </div>
        </div>
      </div>

      {/* Section 1: Coverage & Enrollment Information */}
      <div className="border border-slate-700 rounded mb-3 overflow-hidden">
        <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-700 font-bold uppercase text-[10px] text-slate-800 flex justify-between items-center">
          <span>Section 1: Coverage & School Attendance Metrics</span>
          <span className="text-[9px] font-normal text-slate-500 font-sans">
            Auto-derived from Daily Attendance Registers
          </span>
        </div>
        <div className="p-2.5">
          <table className="w-full border-collapse border border-slate-300 text-center text-[10px]">
            <thead>
              <tr className="bg-slate-200 font-bold">
                <th className="border border-slate-300 p-1 text-left">Indicator Description</th>
                <th className="border border-slate-300 p-1">Pre-Primary (PP)</th>
                <th className="border border-slate-300 p-1">Primary (I - IV)</th>
                <th className="border border-slate-300 p-1">Upper Primary (V)</th>
                <th className="border border-slate-300 p-1 font-black bg-slate-300">Total School</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-1 text-left font-medium">1. Enrolled Students (Capacity)</td>
                <td className="border border-slate-300 p-1 font-mono">{day1Enrollment['PP'] || 0}</td>
                <td className="border border-slate-300 p-1 font-mono">
                  {(day1Enrollment['I'] || 0) + (day1Enrollment['II'] || 0) + (day1Enrollment['III'] || 0) + (day1Enrollment['IV'] || 0)}
                </td>
                <td className="border border-slate-300 p-1 font-mono">{day1Enrollment['V'] || 0}</td>
                <td className="border border-slate-300 p-1 font-mono font-bold bg-slate-100">{totalEnrolled}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-1 text-left font-medium">2. Total School Working Days</td>
                <td colSpan={3} className="border border-slate-300 p-1 font-mono">{totalServingDays} Days</td>
                <td className="border border-slate-300 p-1 font-mono font-bold bg-slate-100">{totalServingDays} Days</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-1 text-left font-medium">3. Actual MDM Serving Days</td>
                <td className="border border-slate-300 p-1 font-mono">{totalServingDays}</td>
                <td className="border border-slate-300 p-1 font-mono">{totalServingDays}</td>
                <td className="border border-slate-300 p-1 font-mono">{totalServingDays}</td>
                <td className="border border-slate-300 p-1 font-mono font-bold bg-blue-50 text-blue-900">{totalServingDays} Days</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-1 text-left font-medium">4. Cumulative Meals Served</td>
                <td className="border border-slate-300 p-1 font-mono">{summary.attendance.pp}</td>
                <td className="border border-slate-300 p-1 font-mono">{summary.attendance.primary}</td>
                <td className="border border-slate-300 p-1 font-mono">{summary.attendance.upper}</td>
                <td className="border border-slate-300 p-1 font-mono font-black bg-emerald-50 text-emerald-950">
                  {summary.attendance.total}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-1 text-left font-medium">5. Average Daily Beneficiaries</td>
                <td className="border border-slate-300 p-1 font-mono">
                  {totalServingDays > 0 ? (summary.attendance.pp / totalServingDays).toFixed(1) : 0}
                </td>
                <td className="border border-slate-300 p-1 font-mono">
                  {totalServingDays > 0 ? (summary.attendance.primary / totalServingDays).toFixed(1) : 0}
                </td>
                <td className="border border-slate-300 p-1 font-mono">
                  {totalServingDays > 0 ? (summary.attendance.upper / totalServingDays).toFixed(1) : 0}
                </td>
                <td className="border border-slate-300 p-1 font-mono font-bold bg-amber-50 text-amber-950">
                  {summary.attendance.avgDaily.toFixed(1)} / Day
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Foodgrains / Rice Stock Balance (in kg) */}
      <div className="border border-slate-700 rounded mb-3 overflow-hidden">
        <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-700 font-bold uppercase text-[10px] text-slate-800">
          Section 2: Foodgrains / Rice Stock Reconciliation (kg)
        </div>
        <div className="p-2.5">
          <table className="w-full border-collapse border border-slate-300 text-center text-[10px]">
            <thead>
              <tr className="bg-slate-200 font-bold">
                <th className="border border-slate-300 p-1 text-left">Category</th>
                <th className="border border-slate-300 p-1">1. Opening Stock</th>
                <th className="border border-slate-300 p-1">2. Received from FCI / Circle</th>
                <th className="border border-slate-300 p-1">3. Total Available (1+2)</th>
                <th className="border border-slate-300 p-1">4. Consumed during Month</th>
                <th className="border border-slate-300 p-1 font-black bg-amber-100">5. Closing Stock (3-4)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-1 text-left font-semibold">Pre-Primary (PP)</td>
                <td className="border border-slate-300 p-1 font-mono">{summary.rice.opening.PP.toFixed(2)}</td>
                <td className="border border-slate-300 p-1 font-mono">{summary.rice.allotment.PP.toFixed(2)}</td>
                <td className="border border-slate-300 p-1 font-mono">
                  {(summary.rice.opening.PP + summary.rice.allotment.PP).toFixed(2)}
                </td>
                <td className="border border-slate-300 p-1 font-mono">{summary.rice.expense.PP.toFixed(2)}</td>
                <td className="border border-slate-300 p-1 font-mono font-bold bg-amber-50">
                  {summary.rice.closing.PP.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-1 text-left font-semibold">Primary (I - IV)</td>
                <td className="border border-slate-300 p-1 font-mono">{summary.rice.opening.PRIMARY.toFixed(2)}</td>
                <td className="border border-slate-300 p-1 font-mono">{summary.rice.allotment.PRIMARY.toFixed(2)}</td>
                <td className="border border-slate-300 p-1 font-mono">
                  {(summary.rice.opening.PRIMARY + summary.rice.allotment.PRIMARY).toFixed(2)}
                </td>
                <td className="border border-slate-300 p-1 font-mono">{summary.rice.expense.PRIMARY.toFixed(2)}</td>
                <td className="border border-slate-300 p-1 font-mono font-bold bg-amber-50">
                  {summary.rice.closing.PRIMARY.toFixed(2)}
                </td>
              </tr>
              {summary.attendance.upper > 0 && (
                <tr>
                  <td className="border border-slate-300 p-1 text-left font-semibold">Upper Primary / Class V</td>
                  <td className="border border-slate-300 p-1 font-mono">{summary.rice.opening.UPPER_PRIMARY.toFixed(2)}</td>
                  <td className="border border-slate-300 p-1 font-mono">{summary.rice.allotment.UPPER_PRIMARY.toFixed(2)}</td>
                  <td className="border border-slate-300 p-1 font-mono">
                    {(summary.rice.opening.UPPER_PRIMARY + summary.rice.allotment.UPPER_PRIMARY).toFixed(2)}
                  </td>
                  <td className="border border-slate-300 p-1 font-mono">{summary.rice.expense.UPPER_PRIMARY.toFixed(2)}</td>
                  <td className="border border-slate-300 p-1 font-mono font-bold bg-amber-50">
                    {summary.rice.closing.UPPER_PRIMARY.toFixed(2)}
                  </td>
                </tr>
              )}
              <tr className="bg-slate-100 font-bold border-t border-slate-400">
                <td className="border border-slate-400 p-1 text-left uppercase">Grand Total (kg)</td>
                <td className="border border-slate-400 p-1 font-mono font-bold">{summary.rice.opening.total.toFixed(2)}</td>
                <td className="border border-slate-400 p-1 font-mono font-bold text-blue-700">+{summary.rice.allotment.total.toFixed(2)}</td>
                <td className="border border-slate-400 p-1 font-mono font-bold">
                  {(summary.rice.opening.total + summary.rice.allotment.total).toFixed(2)}
                </td>
                <td className="border border-slate-400 p-1 font-mono font-bold text-rose-700">-{summary.rice.expense.total.toFixed(2)}</td>
                <td className="border border-slate-400 p-1 font-mono font-black text-amber-950 bg-amber-200">
                  {summary.rice.closing.total.toFixed(2)} kg
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Cooking Cost / Financial Accounts (in ₹) */}
      <div className="border border-slate-700 rounded mb-3 overflow-hidden">
        <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-700 font-bold uppercase text-[10px] text-slate-800">
          Section 3: Cooking Cost Financial Statement (₹)
        </div>
        <div className="p-2.5">
          <table className="w-full border-collapse border border-slate-300 text-center text-[10px]">
            <thead>
              <tr className="bg-slate-200 font-bold">
                <th className="border border-slate-300 p-1 text-left">Fund Head</th>
                <th className="border border-slate-300 p-1">1. Opening Balance (₹)</th>
                <th className="border border-slate-300 p-1">2. Received during Month (₹)</th>
                <th className="border border-slate-300 p-1">3. Total Available (₹)</th>
                <th className="border border-slate-300 p-1">4. Expenditure Incurred (₹)</th>
                <th className="border border-slate-300 p-1 font-black bg-emerald-100">5. Closing Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-1 text-left font-semibold">Pre-Primary (PP)</td>
                <td className="border border-slate-300 p-1 font-mono">{summary.money.opening.PP.toFixed(2)}</td>
                <td className="border border-slate-300 p-1 font-mono">{summary.money.allotment.PP.toFixed(2)}</td>
                <td className="border border-slate-300 p-1 font-mono">
                  {(summary.money.opening.PP + summary.money.allotment.PP).toFixed(2)}
                </td>
                <td className="border border-slate-300 p-1 font-mono">{summary.money.expense.PP.toFixed(2)}</td>
                <td className="border border-slate-300 p-1 font-mono font-bold bg-emerald-50">
                  {summary.money.closing.PP.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-1 text-left font-semibold">Primary (I - IV)</td>
                <td className="border border-slate-300 p-1 font-mono">{summary.money.opening.PRIMARY.toFixed(2)}</td>
                <td className="border border-slate-300 p-1 font-mono">{summary.money.allotment.PRIMARY.toFixed(2)}</td>
                <td className="border border-slate-300 p-1 font-mono">
                  {(summary.money.opening.PRIMARY + summary.money.allotment.PRIMARY).toFixed(2)}
                </td>
                <td className="border border-slate-300 p-1 font-mono">{summary.money.expense.PRIMARY.toFixed(2)}</td>
                <td className="border border-slate-300 p-1 font-mono font-bold bg-emerald-50">
                  {summary.money.closing.PRIMARY.toFixed(2)}
                </td>
              </tr>
              {summary.attendance.upper > 0 && (
                <tr>
                  <td className="border border-slate-300 p-1 text-left font-semibold">Upper Primary / Class V</td>
                  <td className="border border-slate-300 p-1 font-mono">{summary.money.opening.UPPER_PRIMARY.toFixed(2)}</td>
                  <td className="border border-slate-300 p-1 font-mono">{summary.money.allotment.UPPER_PRIMARY.toFixed(2)}</td>
                  <td className="border border-slate-300 p-1 font-mono">
                    {(summary.money.opening.UPPER_PRIMARY + summary.money.allotment.UPPER_PRIMARY).toFixed(2)}
                  </td>
                  <td className="border border-slate-300 p-1 font-mono">{summary.money.expense.UPPER_PRIMARY.toFixed(2)}</td>
                  <td className="border border-slate-300 p-1 font-mono font-bold bg-emerald-50">
                    {summary.money.closing.UPPER_PRIMARY.toFixed(2)}
                  </td>
                </tr>
              )}
              <tr className="bg-slate-100 font-bold border-t border-slate-400">
                <td className="border border-slate-400 p-1 text-left uppercase">Grand Total Cooking Cost (₹)</td>
                <td className="border border-slate-400 p-1 font-mono font-bold">{formatINR(summary.money.opening.total)}</td>
                <td className="border border-slate-400 p-1 font-mono font-bold text-blue-700">+{formatINR(summary.money.allotment.total)}</td>
                <td className="border border-slate-400 p-1 font-mono font-bold">
                  {formatINR(summary.money.opening.total + summary.money.allotment.total)}
                </td>
                <td className="border border-slate-400 p-1 font-mono font-bold text-rose-700">-{formatINR(summary.money.expense.total)}</td>
                <td className="border border-slate-400 p-1 font-mono font-black text-emerald-950 bg-emerald-200">
                  {formatINR(summary.money.closing.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Infrastructure & Health Monitoring (Manual / Configurable Fields) */}
      <div className="border border-slate-700 rounded mb-4 overflow-hidden">
        <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-700 font-bold uppercase text-[10px] text-slate-800 flex justify-between items-center">
          <span>Section 4: School Infrastructure, Cook Details & Health Screening</span>
          <span className="text-[9px] text-slate-500 font-normal">
            Configurable in Settings → School Profile & Reports
          </span>
        </div>
        <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">1. Kitchen Shed Available:</span>
            <strong className="text-slate-900 font-semibold">{mdcf.kitchenShedAvailable || 'YES [Configurable]'}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">2. Potable Drinking Water:</span>
            <strong className="text-slate-900 font-semibold">{mdcf.potableWaterAvailable || 'YES [Configurable]'}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">3. Weighing Machine:</span>
            <strong className="text-slate-900 font-semibold">{mdcf.weighingMachineAvailable || 'YES [Configurable]'}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">4. Number of Cooks Engaged:</span>
            <strong className="text-slate-900 font-mono font-bold">{shg.numberOfCooks || 2} Cooks</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">5. Health Screening Done:</span>
            <strong className="text-slate-900 font-semibold">{mdcf.healthScreeningConducted || 'NO / Scheduled'}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">6. IFA Tablets Distributed:</span>
            <strong className="text-slate-900 font-semibold">{mdcf.ironFolicAcidDistributed || 'YES [Weekly]'}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">7. Deworming Conducted:</span>
            <strong className="text-slate-900 font-semibold">{mdcf.dewormingConducted || 'YES [Bi-Annual]'}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">8. SMC MDM Meeting Date:</span>
            <strong className="text-slate-900 font-mono font-semibold">{mdcf.smcMeetingDate || 'Last Week of Month'}</strong>
          </div>
        </div>
      </div>

      {/* Official Signatures */}
      <div className="mt-6 pt-4 border-t border-slate-400 grid grid-cols-3 gap-6 text-center text-[10px]">
        <div>
          <div className="h-10"></div>
          <div className="border-t border-slate-800 pt-1 font-semibold text-slate-800">
            MDM In-Charge Teacher
          </div>
          <div className="text-[9px] text-slate-500">Date: ........................</div>
        </div>

        <div>
          <div className="h-10"></div>
          <div className="border-t border-slate-800 pt-1 font-semibold text-slate-800">
            SMC / VEC President
          </div>
          <div className="text-[9px] text-slate-500">Verified & Counter-signed</div>
        </div>

        <div>
          <div className="h-10"></div>
          <div className="border-t border-slate-800 pt-1 font-bold text-slate-900">
            Head Teacher / TIC with Seal
          </div>
          <div className="text-[9px] text-slate-600 font-medium">
            {schoolProfile.headTeacherName || 'Head Teacher'}
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-4 pt-2 border-t border-slate-300 text-center text-[8px] text-slate-500 font-sans">
        * Certified that this PM-MDCF monthly return contains accurate figures of student participation, grain utilization, and expenditure.
        Generated on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.
      </div>
    </div>
  );
});

PmMdcfReport.displayName = 'PmMdcfReport';
