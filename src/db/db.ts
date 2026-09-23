import Dexie, { type Table } from 'dexie';
import type {
  SchoolProfile,
  EnrollmentHistory,
  CookingCostRateHistory,
  RiceRateHistory,
  MonthlyPeriod,
  RiceTransaction,
  MoneyTransaction,
  DailyAttendanceRecord,
  CustomMenuOption,
  SHGHistory,
  MonthlyOfficialData,
  HealthActivityLog,
} from '../types/mdm';

export class MDMDatabase extends Dexie {
  schoolProfile!: Table<SchoolProfile, number>;
  enrollmentHistory!: Table<EnrollmentHistory, number>;
  cookingCostRateHistory!: Table<CookingCostRateHistory, number>;
  riceRateHistory!: Table<RiceRateHistory, number>;
  monthlyPeriods!: Table<MonthlyPeriod, number>;
  riceTransactions!: Table<RiceTransaction, number>;
  moneyTransactions!: Table<MoneyTransaction, number>;
  dailyAttendance!: Table<DailyAttendanceRecord, number>;
  menuOptions!: Table<CustomMenuOption, number>;
  shgHistory!: Table<SHGHistory, number>;
  monthlyOfficialData!: Table<MonthlyOfficialData, number>;
  healthActivityLogs!: Table<HealthActivityLog, number>;

  constructor() {
    super('WestBengalMDMDB');
    this.version(2).stores({
      schoolProfile: '++id',
      enrollmentHistory: '++id, effectiveFrom, createdAt',
      cookingCostRateHistory: '++id, effectiveFrom, createdAt',
      riceRateHistory: '++id, effectiveFrom, createdAt',
      monthlyPeriods: '++id, &monthKey, year, month, isLocked',
      riceTransactions: '++id, date, monthKey, category, type',
      moneyTransactions: '++id, date, monthKey, category, type',
      dailyAttendance: '++id, &date, monthKey',
      menuOptions: '++id, name',
      shgHistory: '++id, effectiveFrom, createdAt',
      monthlyOfficialData: '++id, &monthKey, academicYear, year, month',
      healthActivityLogs: '++id, date, monthKey, activityType',
    });
    this.schoolProfile = this.table('schoolProfile');
    this.enrollmentHistory = this.table('enrollmentHistory');
    this.cookingCostRateHistory = this.table('cookingCostRateHistory');
    this.riceRateHistory = this.table('riceRateHistory');
    this.monthlyPeriods = this.table('monthlyPeriods');
    this.riceTransactions = this.table('riceTransactions');
    this.moneyTransactions = this.table('moneyTransactions');
    this.dailyAttendance = this.table('dailyAttendance');
    this.menuOptions = this.table('menuOptions');
    this.shgHistory = this.table('shgHistory');
    this.monthlyOfficialData = this.table('monthlyOfficialData');
    this.healthActivityLogs = this.table('healthActivityLogs');
  }
}

export const db = new MDMDatabase();

export const DEFAULT_MENUS: string[] = [
  'ডাল',
  'সয়াবিন',
  'খিচুড়ি',
  'সবজি',
  'ডিম, আলু',
  'ডাল আলু মাখা',
  'ভাত, ডিমের ঝোল',
  'ভাত, সোয়াবিনের তরকারি',
  'ভাত, ডাল ও বাঁধাকপির তরকারি',
  'ভাত, চাটনি ও পাঁপড়',
];

export async function initializeDefaultMenus() {
  const existing = await db.menuOptions.toArray();
  const seen = new Set<string>();
  const duplicateIds: number[] = [];

  for (const item of existing) {
    const trimmed = (item.name || '').trim();
    if (!trimmed) {
      if (item.id !== undefined) duplicateIds.push(item.id);
      continue;
    }
    if (seen.has(trimmed)) {
      if (item.id !== undefined) duplicateIds.push(item.id);
    } else {
      seen.add(trimmed);
    }
  }

  if (duplicateIds.length > 0) {
    await db.menuOptions.bulkDelete(duplicateIds);
  }

  const toAdd = DEFAULT_MENUS
    .filter((m) => !seen.has(m.trim()))
    .map((m) => ({ name: m.trim(), isDefault: true }));

  if (toAdd.length > 0) {
    await db.menuOptions.bulkAdd(toAdd);
  }
}
