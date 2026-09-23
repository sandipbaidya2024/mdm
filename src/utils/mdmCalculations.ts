import { db } from '../db/db';
import type {
  SchoolType,
  CategoryKey,
  EnrollmentHistory,
  CookingCostRateHistory,
  RiceRateHistory,
  MonthlyPeriod,
} from '../types/mdm';

export const PRIMARY_CLASSES = ['PP', 'I', 'II', 'III', 'IV', 'V'];
export const HIGHER_SECONDARY_CLASSES = ['V', 'VI', 'VII', 'VIII'];

export function getClassesForSchoolType(schoolType: SchoolType): string[] {
  if (schoolType === 'HIGHER_SECONDARY') {
    return HIGHER_SECONDARY_CLASSES;
  }
  return PRIMARY_CLASSES;
}

export function classifyClassToCategory(className: string, schoolType: SchoolType): CategoryKey {
  if (className === 'PP') return 'PP';
  if (schoolType === 'PRIMARY') {
    if (className === 'V') return 'UPPER_PRIMARY';
    return 'PRIMARY'; // I, II, III, IV
  } else {
    // HIGHER_SECONDARY
    return 'UPPER_PRIMARY'; // V, VI, VII, VIII
  }
}

/**
 * Gets effective enrollment for a specific date (YYYY-MM-DD)
 */
export async function getEffectiveEnrollment(dateStr: string): Promise<Record<string, number>> {
  const records = await db.enrollmentHistory.orderBy('effectiveFrom').toArray();
  // Filter records with effectiveFrom <= dateStr
  const eligible = records.filter((r) => r.effectiveFrom <= dateStr);
  if (eligible.length > 0) {
    // Return latest
    return eligible[eligible.length - 1].enrollments;
  }
  if (records.length > 0) {
    return records[0].enrollments;
  }
  return {};
}

/**
 * Gets effective cooking cost rate for a date
 */
export async function getEffectiveCookingCostRate(dateStr: string): Promise<{ PP: number; PRIMARY: number; UPPER_PRIMARY: number }> {
  const records = await db.cookingCostRateHistory.orderBy('effectiveFrom').toArray();
  const eligible = records.filter((r) => r.effectiveFrom <= dateStr);
  if (eligible.length > 0) {
    return eligible[eligible.length - 1].rates;
  }
  if (records.length > 0) {
    return records[0].rates;
  }
  // Default based on sheet
  return { PP: 6.78, PRIMARY: 6.78, UPPER_PRIMARY: 6.78 };
}

/**
 * Gets effective rice consumption rate (kg per student) for a date
 */
export async function getEffectiveRiceRate(dateStr: string): Promise<{ PP: number; PRIMARY: number; UPPER_PRIMARY: number }> {
  const records = await db.riceRateHistory.orderBy('effectiveFrom').toArray();
  const eligible = records.filter((r) => r.effectiveFrom <= dateStr);
  if (eligible.length > 0) {
    return eligible[eligible.length - 1].ratesKg;
  }
  if (records.length > 0) {
    return records[0].ratesKg;
  }
  // Default based on sheet
  return { PP: 0.1, PRIMARY: 0.1, UPPER_PRIMARY: 0.1 };
}

/**
 * Formats MDM SMS string e.g. "5-60-22" or "-0-"
 */
export function generateMdmSmsCode(pp: number, primary: number, upper: number, isHoliday: boolean): string {
  if (isHoliday || (pp === 0 && primary === 0 && upper === 0)) {
    return '-0-';
  }
  return `${pp}-${primary}-${upper}`;
}

/**
 * Format currency
 */
export function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
}

/**
 * Format kilograms
 */
export function formatKg(val: number): string {
  return (val || 0).toFixed(2) + ' kg';
}

/**
 * Month helpers
 */
export function getMonthKey(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getPreviousMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  let y = parseInt(yearStr, 10);
  let m = parseInt(monthStr, 10) - 1;
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function getNextMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  let y = parseInt(yearStr, 10);
  let m = parseInt(monthStr, 10) + 1;
  if (m > 12) {
    m = 1;
    y += 1;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function formatMonthDisplay(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Gets effective SHG / Cooking Agency details for a specific date (YYYY-MM-DD)
 * Supports effective-dated history so historical reports retain applicable SHG values.
 * Falls back to legacy schoolProfile.shgDetails if no history record exists.
 */
export async function getEffectiveSHG(dateStr: string): Promise<{
  nameOfSHG: string;
  leaderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  numberOfCooks?: number;
  cookHonorariumMonthly?: number;
  cookNames?: string;
}> {
  const records = await db.shgHistory.orderBy('effectiveFrom').toArray();
  const eligible = records.filter((r) => r.effectiveFrom <= dateStr);
  if (eligible.length > 0) {
    const latest = eligible[eligible.length - 1];
    return {
      nameOfSHG: latest.nameOfSHG,
      leaderName: latest.leaderName,
      bankName: latest.bankName,
      accountNumber: latest.accountNumber,
      ifscCode: latest.ifscCode,
      numberOfCooks: latest.numberOfCooks,
      cookHonorariumMonthly: latest.cookHonorariumMonthly,
      cookNames: latest.cookNames,
    };
  }
  if (records.length > 0) {
    const first = records[0];
    return {
      nameOfSHG: first.nameOfSHG,
      leaderName: first.leaderName,
      bankName: first.bankName,
      accountNumber: first.accountNumber,
      ifscCode: first.ifscCode,
      numberOfCooks: first.numberOfCooks,
      cookHonorariumMonthly: first.cookHonorariumMonthly,
      cookNames: first.cookNames,
    };
  }

  // Fallback to school profile shgDetails if present
  const profile = await db.schoolProfile.toCollection().first();
  if (profile?.shgDetails?.nameOfSHG) {
    return {
      nameOfSHG: profile.shgDetails.nameOfSHG,
      leaderName: profile.shgDetails.shgLeaderName,
      bankName: profile.shgDetails.shgBankName,
      accountNumber: profile.shgDetails.shgAccountNumber,
      ifscCode: profile.shgDetails.shgIfscCode,
      numberOfCooks: profile.shgDetails.numberOfCooks,
      cookHonorariumMonthly: profile.shgDetails.cookHonorariumMonthly,
      cookNames: profile.shgDetails.cookNames,
    };
  }

  return {
    nameOfSHG: 'Maa Sarada Swanirbhar Dal',
    numberOfCooks: 2,
    cookHonorariumMonthly: 1500,
  };
}

/**
 * Retrieves month-specific official report data for PM-MDCF Page 2 & related sections.
 * Keyed by monthKey ("YYYY-MM").
 */
export async function getMonthlyOfficialData(monthKey: string): Promise<import('../types/mdm').MonthlyOfficialData | undefined> {
  return await db.monthlyOfficialData.where('monthKey').equals(monthKey).first();
}

/**
 * Upserts month-specific official report data.
 * Changing one month NEVER alters any other month's historical data.
 */
export async function saveMonthlyOfficialData(data: Partial<import('../types/mdm').MonthlyOfficialData> & { monthKey: string; academicYear: string }): Promise<void> {
  const existing = await db.monthlyOfficialData.where('monthKey').equals(data.monthKey).first();
  const [yearStr, monthStr] = data.monthKey.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const now = new Date().toISOString();

  if (existing?.id) {
    await db.monthlyOfficialData.update(existing.id, {
      ...data,
      year: y,
      month: m,
      updatedAt: now,
    });
  } else {
    await db.monthlyOfficialData.add({
      monthKey: data.monthKey,
      academicYear: data.academicYear,
      year: y,
      month: m,
      boysReceivedIga: data.boysReceivedIga ?? null,
      girlsReceivedIga: data.girlsReceivedIga ?? null,
      screenedByRbsk: data.screenedByRbsk ?? null,
      referredByRbsk: data.referredByRbsk ?? null,
      dewormingConducted: data.dewormingConducted ?? null,
      inspectedByDistrictOfficials: data.inspectedByDistrictOfficials ?? null,
      inspectedByRbskTeam: data.inspectedByRbskTeam ?? null,
      inspectedBySmcMembers: data.inspectedBySmcMembers ?? null,
      untowardIncidentsOccurred: data.untowardIncidentsOccurred ?? null,
      smcChairpersonName: data.smcChairpersonName,
      headTeacherName: data.headTeacherName,
      createdAt: now,
      updatedAt: now,
    });
  }
}

/**
 * Calculates current month summary:
 * Opening balance + Allotment Received - Daily Expense = Closing Balance
 */
export async function calculateMonthSummary(monthKey: string) {
  // 1. Get or resolve monthly period
  let period = await db.monthlyPeriods.where('monthKey').equals(monthKey).first();

  // If period not found, try to auto-carry from previous month or defaults
  if (!period) {
    const prevKey = getPreviousMonthKey(monthKey);
    const prevPeriod = await db.monthlyPeriods.where('monthKey').equals(prevKey).first();
    let initialOpeningMoney = { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0 };
    let initialOpeningRice = { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0 };

    if (prevPeriod) {
      // Calculate prev period closing
      const prevSummary = await calculateMonthSummary(prevKey);
      initialOpeningMoney = { ...prevSummary.closingMoney };
      initialOpeningRice = { ...prevSummary.closingRice };
    }

    const [y, m] = monthKey.split('-').map(Number);
    const newPeriod: MonthlyPeriod = {
      monthKey,
      year: y,
      month: m,
      isLocked: false,
      openingMoney: initialOpeningMoney,
      openingRiceKg: initialOpeningRice,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const id = await db.monthlyPeriods.add(newPeriod);
    period = { ...newPeriod, id };
  }

  // 2. Fetch all daily records for this month
  const dailyRecords = await db.dailyAttendance.where('monthKey').equals(monthKey).toArray();

  // 3. Fetch all money and rice transactions for this month
  const moneyTx = await db.moneyTransactions.where('monthKey').equals(monthKey).toArray();
  const riceTx = await db.riceTransactions.where('monthKey').equals(monthKey).toArray();

  // Sum Allotments received
  const allotmentMoney = { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 };
  for (const tx of moneyTx) {
    if (tx.type === 'ALLOTMENT_RECEIVED' || (tx.type === 'ADJUSTMENT' && tx.amount > 0)) {
      allotmentMoney[tx.category] += tx.amount;
      allotmentMoney.total += tx.amount;
    }
  }

  const allotmentRice = { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 };
  for (const tx of riceTx) {
    if (tx.type === 'ALLOTMENT_RECEIVED' || (tx.type === 'ADJUSTMENT' && tx.quantityKg > 0)) {
      allotmentRice[tx.category] += tx.quantityKg;
      allotmentRice.total += tx.quantityKg;
    }
  }

  // Sum Expenses
  const expenseMoney = { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 };
  const expenseRice = { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 };

  // Daily attendance expenses - strictly unique valid Daily Entry dates
  const uniqueServingDates = new Set<string>();
  let totalMealsPP = 0;
  let totalMealsPrimary = 0;
  let totalMealsUpper = 0;

  for (const rec of dailyRecords) {
    const rawTotal =
      typeof rec.totalCount === 'number' && rec.totalCount > 0
        ? rec.totalCount
        : rec.attendance
        ? Object.values(rec.attendance).reduce((acc: number, v) => acc + (Number(v) || 0), 0)
        : 0;

    const isMealServed = rawTotal > 0 || !rec.isHoliday;

    if (isMealServed && rawTotal > 0) {
      uniqueServingDates.add(rec.date);
      totalMealsPP += rec.ppCount || 0;
      totalMealsPrimary += rec.primaryCount || 0;
      totalMealsUpper += rec.upperCount || 0;

      expenseMoney.PP += rec.cookingCostExpense?.PP || 0;
      expenseMoney.PRIMARY += rec.cookingCostExpense?.PRIMARY || 0;
      expenseMoney.UPPER_PRIMARY += rec.cookingCostExpense?.UPPER_PRIMARY || 0;
      expenseMoney.total += rec.cookingCostExpense?.total || 0;

      expenseRice.PP += rec.riceExpenseKg?.PP || 0;
      expenseRice.PRIMARY += rec.riceExpenseKg?.PRIMARY || 0;
      expenseRice.UPPER_PRIMARY += rec.riceExpenseKg?.UPPER_PRIMARY || 0;
      expenseRice.total += rec.riceExpenseKg?.total || 0;
    }
  }

  const totalServingDays = uniqueServingDates.size;

  // Add any direct daily expense transactions or negative adjustments
  for (const tx of moneyTx) {
    if (tx.type === 'DAILY_EXPENSE' || (tx.type === 'ADJUSTMENT' && tx.amount < 0)) {
      const positiveAmt = Math.abs(tx.amount);
      expenseMoney[tx.category] += positiveAmt;
      expenseMoney.total += positiveAmt;
    }
  }
  for (const tx of riceTx) {
    if (tx.type === 'DAILY_EXPENSE' || (tx.type === 'ADJUSTMENT' && tx.quantityKg < 0)) {
      const positiveKg = Math.abs(tx.quantityKg);
      expenseRice[tx.category] += positiveKg;
      expenseRice.total += positiveKg;
    }
  }

  // Calculate Closing Balances
  const closingMoney = {
    PP: period.openingMoney.PP + allotmentMoney.PP - expenseMoney.PP,
    PRIMARY: period.openingMoney.PRIMARY + allotmentMoney.PRIMARY - expenseMoney.PRIMARY,
    UPPER_PRIMARY: period.openingMoney.UPPER_PRIMARY + allotmentMoney.UPPER_PRIMARY - expenseMoney.UPPER_PRIMARY,
    total: 0,
  };
  closingMoney.total = closingMoney.PP + closingMoney.PRIMARY + closingMoney.UPPER_PRIMARY;

  const closingRice = {
    PP: period.openingRiceKg.PP + allotmentRice.PP - expenseRice.PP,
    PRIMARY: period.openingRiceKg.PRIMARY + allotmentRice.PRIMARY - expenseRice.PRIMARY,
    UPPER_PRIMARY: period.openingRiceKg.UPPER_PRIMARY + allotmentRice.UPPER_PRIMARY - expenseRice.UPPER_PRIMARY,
    total: 0,
  };
  closingRice.total = closingRice.PP + closingRice.PRIMARY + closingRice.UPPER_PRIMARY;

  const totalOpeningMoney = period.openingMoney.PP + period.openingMoney.PRIMARY + period.openingMoney.UPPER_PRIMARY;
  const totalOpeningRice = period.openingRiceKg.PP + period.openingRiceKg.PRIMARY + period.openingRiceKg.UPPER_PRIMARY;

  return {
    period,
    totalServingDays,
    attendance: {
      pp: totalMealsPP,
      primary: totalMealsPrimary,
      upper: totalMealsUpper,
      total: totalMealsPP + totalMealsPrimary + totalMealsUpper,
      avgDaily: totalServingDays > 0 ? (totalMealsPP + totalMealsPrimary + totalMealsUpper) / totalServingDays : 0,
    },
    openingMoney: { ...period.openingMoney, total: totalOpeningMoney },
    allotmentMoney,
    expenseMoney,
    closingMoney,
    openingRice: { ...period.openingRiceKg, total: totalOpeningRice },
    allotmentRice,
    expenseRice,
    closingRice,
  };
}

/**
 * Propagate closing balance to the next month's opening balance
 */
export async function syncClosingToNextMonth(currentMonthKey: string) {
  const currentSummary = await calculateMonthSummary(currentMonthKey);
  const nextKey = getNextMonthKey(currentMonthKey);
  const nextPeriod = await db.monthlyPeriods.where('monthKey').equals(nextKey).first();

  const nextOpeningMoney = {
    PP: Number(currentSummary.closingMoney.PP.toFixed(2)),
    PRIMARY: Number(currentSummary.closingMoney.PRIMARY.toFixed(2)),
    UPPER_PRIMARY: Number(currentSummary.closingMoney.UPPER_PRIMARY.toFixed(2)),
  };

  const nextOpeningRice = {
    PP: Number(currentSummary.closingRice.PP.toFixed(2)),
    PRIMARY: Number(currentSummary.closingRice.PRIMARY.toFixed(2)),
    UPPER_PRIMARY: Number(currentSummary.closingRice.UPPER_PRIMARY.toFixed(2)),
  };

  if (nextPeriod) {
    if (!nextPeriod.isLocked) {
      await db.monthlyPeriods.update(nextPeriod.id!, {
        openingMoney: nextOpeningMoney,
        openingRiceKg: nextOpeningRice,
        updatedAt: new Date().toISOString(),
      });
    }
  } else {
    const [y, m] = nextKey.split('-').map(Number);
    await db.monthlyPeriods.add({
      monthKey: nextKey,
      year: y,
      month: m,
      isLocked: false,
      openingMoney: nextOpeningMoney,
      openingRiceKg: nextOpeningRice,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}
