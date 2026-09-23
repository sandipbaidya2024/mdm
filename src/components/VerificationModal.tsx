import React, { useState } from 'react';
import type { SchoolProfile } from '../types/mdm';
import { runAllVerificationTests, type TestResult } from '../utils/mdmTestingSuite';
import { CheckCircle2, XCircle, Play, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

interface VerificationModalProps {
  schoolProfile: SchoolProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  schoolProfile,
  isOpen,
  onClose,
}) => {
  const [running, setRunning] = useState<boolean>(false);
  const [results, setResults] = useState<TestResult[] | null>(null);

  if (!isOpen) return null;

  const handleRunTests = async () => {
    setRunning(true);
    try {
      const res = await runAllVerificationTests(schoolProfile);
      setResults(res);
    } finally {
      setRunning(false);
    }
  };

  const allPassed = results && results.every((r) => r.passed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                MDM Accounting & Official Reports Verification (Tests A–H, R1–R6)
              </h3>
              <p className="text-xs text-slate-500">
                Automated tests for monthly continuity, rate isolation, ledger reconciliation & official reports integrity
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {!results ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-3">
              <p className="text-xs text-slate-600">
                Run live verification tests against local IndexedDB to check:
              </p>
              <ul className="text-xs text-slate-500 text-left list-disc list-inside space-y-1 max-w-md mx-auto font-mono">
                <li>Tests 1–3: Attendance, school-day counts & expenditure consistency</li>
                <li>Tests 4–5: Rice & money conservation formulas (Opening + Received - Used = Closing)</li>
                <li>Tests 6–8: Historical rate, enrollment & SHG protection</li>
                <li>Tests 9–10: Monthly official data isolation & locked month protection</li>
                <li>Tests 11–13: Backup/restore integrity, read-only projection & reconciliation</li>
              </ul>
              <button
                type="button"
                id="btn-run-tests"
                onClick={handleRunTests}
                disabled={running}
                className="mt-3 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 mx-auto shadow-sm"
              >
                {running ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executing 13 Integrity Tests...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run All 13 Verification Tests
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                  allPassed
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-rose-50 text-rose-900 border-rose-300'
                }`}
              >
                <span>
                  {allPassed
                    ? '✓ All 13 Integrity Tests Passed: 100% Accounting Rules Preserved'
                    : 'Some scenarios require attention'}
                </span>
                <button
                  type="button"
                  onClick={handleRunTests}
                  className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-[11px]"
                >
                  Re-test
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {results.map((test) => (
                  <div
                    key={test.id}
                    className={`p-3 rounded-xl border text-xs ${
                      test.passed
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-rose-200 bg-rose-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {test.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      )}
                      <strong className="text-slate-800">{test.name}</strong>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600 pl-6 font-mono leading-relaxed">
                      {test.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
