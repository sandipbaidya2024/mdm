import { db } from '../db/db';
import type { SchoolProfile, SchoolType } from '../types/mdm';
import {
  classifyClassToCategory,
  getClassesForSchoolType,
  getEffectiveEnrollment,
  getEffectiveCookingCostRate,
  getEffectiveRiceRate,
  calculateMonthSummary,
  getEffectiveSHG,
  getMonthlyOfficialData,
} from './mdmCalculations';

export interface DayLedgerEntry {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  dayName: string; // Mon, Tue, etc.
  isHoliday: boolean;
  holidayReason?: string;
  menuItem: string;
  smsCode: string;
  // Class attendance
  attendance: Record<string, number>;
  ppCount: number;
  primaryCount: number;
  upperCount: number;
  totalCount: number;
  // Effective limits & rates for this specific date
  applicableEnrollment: Record<string, number>;
  ratesUsed: {
    cookingCost: { PP: number; PRIMARY: number; UPPER_PRIMARY: number };
    riceKg: { PP: number; PRIMARY: number; UPPER_PRIMARY: number };
  };
  // Money Ledger for the day
  money: {
    opening: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
    allotment: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
    expense: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
    closing: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
  };
  // Rice Ledger for the day (kg)
  rice: {
    opening: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
    allotment: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
    expense: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
    closing: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
  };
}

export interface MonthlyRegisterSheetData {
  monthKey: string;
  year: number;
  month: number;
  monthName: string;
  isLocked: boolean;
  schoolProfile: SchoolProfile;
  effectiveSHG?: {
    nameOfSHG: string;
    leaderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    numberOfCooks?: number;
    cookHonorariumMonthly?: number;
    cookNames?: string;
  };
  monthlyOfficialData?: import('../types/mdm').MonthlyOfficialData;
  classes: string[];
  days: DayLedgerEntry[];
  summary: {
    totalServingDays: number;
    attendance: {
      pp: number;
      primary: number;
      upper: number;
      total: number;
      avgDaily: number;
    };
    money: {
      opening: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
      allotment: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
      expense: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
      closing: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
    };
    rice: {
      opening: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
      allotment: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
      expense: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
      closing: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
    };
  };
}

/**
 * Builds the complete day-by-day continuous register for a selected month
 * linking each day's closing strictly as the next day's opening.
 * There is only ONE source of truth: Dexie IndexedDB.
 */
export async function getMonthlyRegisterSheet(
  monthKey: string,
  schoolProfile: SchoolProfile
): Promise<MonthlyRegisterSheetData> {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // 1. Calculate and ensure month summary & initial period
  const monthSummary = await calculateMonthSummary(monthKey);
  const isLocked = !!monthSummary.period.isLocked;

  // 2. Fetch all daily attendance records for this month
  const dailyAttendanceList = await db.dailyAttendance
    .where('monthKey')
    .equals(monthKey)
    .toArray();
  const attendanceMap = new Map<string, any>();
  for (const item of dailyAttendanceList) {
    attendanceMap.set(item.date, item);
  }

  // 3. Fetch all money and rice allotment transactions for this month
  const moneyTxList = await db.moneyTransactions
    .where('monthKey')
    .equals(monthKey)
    .toArray();
  const riceTxList = await db.riceTransactions
    .where('monthKey')
    .equals(monthKey)
    .toArray();

  // 4. Fetch effective SHG for this month (using 1st of month) and official monthly report data
  const firstOfMonthDate = `${monthKey}-01`;
  const effectiveSHG = await getEffectiveSHG(firstOfMonthDate);
  const monthlyOfficialData = await getMonthlyOfficialData(monthKey);

  const classes = getClassesForSchoolType(schoolProfile.schoolType);

  // 4. Determine total days in month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Running Balances initialized with Month Opening Balances
  let currentMoneyOpening = {
    PP: Number(monthSummary.period.openingMoney.PP.toFixed(2)),
    PRIMARY: Number(monthSummary.period.openingMoney.PRIMARY.toFixed(2)),
    UPPER_PRIMARY: Number(monthSummary.period.openingMoney.UPPER_PRIMARY.toFixed(2)),
  };

  let currentRiceOpening = {
    PP: Number(monthSummary.period.openingRiceKg.PP.toFixed(2)),
    PRIMARY: Number(monthSummary.period.openingRiceKg.PRIMARY.toFixed(2)),
    UPPER_PRIMARY: Number(monthSummary.period.openingRiceKg.UPPER_PRIMARY.toFixed(2)),
  };

  const days: DayLedgerEntry[] = [];

  let totalServingDays = 0;
  let totalMealsPP = 0;
  let totalMealsPrimary = 0;
  let totalMealsUpper = 0;

  const totalAllotmentMoney = { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 };
  const totalExpenseMoney = { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 };

  const totalAllotmentRice = { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 };
  const totalExpenseRice = { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 };

  // Loop through every calendar day (1..daysInMonth)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.getDay();
    const isSunday = dayOfWeek === 0;

    // Check existing daily record
    const existingRec = attendanceMap.get(dateStr);

    // Historical effective enrollment and rates for THAT DATE
    const applicableEnrollment = await getEffectiveEnrollment(dateStr);
    const costRates = await getEffectiveCookingCostRate(dateStr);
    const riceRates = await getEffectiveRiceRate(dateStr);

    // Determine if user saved an entry where meal was served
    // The Daily Entry record is the source of truth
    let rawTotal = 0;
    if (existingRec) {
      if (typeof existingRec.totalCount === 'number' && existingRec.totalCount > 0) {
        rawTotal = existingRec.totalCount;
      } else if (existingRec.attendance) {
        rawTotal = Object.values(existingRec.attendance).reduce((acc: number, v) => acc + (Number(v) || 0), 0);
      }
    }

    // A date has valid MDM served if an entry was saved and meals were served (attendance > 0 or marked as working day)
    const isMealServed = existingRec ? (rawTotal > 0 || !existingRec.isHoliday) : false;
    const isHoliday = !isMealServed;
    const holidayReason = existingRec
      ? (isMealServed ? '' : (existingRec.holidayReason || (isSunday ? 'Sunday' : 'Holiday')))
      : (isSunday ? 'Sunday' : '');
    const menuItem = existingRec
      ? (isMealServed ? (existingRec.menuItem || 'Meal Served') : '')
      : '';

    // Attendance numbers
    const attendance: Record<string, number> = {};
    let pp = 0;
    let pri = 0;
    let up = 0;

    classes.forEach((c) => {
      const cnt = existingRec && isMealServed ? (existingRec.attendance?.[c] || 0) : 0;
      attendance[c] = cnt;
      const cat = classifyClassToCategory(c, schoolProfile.schoolType);
      if (cat === 'PP') pp += cnt;
      else if (cat === 'PRIMARY') pri += cnt;
      else if (cat === 'UPPER_PRIMARY') up += cnt;
    });

    const dayTotalStudents = pp + pri + up;

    // Business rule: School-day count = COUNT(unique valid Daily Entry dates)
    // Total meals = SUM(attendance across valid Daily Entry dates)
    if (isMealServed && dayTotalStudents > 0) {
      totalServingDays += 1;
      totalMealsPP += pp;
      totalMealsPrimary += pri;
      totalMealsUpper += up;
    }

    const smsCode = existingRec
      ? existingRec.smsCode
      : isHoliday || dayTotalStudents === 0
      ? '-0-'
      : `${pp}-${pri}-${up}`;

    // Transactions occurring on this day
    const dayMoneyTx = moneyTxList.filter((tx) => tx.date === dateStr);
    const dayRiceTx = riceTxList.filter((tx) => tx.date === dateStr);

    const dayAllotmentMoney = { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 };
    for (const tx of dayMoneyTx) {
      if (tx.type === 'ALLOTMENT_RECEIVED' || (tx.type === 'ADJUSTMENT' && tx.amount > 0)) {
        dayAllotmentMoney[tx.category] += tx.amount;
        dayAllotmentMoney.total += tx.amount;
        totalAllotmentMoney[tx.category] += tx.amount;
        totalAllotmentMoney.total += tx.amount;
      }
    }

    const dayAllotmentRice = { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 };
    for (const tx of dayRiceTx) {
      if (tx.type === 'ALLOTMENT_RECEIVED' || (tx.type === 'ADJUSTMENT' && tx.quantityKg > 0)) {
        dayAllotmentRice[tx.category] += tx.quantityKg;
        dayAllotmentRice.total += tx.quantityKg;
        totalAllotmentRice[tx.category] += tx.quantityKg;
        totalAllotmentRice.total += tx.quantityKg;
      }
    }

    // Daily Expenses
    const dayExpenseMoney = {
      PP: isHoliday ? 0 : Number((pp * costRates.PP).toFixed(2)),
      PRIMARY: isHoliday ? 0 : Number((pri * costRates.PRIMARY).toFixed(2)),
      UPPER_PRIMARY: isHoliday ? 0 : Number((up * costRates.UPPER_PRIMARY).toFixed(2)),
      total: 0,
    };
    dayExpenseMoney.total = Number(
      (dayExpenseMoney.PP + dayExpenseMoney.PRIMARY + dayExpenseMoney.UPPER_PRIMARY).toFixed(2)
    );

    const dayExpenseRice = {
      PP: isHoliday ? 0 : Number((pp * riceRates.PP).toFixed(2)),
      PRIMARY: isHoliday ? 0 : Number((pri * riceRates.PRIMARY).toFixed(2)),
      UPPER_PRIMARY: isHoliday ? 0 : Number((up * riceRates.UPPER_PRIMARY).toFixed(2)),
      total: 0,
    };
    dayExpenseRice.total = Number(
      (dayExpenseRice.PP + dayExpenseRice.PRIMARY + dayExpenseRice.UPPER_PRIMARY).toFixed(2)
    );

    // Sum overall month expenses
    totalExpenseMoney.PP += dayExpenseMoney.PP;
    totalExpenseMoney.PRIMARY += dayExpenseMoney.PRIMARY;
    totalExpenseMoney.UPPER_PRIMARY += dayExpenseMoney.UPPER_PRIMARY;
    totalExpenseMoney.total += dayExpenseMoney.total;

    totalExpenseRice.PP += dayExpenseRice.PP;
    totalExpenseRice.PRIMARY += dayExpenseRice.PRIMARY;
    totalExpenseRice.UPPER_PRIMARY += dayExpenseRice.UPPER_PRIMARY;
    totalExpenseRice.total += dayExpenseRice.total;

    // Daily Closings: Opening + Received - Expense = Closing
    const dayClosingMoney = {
      PP: Number((currentMoneyOpening.PP + dayAllotmentMoney.PP - dayExpenseMoney.PP).toFixed(2)),
      PRIMARY: Number(
        (currentMoneyOpening.PRIMARY + dayAllotmentMoney.PRIMARY - dayExpenseMoney.PRIMARY).toFixed(2)
      ),
      UPPER_PRIMARY: Number(
        (currentMoneyOpening.UPPER_PRIMARY + dayAllotmentMoney.UPPER_PRIMARY - dayExpenseMoney.UPPER_PRIMARY).toFixed(2)
      ),
      total: 0,
    };
    dayClosingMoney.total = Number(
      (dayClosingMoney.PP + dayClosingMoney.PRIMARY + dayClosingMoney.UPPER_PRIMARY).toFixed(2)
    );

    const dayClosingRice = {
      PP: Number((currentRiceOpening.PP + dayAllotmentRice.PP - dayExpenseRice.PP).toFixed(2)),
      PRIMARY: Number(
        (currentRiceOpening.PRIMARY + dayAllotmentRice.PRIMARY - dayExpenseRice.PRIMARY).toFixed(2)
      ),
      UPPER_PRIMARY: Number(
        (currentRiceOpening.UPPER_PRIMARY + dayAllotmentRice.UPPER_PRIMARY - dayExpenseRice.UPPER_PRIMARY).toFixed(2)
      ),
      total: 0,
    };
    dayClosingRice.total = Number(
      (dayClosingRice.PP + dayClosingRice.PRIMARY + dayClosingRice.UPPER_PRIMARY).toFixed(2)
    );

    // Day opening object
    const dayOpeningMoney = {
      ...currentMoneyOpening,
      total: Number(
        (currentMoneyOpening.PP + currentMoneyOpening.PRIMARY + currentMoneyOpening.UPPER_PRIMARY).toFixed(2)
      ),
    };

    const dayOpeningRice = {
      ...currentRiceOpening,
      total: Number(
        (currentRiceOpening.PP + currentRiceOpening.PRIMARY + currentRiceOpening.UPPER_PRIMARY).toFixed(2)
      ),
    };

    days.push({
      date: dateStr,
      dayNumber: d,
      dayName: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
      isHoliday,
      holidayReason,
      menuItem,
      smsCode,
      attendance,
      ppCount: pp,
      primaryCount: pri,
      upperCount: up,
      totalCount: dayTotalStudents,
      applicableEnrollment,
      ratesUsed: {
        cookingCost: costRates,
        riceKg: riceRates,
      },
      money: {
        opening: dayOpeningMoney,
        allotment: dayAllotmentMoney,
        expense: dayExpenseMoney,
        closing: dayClosingMoney,
      },
      rice: {
        opening: dayOpeningRice,
        allotment: dayAllotmentRice,
        expense: dayExpenseRice,
        closing: dayClosingRice,
      },
    });

    // CRITICAL: Next day's opening automatically EQUALS today's closing
    currentMoneyOpening = {
      PP: dayClosingMoney.PP,
      PRIMARY: dayClosingMoney.PRIMARY,
      UPPER_PRIMARY: dayClosingMoney.UPPER_PRIMARY,
    };

    currentRiceOpening = {
      PP: dayClosingRice.PP,
      PRIMARY: dayClosingRice.PRIMARY,
      UPPER_PRIMARY: dayClosingRice.UPPER_PRIMARY,
    };
  }

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const finalClosingMoney = currentMoneyOpening;
  const finalClosingRice = currentRiceOpening;

  const totalOpeningMoney = {
    ...monthSummary.period.openingMoney,
    total: Number(
      (
        monthSummary.period.openingMoney.PP +
        monthSummary.period.openingMoney.PRIMARY +
        monthSummary.period.openingMoney.UPPER_PRIMARY
      ).toFixed(2)
    ),
  };

  const totalOpeningRice = {
    ...monthSummary.period.openingRiceKg,
    total: Number(
      (
        monthSummary.period.openingRiceKg.PP +
        monthSummary.period.openingRiceKg.PRIMARY +
        monthSummary.period.openingRiceKg.UPPER_PRIMARY
      ).toFixed(2)
    ),
  };

  return {
    monthKey,
    year,
    month,
    monthName,
    isLocked,
    schoolProfile,
    effectiveSHG,
    monthlyOfficialData,
    classes,
    days,
    summary: {
      totalServingDays,
      attendance: {
        pp: totalMealsPP,
        primary: totalMealsPrimary,
        upper: totalMealsUpper,
        total: totalMealsPP + totalMealsPrimary + totalMealsUpper,
        avgDaily:
          totalServingDays > 0
            ? Number(((totalMealsPP + totalMealsPrimary + totalMealsUpper) / totalServingDays).toFixed(2))
            : 0,
      },
      money: {
        opening: totalOpeningMoney,
        allotment: totalAllotmentMoney,
        expense: totalExpenseMoney,
        closing: {
          ...finalClosingMoney,
          total: Number(
            (finalClosingMoney.PP + finalClosingMoney.PRIMARY + finalClosingMoney.UPPER_PRIMARY).toFixed(2)
          ),
        },
      },
      rice: {
        opening: totalOpeningRice,
        allotment: totalAllotmentRice,
        expense: totalExpenseRice,
        closing: {
          ...finalClosingRice,
          total: Number(
            (finalClosingRice.PP + finalClosingRice.PRIMARY + finalClosingRice.UPPER_PRIMARY).toFixed(2)
          ),
        },
      },
    },
  };
}
