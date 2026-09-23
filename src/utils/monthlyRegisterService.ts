import { db } from '../db/db';
import type { SchoolProfile, SchoolType } from '../types/mdm';
import {
  getClassesForSchoolType,
  classifyClassToCategory,
  getEffectiveEnrollment,
  getEffectiveCookingCostRate,
  getEffectiveRiceRate,
  calculateMonthSummary,
} from './mdmCalculations';

export interface DayRegisterRow {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  dayOfWeek: string;
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
  // Money (₹)
  openingMoney: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
  allotmentMoney: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
  expenseMoney: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
  closingMoney: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
  // Rice (kg)
  openingRice: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
  allotmentRice: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
  expenseRice: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
  closingRice: { PP: number; PRIMARY: number; UPPER_PRIMARY: number; total: number };
  // Rates effective on this day
  cookingCostRates: { PP: number; PRIMARY: number; UPPER_PRIMARY: number };
  riceRatesKg: { PP: number; PRIMARY: number; UPPER_PRIMARY: number };
  applicableEnrollment: Record<string, number>;
}

export interface MonthlyRegisterData {
  monthKey: string;
  year: number;
  month: number;
  isLocked: boolean;
  schoolProfile: SchoolProfile;
  classes: string[];
  rows: DayRegisterRow[];
  totals: {
    totalServingDays: number;
    attendance: {
      byClass: Record<string, number>;
      pp: number;
      primary: number;
      upper: number;
      total: number;
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
 * Builds the complete daily sheet register for a month (Days 1 to End of Month)
 * Strictly chaining daily Closing = Opening + Allotment - Expense
 * and carrying Previous Day's Closing -> Next Day's Opening.
 */
export async function getMonthlyRegisterData(
  monthKey: string,
  schoolProfile: SchoolProfile
): Promise<MonthlyRegisterData> {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  // 1. Get Monthly summary which has initial period opening balances
  const summary = await calculateMonthSummary(monthKey);
  const isLocked = !!summary.period?.isLocked;

  // 2. Fetch all daily records for this month
  const dailyAttendanceList = await db.dailyAttendance
    .where('monthKey')
    .equals(monthKey)
    .toArray();
  const dailyMap = new Map(dailyAttendanceList.map((d) => [d.date, d]));

  // 3. Fetch all money and rice transactions for this month
  const moneyTxList = await db.moneyTransactions
    .where('monthKey')
    .equals(monthKey)
    .toArray();
  const riceTxList = await db.riceTransactions
    .where('monthKey')
    .equals(monthKey)
    .toArray();

  const classes = getClassesForSchoolType(schoolProfile.schoolType);

  // Initialize running balances with the Month's Opening Balances
  let currentMoney = {
    PP: summary.period.openingMoney.PP,
    PRIMARY: summary.period.openingMoney.PRIMARY,
    UPPER_PRIMARY: summary.period.openingMoney.UPPER_PRIMARY,
  };

  let currentRice = {
    PP: summary.period.openingRiceKg.PP,
    PRIMARY: summary.period.openingRiceKg.PRIMARY,
    UPPER_PRIMARY: summary.period.openingRiceKg.UPPER_PRIMARY,
  };

  const rows: DayRegisterRow[] = [];

  const totals = {
    totalServingDays: 0,
    attendance: {
      byClass: {} as Record<string, number>,
      pp: 0,
      primary: 0,
      upper: 0,
      total: 0,
    },
    money: {
      opening: {
        PP: currentMoney.PP,
        PRIMARY: currentMoney.PRIMARY,
        UPPER_PRIMARY: currentMoney.UPPER_PRIMARY,
        total: currentMoney.PP + currentMoney.PRIMARY + currentMoney.UPPER_PRIMARY,
      },
      allotment: { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 },
      expense: { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 },
      closing: { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 },
    },
    rice: {
      opening: {
        PP: currentRice.PP,
        PRIMARY: currentRice.PRIMARY,
        UPPER_PRIMARY: currentRice.UPPER_PRIMARY,
        total: currentRice.PP + currentRice.PRIMARY + currentRice.UPPER_PRIMARY,
      },
      allotment: { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 },
      expense: { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 },
      closing: { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 },
    },
  };

  classes.forEach((c) => (totals.attendance.byClass[c] = 0));

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${dayStr}`;
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dayNames[dateObj.getDay()];
    const isSunday = dateObj.getDay() === 0;

    // Effective rates and enrollment on THAT EXACT DATE
    const effectiveEnrollment = await getEffectiveEnrollment(dateStr);
    const effectiveCostRates = await getEffectiveCookingCostRate(dateStr);
    const effectiveRiceRates = await getEffectiveRiceRate(dateStr);

    // Existing recorded day entry
    const existingRec = dailyMap.get(dateStr);

    let rawTotal = 0;
    if (existingRec) {
      if (typeof existingRec.totalCount === 'number' && existingRec.totalCount > 0) {
        rawTotal = existingRec.totalCount;
      } else if (existingRec.attendance) {
        rawTotal = Object.values(existingRec.attendance).reduce((acc: number, v) => acc + (Number(v) || 0), 0);
      }
    }

    const isMealServed = existingRec ? (rawTotal > 0 || !existingRec.isHoliday) : false;
    let isHoliday = !isMealServed;
    let holidayReason = existingRec
      ? (isMealServed ? '' : (existingRec.holidayReason || (isSunday ? 'Sunday' : 'Holiday')))
      : (isSunday ? 'Sunday' : '');
    let menuItem = existingRec?.menuItem || (isHoliday ? '' : 'ডাল');
    let attendanceMap: Record<string, number> = {};

    classes.forEach((c) => {
      attendanceMap[c] = existingRec && isMealServed ? existingRec.attendance[c] || 0 : 0;
    });

    let ppCount = 0;
    let primaryCount = 0;
    let upperCount = 0;

    if (isMealServed && existingRec) {
      ppCount = existingRec.ppCount;
      primaryCount = existingRec.primaryCount;
      upperCount = existingRec.upperCount;
    }

    const totalStudents = ppCount + primaryCount + upperCount;
    const smsCode = isHoliday || totalStudents === 0 ? '-0-' : `${ppCount}-${primaryCount}-${upperCount}`;

    // Transactions on this specific date
    const dayMoneyTx = moneyTxList.filter((tx) => tx.date === dateStr);
    const dayRiceTx = riceTxList.filter((tx) => tx.date === dateStr);

    const dayAllotmentMoney = { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 };
    for (const tx of dayMoneyTx) {
      if (tx.type === 'ALLOTMENT_RECEIVED' || (tx.type === 'ADJUSTMENT' && tx.amount > 0)) {
        dayAllotmentMoney[tx.category] += tx.amount;
        dayAllotmentMoney.total += tx.amount;
      }
    }

    const dayAllotmentRice = { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 };
    for (const tx of dayRiceTx) {
      if (tx.type === 'ALLOTMENT_RECEIVED' || (tx.type === 'ADJUSTMENT' && tx.quantityKg > 0)) {
        dayAllotmentRice[tx.category] += tx.quantityKg;
        dayAllotmentRice.total += tx.quantityKg;
      }
    }

    // Daily Expenses
    let dayExpenseMoney = { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 };
    let dayExpenseRice = { PP: 0, PRIMARY: 0, UPPER_PRIMARY: 0, total: 0 };

    if (isMealServed && existingRec && totalStudents > 0) {
      // Use the recorded day expenses (which were computed using effective rates on save)
      dayExpenseMoney = { ...existingRec.cookingCostExpense };
      dayExpenseRice = { ...existingRec.riceExpenseKg };
      totals.totalServingDays += 1;
    }

    // Additional direct expense / negative adjustment transactions
    for (const tx of dayMoneyTx) {
      if (tx.type === 'DAILY_EXPENSE' || (tx.type === 'ADJUSTMENT' && tx.amount < 0)) {
        const val = Math.abs(tx.amount);
        dayExpenseMoney[tx.category] += val;
        dayExpenseMoney.total += val;
      }
    }

    for (const tx of dayRiceTx) {
      if (tx.type === 'DAILY_EXPENSE' || (tx.type === 'ADJUSTMENT' && tx.quantityKg < 0)) {
        const val = Math.abs(tx.quantityKg);
        dayExpenseRice[tx.category] += val;
        dayExpenseRice.total += val;
      }
    }

    // Daily Opening
    const dayOpeningMoney = {
      PP: currentMoney.PP,
      PRIMARY: currentMoney.PRIMARY,
      UPPER_PRIMARY: currentMoney.UPPER_PRIMARY,
      total: currentMoney.PP + currentMoney.PRIMARY + currentMoney.UPPER_PRIMARY,
    };

    const dayOpeningRice = {
      PP: currentRice.PP,
      PRIMARY: currentRice.PRIMARY,
      UPPER_PRIMARY: currentRice.UPPER_PRIMARY,
      total: currentRice.PP + currentRice.PRIMARY + currentRice.UPPER_PRIMARY,
    };

    // Daily Closing = Opening + Allotment - Expense
    const dayClosingMoney = {
      PP: Number((dayOpeningMoney.PP + dayAllotmentMoney.PP - dayExpenseMoney.PP).toFixed(2)),
      PRIMARY: Number((dayOpeningMoney.PRIMARY + dayAllotmentMoney.PRIMARY - dayExpenseMoney.PRIMARY).toFixed(2)),
      UPPER_PRIMARY: Number((dayOpeningMoney.UPPER_PRIMARY + dayAllotmentMoney.UPPER_PRIMARY - dayExpenseMoney.UPPER_PRIMARY).toFixed(2)),
      total: 0,
    };
    dayClosingMoney.total = Number(
      (dayClosingMoney.PP + dayClosingMoney.PRIMARY + dayClosingMoney.UPPER_PRIMARY).toFixed(2)
    );

    const dayClosingRice = {
      PP: Number((dayOpeningRice.PP + dayAllotmentRice.PP - dayExpenseRice.PP).toFixed(2)),
      PRIMARY: Number((dayOpeningRice.PRIMARY + dayAllotmentRice.PRIMARY - dayExpenseRice.PRIMARY).toFixed(2)),
      UPPER_PRIMARY: Number((dayOpeningRice.UPPER_PRIMARY + dayAllotmentRice.UPPER_PRIMARY - dayExpenseRice.UPPER_PRIMARY).toFixed(2)),
      total: 0,
    };
    dayClosingRice.total = Number(
      (dayClosingRice.PP + dayClosingRice.PRIMARY + dayClosingRice.UPPER_PRIMARY).toFixed(2)
    );

    // Carry forward to next day
    currentMoney = {
      PP: dayClosingMoney.PP,
      PRIMARY: dayClosingMoney.PRIMARY,
      UPPER_PRIMARY: dayClosingMoney.UPPER_PRIMARY,
    };

    currentRice = {
      PP: dayClosingRice.PP,
      PRIMARY: dayClosingRice.PRIMARY,
      UPPER_PRIMARY: dayClosingRice.UPPER_PRIMARY,
    };

    // Accumulate Totals
    classes.forEach((c) => {
      totals.attendance.byClass[c] += attendanceMap[c] || 0;
    });
    totals.attendance.pp += ppCount;
    totals.attendance.primary += primaryCount;
    totals.attendance.upper += upperCount;
    totals.attendance.total += totalStudents;

    totals.money.allotment.PP += dayAllotmentMoney.PP;
    totals.money.allotment.PRIMARY += dayAllotmentMoney.PRIMARY;
    totals.money.allotment.UPPER_PRIMARY += dayAllotmentMoney.UPPER_PRIMARY;
    totals.money.allotment.total += dayAllotmentMoney.total;

    totals.money.expense.PP += dayExpenseMoney.PP;
    totals.money.expense.PRIMARY += dayExpenseMoney.PRIMARY;
    totals.money.expense.UPPER_PRIMARY += dayExpenseMoney.UPPER_PRIMARY;
    totals.money.expense.total += dayExpenseMoney.total;

    totals.rice.allotment.PP += dayAllotmentRice.PP;
    totals.rice.allotment.PRIMARY += dayAllotmentRice.PRIMARY;
    totals.rice.allotment.UPPER_PRIMARY += dayAllotmentRice.UPPER_PRIMARY;
    totals.rice.allotment.total += dayAllotmentRice.total;

    totals.rice.expense.PP += dayExpenseRice.PP;
    totals.rice.expense.PRIMARY += dayExpenseRice.PRIMARY;
    totals.rice.expense.UPPER_PRIMARY += dayExpenseRice.UPPER_PRIMARY;
    totals.rice.expense.total += dayExpenseRice.total;

    rows.push({
      date: dateStr,
      dayNumber: d,
      dayOfWeek,
      isHoliday,
      holidayReason,
      menuItem,
      smsCode,
      attendance: attendanceMap,
      ppCount,
      primaryCount,
      upperCount,
      totalCount: totalStudents,
      openingMoney: dayOpeningMoney,
      allotmentMoney: dayAllotmentMoney,
      expenseMoney: dayExpenseMoney,
      closingMoney: dayClosingMoney,
      openingRice: dayOpeningRice,
      allotmentRice: dayAllotmentRice,
      expenseRice: dayExpenseRice,
      closingRice: dayClosingRice,
      cookingCostRates: effectiveCostRates,
      riceRatesKg: effectiveRiceRates,
      applicableEnrollment: effectiveEnrollment,
    });
  }

  // Final monthly closing balances from the last day
  const lastRow = rows[rows.length - 1];
  totals.money.closing = { ...lastRow.closingMoney };
  totals.rice.closing = { ...lastRow.closingRice };

  return {
    monthKey,
    year,
    month,
    isLocked,
    schoolProfile,
    classes,
    rows,
    totals,
  };
}
