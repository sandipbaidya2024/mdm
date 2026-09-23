import React, { forwardRef } from 'react';
import type { MonthlyRegisterSheetData } from '../../utils/monthlyRegisterBuilder';

interface PmMdcfPage1Props {
  data: MonthlyRegisterSheetData;
}

/**
 * PAGE 3: PM-MDCF – Page 1
 * Exact data-driven reproduction of the official PM-MDCF source form.
 *
 * Section Headings (verbatim source order and terminology):
 * 1. School Details >
 * 2. Meals Availed Status >
 * 3. Fund Details (in Rs.) >
 * 4. Cook Cum Helper Payment Details >
 * 5. food frains Details (in KG.) >
 */
export const PmMdcfPage1 = forwardRef<HTMLDivElement, PmMdcfPage1Props>(({ data }, ref) => {
  const { schoolProfile, summary, days, monthName, year, effectiveSHG } = data;
  const mdcf = schoolProfile.mdcfDetails || {};
  const shg = effectiveSHG || schoolProfile.shgDetails || {};

  // Enrollment breakdown from applicable day 1
  const day1Enrollment = days[0]?.applicableEnrollment || {};
  const enrollPP = day1Enrollment['PP'] || 0;
  const enrollPri =
    (day1Enrollment['I'] || 0) +
    (day1Enrollment['II'] || 0) +
    (day1Enrollment['III'] || 0) +
    (day1Enrollment['IV'] || 0);
  const enrollUp = day1Enrollment['V'] || 0;
  const totalEnroll = enrollPP + enrollPri + enrollUp;

  // Meals Availed
  const mealsPP = summary.attendance.pp;
  const mealsPri = summary.attendance.primary;
  const mealsUp = summary.attendance.upper;

  // Cook Cum Helper Details
  const numberOfCooks = shg.numberOfCooks ?? 2;
  const cookHonorariumMonthly = shg.cookHonorariumMonthly ?? 1500;
  const totalPaymentToCCH = numberOfCooks * cookHonorariumMonthly;

  const leaderName =
    ('leaderName' in shg ? (shg as { leaderName?: string }).leaderName : undefined) ||
    ('shgLeaderName' in shg ? (shg as { shgLeaderName?: string }).shgLeaderName : undefined);

  const configuredCookNames = (shg.cookNames || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const cooksList = Array.from({ length: numberOfCooks }).map((_, idx) => {
    const name =
      configuredCookNames[idx] ||
      (idx === 0 && leaderName ? leaderName : `Cook Cum Helper ${idx + 1}`);
    return {
      slNo: idx + 1,
      name,
      gender: 'Female',
      category: 'OBC',
      payment: 'Bank Transfer',
      amount: cookHonorariumMonthly,
    };
  });

  return (
    <div
      ref={ref}
      id="pm-mdcf-page-1"
      className="bg-white text-black font-sans p-6 text-[9.5px] leading-tight w-full max-w-[1020px] mx-auto border border-black shadow-sm"
    >
      {/* Top Header with MDM Page No. - 5 Box */}
      <div className="relative pb-2 mb-2.5 border-b-2 border-black">
        {/* "MDM Page No. - 5" Box */}
        <div className="absolute right-0 top-0 border-2 border-black px-2.5 py-1 text-center font-bold text-[9.5px] bg-slate-50">
          MDM Page No. - 5
        </div>

        <div className="text-center pr-32 pl-4">
          <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-slate-800">
            PRADHAN MANTRI POSHAN SHAKTI NIRMAN (PM-POSHAN)
          </div>
          <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider mt-0.5">
            MONTHLY DATA CAPTURE FORMAT (PM-MDCF) — PAGE 1
          </h1>
          <div className="text-[9px] text-slate-600 mt-0.5 italic">
            (To be filled by Head of Institution and submitted to Block / Sub-Division / Municipality authority)
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. School Details >                                      */}
      {/* ======================================================== */}
      <div className="mb-2.5 border border-black">
        <div className="bg-slate-200 px-2 py-0.5 font-bold uppercase text-[9.5px] border-b border-black">
          1. School Details &gt;
        </div>
        <table className="w-full border-collapse text-[9px]">
          <tbody>
            <tr className="border-b border-slate-300">
              <td className="border-r border-slate-300 py-1 px-2 font-bold bg-slate-50 w-[18%]">Month-Year</td>
              <td className="border-r border-slate-300 py-1 px-2 w-[32%] font-mono font-bold uppercase">{monthName}-{year}</td>
              <td className="border-r border-slate-300 py-1 px-2 font-bold bg-slate-50 w-[18%]">UDISE Code</td>
              <td className="py-1 px-2 w-[32%] font-mono font-bold">{schoolProfile.udiseCode}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <td className="border-r border-slate-300 py-1 px-2 font-bold bg-slate-50">School Name</td>
              <td className="border-r border-slate-300 py-1 px-2 font-bold uppercase">{schoolProfile.schoolName}</td>
              <td className="border-r border-slate-300 py-1 px-2 font-bold bg-slate-50">Type</td>
              <td className="py-1 px-2">{schoolProfile.schoolType === 'PRIMARY' ? 'Primary' : 'Upper Primary'}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <td className="border-r border-slate-300 py-1 px-2 font-bold bg-slate-50">Category</td>
              <td className="border-r border-slate-300 py-1 px-2">{schoolProfile.schoolType === 'PRIMARY' ? 'Primary with Pre-Primary' : 'Upper Primary'}</td>
              <td className="border-r border-slate-300 py-1 px-2 font-bold bg-slate-50">State</td>
              <td className="py-1 px-2 uppercase">West Bengal</td>
            </tr>
            <tr className="border-b border-slate-300">
              <td className="border-r border-slate-300 py-1 px-2 font-bold bg-slate-50">District</td>
              <td className="border-r border-slate-300 py-1 px-2 uppercase">{schoolProfile.district}</td>
              <td className="border-r border-slate-300 py-1 px-2 font-bold bg-slate-50">Block</td>
              <td className="py-1 px-2 uppercase">{schoolProfile.blockCircle}</td>
            </tr>
            <tr className="border-b border-slate-300">
              <td className="border-r border-slate-300 py-1 px-2 font-bold bg-slate-50">Village</td>
              <td className="border-r border-slate-300 py-1 px-2 uppercase">{mdcf.villageWard || mdcf.panchayatMunicipality || schoolProfile.address || '—'}</td>
              <td className="border-r border-slate-300 py-1 px-2 font-bold bg-slate-50">Kitchen Type</td>
              <td className="py-1 px-2">{mdcf.kitchenShedAvailable === 'NO' ? 'No Kitchen Shed' : 'School Kitchen'}</td>
            </tr>
            <tr>
              <td className="border-r border-slate-300 py-1 px-2 font-bold bg-slate-50">NGO/SHG</td>
              <td className="border-r border-slate-300 py-1 px-2 uppercase font-medium">{shg.nameOfSHG || 'Self Help Group'}</td>
              <td className="border-r border-slate-300 py-1 px-2 font-bold bg-slate-50">Enrollment</td>
              <td className="py-1 px-2 font-mono font-medium">
                Bal Vatika: {enrollPP}, Primary (I-IV): {enrollPri}, Upper: {enrollUp} (Total: {totalEnroll})
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ======================================================== */}
      {/* 2. Meals Availed Status >                                 */}
      {/* ======================================================== */}
      <div className="mb-2.5 border border-black">
        <div className="bg-slate-200 px-2 py-0.5 font-bold uppercase text-[9.5px] border-b border-black">
          2. Meals Availed Status &gt;
        </div>
        <table className="w-full border-collapse border border-black text-center text-[9px]">
          <thead>
            <tr className="bg-slate-100 font-bold">
              <th className="border border-black py-0.5 px-3 text-left w-[46%]"></th>
              <th className="border border-black py-0.5 px-2 w-[18%]">Bal Vatika</th>
              <th className="border border-black py-0.5 px-2 w-[18%]">Primary (I-IV)</th>
              <th className="border border-black py-0.5 px-2 w-[18%]">Upper</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            <tr>
              <td className="border border-black py-1 px-3 text-left font-sans font-medium">
                Number of School Days During the Month
              </td>
              <td className="border border-black py-1 px-2 font-bold">{summary.totalServingDays}</td>
              <td className="border border-black py-1 px-2 font-bold">{summary.totalServingDays}</td>
              <td className="border border-black py-1 px-2 font-bold">{enrollUp > 0 ? summary.totalServingDays : 0}</td>
            </tr>
            <tr>
              <td className="border border-black py-1 px-3 text-left font-sans font-medium">
                Actual Number of Days Mid-Day Meal Served
              </td>
              <td className="border border-black py-1 px-2 font-bold">{summary.totalServingDays}</td>
              <td className="border border-black py-1 px-2 font-bold">{summary.totalServingDays}</td>
              <td className="border border-black py-1 px-2 font-bold">{enrollUp > 0 ? summary.totalServingDays : 0}</td>
            </tr>
            <tr>
              <td className="border border-black py-1 px-3 text-left font-sans font-medium">
                Total Meals Served During the Month
              </td>
              <td className="border border-black py-1 px-2 font-extrabold">{mealsPP}</td>
              <td className="border border-black py-1 px-2 font-extrabold">{mealsPri}</td>
              <td className="border border-black py-1 px-2 font-extrabold">{mealsUp}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ======================================================== */}
      {/* 3. Fund Details (in Rs.) >                                */}
      {/* ======================================================== */}
      <div className="mb-2.5 border border-black">
        <div className="bg-slate-200 px-2 py-0.5 font-bold uppercase text-[9.5px] border-b border-black">
          3. Fund Details (in Rs.) &gt;
        </div>
        <table className="w-full border-collapse border border-black text-center text-[9px]">
          <thead>
            <tr className="bg-slate-100 font-bold">
              <th className="border border-black py-0.5 px-3 text-left w-[36%]">Component</th>
              <th className="border border-black py-0.5 px-2 w-[16%]">Opening Balance</th>
              <th className="border border-black py-0.5 px-2 w-[16%]">Received</th>
              <th className="border border-black py-0.5 px-2 w-[16%]">Expenditure</th>
              <th className="border border-black py-0.5 px-2 w-[16%]">Closing</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            <tr>
              <td className="border border-black py-0.5 px-3 text-left font-sans font-medium">
                Cooking Cost - Bal Vatika (PP)
              </td>
              <td className="border border-black py-0.5 px-2">{summary.money.opening.PP.toFixed(2)}</td>
              <td className="border border-black py-0.5 px-2">{summary.money.allotment.PP.toFixed(2)}</td>
              <td className="border border-black py-0.5 px-2">{summary.money.expense.PP.toFixed(2)}</td>
              <td className="border border-black py-0.5 px-2 font-bold">{summary.money.closing.PP.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="border border-black py-0.5 px-3 text-left font-sans font-medium">
                Cooking Cost - Primary (I-IV)
              </td>
              <td className="border border-black py-0.5 px-2">{summary.money.opening.PRIMARY.toFixed(2)}</td>
              <td className="border border-black py-0.5 px-2">{summary.money.allotment.PRIMARY.toFixed(2)}</td>
              <td className="border border-black py-0.5 px-2">{summary.money.expense.PRIMARY.toFixed(2)}</td>
              <td className="border border-black py-0.5 px-2 font-bold">{summary.money.closing.PRIMARY.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="border border-black py-0.5 px-3 text-left font-sans font-medium">
                Cooking Cost - Upper Primary (V)
              </td>
              <td className="border border-black py-0.5 px-2">{summary.money.opening.UPPER_PRIMARY.toFixed(2)}</td>
              <td className="border border-black py-0.5 px-2">{summary.money.allotment.UPPER_PRIMARY.toFixed(2)}</td>
              <td className="border border-black py-0.5 px-2">{summary.money.expense.UPPER_PRIMARY.toFixed(2)}</td>
              <td className="border border-black py-0.5 px-2 font-bold">{summary.money.closing.UPPER_PRIMARY.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="border border-black py-0.5 px-3 text-left font-sans font-medium">
                Cook Cum Helper
              </td>
              <td className="border border-black py-0.5 px-2">0.00</td>
              <td className="border border-black py-0.5 px-2">{totalPaymentToCCH.toFixed(2)}</td>
              <td className="border border-black py-0.5 px-2">{totalPaymentToCCH.toFixed(2)}</td>
              <td className="border border-black py-0.5 px-2 font-bold">0.00</td>
            </tr>
            <tr>
              <td className="border border-black py-0.5 px-3 text-left font-sans font-medium">
                School Expenses : MME Expenses
              </td>
              <td className="border border-black py-0.5 px-2">0.00</td>
              <td className="border border-black py-0.5 px-2">0.00</td>
              <td className="border border-black py-0.5 px-2">0.00</td>
              <td className="border border-black py-0.5 px-2 font-bold">0.00</td>
            </tr>
            <tr className="bg-slate-50 font-sans">
              <td className="border border-black py-1 px-3 text-left font-semibold">
                Number of School Days During the Month
              </td>
              <td colSpan={4} className="border border-black py-1 px-3 text-left font-semibold">
                <span className="inline-flex items-center gap-4">
                  <span className="flex items-center gap-1 font-bold">
                    <span className="border border-black px-1.5 py-0.5 bg-black text-white text-[8px] font-black">✓</span> Yes
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="border border-black px-1.5 py-0.5 text-[8px]"> </span> No
                  </span>
                  <span className="text-slate-600 font-normal ml-3">
                    (Total Days: <span className="font-mono font-bold text-black">{summary.totalServingDays}</span>)
                  </span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ======================================================== */}
      {/* 4. Cook Cum Helper Payment Details >                     */}
      {/* ======================================================== */}
      <div className="mb-2.5 border border-black">
        <div className="bg-slate-200 px-2 py-0.5 font-bold uppercase text-[9.5px] border-b border-black">
          4. Cook Cum Helper Payment Details &gt;
        </div>
        <table className="w-full border-collapse border border-black text-center text-[9px]">
          <thead>
            <tr className="bg-slate-100 font-bold">
              <th className="border border-black py-0.5 px-2 w-[8%]">Sl. No.</th>
              <th className="border border-black py-0.5 px-3 text-left w-[36%]">Cook Name</th>
              <th className="border border-black py-0.5 px-2 w-[14%]">Gender</th>
              <th className="border border-black py-0.5 px-2 w-[14%]">Category</th>
              <th className="border border-black py-0.5 px-2 w-[14%]">Payment</th>
              <th className="border border-black py-0.5 px-2 w-[14%]">Amount</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {cooksList.map((cook) => (
              <tr key={cook.slNo}>
                <td className="border border-black py-0.5 px-2">{cook.slNo}</td>
                <td className="border border-black py-0.5 px-3 text-left font-sans font-medium uppercase">
                  {cook.name}
                </td>
                <td className="border border-black py-0.5 px-2 font-sans">{cook.gender}</td>
                <td className="border border-black py-0.5 px-2 font-sans">{cook.category}</td>
                <td className="border border-black py-0.5 px-2 font-sans">{cook.payment}</td>
                <td className="border border-black py-0.5 px-2 font-bold">{cook.amount.toFixed(2)}</td>
              </tr>
            ))}
            <tr className="bg-slate-100 font-bold">
              <td colSpan={5} className="border border-black py-0.5 px-3 text-right font-sans">
                Total Payment to CCH:
              </td>
              <td className="border border-black py-0.5 px-2 font-mono font-black">
                {totalPaymentToCCH.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ======================================================== */}
      {/* 5. food frains Details (in KG.) >                        */}
      {/* ======================================================== */}
      <div className="mb-2 border border-black">
        <div className="bg-slate-200 px-2 py-0.5 font-bold uppercase text-[9.5px] border-b border-black">
          5. food frains Details (in KG.) &gt;
        </div>
        <table className="w-full border-collapse border border-black text-center text-[9px]">
          <thead>
            <tr className="bg-slate-100 font-bold">
              <th className="border border-black py-0.5 px-2 w-[18%] text-left">Category</th>
              <th className="border border-black py-0.5 px-2 w-[14%] text-left">Food Item</th>
              <th className="border border-black py-0.5 px-2 w-[17%]">Opening</th>
              <th className="border border-black py-0.5 px-2 w-[17%]">Received During</th>
              <th className="border border-black py-0.5 px-2 w-[17%]">Consumption</th>
              <th className="border border-black py-0.5 px-2 w-[17%]">Closing Balance</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {/* Bal Vatika */}
            <tr>
              <td rowSpan={2} className="border border-black py-0.5 px-2 text-left font-sans font-semibold bg-slate-50 align-middle">
                Bal Vatika
              </td>
              <td className="border border-black py-0.5 px-2 text-left font-sans text-slate-500">Wheat</td>
              <td className="border border-black py-0.5 px-2 text-slate-400">0.000</td>
              <td className="border border-black py-0.5 px-2 text-slate-400">0.000</td>
              <td className="border border-black py-0.5 px-2 text-slate-400">0.000</td>
              <td className="border border-black py-0.5 px-2 text-slate-400">0.000</td>
            </tr>
            <tr>
              <td className="border border-black py-0.5 px-2 text-left font-sans font-medium">Rice</td>
              <td className="border border-black py-0.5 px-2">{summary.rice.opening.PP.toFixed(3)}</td>
              <td className="border border-black py-0.5 px-2">{summary.rice.allotment.PP.toFixed(3)}</td>
              <td className="border border-black py-0.5 px-2">{summary.rice.expense.PP.toFixed(3)}</td>
              <td className="border border-black py-0.5 px-2 font-bold">{summary.rice.closing.PP.toFixed(3)}</td>
            </tr>

            {/* Primary */}
            <tr>
              <td rowSpan={2} className="border border-black py-0.5 px-2 text-left font-sans font-semibold bg-slate-50 align-middle">
                Primary
              </td>
              <td className="border border-black py-0.5 px-2 text-left font-sans text-slate-500">Wheat</td>
              <td className="border border-black py-0.5 px-2 text-slate-400">0.000</td>
              <td className="border border-black py-0.5 px-2 text-slate-400">0.000</td>
              <td className="border border-black py-0.5 px-2 text-slate-400">0.000</td>
              <td className="border border-black py-0.5 px-2 text-slate-400">0.000</td>
            </tr>
            <tr>
              <td className="border border-black py-0.5 px-2 text-left font-sans font-medium">Rice</td>
              <td className="border border-black py-0.5 px-2">{summary.rice.opening.PRIMARY.toFixed(3)}</td>
              <td className="border border-black py-0.5 px-2">{summary.rice.allotment.PRIMARY.toFixed(3)}</td>
              <td className="border border-black py-0.5 px-2">{summary.rice.expense.PRIMARY.toFixed(3)}</td>
              <td className="border border-black py-0.5 px-2 font-bold">{summary.rice.closing.PRIMARY.toFixed(3)}</td>
            </tr>

            {/* Upper Primary */}
            <tr>
              <td rowSpan={2} className="border border-black py-0.5 px-2 text-left font-sans font-semibold bg-slate-50 align-middle">
                Upper Primary
              </td>
              <td className="border border-black py-0.5 px-2 text-left font-sans text-slate-500">Wheat</td>
              <td className="border border-black py-0.5 px-2 text-slate-400">0.000</td>
              <td className="border border-black py-0.5 px-2 text-slate-400">0.000</td>
              <td className="border border-black py-0.5 px-2 text-slate-400">0.000</td>
              <td className="border border-black py-0.5 px-2 text-slate-400">0.000</td>
            </tr>
            <tr>
              <td className="border border-black py-0.5 px-2 text-left font-sans font-medium">Rice</td>
              <td className="border border-black py-0.5 px-2">{summary.rice.opening.UPPER_PRIMARY.toFixed(3)}</td>
              <td className="border border-black py-0.5 px-2">{summary.rice.allotment.UPPER_PRIMARY.toFixed(3)}</td>
              <td className="border border-black py-0.5 px-2">{summary.rice.expense.UPPER_PRIMARY.toFixed(3)}</td>
              <td className="border border-black py-0.5 px-2 font-bold">{summary.rice.closing.UPPER_PRIMARY.toFixed(3)}</td>
            </tr>

            {/* Total Row */}
            <tr className="bg-slate-100 font-bold">
              <td colSpan={2} className="border border-black py-0.5 px-2 text-left font-sans">
                Total Foodgrains (Rice + Wheat)
              </td>
              <td className="border border-black py-0.5 px-2 font-mono">{(summary.rice.opening.total).toFixed(3)}</td>
              <td className="border border-black py-0.5 px-2 font-mono">{(summary.rice.allotment.total).toFixed(3)}</td>
              <td className="border border-black py-0.5 px-2 font-mono">{(summary.rice.expense.total).toFixed(3)}</td>
              <td className="border border-black py-0.5 px-2 font-mono font-black">{(summary.rice.closing.total).toFixed(3)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Page 1 Bottom Footer */}
      <div className="flex justify-between items-center text-[8.5px] text-slate-600 font-medium pt-0.5">
        <span>Report Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        <span className="font-semibold">PM-MDCF Page 1 of 2 (Continued on Page 2)</span>
      </div>
    </div>
  );
});

PmMdcfPage1.displayName = 'PmMdcfPage1';
