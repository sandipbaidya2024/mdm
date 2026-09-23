import React, { useState } from 'react';
import { db } from '../db/db';
import type { SchoolType, SchoolProfile } from '../types/mdm';
import { PRIMARY_CLASSES, HIGHER_SECONDARY_CLASSES } from '../utils/mdmCalculations';
import { Building2, Calendar, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface SetupWizardProps {
  onComplete: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState<number>(1);
  const [schoolType, setSchoolType] = useState<SchoolType>('PRIMARY');
  const [profile, setProfile] = useState({
    schoolName: '',
    udiseCode: '',
    academicYear: '2026',
    district: '',
    blockCircle: '',
    address: '',
    headTeacherName: '',
    contactNumber: '',
  });

  // Start Date Option
  const [startOption, setStartOption] = useState<'CURRENT_MONTH' | 'NEXT_MONTH' | 'CUSTOM'>('CURRENT_MONTH');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-01-01');

  // Initial Enrollment
  const [enrollments, setEnrollments] = useState<Record<string, number>>({
    PP: 6,
    I: 16,
    II: 14,
    III: 20,
    IV: 19,
    V: 20,
  });

  // Initial Rates
  const [cookingCostRates, setCookingCostRates] = useState({
    PP: 6.78,
    PRIMARY: 6.78,
    UPPER_PRIMARY: 6.78,
  });
  const [riceRatesKg, setRiceRatesKg] = useState({
    PP: 0.1,
    PRIMARY: 0.1,
    UPPER_PRIMARY: 0.1,
  });

  // Initial Balances
  const [openingMoney, setOpeningMoney] = useState({
    PP: 4894.51,
    PRIMARY: 22611.71,
    UPPER_PRIMARY: 8063.61,
  });
  const [openingRice, setOpeningRice] = useState({
    PP: 26.9,
    PRIMARY: 90.02,
    UPPER_PRIMARY: 76.7,
  });

  const activeClasses = schoolType === 'PRIMARY' ? PRIMARY_CLASSES : HIGHER_SECONDARY_CLASSES;

  const handleSchoolTypeChange = (type: SchoolType) => {
    setSchoolType(type);
    if (type === 'PRIMARY') {
      setEnrollments({ PP: 6, I: 16, II: 14, III: 20, IV: 19, V: 20 });
    } else {
      setEnrollments({ V: 25, VI: 30, VII: 35, VIII: 30 });
    }
  };

  const calculateEffectiveStartDate = () => {
    const today = new Date();
    if (startOption === 'CURRENT_MONTH') {
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}-01`;
    }
    if (startOption === 'NEXT_MONTH') {
      let y = today.getFullYear();
      let m = today.getMonth() + 2;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      return `${y}-${String(m).padStart(2, '0')}-01`;
    }
    return customStartDate;
  };

  const handleCompleteSetup = async () => {
    const effectiveStartDate = calculateEffectiveStartDate();
    const [yStr, mStr] = effectiveStartDate.split('-');
    const initialMonthKey = `${yStr}-${mStr}`;

    const newProfile: SchoolProfile = {
      schoolName: profile.schoolName.trim() || 'Joypur Primary School',
      udiseCode: profile.udiseCode.trim() || '19181204401',
      schoolType,
      academicYear: profile.academicYear.trim() || '2026',
      district: profile.district.trim() || 'South 24 Parganas',
      blockCircle: profile.blockCircle.trim() || 'Joypur Circle',
      address: profile.address.trim() || 'Vill & P.O. - Joypur, West Bengal',
      headTeacherName: profile.headTeacherName.trim() || 'Teacher-in-Charge',
      contactNumber: profile.contactNumber.trim() || '',
      startDate: effectiveStartDate,
      isSetupComplete: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.transaction(
      'rw',
      [
        db.schoolProfile,
        db.enrollmentHistory,
        db.cookingCostRateHistory,
        db.riceRateHistory,
        db.monthlyPeriods,
      ],
      async () => {
        await db.schoolProfile.clear();
        await db.schoolProfile.add(newProfile);

        // Add Initial Enrollment History
        await db.enrollmentHistory.add({
          effectiveFrom: effectiveStartDate,
          enrollments,
          note: 'Setup baseline enrollment',
          createdAt: new Date().toISOString(),
        });

        // Add Initial Cooking Cost Rates
        await db.cookingCostRateHistory.add({
          effectiveFrom: effectiveStartDate,
          rates: cookingCostRates,
          note: 'Initial government cooking cost rate',
          createdAt: new Date().toISOString(),
        });

        // Add Initial Rice Rates
        await db.riceRateHistory.add({
          effectiveFrom: effectiveStartDate,
          ratesKg: riceRatesKg,
          note: 'Initial government rice consumption norm',
          createdAt: new Date().toISOString(),
        });

        // Add Starting Monthly Period
        await db.monthlyPeriods.put({
          monthKey: initialMonthKey,
          year: parseInt(yStr, 10),
          month: parseInt(mStr, 10),
          isLocked: false,
          openingMoney,
          openingRiceKg: openingRice,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    );

    onComplete();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-3xl w-full rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-700 text-white p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 bg-emerald-600/60 rounded-lg text-emerald-100">
              <Building2 className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">MDM Management System Setup</h1>
              <p className="text-emerald-100 text-sm">West Bengal Mid-Day Meal (PM POSHAN) Offline Register</p>
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="flex items-center gap-2 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-all ${
                  i === step ? 'bg-amber-400' : i < step ? 'bg-emerald-300' : 'bg-emerald-800'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-emerald-200 mt-2 font-medium">
            <span>1. School Type</span>
            <span>2. School Profile</span>
            <span>3. Starting Date & Rates</span>
            <span>4. Initial Balances</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* STEP 1: School Type */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Select Your School Type</h2>
                <p className="text-sm text-slate-500">
                  This determines the exact classes and category groups used throughout attendance and registers.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div
                  id="select-primary-type"
                  onClick={() => handleSchoolTypeChange('PRIMARY')}
                  className={`cursor-pointer rounded-xl border-2 p-5 transition-all ${
                    schoolType === 'PRIMARY'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-slate-900 text-base">Primary School</span>
                    {schoolType === 'PRIMARY' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    Covers Pre-Primary (PP), Primary (I to IV), and Class V (Upper Primary).
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRIMARY_CLASSES.map((cls) => (
                      <span key={cls} className="px-2.5 py-0.5 text-xs font-semibold rounded bg-white border border-slate-200 text-slate-700">
                        {cls}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  id="select-higher-secondary-type"
                  onClick={() => handleSchoolTypeChange('HIGHER_SECONDARY')}
                  className={`cursor-pointer rounded-xl border-2 p-5 transition-all ${
                    schoolType === 'HIGHER_SECONDARY'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-slate-900 text-base">Higher Secondary / Upper</span>
                    {schoolType === 'HIGHER_SECONDARY' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    Covers Upper Primary classes: Class V to Class VIII.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {HIGHER_SECONDARY_CLASSES.map((cls) => (
                      <span key={cls} className="px-2.5 py-0.5 text-xs font-semibold rounded bg-white border border-slate-200 text-slate-700">
                        {cls}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Universal West Bengal School Support:</strong> School type, rates, and enrollment are not locked to any single school and can be edited later under Settings.
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: School Profile */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold text-slate-800">School Profile Details</h2>
                <p className="text-sm text-slate-500">Enter your institution details as recognized by the Education Department.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">School Name *</label>
                  <input
                    type="text"
                    id="input-school-name"
                    value={profile.schoolName}
                    onChange={(e) => setProfile({ ...profile, schoolName: e.target.value })}
                    placeholder="e.g. Joypur Primary School"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">UDISE Code *</label>
                  <input
                    type="text"
                    id="input-udise-code"
                    value={profile.udiseCode}
                    onChange={(e) => setProfile({ ...profile, udiseCode: e.target.value })}
                    placeholder="11-digit UDISE Code"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year *</label>
                  <input
                    type="text"
                    id="input-academic-year"
                    value={profile.academicYear}
                    onChange={(e) => setProfile({ ...profile, academicYear: e.target.value })}
                    placeholder="2026"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">District *</label>
                  <input
                    type="text"
                    id="input-district"
                    value={profile.district}
                    onChange={(e) => setProfile({ ...profile, district: e.target.value })}
                    placeholder="e.g. South 24 Parganas"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Block / Circle *</label>
                  <input
                    type="text"
                    id="input-block-circle"
                    value={profile.blockCircle}
                    onChange={(e) => setProfile({ ...profile, blockCircle: e.target.value })}
                    placeholder="e.g. Joypur Circle"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">School Full Address</label>
                  <input
                    type="text"
                    id="input-address"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    placeholder="Village, Post Office, PIN Code"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Head Teacher / In-Charge Name</label>
                  <input
                    type="text"
                    id="input-head-teacher"
                    value={profile.headTeacherName}
                    onChange={(e) => setProfile({ ...profile, headTeacherName: e.target.value })}
                    placeholder="Head Teacher / TIC"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Mobile Number</label>
                  <input
                    type="text"
                    id="input-contact"
                    value={profile.contactNumber}
                    onChange={(e) => setProfile({ ...profile, contactNumber: e.target.value })}
                    placeholder="SMS reporting phone number"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Starting Date & Rates */}
          {step === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Accounting Start Period & Rates</h2>
                <p className="text-sm text-slate-500">
                  Select which date to start maintaining records from, and set the baseline rates.
                </p>
              </div>

              {/* Start Date Option */}
              <div className="bg-slate-100 p-4 rounded-xl space-y-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Starting Accounting Period
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setStartOption('CURRENT_MONTH')}
                    className={`p-3 text-left rounded-lg text-xs font-medium border transition-all ${
                      startOption === 'CURRENT_MONTH'
                        ? 'border-emerald-600 bg-white text-emerald-900 shadow-sm'
                        : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="font-bold">A. 1st Day of Current Month</div>
                    <div className="text-[11px] text-slate-500 mt-1">Start from this month's beginning</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStartOption('NEXT_MONTH')}
                    className={`p-3 text-left rounded-lg text-xs font-medium border transition-all ${
                      startOption === 'NEXT_MONTH'
                        ? 'border-emerald-600 bg-white text-emerald-900 shadow-sm'
                        : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="font-bold">B. 1st Day of Next Month</div>
                    <div className="text-[11px] text-slate-500 mt-1">Prepare upcoming month</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStartOption('CUSTOM')}
                    className={`p-3 text-left rounded-lg text-xs font-medium border transition-all ${
                      startOption === 'CUSTOM'
                        ? 'border-emerald-600 bg-white text-emerald-900 shadow-sm'
                        : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <div className="font-bold">C. Custom Start Date</div>
                    <div className="text-[11px] text-slate-500 mt-1">Select specific date</div>
                  </button>
                </div>

                {startOption === 'CUSTOM' && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Important Notice regarding Custom Date
                    </div>
                    <p className="text-xs text-amber-700 mb-2">
                      Days prior to this date will not be maintained in this app. Ensure your opening balances correspond exactly to this start date.
                    </p>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded border border-amber-300 bg-white text-slate-800 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Initial Enrollment Setup */}
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-2">
                  Class-wise Student Enrollment (Effective from Start Date)
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {activeClasses.map((cls) => (
                    <div key={cls} className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                      <span className="block text-xs font-bold text-slate-700 mb-1">Class {cls}</span>
                      <input
                        type="number"
                        min="0"
                        value={enrollments[cls] ?? 0}
                        onChange={(e) =>
                          setEnrollments({
                            ...enrollments,
                            [cls]: Math.max(0, parseInt(e.target.value, 10) || 0),
                          })
                        }
                        className="w-full text-center py-1 border border-slate-300 rounded font-semibold text-slate-800 text-sm focus:outline-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Rates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="block text-xs font-bold text-slate-800 mb-2">
                    Cooking Cost Rate per Meal (₹)
                  </span>
                  <div className="space-y-2">
                    {schoolType === 'PRIMARY' && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">Pre-Primary (PP):</span>
                        <input
                          type="number"
                          step="0.01"
                          value={cookingCostRates.PP}
                          onChange={(e) => setCookingCostRates({ ...cookingCostRates, PP: parseFloat(e.target.value) || 0 })}
                          className="w-20 px-2 py-1 border border-slate-300 rounded text-right font-mono text-xs"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Primary (I–IV):</span>
                      <input
                        type="number"
                        step="0.01"
                        value={cookingCostRates.PRIMARY}
                        onChange={(e) => setCookingCostRates({ ...cookingCostRates, PRIMARY: parseFloat(e.target.value) || 0 })}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-right font-mono text-xs"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Upper Primary (V / VI–VIII):</span>
                      <input
                        type="number"
                        step="0.01"
                        value={cookingCostRates.UPPER_PRIMARY}
                        onChange={(e) => setCookingCostRates({ ...cookingCostRates, UPPER_PRIMARY: parseFloat(e.target.value) || 0 })}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-right font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="block text-xs font-bold text-slate-800 mb-2">
                    Rice Norm per Meal (kg)
                  </span>
                  <div className="space-y-2">
                    {schoolType === 'PRIMARY' && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">Pre-Primary (PP):</span>
                        <input
                          type="number"
                          step="0.005"
                          value={riceRatesKg.PP}
                          onChange={(e) => setRiceRatesKg({ ...riceRatesKg, PP: parseFloat(e.target.value) || 0 })}
                          className="w-20 px-2 py-1 border border-slate-300 rounded text-right font-mono text-xs"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Primary (I–IV):</span>
                      <input
                        type="number"
                        step="0.005"
                        value={riceRatesKg.PRIMARY}
                        onChange={(e) => setRiceRatesKg({ ...riceRatesKg, PRIMARY: parseFloat(e.target.value) || 0 })}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-right font-mono text-xs"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Upper Primary (V / VI–VIII):</span>
                      <input
                        type="number"
                        step="0.005"
                        value={riceRatesKg.UPPER_PRIMARY}
                        onChange={(e) => setRiceRatesKg({ ...riceRatesKg, UPPER_PRIMARY: parseFloat(e.target.value) || 0 })}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-right font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Initial Opening Balances */}
          {step === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Initial Opening Balances</h2>
                <p className="text-sm text-slate-500">
                  Enter the opening Money and Rice stock balances as of your start period (matching your official school register).
                </p>
              </div>

              {/* Money Opening */}
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <span className="block text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                  Opening Money Balance (₹)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Pre-Primary (PP)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={openingMoney.PP}
                      onChange={(e) => setOpeningMoney({ ...openingMoney, PP: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Primary (I–IV)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={openingMoney.PRIMARY}
                      onChange={(e) => setOpeningMoney({ ...openingMoney, PRIMARY: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Class V / Upper Primary</label>
                    <input
                      type="number"
                      step="0.01"
                      value={openingMoney.UPPER_PRIMARY}
                      onChange={(e) => setOpeningMoney({ ...openingMoney, UPPER_PRIMARY: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Rice Opening */}
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <span className="block text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
                  Opening Rice Stock (in kg)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Pre-Primary (PP) kg</label>
                    <input
                      type="number"
                      step="0.01"
                      value={openingRice.PP}
                      onChange={(e) => setOpeningRice({ ...openingRice, PP: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Primary (I–IV) kg</label>
                    <input
                      type="number"
                      step="0.01"
                      value={openingRice.PRIMARY}
                      onChange={(e) => setOpeningRice({ ...openingRice, PRIMARY: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Class V / Upper Primary kg</label>
                    <input
                      type="number"
                      step="0.01"
                      value={openingRice.UPPER_PRIMARY}
                      onChange={(e) => setOpeningRice({ ...openingRice, UPPER_PRIMARY: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  All balances will seamlessly carry forward month-to-month. You can lock months or record allotments anytime.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-6 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-5 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-white transition-colors"
            >
              Previous
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-6 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 flex items-center gap-2 transition-colors shadow-sm"
            >
              Next Step
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              id="btn-complete-setup"
              onClick={handleCompleteSetup}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 flex items-center gap-2 transition-colors shadow-md"
            >
              Save & Launch MDM Register
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
