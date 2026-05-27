import type { EmployeeType, LeaveType } from './schemas';

export interface YearLedger {
  yearIndex: number;
  startDate: string;
  endDate: string;
  baseGranted: number;
  carryover: number;
  available: number;
  taken: number;
  remaining: number;
  leaves: LeaveType[];
}

export interface VacationBalanceResult {
  granted: number;
  taken: number;
  remaining: number;
  currentYearIndex: number;
  years: YearLedger[];
}

/**
 * Calculates the number of days between two dates inclusive
 */
export const getDaysBetween = (start: Date | string, end: Date | string): number => {
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  
  const diffTime = Math.max(0, e.getTime() - s.getTime());
  return Math.ceil(diffTime / (1000 * 3600 * 24)) + 1;
};

/**
 * Check if two date ranges overlap
 */
export const isOverlapping = (
  startA: string | Date,
  endA: string | Date,
  startB: string | Date,
  endB: string | Date
): boolean => {
  const sA = new Date(startA); sA.setHours(0,0,0,0);
  const eA = new Date(endA); eA.setHours(0,0,0,0);
  const sB = new Date(startB); sB.setHours(0,0,0,0);
  const eB = new Date(endB); eB.setHours(0,0,0,0);

  if (isNaN(sA.getTime()) || isNaN(eA.getTime()) || isNaN(sB.getTime()) || isNaN(eB.getTime())) {
    return false;
  }
  return sA <= eB && eA >= sB;
};

/**
 * Check if a new leave overlaps with any existing leaves
 */
export const checkLeaveOverlap = (
  leaves: LeaveType[],
  newStart: string,
  newEnd: string,
  excludeLeaveId?: string
): boolean => {
  if (!leaves || !Array.isArray(leaves) || !newStart || !newEnd) return false;

  return leaves.some(leave => {
    if (excludeLeaveId && leave.id === excludeLeaveId) return false;
    return isOverlapping(newStart, newEnd, leave.startDate, leave.endDate);
  });
};

/**
 * Calculates the detailed vacation balance ledger year-by-year based on employee start date
 */
export const calculateVacationBalance = (employee: Partial<EmployeeType>): VacationBalanceResult => {
  const defaultResult: VacationBalanceResult = {
    granted: 30,
    taken: 0,
    remaining: 30,
    currentYearIndex: 1,
    years: [],
  };

  if (!employee || !employee.startDate) return defaultResult;
  const start = new Date(employee.startDate);
  start.setHours(0, 0, 0, 0);
  if (isNaN(start.getTime()) || start.getFullYear() < 1980 || start.getFullYear() > 2100) return defaultResult;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Find the maximum date boundary to calculate years up to (either today or the furthest leave)
  let maxDate = new Date(today);
  const empLeaves = employee.leaves || [];
  empLeaves.forEach(l => {
    if (l.startDate) {
      const d = new Date(l.startDate);
      if (!isNaN(d.getTime()) && d > maxDate) maxDate = d;
    }
    if (l.endDate) {
      const d = new Date(l.endDate);
      if (!isNaN(d.getTime()) && d > maxDate) maxDate = d;
    }
  });

  const diffTime = Math.max(0, maxDate.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const maxYearIndex = Math.floor(diffDays / 365);

  const currentDiffTime = Math.max(0, today.getTime() - start.getTime());
  const currentDiffDays = Math.ceil(currentDiffTime / (1000 * 60 * 60 * 24));
  const currentYearIndex = Math.floor(currentDiffDays / 365);

  if (maxYearIndex > 60 || currentYearIndex > 60) return defaultResult;

  const years: YearLedger[] = [];
  let carryover = 0;

  for (let y = 0; y <= maxYearIndex; y++) {
    const yearStart = new Date(start);
    yearStart.setDate(yearStart.getDate() + (y * 365));
    yearStart.setHours(0, 0, 0, 0);

    const yearEnd = new Date(start);
    yearEnd.setDate(yearEnd.getDate() + ((y + 1) * 365) - 1);
    yearEnd.setHours(23, 59, 59, 999);

    const baseGranted = 30;
    const totalAvailable = baseGranted + carryover;
    let takenThisYear = 0;
    const leavesThisYear: LeaveType[] = [];

    empLeaves.forEach(leave => {
      if (!leave.startDate || !leave.endDate) return;
      const leaveStart = new Date(leave.startDate); leaveStart.setHours(0, 0, 0, 0);
      const leaveEnd = new Date(leave.endDate); leaveEnd.setHours(0, 0, 0, 0);
      if (isNaN(leaveStart.getTime()) || isNaN(leaveEnd.getTime())) return;

      // Assign leave to the year in which it starts
      if (leaveStart >= yearStart && leaveStart <= yearEnd) {
        takenThisYear += getDaysBetween(leaveStart, leaveEnd);
        leavesThisYear.push(leave);
      }
    });

    const remainingThisYear = totalAvailable - takenThisYear;

    years.push({
      yearIndex: y + 1,
      startDate: yearStart.toISOString().split('T')[0],
      endDate: yearEnd.toISOString().split('T')[0],
      baseGranted,
      carryover,
      available: totalAvailable,
      taken: takenThisYear,
      remaining: remainingThisYear,
      leaves: leavesThisYear,
    });

    // Rollover remaining balance to the next year
    carryover = remainingThisYear;
  }

  // We find the ledger row for the actual current year (based on current date)
  // or the latest calculated year if today is before start date or in years list
  const activeYearIndex = Math.min(currentYearIndex, maxYearIndex);
  const currentYearData = years[activeYearIndex] || {
    available: 30,
    taken: 0,
    remaining: 30,
  };

  return {
    granted: currentYearData.available,
    taken: currentYearData.taken,
    remaining: currentYearData.remaining,
    currentYearIndex: currentYearIndex + 1,
    years,
  };
};

/**
 * Helper to calculate remaining days until document expiry
 */
export const getRemainingDays = (expiry: string): number => {
  if (!expiry) return 0;
  const diff = new Date(expiry).getTime() - new Date().setHours(0,0,0,0);
  return Math.ceil(diff / (1000 * 3600 * 24));
};

/**
 * Gets the status of a document ('active', 'near', 'expired')
 */
export const getDocStatus = (expiry: string, threshold = 30): 'active' | 'near' | 'expired' => {
  const days = getRemainingDays(expiry);
  if (days <= 0) return 'expired';
  if (days <= threshold) return 'near';
  return 'active';
};
