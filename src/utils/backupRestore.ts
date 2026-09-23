import { db } from '../db/db';
import { calculateMonthSummary } from './mdmCalculations';

export interface BackupData {
  version: number;
  exportedAt: string;
  data: {
    schoolProfile: any[];
    enrollmentHistory: any[];
    cookingCostRateHistory: any[];
    riceRateHistory: any[];
    monthlyPeriods: any[];
    riceTransactions: any[];
    moneyTransactions: any[];
    dailyAttendance: any[];
    menuOptions: any[];
    shgHistory?: any[];
    monthlyOfficialData?: any[];
    healthActivityLogs?: any[];
  };
}

export async function exportDatabaseBackup(): Promise<string> {
  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      schoolProfile: await db.schoolProfile.toArray(),
      enrollmentHistory: await db.enrollmentHistory.toArray(),
      cookingCostRateHistory: await db.cookingCostRateHistory.toArray(),
      riceRateHistory: await db.riceRateHistory.toArray(),
      monthlyPeriods: await db.monthlyPeriods.toArray(),
      riceTransactions: await db.riceTransactions.toArray(),
      moneyTransactions: await db.moneyTransactions.toArray(),
      dailyAttendance: await db.dailyAttendance.toArray(),
      menuOptions: await db.menuOptions.toArray(),
      shgHistory: await db.shgHistory.toArray(),
      monthlyOfficialData: await db.monthlyOfficialData.toArray(),
      healthActivityLogs: await db.healthActivityLogs.toArray(),
    },
  };

  return JSON.stringify(backup, null, 2);
}

export async function importDatabaseBackup(jsonString: string): Promise<boolean> {
  try {
    const parsed: BackupData = JSON.parse(jsonString);
    if (!parsed.data) {
      throw new Error('Invalid backup file format.');
    }

    await db.transaction(
      'rw',
      [
        db.schoolProfile,
        db.enrollmentHistory,
        db.cookingCostRateHistory,
        db.riceRateHistory,
        db.monthlyPeriods,
        db.riceTransactions,
        db.moneyTransactions,
        db.dailyAttendance,
        db.menuOptions,
        db.shgHistory,
        db.monthlyOfficialData,
        db.healthActivityLogs,
      ],
      async () => {
        await db.schoolProfile.clear();
        await db.enrollmentHistory.clear();
        await db.cookingCostRateHistory.clear();
        await db.riceRateHistory.clear();
        await db.monthlyPeriods.clear();
        await db.riceTransactions.clear();
        await db.moneyTransactions.clear();
        await db.dailyAttendance.clear();
        await db.menuOptions.clear();
        await db.shgHistory.clear();
        await db.monthlyOfficialData.clear();
        await db.healthActivityLogs.clear();

        if (parsed.data.schoolProfile?.length) await db.schoolProfile.bulkAdd(parsed.data.schoolProfile);
        if (parsed.data.enrollmentHistory?.length) await db.enrollmentHistory.bulkAdd(parsed.data.enrollmentHistory);
        if (parsed.data.cookingCostRateHistory?.length) await db.cookingCostRateHistory.bulkAdd(parsed.data.cookingCostRateHistory);
        if (parsed.data.riceRateHistory?.length) await db.riceRateHistory.bulkAdd(parsed.data.riceRateHistory);
        if (parsed.data.monthlyPeriods?.length) await db.monthlyPeriods.bulkAdd(parsed.data.monthlyPeriods);
        if (parsed.data.riceTransactions?.length) await db.riceTransactions.bulkAdd(parsed.data.riceTransactions);
        if (parsed.data.moneyTransactions?.length) await db.moneyTransactions.bulkAdd(parsed.data.moneyTransactions);
        if (parsed.data.dailyAttendance?.length) await db.dailyAttendance.bulkAdd(parsed.data.dailyAttendance);
        if (parsed.data.menuOptions?.length) await db.menuOptions.bulkAdd(parsed.data.menuOptions);
        if (parsed.data.shgHistory?.length) await db.shgHistory.bulkAdd(parsed.data.shgHistory);
        if (parsed.data.monthlyOfficialData?.length) await db.monthlyOfficialData.bulkAdd(parsed.data.monthlyOfficialData);
        if (parsed.data.healthActivityLogs?.length) await db.healthActivityLogs.bulkAdd(parsed.data.healthActivityLogs);
      }
    );

    return true;
  } catch (err) {
    console.error('Failed to import backup', err);
    throw err;
  }
}

/**
 * Seeds the exact January 2026 data from the user's Google Sheet
 * for immediate verification, demonstration, and offline inspection.
 */
export async function seedGoogleSheetSampleData() {
  await db.transaction(
    'rw',
    [
      db.schoolProfile,
      db.enrollmentHistory,
      db.cookingCostRateHistory,
      db.riceRateHistory,
      db.monthlyPeriods,
      db.riceTransactions,
      db.moneyTransactions,
      db.dailyAttendance,
      db.menuOptions,
    ],
    async () => {
      // 1. School Profile
      await db.schoolProfile.clear();
      await db.schoolProfile.add({
        schoolName: 'Joypur Primary School',
        udiseCode: '19181204401',
        schoolType: 'PRIMARY',
        academicYear: '2026',
        district: 'South 24 Parganas',
        blockCircle: 'Joypur Circle',
        address: 'Vill & P.O. - Joypur, West Bengal',
        headTeacherName: 'Sandip Baidya',
        contactNumber: '9876543210',
        startDate: '2026-01-01',
        isSetupComplete: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 2. Initial Enrollment History (Effective 2026-01-01)
      await db.enrollmentHistory.clear();
      await db.enrollmentHistory.add({
        effectiveFrom: '2026-01-01',
        enrollments: {
          PP: 6,
          I: 16,
          II: 14,
          III: 20,
          IV: 19,
          V: 25, // Notice sheet had attendance up to 23 for class V, enrollment set comfortably
        },
        note: 'Baseline enrollment for Academic Year 2026',
        createdAt: new Date().toISOString(),
      });

      // 3. Rate Histories (Cooking Cost ₹6.78 and Rice 0.100 kg)
      await db.cookingCostRateHistory.clear();
      await db.cookingCostRateHistory.add({
        effectiveFrom: '2026-01-01',
        rates: { PP: 6.78, PRIMARY: 6.78, UPPER_PRIMARY: 6.78 },
        note: 'Initial rates from Google Sheet',
        createdAt: new Date().toISOString(),
      });

      await db.riceRateHistory.clear();
      await db.riceRateHistory.add({
        effectiveFrom: '2026-01-01',
        ratesKg: { PP: 0.1, PRIMARY: 0.1, UPPER_PRIMARY: 0.1 },
        note: 'Initial standard rice norms (100g)',
        createdAt: new Date().toISOString(),
      });

      // 4. Monthly Period: January 2026
      await db.monthlyPeriods.clear();
      await db.monthlyPeriods.add({
        monthKey: '2026-01',
        year: 2026,
        month: 1,
        isLocked: false,
        openingMoney: {
          PP: 4894.51,
          PRIMARY: 22611.71,
          UPPER_PRIMARY: 8063.61,
        },
        openingRiceKg: {
          PP: 26.9,
          PRIMARY: 90.02,
          UPPER_PRIMARY: 76.7,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 5. Rice Allotment received on Jan 1: PP: 50kg, I-IV: 150kg, V: 50kg
      await db.riceTransactions.clear();
      await db.riceTransactions.bulkAdd([
        {
          date: '2026-01-01',
          monthKey: '2026-01',
          category: 'PP',
          quantityKg: 50.0,
          type: 'ALLOTMENT_RECEIVED',
          reference: 'MEMO-2026/01-PP',
          note: 'Circle Rice Allotment Q4',
          createdAt: new Date().toISOString(),
        },
        {
          date: '2026-01-01',
          monthKey: '2026-01',
          category: 'PRIMARY',
          quantityKg: 150.0,
          type: 'ALLOTMENT_RECEIVED',
          reference: 'MEMO-2026/01-PRI',
          note: 'Circle Rice Allotment Q4',
          createdAt: new Date().toISOString(),
        },
        {
          date: '2026-01-01',
          monthKey: '2026-01',
          category: 'UPPER_PRIMARY',
          quantityKg: 50.0,
          type: 'ALLOTMENT_RECEIVED',
          reference: 'MEMO-2026/01-UP',
          note: 'Circle Rice Allotment Q4',
          createdAt: new Date().toISOString(),
        },
      ]);

      await db.moneyTransactions.clear();

      // 6. Daily Attendance records from Sheet (31 days)
      const sheetData = [
        { d: 1, att: null, holiday: true, reason: 'New Year / Holiday', menu: 'ডাল' },
        { d: 2, att: [5, 13, 13, 16, 18, 22], menu: 'সয়াবিন' },
        { d: 3, att: [5, 12, 13, 16, 17, 19], menu: 'খিচুড়ি' },
        { d: 4, att: null, holiday: true, reason: 'Sunday', menu: '' },
        { d: 5, att: [5, 14, 13, 18, 17, 20], menu: 'সয়াবিন' },
        { d: 6, att: [5, 16, 11, 16, 19, 21], menu: 'সবজি' },
        { d: 7, att: [5, 16, 13, 14, 15, 20], menu: 'ডিম, আলু' },
        { d: 8, att: [5, 16, 13, 18, 17, 22], menu: 'ডাল আলু মাখা' },
        { d: 9, att: [5, 14, 12, 16, 15, 23], menu: 'সয়াবিন' },
        { d: 10, att: [5, 16, 14, 20, 16, 18], menu: 'খিচুড়ি' },
        { d: 11, att: null, holiday: true, reason: 'Sunday', menu: '' },
        { d: 12, att: null, holiday: true, reason: 'Swami Vivekananda Jayanti', menu: 'সয়াবিন' },
        { d: 13, att: null, holiday: true, reason: 'Local Holiday', menu: 'সবজি' },
        { d: 14, att: [5, 16, 14, 16, 17, 16], menu: 'ডিম, আলু' },
        { d: 15, att: [5, 16, 13, 17, 16, 18], menu: 'ডাল আলু মাখা' },
        { d: 16, att: [5, 16, 13, 16, 15, 17], menu: 'সয়াবিন' },
        { d: 17, att: [5, 14, 12, 14, 13, 17], menu: 'খিচুড়ি' },
        { d: 18, att: null, holiday: true, reason: 'Sunday', menu: '' },
        { d: 19, att: [5, 14, 11, 17, 13, 16], menu: 'সয়াবিন' },
        { d: 20, att: [5, 13, 10, 15, 14, 17], menu: 'সবজি' },
        { d: 21, att: [5, 15, 12, 17, 14, 15], menu: 'ডিম, আলু' },
        { d: 22, att: null, holiday: true, reason: 'Saraswati Puja prep / holiday', menu: 'ডাল আলু মাখা' },
        { d: 23, att: null, holiday: true, reason: 'Netaji Birthday', menu: 'সয়াবিন' },
        { d: 24, att: [5, 16, 14, 20, 19, 17], menu: 'খিচুড়ি' },
        { d: 25, att: null, holiday: true, reason: 'Sunday', menu: '' },
        { d: 26, att: [5, 8, 7, 8, 5, 13], menu: 'সয়াবিন' }, // Republic day attended special
        { d: 27, att: [5, 11, 10, 17, 14, 14], menu: 'সবজি' },
        { d: 28, att: [5, 13, 11, 17, 16, 15], menu: 'ডিম, আলু' },
        { d: 29, att: [5, 14, 13, 16, 15, 15], menu: 'ডাল আলু মাখা' },
        { d: 30, att: [5, 15, 13, 18, 14, 16], menu: 'সয়াবিন' },
        { d: 31, att: [5, 14, 12, 17, 16, 15], menu: 'খিচুড়ি' },
      ];

      await db.dailyAttendance.clear();
      const recordsToInsert = [];

      for (const item of sheetData) {
        const dateStr = `2026-01-${String(item.d).padStart(2, '0')}`;
        const isHoliday = !!item.holiday || !item.att;

        let ppCount = 0;
        let primaryCount = 0;
        let upperCount = 0;
        let totalCount = 0;
        const attendanceMap: Record<string, number> = {
          PP: 0,
          I: 0,
          II: 0,
          III: 0,
          IV: 0,
          V: 0,
        };

        if (!isHoliday && item.att) {
          const [pp, c1, c2, c3, c4, c5] = item.att;
          attendanceMap.PP = pp;
          attendanceMap.I = c1;
          attendanceMap.II = c2;
          attendanceMap.III = c3;
          attendanceMap.IV = c4;
          attendanceMap.V = c5;

          ppCount = pp;
          primaryCount = c1 + c2 + c3 + c4;
          upperCount = c5;
          totalCount = ppCount + primaryCount + upperCount;
        }

        const cookingCostPP = Number((ppCount * 6.78).toFixed(2));
        const cookingCostPrimary = Number((primaryCount * 6.78).toFixed(2));
        const cookingCostUpper = Number((upperCount * 6.78).toFixed(2));
        const totalCookingCost = Number((cookingCostPP + cookingCostPrimary + cookingCostUpper).toFixed(2));

        const ricePP = Number((ppCount * 0.1).toFixed(2));
        const ricePrimary = Number((primaryCount * 0.1).toFixed(2));
        const riceUpper = Number((upperCount * 0.1).toFixed(2));
        const totalRice = Number((ricePP + ricePrimary + riceUpper).toFixed(2));

        const smsCode = isHoliday || totalCount === 0 ? '-0-' : `${ppCount}-${primaryCount}-${upperCount}`;

        recordsToInsert.push({
          date: dateStr,
          monthKey: '2026-01',
          isHoliday,
          holidayReason: item.reason || '',
          menuItem: item.menu || '',
          attendance: attendanceMap,
          ppCount,
          primaryCount,
          upperCount,
          totalCount,
          smsCode,
          ratesUsed: {
            cookingCost: { PP: 6.78, PRIMARY: 6.78, UPPER_PRIMARY: 6.78 },
            riceKg: { PP: 0.1, PRIMARY: 0.1, UPPER_PRIMARY: 0.1 },
          },
          cookingCostExpense: {
            PP: cookingCostPP,
            PRIMARY: cookingCostPrimary,
            UPPER_PRIMARY: cookingCostUpper,
            total: totalCookingCost,
          },
          riceExpenseKg: {
            PP: ricePP,
            PRIMARY: ricePrimary,
            UPPER_PRIMARY: riceUpper,
            total: totalRice,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      await db.dailyAttendance.bulkAdd(recordsToInsert);
    }
  );
}
