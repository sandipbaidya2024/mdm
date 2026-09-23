import React, { useState, useEffect } from 'react';
import type { SchoolProfile } from '../../types/mdm';
import {
  getMonthlyRegisterSheet,
  type MonthlyRegisterSheetData,
} from '../../utils/monthlyRegisterBuilder';
import { triggerReportPrint } from '../../utils/reportPrinter';
import { Cdma1Report } from './Cdma1Report';
import { Cdma2Report } from './Cdma2Report';
import { PmMdcfPage1 } from './PmMdcfPage1';
import { PmMdcfPage2 } from './PmMdcfPage2';
import {
  FileText,
  Calendar,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Layers,
  ChevronDown,
  HeartPulse,
  Printer,
} from 'lucide-react';

interface ReportCenterProps {
  schoolProfile: SchoolProfile;
  initialMonthKey?: string;
  onNavigateToOfficialData?: (year: number, month: number) => void;
}

export const ReportCenter: React.FC<ReportCenterProps> = ({
  schoolProfile,
  initialMonthKey = '2026-01',
  onNavigateToOfficialData,
}) => {
  // Parse year & month from initialMonthKey
  const [initialYear, initialMonth] = initialMonthKey.split('-');
  const [selectedYear, setSelectedYear] = useState<string>(initialYear || schoolProfile.academicYear || '2026');
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth || '01');

  // Currently generated report data
  const [reportData, setReportData] = useState<MonthlyRegisterSheetData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activePageScroll, setActivePageScroll] = useState<number>(1);

  // Computed month key
  const activeMonthKey = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;

  const handlePrintCdma1 = () => {
    triggerReportPrint('cmda1', `CMDA1_${schoolProfile.udiseCode}_${activeMonthKey}`);
  };

  const handlePrintCdma2 = () => {
    triggerReportPrint('cmda2', `CMDA2_${schoolProfile.udiseCode}_${activeMonthKey}`);
  };

  const handlePrintPmMdcf1 = () => {
    triggerReportPrint('pmmdcf1', `PM_MDCF_Page1_${schoolProfile.udiseCode}_${activeMonthKey}`);
  };

  const handlePrintPmMdcf2 = () => {
    triggerReportPrint('pmmdcf2', `PM_MDCF_Page2_${schoolProfile.udiseCode}_${activeMonthKey}`);
  };

  const handlePrintAll = () => {
    triggerReportPrint('all', `MDM_Official_Reports_${schoolProfile.udiseCode}_${activeMonthKey}`);
  };

  const loadReport = async (monthKey: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getMonthlyRegisterSheet(monthKey, schoolProfile);
      setReportData(data);
    } catch (err: any) {
      console.error('Error generating Monthly Report from IndexedDB:', err);
      setErrorMessage(err?.message || 'Failed to load report data from local database.');
    } finally {
      setLoading(false);
    }
  };

  // Generate on initial mount or when year/month changes
  useEffect(() => {
    loadReport(activeMonthKey);
  }, [activeMonthKey, schoolProfile]);

  const scrollToPage = (pageNum: number) => {
    setActivePageScroll(pageNum);
    const element = document.getElementById(`report-page-${pageNum}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Selector Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                <FileText className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  Monthly Report
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official 4-page continuous inspection report preview (CMDA-1, CMDA-2, PM-MDCF Page 1 & 2). Sourced directly from local database records.
                </p>
              </div>
            </div>
          </div>

          {/* Period Status Badge */}
          <div className="flex items-center gap-2">
            {reportData?.isLocked ? (
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Locked Historical Period
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5">
                <Unlock className="w-3.5 h-3.5" />
                Open Period
              </span>
            )}
          </div>
        </div>

        {/* Filter Controls: Academic Year Selector + Month Selector + Generate/View Report */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            {/* Academic Year Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Academic Year:
              </label>
              <select
                id="select-report-year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-emerald-600"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Month:
              </label>
              <select
                id="select-report-month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-emerald-600"
              >
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>

            {/* Generate / View Report Trigger */}
            <button
              type="button"
              id="btn-generate-report"
              onClick={() => loadReport(activeMonthKey)}
              disabled={loading}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Generate / View Report
            </button>

            {onNavigateToOfficialData && (
              <button
                type="button"
                id="btn-go-to-official-data"
                onClick={() => onNavigateToOfficialData(parseInt(selectedYear, 10), parseInt(selectedMonth, 10))}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                title="Input or update official monthly health, inspection and sign-off records for this month"
              >
                <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                Monthly Official Data
              </button>
            )}
          </div>

          {/* Page Jump Shortcuts */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <span className="text-[10px] font-bold text-slate-500 uppercase px-2">Jump to:</span>
            <button
              type="button"
              onClick={() => scrollToPage(1)}
              className="px-2.5 py-1 rounded text-xs font-bold hover:bg-white text-slate-700 transition-all"
            >
              Page 1 (CMDA-1)
            </button>
            <button
              type="button"
              onClick={() => scrollToPage(2)}
              className="px-2.5 py-1 rounded text-xs font-bold hover:bg-white text-slate-700 transition-all"
            >
              Page 2 (CMDA-2)
            </button>
            <button
              type="button"
              onClick={() => scrollToPage(3)}
              className="px-2.5 py-1 rounded text-xs font-bold hover:bg-white text-slate-700 transition-all"
            >
              Page 3 (PM-MDCF 1)
            </button>
            <button
              type="button"
              onClick={() => scrollToPage(4)}
              className="px-2.5 py-1 rounded text-xs font-bold hover:bg-white text-slate-700 transition-all"
            >
              Page 4 (PM-MDCF 2)
            </button>
          </div>
        </div>

        {/* Official Report Print Actions Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Print Options:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Individual Print Buttons */}
            <button
              type="button"
              id="btn-print-cmda1"
              onClick={() => handlePrintCdma1()}
              disabled={!reportData || loading}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              title="Print only Page 1 (CMDA-1 Monthly Report)"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              Print CMDA-1
            </button>

            <button
              type="button"
              id="btn-print-cmda2"
              onClick={() => handlePrintCdma2()}
              disabled={!reportData || loading}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              title="Print only Page 2 (CMDA-2 Expenditure Statement)"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              Print CMDA-2
            </button>

            <button
              type="button"
              id="btn-print-pmmdcf1"
              onClick={() => handlePrintPmMdcf1()}
              disabled={!reportData || loading}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              title="Print only Page 3 (PM-MDCF Page 1)"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              Print PM-MDCF Page 1
            </button>

            <button
              type="button"
              id="btn-print-pmmdcf2"
              onClick={() => handlePrintPmMdcf2()}
              disabled={!reportData || loading}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              title="Print only Page 4 (PM-MDCF Page 2)"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              Print PM-MDCF Page 2
            </button>

            {/* Print All Button */}
            <button
              type="button"
              id="btn-print-all-reports"
              onClick={() => handlePrintAll()}
              disabled={!reportData || loading}
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer ml-1"
              title="Print all four reports consecutively as 4 separate A4 pages"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              Print All (4 Pages)
            </button>
          </div>
        </div>
      </div>

      {/* Visual Indicator: Continuous 4-Page A4 Preview */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-700" />
          <span className="font-semibold text-slate-700">
            Official 4-Page Visual Document Preview
          </span>
          <span className="text-[11px] text-slate-400">
            • A4 Document layout with standardized page margins and boundaries
          </span>
        </div>
        <div className="text-[11px] font-medium text-slate-500">
          Showing Report for: <strong className="text-emerald-800">{reportData?.monthName || activeMonthKey}</strong>
        </div>
      </div>

      {/* Document Container: 4 Continuous A4 Pages */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <span className="text-sm font-semibold text-slate-700">
            Compiling 4-page official Monthly Report from database...
          </span>
        </div>
      ) : errorMessage ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-8 text-center text-xs space-y-2">
          <p className="font-bold">Error Loading Monthly Report</p>
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={() => loadReport(activeMonthKey)}
            className="px-3 py-1.5 bg-rose-700 text-white rounded text-xs font-semibold hover:bg-rose-800"
          >
            Retry
          </button>
        </div>
      ) : !reportData ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500 text-xs">
          No report data found for this period. Click "Generate / View Report" to build.
        </div>
      ) : (
        <div className="space-y-8 flex flex-col items-center bg-slate-100/70 p-4 sm:p-8 rounded-2xl border border-slate-200">
          {/* ======================================================== */}
          {/* PAGE 1: CMDA-1                                           */}
          {/* ======================================================== */}
          <div
            id="report-page-1"
            className="w-full max-w-[1060px] bg-white rounded-lg shadow-md border border-slate-300 overflow-hidden relative"
          >
            {/* Page Header Ribbon */}
            <div className="bg-slate-800 text-white px-4 py-1.5 flex items-center justify-between text-xs font-mono select-none">
              <span className="flex items-center gap-1.5 font-bold">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                PAGE 1 OF 4 — CMDA-1: MONTHLY REPORT OF COOKED MID-DAY MEAL
              </span>
              <span className="text-slate-300 text-[10px]">
                A4 Document Format • Institutional Data Collection Sheet
              </span>
            </div>

            {/* Page 1 Document Content */}
            <div className="p-4 sm:p-6 overflow-x-auto">
              <Cdma1Report data={reportData} />
            </div>

            {/* Page Boundary Marker */}
            <div className="bg-slate-50 border-t border-slate-200 py-1.5 px-4 text-center text-[10px] text-slate-500 font-mono">
              — End of Page 1 (CMDA-1) —
            </div>
          </div>

          {/* ======================================================== */}
          {/* PAGE 2: CMDA-2                                           */}
          {/* ======================================================== */}
          <div
            id="report-page-2"
            className="w-full max-w-[1060px] bg-white rounded-lg shadow-md border border-slate-300 overflow-hidden relative"
          >
            {/* Page Header Ribbon */}
            <div className="bg-slate-800 text-white px-4 py-1.5 flex items-center justify-between text-xs font-mono select-none">
              <span className="flex items-center gap-1.5 font-bold">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                PAGE 2 OF 4 — CMDA-2: MID-DAY MEAL EXPENDITURE (DAILY 31-ROW)
              </span>
              <span className="text-slate-300 text-[10px]">
                A4 Document Format • Daily Attendance & Expenditure Statement
              </span>
            </div>

            {/* Page 2 Document Content */}
            <div className="p-4 sm:p-6 overflow-x-auto">
              <Cdma2Report data={reportData} />
            </div>

            {/* Page Boundary Marker */}
            <div className="bg-slate-50 border-t border-slate-200 py-1.5 px-4 text-center text-[10px] text-slate-500 font-mono">
              — End of Page 2 (CMDA-2) —
            </div>
          </div>

          {/* ======================================================== */}
          {/* PAGE 3: PM-MDCF — Page 1                                 */}
          {/* ======================================================== */}
          <div
            id="report-page-3"
            className="w-full max-w-[1060px] bg-white rounded-lg shadow-md border border-slate-300 overflow-hidden relative"
          >
            {/* Page Header Ribbon */}
            <div className="bg-slate-800 text-white px-4 py-1.5 flex items-center justify-between text-xs font-mono select-none">
              <span className="flex items-center gap-1.5 font-bold">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                PAGE 3 OF 4 — PM-MDCF: MONTHLY DATA CAPTURE FORMAT (PAGE 1)
              </span>
              <span className="text-slate-300 text-[10px]">
                A4 Document Format • Sections 1 to 5 (School, Meals, Fund, CCH, Foodgrains)
              </span>
            </div>

            {/* Page 3 Document Content */}
            <div className="p-4 sm:p-6 overflow-x-auto">
              <PmMdcfPage1 data={reportData} />
            </div>

            {/* Page Boundary Marker */}
            <div className="bg-slate-50 border-t border-slate-200 py-1.5 px-4 text-center text-[10px] text-slate-500 font-mono">
              — End of Page 3 (PM-MDCF Page 1) • Continues on Page 4 —
            </div>
          </div>

          {/* ======================================================== */}
          {/* PAGE 4: PM-MDCF — Page 2                                 */}
          {/* ======================================================== */}
          <div
            id="report-page-4"
            className="w-full max-w-[1060px] bg-white rounded-lg shadow-md border border-slate-300 overflow-hidden relative"
          >
            {/* Page Header Ribbon */}
            <div className="bg-slate-800 text-white px-4 py-1.5 flex items-center justify-between text-xs font-mono select-none">
              <span className="flex items-center gap-1.5 font-bold">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                PAGE 4 OF 4 — PM-MDCF: MONTHLY DATA CAPTURE FORMAT (PAGE 2)
              </span>
              <span className="text-slate-300 text-[10px]">
                A4 Document Format • Sections 6 & 7 (Children Health, School Inspection, Signatures)
              </span>
            </div>

            {/* Page 4 Document Content */}
            <div className="p-4 sm:p-6 overflow-x-auto">
              <PmMdcfPage2 data={reportData} />
            </div>

            {/* Page Boundary Marker */}
            <div className="bg-slate-50 border-t border-slate-200 py-1.5 px-4 text-center text-[10px] text-slate-500 font-mono">
              — End of Page 4 (PM-MDCF Page 2) • Report Complete —
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DEDICATED INVISIBLE PRINT CONTAINER                      */}
      {/* Off-screen/hidden during interactive preview.              */}
      {/* Handled by window.print() + @media print CSS for          */}
      {/* pristine single/multi-page A4 printing.                   */}
      {/* ======================================================== */}
      {reportData && (
        <div
          id="report-center-print-container"
          aria-hidden="true"
        >
          {/* Page 1 / Section 1: CMDA-1 */}
          <div
            id="print-section-cmda1"
            className="report-print-page report-print-page-break p-4 bg-white"
          >
            <Cdma1Report data={reportData} />
          </div>

          {/* Page 2 / Section 2: CMDA-2 */}
          <div
            id="print-section-cmda2"
            className="report-print-page report-print-page-break p-4 bg-white"
          >
            <Cdma2Report data={reportData} />
          </div>

          {/* Page 3 / Section 3: PM-MDCF Page 1 */}
          <div
            id="print-section-pmmdcf1"
            className="report-print-page report-print-page-break p-4 bg-white"
          >
            <PmMdcfPage1 data={reportData} />
          </div>

          {/* Page 4 / Section 4: PM-MDCF Page 2 */}
          <div
            id="print-section-pmmdcf2"
            className="report-print-page report-print-page-last p-4 bg-white"
          >
            <PmMdcfPage2 data={reportData} />
          </div>
        </div>
      )}
    </div>
  );
};
