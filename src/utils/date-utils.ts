import { DateTime, Interval } from "luxon";
import { Shift, MaintenanceWindow } from "../reflow/types";

/**
 * Normalizes a value to a Luxon DateTime.
 *
 * - If `value` is an ISO string, parses it with DateTime.fromISO.
 * - If `value` is already a DateTime, returns it unchanged.
 *
 * @param value ISO 8601 string or DateTime
 * @returns DateTime in the current system zone
 */
export function toDT(value: string | DateTime): DateTime {
  return typeof value === "string" ? DateTime.fromISO(value) : value;
}

/**
 * Computes the non-negative difference in minutes between two DateTimes.
 *
 * Returns 0 if `b` is not after `a`. May return fractional minutes.
 *
 * @param a Start DateTime
 * @param b End DateTime
 * @returns Number of minutes (>= 0)
 */
export function minutesBetween(a: DateTime, b: DateTime): number {
  return Math.max(0, b.diff(a, "minutes").minutes);
}

/**
 * Checks whether a DateTime falls within any provided shift.
 *
 * Assumptions:
 * - `Shift.dayOfWeek` uses 0=Sunday..6=Saturday.
 * - Comparison uses `dt.weekday % 7` (Luxon: 1=Mon..7=Sun).
 * - Start hour is inclusive; end hour is exclusive.
 *
 * @param dt DateTime to test
 * @param shifts List of shifts
 * @returns true if `dt` is within a shift window
 */
export function isWithinShift(dt: DateTime, shifts: Shift[]): boolean {
  return shifts.some(s =>
    s.dayOfWeek === dt.weekday % 7 &&
    dt.hour >= s.startHour &&
    dt.hour < s.endHour
  );
}

/**
 * Finds the next shift start strictly after the given DateTime.
 *
 * Scans up to 14 days ahead and returns the first matching shift start.
 * Throws if none is found within that window.
 *
 * @param dt Reference DateTime
 * @param shifts List of shifts
 * @throws Error when no shift is found within 14 days
 * @returns The next shift start DateTime
 */
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

/**
 * Returns the end time of the shift on the given day that `dt` is in or after.
 *
 * Picks the first shift on the same weekday where `dt.hour >= startHour` and
 * returns `dt` with `hour` set to that shift's `endHour`. If no shift matches,
 * returns `dt` unchanged. Does not validate containment or handle overlaps.
 *
 * @param dt DateTime within the target day
 * @param shifts List of shifts
 * @returns DateTime at the shift end hour or the original `dt` if none found
 */
export function shiftEnd(dt: DateTime, shifts: Shift[]): DateTime {
  const shift = shifts.find(
    s => s.dayOfWeek === dt.weekday % 7 && dt.hour >= s.startHour
  );
  if (!shift) return dt;
  return dt.set({ hour: shift.endHour });
}

/**
 * Returns the maintenance window that contains `dt`, or null if none.
 *
 * Window bounds follow Luxon `Interval.contains` semantics
 * (inclusive of start, exclusive of end).
 *
 * @param dt DateTime to test
 * @param windows Maintenance windows with ISO start/end
 * @returns Matching MaintenanceWindow or null
 */
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

/**
 * Returns the next maintenance start strictly after `dt`, or null if none.
 *
 * @param dt Reference DateTime
 * @param windows Maintenance windows with ISO start/end
 * @returns DateTime of next maintenance start or null
 */
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