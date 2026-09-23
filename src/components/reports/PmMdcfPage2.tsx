import React, { forwardRef } from 'react';
import type { MonthlyRegisterSheetData } from '../../utils/monthlyRegisterBuilder';

interface PmMdcfPage2Props {
  data: MonthlyRegisterSheetData;
}

/**
 * PAGE 4: PM-MDCF – Page 2
 * Authoritative visual and structural reproduction of the official PM-MDCF Page 2 source form.
 *
 * Section Headings & Order:
 * 6. Children Health Status >
 *    Only 4 health fields:
 *    1. No. of children from class 1 to 8 who had received 4 IGA tablets (Boys)
 *    2. No. of children from class 1 to 8 who had received 4 IGA tablets (Girls)
 *    3. No. of children screened by mobile health (RBSK) team
 *    4. No. of children referred by mobile health (RBSK) team
 *
 * 7. School Inspection >
 *    Original structure:
 *    1. Initial inspection question: Whether school inspected during the month ? (Yes/No)
 *    2. By District Officials (Yes/No)
 *    3. By RBSK team (Yes/No)
 *    4. By SMC Members (Yes/No)
 *    5. Number of Untoward Incidents Occurred
 *
 * Signature Area:
 * - Signature of the SMC Chairperson/Gram Pradhan
 * - Signature of the Head of the Institution
 */
export const PmMdcfPage2 = forwardRef<HTMLDivElement, PmMdcfPage2Props>(({ data }, ref) => {
  const { schoolProfile, monthName, year, monthlyOfficialData } = data;
  const mdcfFallback = schoolProfile.mdcfDetails || {};

  // Clean period without duplicate year (e.g. "SEPTEMBER 2026")
  const rawMonthName = data.month
    ? new Date(year, data.month - 1, 1).toLocaleDateString('en-US', { month: 'long' })
    : (monthName || '').replace(new RegExp(`\\s*${year}\\s*`, 'g'), '').trim();
  const displayPeriod = `${rawMonthName.toUpperCase()} ${year}`;

  // Children Health Status (Section 6) values: read from MonthlyOfficialData first
  const boysReceivedIga =
    monthlyOfficialData?.boysReceivedIga !== undefined && monthlyOfficialData?.boysReceivedIga !== null
      ? monthlyOfficialData.boysReceivedIga
      : (mdcfFallback.boysReceivedIga ?? 0);

  const girlsReceivedIga =
    monthlyOfficialData?.girlsReceivedIga !== undefined && monthlyOfficialData?.girlsReceivedIga !== null
      ? monthlyOfficialData.girlsReceivedIga
      : (mdcfFallback.girlsReceivedIga ?? 0);

  const screenedByRbsk =
    monthlyOfficialData?.screenedByRbsk !== undefined && monthlyOfficialData?.screenedByRbsk !== null
      ? monthlyOfficialData.screenedByRbsk
      : (mdcfFallback.screenedByRbsk ?? 0);

  const referredByRbsk =
    monthlyOfficialData?.referredByRbsk !== undefined && monthlyOfficialData?.referredByRbsk !== null
      ? monthlyOfficialData.referredByRbsk
      : (mdcfFallback.referredByRbsk ?? 0);

  // School Inspection (Section 7) values: read from MonthlyOfficialData first
  const districtInspected =
    monthlyOfficialData?.inspectedByDistrictOfficials ??
    mdcfFallback.inspectedByDistrictOfficials ??
    'NO';

  const rbskInspected =
    monthlyOfficialData?.inspectedByRbskTeam ??
    mdcfFallback.inspectedByRbskTeam ??
    'NO';

  const smcInspected =
    monthlyOfficialData?.inspectedBySmcMembers ??
    mdcfFallback.inspectedBySmcMembers ??
    'YES';

  const schoolWasInspected =
    districtInspected === 'YES' || rbskInspected === 'YES' || smcInspected === 'YES';

  const untowardIncidents =
    monthlyOfficialData?.untowardIncidentsOccurred !== undefined &&
    monthlyOfficialData?.untowardIncidentsOccurred !== null
      ? monthlyOfficialData.untowardIncidentsOccurred
      : (mdcfFallback.untowardIncidentsOccurred ?? 0);

  const smcChairperson =
    monthlyOfficialData?.smcChairpersonName ||
    mdcfFallback.smcChairpersonName ||
    '';

  // Authentic Yes/No box renderer
  const renderYesNo = (isYes: boolean) => (
    <span className="inline-flex items-center gap-4 text-[9px]">
      <span className={`inline-flex items-center gap-1.5 ${isYes ? 'font-bold text-black' : 'text-slate-600'}`}>
        <span
          className={`inline-block w-3.5 h-3.5 border border-black text-[9px] leading-none text-center font-black ${
            isYes ? 'bg-black text-white' : 'bg-white text-transparent'
          }`}
        >
          ✓
        </span>{' '}
        Yes
      </span>
      <span className={`inline-flex items-center gap-1.5 ${!isYes ? 'font-bold text-black' : 'text-slate-600'}`}>
        <span
          className={`inline-block w-3.5 h-3.5 border border-black text-[9px] leading-none text-center font-black ${
            !isYes ? 'bg-black text-white' : 'bg-white text-transparent'
          }`}
        >
          ✓
        </span>{' '}
        No
      </span>
    </span>
  );

  return (
    <div
      ref={ref}
      id="pm-mdcf-page-2"
      className="bg-white text-black font-sans p-6 text-[9.5px] leading-tight w-full max-w-[1020px] mx-auto border border-black shadow-sm"
    >
      {/* Top Header with MDM Page No. - 6 Box */}
      <div className="relative pb-2 mb-3 border-b-2 border-black">
        {/* "MDM Page No. - 6" Box */}
        <div className="absolute right-0 top-0 border-2 border-black px-2.5 py-1 text-center font-bold text-[9.5px] bg-slate-50">
          MDM Page No. - 6
        </div>

        <div className="text-center pr-32 pl-4">
          <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-slate-800">
            PRADHAN MANTRI POSHAN SHAKTI NIRMAN (PM-POSHAN)
          </div>
          <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider mt-0.5">
            MONTHLY DATA CAPTURE FORMAT (PM-MDCF) — PAGE 2
          </h1>
          <div className="text-[9px] text-slate-600 mt-0.5 italic">
            (To be filled by Head of Institution and submitted to Block / Sub-Division / Municipality authority)
          </div>
        </div>

        <div className="flex justify-between items-center text-[9.5px] font-bold text-slate-800 pt-2 px-1">
          <span>
            School: <span className="underline uppercase">{schoolProfile.schoolName}</span> ({schoolProfile.udiseCode})
          </span>
          <span>
            Period: <span className="underline uppercase">{displayPeriod}</span>
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 6. Children Health Status >                              */}
      {/* ======================================================== */}
      <div className="mb-4 border border-black">
        <div className="bg-slate-200 px-2 py-1 font-bold uppercase text-[9.5px] border-b border-black">
          6. Children Health Status &gt;
        </div>
        <div className="p-2 text-[9.5px]">
          <table className="w-full border-collapse border border-black text-left text-[9px]">
            <thead>
              <tr className="bg-slate-100 font-bold text-center">
                <th className="border border-black py-1 px-2 w-12">Sl No</th>
                <th className="border border-black py-1 px-3 text-left">Health Indicator Particulars</th>
                <th className="border border-black py-1 px-3 w-32">Number of Children</th>
              </tr>
            </thead>
            <tbody className="font-sans">
              <tr>
                <td className="border border-black py-1 px-2 text-center font-bold">1</td>
                <td className="border border-black py-1 px-3">
                  No. of children from class 1 to 8 who had received 4 IGA tablets (Boys)
                </td>
                <td className="border border-black py-1 px-3 text-center font-mono font-bold">
                  {boysReceivedIga}
                </td>
              </tr>
              <tr>
                <td className="border border-black py-1 px-2 text-center font-bold">2</td>
                <td className="border border-black py-1 px-3">
                  No. of children from class 1 to 8 who had received 4 IGA tablets (Girls)
                </td>
                <td className="border border-black py-1 px-3 text-center font-mono font-bold">
                  {girlsReceivedIga}
                </td>
              </tr>
              <tr>
                <td className="border border-black py-1 px-2 text-center font-bold">3</td>
                <td className="border border-black py-1 px-3">
                  No. of children screened by mobile health (RBSK) team
                </td>
                <td className="border border-black py-1 px-3 text-center font-mono font-bold">
                  {screenedByRbsk}
                </td>
              </tr>
              <tr>
                <td className="border border-black py-1 px-2 text-center font-bold">4</td>
                <td className="border border-black py-1 px-3">
                  No. of children referred by mobile health (RBSK) team
                </td>
                <td className="border border-black py-1 px-3 text-center font-mono font-bold">
                  {referredByRbsk}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 7. School Inspection >                                   */}
      {/* ======================================================== */}
      <div className="mb-4 border border-black">
        <div className="bg-slate-200 px-2 py-1 font-bold uppercase text-[9.5px] border-b border-black">
          7. School Inspection &gt;
        </div>
        <div className="p-2 text-[9.5px]">
          <table className="w-full border-collapse border border-black text-left text-[9px]">
            <tbody>
              <tr className="border-b border-black bg-slate-50">
                <td className="border-r border-black py-1.5 px-3 font-semibold text-slate-900 w-[65%]">
                  Whether school inspected during the month ?
                </td>
                <td className="py-1.5 px-3 text-center w-[35%]">
                  {renderYesNo(schoolWasInspected)}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="border-r border-black py-1.5 px-3 pl-6 font-medium text-slate-800">
                  By District Officials
                </td>
                <td className="py-1.5 px-3 text-center">
                  {renderYesNo(districtInspected === 'YES')}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="border-r border-black py-1.5 px-3 pl-6 font-medium text-slate-800">
                  By RBSK team
                </td>
                <td className="py-1.5 px-3 text-center">
                  {renderYesNo(rbskInspected === 'YES')}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="border-r border-black py-1.5 px-3 pl-6 font-medium text-slate-800">
                  By SMC Members
                </td>
                <td className="py-1.5 px-3 text-center">
                  {renderYesNo(smcInspected === 'YES')}
                </td>
              </tr>
              <tr>
                <td className="border-r border-black py-1.5 px-3 font-semibold text-slate-900">
                  Number of Untoward Incidents Occurred
                </td>
                <td className="py-1.5 px-3 text-center font-mono font-bold">
                  {untowardIncidents}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Certification Note */}
      <div className="text-[8.5px] italic text-slate-700 mt-6 mb-4 border-l-2 border-black pl-2">
        Certified that the Mid-Day Meal information recorded above has been thoroughly checked and verified with the Daily Attendance Register, Cash Book, Rice Stock Ledger, and Cook Honorarium disbursements of the Institution.
      </div>

      {/* ======================================================== */}
      {/* Official Signature Area                                  */}
      {/* ======================================================== */}
      <div className="mt-14 pt-6 grid grid-cols-2 gap-16 text-center text-[10px]">
        <div>
          <div className="h-14"></div>
          <div className="border-t border-black pt-1.5 font-bold uppercase tracking-wide">
            Signature of the SMC Chairperson/Gram Pradhan
          </div>
          {smcChairperson && (
            <div className="text-[9px] text-slate-700 mt-1 font-medium">
              ({smcChairperson})
            </div>
          )}
        </div>

        <div>
          <div className="h-14"></div>
          <div className="border-t border-black pt-1.5 font-bold uppercase tracking-wide">
            Signature of the Head of the Institution
          </div>
          {schoolProfile.headTeacherName && (
            <div className="text-[9px] text-slate-700 mt-1 font-medium">
              ({schoolProfile.headTeacherName})
            </div>
          )}
        </div>
      </div>

      {/* Page 2 Footer */}
      <div className="mt-8 text-right text-[8.5px] text-slate-500 font-mono">
        PM-MDCF Page 2 of 2 • End of Report
      </div>
    </div>
  );
});

PmMdcfPage2.displayName = 'PmMdcfPage2';
