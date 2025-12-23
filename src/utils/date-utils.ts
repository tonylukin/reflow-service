import { DateTime, Interval } from "luxon";
import { Shift, MaintenanceWindow } from "../reflow/types";

export function toDT(value: string | DateTime): DateTime {
  return typeof value === "string" ? DateTime.fromISO(value) : value;
}

export function minutesBetween(a: DateTime, b: DateTime): number {
  return Math.max(0, b.diff(a, "minutes").minutes);
}

export function isWithinShift(dt: DateTime, shifts: Shift[]): boolean {
  return shifts.some(s =>
    s.dayOfWeek === dt.weekday % 7 &&
    dt.hour >= s.startHour &&
    dt.hour < s.endHour
  );
}

export function nextShiftStart(dt: DateTime, shifts: Shift[]): DateTime {
  for (let i = 0; i < 14; i++) {
    const day = dt.plus({ days: i }).startOf("day");
    for (const s of shifts) {
      if (s.dayOfWeek === day.weekday % 7) {
        const start = day.set({ hour: s.startHour });
        if (start > dt) return start;
      }
    }
  }
  throw new Error("No shift found");
}

export function shiftEnd(dt: DateTime, shifts: Shift[]): DateTime {
  const shift = shifts.find(
    s => s.dayOfWeek === dt.weekday % 7 && dt.hour >= s.startHour
  );
  if (!shift) return dt;
  return dt.set({ hour: shift.endHour });
}

export function inMaintenance(
  dt: DateTime,
  windows: MaintenanceWindow[]
): MaintenanceWindow | null {
  return (
    windows.find(w =>
      Interval.fromDateTimes(
        DateTime.fromISO(w.startDate),
        DateTime.fromISO(w.endDate)
      ).contains(dt)
    ) ?? null
  );
}

export function nextMaintenance(
  dt: DateTime,
  windows: MaintenanceWindow[]
): DateTime | null {
  const future = windows
    .map(w => DateTime.fromISO(w.startDate))
    .filter(d => d > dt)
    .sort((a, b) => a.toMillis() - b.toMillis());
  return future[0] ?? null;
}
