export type SchoolType = 'PRIMARY' | 'HIGHER_SECONDARY';

export type CategoryKey = 'PP' | 'PRIMARY' | 'UPPER_PRIMARY';

export interface SchoolProfile {
  id?: number;
  schoolName: string;
  udiseCode: string;
  schoolType: SchoolType;
  academicYear: string;
  district: string;
  blockCircle: string;
  address: string;
  headTeacherName: string;
  contactNumber: string;
  startDate: string; // YYYY-MM-DD
  isSetupComplete: boolean;
  createdAt: string;
  updatedAt: string;
  // Official reporting configuration fields (configurable by school in Settings, not fabricated)
  shgDetails?: {
    nameOfSHG?: string; // e.g. "Maa Sarada Swanirbhar Dal"
    shgLeaderName?: string;
    shgBankName?: string;
    shgAccountNumber?: string;
    shgBranchName?: string;
    shgIfscCode?: string;
    numberOfCooks?: number;
    cookNames?: string;
    cookHonorariumMonthly?: number;
  };
  mdcfDetails?: {
    panchayatMunicipality?: string;
    villageWard?: string;
    kitchenShedAvailable?: 'YES' | 'NO';
    potableWaterAvailable?: 'YES' | 'NO';
    weighingMachineAvailable?: 'YES' | 'NO';
    healthScreeningConducted?: 'YES' | 'NO';
    healthScreeningDate?: string;
    ironFolicAcidDistributed?: 'YES' | 'NO';
    dewormingConducted?: 'YES' | 'NO';
    smcMeetingDate?: string;
    inspectionDate?: string;
    inspectingOfficer?: string;
    // Health status fields (Section 6)
    boysReceivedIga?: number;
    girlsReceivedIga?: number;
    screenedByRbsk?: number;
    referredByRbsk?: number;
    // School Inspection (Section 7)
    inspectedByDistrictOfficials?: 'YES' | 'NO';
    districtInspectionCount?: number;
    inspectedByRbskTeam?: 'YES' | 'NO';
    rbskInspectionCount?: number;
    inspectedBySmcMembers?: 'YES' | 'NO';
    smcInspectionCount?: number;
    untowardIncidentsOccurred?: number;
    smcChairpersonName?: string;
  };
}

export interface EnrollmentHistory {
  id?: number;
  effectiveFrom: string; // YYYY-MM-DD
  enrollments: Record<string, number>; // e.g. { PP: 6, I: 16, II: 14, III: 20, IV: 19, V: 17 }
  note?: string;
  createdAt: string;
}

export interface CookingCostRateHistory {
  id?: number;
  effectiveFrom: string; // YYYY-MM-DD
  rates: {
    PP: number; // e.g., 6.78
    PRIMARY: number; // e.g., 6.78
    UPPER_PRIMARY: number; // e.g., 6.78
  };
  note?: string;
  createdAt: string;
}

export interface RiceRateHistory {
  id?: number;
  effectiveFrom: string; // YYYY-MM-DD
  ratesKg: {
    PP: number; // e.g., 0.100 kg
    PRIMARY: number; // e.g., 0.100 kg
    UPPER_PRIMARY: number; // e.g., 0.100 kg
  };
  note?: string;
  createdAt: string;
}

export interface MonthlyPeriod {
  id?: number;
  monthKey: string; // "YYYY-MM", e.g. "2026-01"
  year: number;
  month: number; // 1-12
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  // Carried forward / initial opening
  openingMoney: {
    PP: number;
    PRIMARY: number;
    UPPER_PRIMARY: number;
  };
  openingRiceKg: {
    PP: number;
    PRIMARY: number;
    UPPER_PRIMARY: number;
  };
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'OPENING' | 'ALLOTMENT_RECEIVED' | 'DAILY_EXPENSE' | 'ADJUSTMENT';

export interface RiceTransaction {
  id?: number;
  date: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  category: CategoryKey;
  quantityKg: number; // positive for allotment/opening, negative for consumption
  type: TransactionType;
  reference?: string; // voucher, memo number, or daily attendance ref
  note?: string;
  createdAt: string;
}

export interface MoneyTransaction {
  id?: number;
  date: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  category: CategoryKey;
  amount: number; // positive for allotment/opening, negative for cooking expense
  type: TransactionType;
  reference?: string; // voucher, memo number, etc.
  note?: string;
  createdAt: string;
}

export interface DailyAttendanceRecord {
  id?: number;
  date: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  isHoliday: boolean;
  holidayReason?: string;
  menuItem: string; // Bengali menu e.g. ডাল, সয়াবিন, ডিম আলু
  // Attendance by class
  attendance: Record<string, number>;
  // Group attendance
  ppCount: number;
  primaryCount: number;
  upperCount: number;
  totalCount: number;
  smsCode: string; // e.g. "5-60-22" or "-0-"
  // Calculated financial & rice consumption based on effective rates
  ratesUsed: {
    cookingCost: { PP: number; PRIMARY: number; UPPER_PRIMARY: number };
    riceKg: { PP: number; PRIMARY: number; UPPER_PRIMARY: number };
  };
  cookingCostExpense: {
    PP: number;
    PRIMARY: number;
    UPPER_PRIMARY: number;
    total: number;
  };
  riceExpenseKg: {
    PP: number;
    PRIMARY: number;
    UPPER_PRIMARY: number;
    total: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CustomMenuOption {
  id?: number;
  name: string; // Bengali / English
  isDefault?: boolean;
}

/**
 * Effective-dated SHG / Cooking Agency History
 * Allows historical reports to retain the SHG name & bank details applicable
 * to their specific historical period without altering past records.
 */
export interface SHGHistory {
  id?: number;
  effectiveFrom: string; // YYYY-MM-DD
  nameOfSHG: string;
  leaderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  numberOfCooks?: number;
  cookHonorariumMonthly?: number;
  cookNames?: string;
  note?: string;
  createdAt: string;
}

/**
 * Monthly Official Report Data keyed by monthKey (e.g. "2026-08") and academicYear
 * Stores month-specific Children Health Status & School Inspection data.
 */
export interface MonthlyOfficialData {
  id?: number;
  monthKey: string; // YYYY-MM, e.g. "2026-08"
  academicYear: string; // e.g. "2026-2027" or "2026"
  year: number;
  month: number;
  isLocked?: boolean;
  // Section 6: Children Health Status
  boysReceivedIga: number | null;
  girlsReceivedIga: number | null;
  screenedByRbsk: number | null;
  referredByRbsk: number | null;
  dewormingConducted?: 'YES' | 'NO' | null;
  // Section 7: School Inspection
  inspectedByDistrictOfficials: 'YES' | 'NO' | null;
  inspectedByRbskTeam: 'YES' | 'NO' | null;
  inspectedBySmcMembers: 'YES' | 'NO' | null;
  untowardIncidentsOccurred: number | null;
  // Official signatures metadata for the month
  smcChairpersonName?: string;
  headTeacherName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Optional Health Activity Log
 * Allows recording individual health visits/activities in a month.
 * Can automatically sum into the MonthlyOfficialData.
 */
export interface HealthActivityLog {
  id?: number;
  date: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  academicYear?: string;
  activityType: string; // e.g. "RBSK Screening", "WIFS IFA Distribution", "Deworming Camp"
  childrenScreened: number;
  childrenReferred: number;
  igaBoys: number;
  igaGirls: number;
  remarks?: string;
  createdAt: string;
}
